import io
import csv
import json
from fastapi import APIRouter, Depends, HTTPException, Response
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from app.db.repositories import get_repo
from app.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.get("/export/{run_id}/csv")
def export_run_csv(run_id: str, current_user: dict = Depends(get_current_user)):
    results_repo = get_repo("run_results")
    res = results_repo.col.find_one({"run_id": run_id})
    if not res:
        raise HTTPException(status_code=404, detail="Run results not found")

    daily = res.get("daily_results", [])
    output = io.StringIO()
    writer = csv.writer(output)

    # Disclaimer header
    writer.writerow(["# OutbreakLab Policy Scenario Export - HYPOTHETICAL SCENARIO - NOT A REAL FORECAST"])
    writer.writerow(["Day", "Susceptible", "Exposed", "Asymptomatic", "Symptomatic_Infected", "Hospitalised", "Recovered", "Deaths", "Vaccinated", "Rt"])

    for d in daily:
        writer.writerow([
            d.get("day", 0),
            round(d.get("S", 0), 1),
            round(d.get("E", 0), 1),
            round(d.get("A", 0), 1),
            round(d.get("I", 0), 1),
            round(d.get("H", 0), 1),
            round(d.get("R", 0), 1),
            round(d.get("D", 0), 1),
            round(d.get("V", 0), 1),
            round(d.get("Rt", 1.0), 3)
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=outbreaklab_run_{run_id[:8]}.csv"}
    )

@router.get("/export/{run_id}/excel")
def export_run_excel(run_id: str, current_user: dict = Depends(get_current_user)):
    runs_repo = get_repo("runs")
    results_repo = get_repo("run_results")

    run = runs_repo.get_by_id(run_id)
    res = results_repo.col.find_one({"run_id": run_id})
    if not run or not res:
        raise HTTPException(status_code=404, detail="Run not found")

    wb = Workbook()

    # Sheet 1: Summary & Metrics
    ws1 = wb.active
    ws1.title = "Executive Summary"

    ws1.append(["OutbreakLab Simulation Brief"])
    ws1.append(["Disclaimer: Hypothetical scenario for preparedness education, NOT a real-outbreak forecast."])
    ws1.append([])
    ws1.append(["Run ID", run["id"]])
    ws1.append(["Scenario", run.get("scenario_name", "N/A")])
    ws1.append(["Engine", run.get("engine", "ode")])
    ws1.append(["Horizon (Days)", run.get("horizon_days", 180)])
    ws1.append(["Seed", run.get("seed", 42)])
    ws1.append([])

    metrics = run.get("metrics", {})
    ws1.append(["Metric", "Value"])
    ws1.append(["Peak Symptomatic Infected", metrics.get("peak_infected", 0)])
    ws1.append(["Peak Infected Day", metrics.get("peak_infected_day", 0)])
    ws1.append(["Peak Hospital Occupancy", metrics.get("peak_hospital_occupancy", 0)])
    ws1.append(["Hospital Bed Capacity", metrics.get("hospital_bed_capacity", 0)])
    ws1.append(["Days Over Hospital Capacity", metrics.get("days_over_hospital_capacity", 0)])
    ws1.append(["Peak ICU Occupancy", metrics.get("peak_icu_occupancy", 0)])
    ws1.append(["ICU Capacity", metrics.get("icu_capacity", 0)])
    ws1.append(["Total Cumulative Cases", metrics.get("total_cases", 0)])
    ws1.append(["Overall Attack Rate", f"{metrics.get('overall_attack_rate', 0.0):.1%}"])
    ws1.append(["Total Deaths", metrics.get("total_deaths", 0)])
    ws1.append(["Total Estimated Cost ($)", f"${metrics.get('total_cost', 0):,.2f}"])
    ws1.append(["Basic Reproduction Number (R0)", metrics.get("r0", 0)])
    ws1.append(["Herd Immunity Threshold", f"{metrics.get('herd_immunity_threshold', 0):.1%}"])

    # Sheet 2: Daily Dynamics
    ws2 = wb.create_sheet(title="Daily Time Series")
    ws2.append(["Day", "Susceptible", "Exposed", "Asymptomatic", "Symptomatic", "Hospitalised", "Recovered", "Deaths", "Vaccinated", "Rt"])

    for d in res.get("daily_results", []):
        ws2.append([
            d.get("day", 0),
            round(d.get("S", 0), 1),
            round(d.get("E", 0), 1),
            round(d.get("A", 0), 1),
            round(d.get("I", 0), 1),
            round(d.get("H", 0), 1),
            round(d.get("R", 0), 1),
            round(d.get("D", 0), 1),
            round(d.get("V", 0), 1),
            round(d.get("Rt", 1.0), 3)
        ])

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    return Response(
        content=stream.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=outbreaklab_brief_{run_id[:8]}.xlsx"}
    )
