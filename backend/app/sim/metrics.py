import numpy as np
from typing import Dict, Any, List, Optional

def compute_outcome_metrics(
    population: Dict[str, Any],
    simulation_output: Dict[str, Any],
    cost_data: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Computes all public health outcome metrics from simulation time series.
    """
    daily = simulation_output.get("daily_results", [])
    if not daily:
        return {}

    age_groups = population.get("age_groups", [])
    total_N = float(population.get("total_population", sum(ag.get("count", 0) for ag in age_groups)))
    hospital_bed_capacity = int(population.get("hospital_beds", 100))
    icu_bed_capacity = int(population.get("icu_beds", 20))

    days = [d["day"] for d in daily]
    I_series = np.array([d["I"] for d in daily], dtype=float)
    H_series = np.array([d["H"] for d in daily], dtype=float)
    D_series = np.array([d["D"] for d in daily], dtype=float)
    S_series = np.array([d["S"] for d in daily], dtype=float)

    # Peak infected
    peak_I_idx = int(np.argmax(I_series))
    peak_infected = int(round(I_series[peak_I_idx]))
    peak_infected_day = int(days[peak_I_idx])

    # Peak hospital load
    peak_H_idx = int(np.argmax(H_series))
    peak_hospital_occupancy = int(round(H_series[peak_H_idx]))
    peak_hospital_day = int(days[peak_H_idx])

    # ICU load (default 20% of acute hospital patients require ICU)
    ICU_series = H_series * 0.20
    peak_icu_occupancy = int(round(np.max(ICU_series)))

    # Days exceeding capacity
    days_over_hosp = int(np.sum(H_series > hospital_bed_capacity))
    days_over_icu = int(np.sum(ICU_series > icu_bed_capacity))

    # Total deaths at end of horizon
    total_deaths = int(round(D_series[-1]))

    # Attack rate overall: fraction of initial susceptibles infected
    S_start = S_series[0]
    S_end = S_series[-1]
    total_infected = max(0.0, S_start - S_end)
    overall_attack_rate = float(round(total_infected / max(1.0, total_N), 4))

    # Attack rate by age
    attack_rate_by_age = {}
    yll_proxy = 0.0
    # Standard standard life expectancy discount per age bracket (approx years remaining)
    age_weights = {"0-4": 75.0, "5-17": 65.0, "18-49": 40.0, "50-64": 22.0, "65+": 10.0}

    for ag in age_groups:
        ag_name = ag.get("name", "Unknown")
        ag_count = max(1.0, float(ag.get("count", 1)))
        s_start_ag = daily[0]["by_age"].get(ag_name, {}).get("S", ag_count)
        s_end_ag = daily[-1]["by_age"].get(ag_name, {}).get("S", ag_count)
        inf_ag = max(0.0, s_start_ag - s_end_ag)
        attack_rate_by_age[ag_name] = float(round(inf_ag / ag_count, 4))

        # YLL contribution from deaths in this group
        d_end_ag = daily[-1]["by_age"].get(ag_name, {}).get("D", 0.0)
        weight = age_weights.get(ag_name, 25.0)
        yll_proxy += float(d_end_ag * weight)

    total_cost = cost_data.get("total_cost", 0.0) if cost_data else 0.0

    return {
        "peak_infected": peak_infected,
        "peak_infected_day": peak_infected_day,
        "total_cases": int(round(total_infected)),
        "overall_attack_rate": overall_attack_rate,
        "attack_rate_by_age": attack_rate_by_age,
        "peak_hospital_occupancy": peak_hospital_occupancy,
        "peak_hospital_day": peak_hospital_day,
        "hospital_bed_capacity": hospital_bed_capacity,
        "days_over_hospital_capacity": days_over_hosp,
        "peak_icu_occupancy": peak_icu_occupancy,
        "icu_capacity": icu_bed_capacity,
        "days_over_icu_capacity": days_over_icu,
        "total_deaths": total_deaths,
        "yll_proxy": float(round(yll_proxy, 1)),
        "total_cost": float(round(total_cost, 2)),
        "r0": float(round(simulation_output.get("target_r0", 2.5), 2)),
        "herd_immunity_threshold": float(round(simulation_output.get("herd_immunity_threshold", 0.6), 4))
    }
