import numpy as np
from scipy.stats import qmc, spearmanr
from typing import Dict, Any, List
from app.sim.ode import run_ode_simulation
from app.sim.metrics import compute_outcome_metrics

PARAM_BOUNDS = {
    "R0": (1.2, 4.0),
    "latent_period_days": (1.5, 6.0),
    "infectious_period_days": (3.0, 10.0),
    "asymptomatic_fraction": (0.1, 0.6),
    "hospital_stay_days": (4.0, 14.0),
    "compliance": (0.4, 0.95),
}

def run_sensitivity_analysis(
    population: Dict[str, Any],
    base_pathogen: Dict[str, Any],
    contact_matrix: Dict[str, Any],
    base_interventions: List[Dict[str, Any]],
    target_metric: str = "total_deaths",
    method: str = "latin_hypercube",
    samples: int = 60,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Executes Global Latin Hypercube Sensitivity analysis or Tornado One-At-A-Time.
    Returns parameter correlation coefficients and scatter points for visual spokes.
    """
    param_names = list(PARAM_BOUNDS.keys())
    d = len(param_names)

    # Latin Hypercube Sampling
    sampler = qmc.LatinHypercube(d=d, seed=seed)
    unit_samples = sampler.random(n=samples)

    scaled_samples = np.zeros_like(unit_samples)
    for j, p in enumerate(param_names):
        low, high = PARAM_BOUNDS[p]
        scaled_samples[:, j] = low + unit_samples[:, j] * (high - low)

    metric_values = np.zeros(samples)

    for i in range(samples):
        # Build modified pathogen & interventions
        mod_pathogen = dict(base_pathogen)
        mod_pathogen["r0"] = float(scaled_samples[i, 0])
        mod_pathogen["latent_period_days"] = float(scaled_samples[i, 1])
        mod_pathogen["infectious_period_days"] = float(scaled_samples[i, 2])
        mod_pathogen["asymptomatic_fraction"] = float(scaled_samples[i, 3])
        mod_pathogen["hospital_stay_days"] = float(scaled_samples[i, 4])

        mod_invs = [dict(inv) for inv in base_interventions]
        for inv in mod_invs:
            inv["compliance"] = float(scaled_samples[i, 5])

        res = run_ode_simulation(
            population=population,
            pathogen=mod_pathogen,
            contact_matrix=contact_matrix,
            interventions=mod_invs,
            horizon_days=120
        )
        metrics = compute_outcome_metrics(population, res)
        metric_values[i] = float(metrics.get(target_metric, 0.0))

    # Compute Spearman rank correlations
    spokes = []
    for j, p in enumerate(param_names):
        corr_res = spearmanr(scaled_samples[:, j], metric_values)
        corr = float(corr_res.statistic) if not np.isnan(corr_res.statistic) else 0.0
        pval = float(corr_res.pvalue) if not np.isnan(corr_res.pvalue) else 1.0

        # Create 15 downsampled scatter points for UI visualization
        step = max(1, samples // 15)
        scatter_pts = [
            {"x": float(round(scaled_samples[k, j], 3)), "y": float(round(metric_values[k], 1))}
            for k in range(0, samples, step)
        ]

        spokes.append({
            "param": p,
            "correlation": float(round(corr, 3)),
            "abs_correlation": abs(float(round(corr, 3))),
            "p_value": float(round(pval, 4)),
            "scatter": scatter_pts
        })

    # Sort spokes descending by absolute correlation
    spokes.sort(key=lambda s: s["abs_correlation"], reverse=True)
    most_influential = [s["param"] for s in spokes[:2]]

    summary = (
        f"Sensitivity analysis indicates that {spokes[0]['param']} (r = {spokes[0]['correlation']:+.2f}) "
        f"and {spokes[1]['param']} (r = {spokes[1]['correlation']:+.2f}) are the primary drivers of {target_metric.replace('_', ' ')}."
    )

    return {
        "target_metric": target_metric,
        "method": method,
        "spokes": spokes,
        "most_influential": most_influential,
        "plain_language_summary": summary
    }
