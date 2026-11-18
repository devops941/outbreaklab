from typing import Dict, Any, List, Optional

def compute_intervention_costs(
    interventions: List[Dict[str, Any]],
    simulation_output: Dict[str, Any],
    cost_per_bed_day: float = 1200.0
) -> Dict[str, float]:
    """
    Computes total economic and healthcare costs for a simulation run.
    """
    daily = simulation_output.get("daily_results", [])
    total_days = len(daily)

    # 1. Hospital bed-day costs
    total_bed_days = sum(float(d.get("H", 0.0)) for d in daily)
    hospital_care_cost = total_bed_days * cost_per_bed_day

    # 2. Direct intervention policy costs
    intervention_policy_cost = 0.0
    vaccine_doses_cost = 0.0

    for inv in interventions:
        start = int(inv.get("start_day", 0))
        end = min(total_days, int(inv.get("end_day", total_days)))
        active_duration = max(0, end - start)
        daily_cost = float(inv.get("cost_per_day", 0.0))
        intervention_policy_cost += active_duration * daily_cost

        # Vaccine dose cost
        if inv.get("intervention_type") == "vaccination":
            params = inv.get("parameters", {})
            daily_doses = float(params.get("daily_doses", 0))
            cost_per_dose = float(inv.get("cost_per_dose", 25.0))
            total_doses = active_duration * daily_doses
            vaccine_doses_cost += total_doses * cost_per_dose

    total_cost = hospital_care_cost + intervention_policy_cost + vaccine_doses_cost

    return {
        "hospital_care_cost": round(hospital_care_cost, 2),
        "intervention_policy_cost": round(intervention_policy_cost, 2),
        "vaccine_doses_cost": round(vaccine_doses_cost, 2),
        "total_cost": round(total_cost, 2)
    }

def compute_incremental_cost_effectiveness(
    baseline_metrics: Dict[str, Any],
    intervention_metrics: Dict[str, Any]
) -> Dict[str, Optional[float]]:
    """
    Computes deaths averted and cost per death averted relative to baseline.
    """
    b_deaths = baseline_metrics.get("total_deaths", 0)
    i_deaths = intervention_metrics.get("total_deaths", 0)
    deaths_averted = max(0, b_deaths - i_deaths)

    b_cost = baseline_metrics.get("total_cost", 0.0)
    i_cost = intervention_metrics.get("total_cost", 0.0)
    incremental_cost = i_cost - b_cost

    cost_per_death_averted = None
    if deaths_averted > 0:
        cost_per_death_averted = round(incremental_cost / deaths_averted, 2)

    return {
        "deaths_averted": deaths_averted,
        "incremental_cost": round(incremental_cost, 2),
        "cost_per_death_averted": cost_per_death_averted
    }
