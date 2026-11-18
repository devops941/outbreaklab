import numpy as np
from scipy.optimize import brentq
from typing import Dict, Any, List, Optional
from app.sim.ode import run_ode_simulation
from app.sim.metrics import compute_outcome_metrics

def find_intervention_threshold(
    population: Dict[str, Any],
    pathogen: Dict[str, Any],
    contact_matrix: Dict[str, Any],
    base_interventions: List[Dict[str, Any]],
    target_metric: str, # "peak_hospital_occupancy" or "overall_attack_rate"
    target_value: float,
    parameter_to_vary: str = "contact_reduction",
    layer_name: str = "school",
    min_bound: float = 0.0,
    max_bound: float = 0.90,
    horizon_days: int = 150
) -> Dict[str, Any]:
    """
    Finds the exact minimum parameter strength to achieve target_metric <= target_value
    using bracketing and scipy.optimize.brentq.
    Generates an evaluation curve across the domain for plotting.
    """
    curve_points = []
    test_values = np.linspace(min_bound, max_bound, 9)

    def evaluate_strength(val: float) -> float:
        # Clone interventions and update the chosen parameter
        modified_invs = [dict(inv) for inv in base_interventions]

        if parameter_to_vary == "contact_reduction":
            # Add or update contact reduction on target layer
            found = False
            for inv in modified_invs:
                if inv.get("intervention_type") == "contact_reduction":
                    params = dict(inv.get("parameters", {}))
                    layer_reds = dict(params.get("layer_reductions", {}))
                    layer_reds[layer_name] = float(val)
                    params["layer_reductions"] = layer_reds
                    inv["parameters"] = params
                    found = True
                    break
            if not found:
                modified_invs.append({
                    "name": f"{layer_name.capitalize()} Reduction",
                    "intervention_type": "contact_reduction",
                    "start_day": 10,
                    "end_day": horizon_days,
                    "compliance": 0.9,
                    "parameters": {"layer_reductions": {layer_name: float(val)}}
                })

        elif parameter_to_vary == "vaccination_rate":
            for inv in modified_invs:
                if inv.get("intervention_type") == "vaccination":
                    params = dict(inv.get("parameters", {}))
                    params["daily_doses"] = float(val)
                    inv["parameters"] = params

        sim_res = run_ode_simulation(
            population=population,
            pathogen=pathogen,
            contact_matrix=contact_matrix,
            interventions=modified_invs,
            horizon_days=horizon_days
        )
        metrics = compute_outcome_metrics(population, sim_res)
        return float(metrics.get(target_metric, 0.0))

    # Pre-evaluate grid to build curve and check bracketing
    grid_metrics = []
    for val in test_values:
        m = evaluate_strength(float(val))
        grid_metrics.append(m)
        curve_points.append({"parameter": float(round(val, 3)), "metric": float(round(m, 1))})

    # For reductions, metric usually decreases as strength increases:
    # f(x) = evaluate_strength(x) - target_value
    val_low = min_bound
    metric_low = grid_metrics[0]
    val_high = max_bound
    metric_high = grid_metrics[-1]

    # Check feasibility
    # Target condition: metric <= target_value
    if metric_low <= target_value:
        # Already satisfied with 0 strength
        return {
            "success": True,
            "threshold_value": float(round(val_low, 3)),
            "achieved_metric": float(round(metric_low, 1)),
            "target_metric": target_metric,
            "target_value": target_value,
            "parameter_to_vary": parameter_to_vary,
            "curve": curve_points,
            "plain_language_summary": f"Target of {target_value} {target_metric} is already satisfied with zero additional intervention (achieved {round(metric_low, 1)})."
        }

    if metric_high > target_value:
        # Even with max strength, target cannot be met
        return {
            "success": False,
            "threshold_value": None,
            "achieved_metric": float(round(metric_high, 1)),
            "target_metric": target_metric,
            "target_value": target_value,
            "parameter_to_vary": parameter_to_vary,
            "curve": curve_points,
            "plain_language_summary": f"Unreachable goal within bounds [{min_bound:.0%}, {max_bound:.0%}]. Even at maximum {max_bound:.0%} strength, {target_metric} reaches {round(metric_high, 1)}, which exceeds the goal of {target_value}."
        }

    # Bracket found: metric_low > target_value and metric_high <= target_value
    # Find root using Brent's method
    def root_fn(x: float) -> float:
        return evaluate_strength(x) - target_value

    try:
        found_threshold = float(brentq(root_fn, val_low, val_high, xtol=1e-3, rtol=1e-3))
        achieved = evaluate_strength(found_threshold)
        pct_str = f"{found_threshold*100:.1f}%" if parameter_to_vary == "contact_reduction" else f"{found_threshold:.1f}"
        return {
            "success": True,
            "threshold_value": float(round(found_threshold, 4)),
            "achieved_metric": float(round(achieved, 1)),
            "target_metric": target_metric,
            "target_value": target_value,
            "parameter_to_vary": parameter_to_vary,
            "curve": curve_points,
            "plain_language_summary": f"A minimum {parameter_to_vary} of {pct_str} is required to keep {target_metric.replace('_', ' ')} under {target_value} (achieved: {round(achieved, 1)})."
        }
    except Exception as e:
        return {
            "success": False,
            "threshold_value": None,
            "achieved_metric": None,
            "target_metric": target_metric,
            "target_value": target_value,
            "parameter_to_vary": parameter_to_vary,
            "curve": curve_points,
            "plain_language_summary": f"Optimization could not converge: {str(e)}"
        }
