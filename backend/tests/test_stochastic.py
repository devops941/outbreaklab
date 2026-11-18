import numpy as np
import pytest
from app.sim.stochastic import run_stochastic_simulation
from app.sim.thresholds import find_intervention_threshold

@pytest.fixture
def sample_setup():
    population = {
        "total_population": 5000,
        "hospital_beds": 50,
        "icu_beds": 10,
        "age_groups": [
            {"name": "General", "count": 5000, "initial_immunity": 0.0, "hospitalisation_rate": 0.03, "ifr": 0.003}
        ]
    }
    pathogen = {
        "r0": 2.2,
        "latent_period_days": 3.0,
        "infectious_period_days": 5.0,
        "hospital_stay_days": 8.0,
        "asymptomatic_fraction": 0.3,
        "relative_infectiousness_asym": 0.5,
        "waning_immunity_days": 0.0
    }
    contact_matrix = {
        "age_groups": ["General"],
        "layers": {
            "community": [[8.0]]
        }
    }
    return population, pathogen, contact_matrix

def test_stochastic_seed_reproducibility(sample_setup):
    pop, path, mat = sample_setup
    seed = 12345

    res1 = run_stochastic_simulation(pop, path, mat, interventions=[], horizon_days=40, mc_runs=20, seed=seed)
    res2 = run_stochastic_simulation(pop, path, mat, interventions=[], horizon_days=40, mc_runs=20, seed=seed)

    d1 = [d["I"] for d in res1["daily_results"]]
    d2 = [d["I"] for d in res2["daily_results"]]

    assert np.allclose(d1, d2), "Stochastic Monte Carlo runs with same seed must be strictly identical"

def test_threshold_finding_convergence(sample_setup):
    pop, path, mat = sample_setup
    # Target: keep peak hospital occupancy under 30 beds
    target_beds = 30.0

    res = find_intervention_threshold(
        population=pop,
        pathogen=path,
        contact_matrix=mat,
        base_interventions=[],
        target_metric="peak_hospital_occupancy",
        target_value=target_beds,
        parameter_to_vary="contact_reduction",
        layer_name="community",
        min_bound=0.0,
        max_bound=0.90,
        horizon_days=60
    )

    if res["success"]:
        assert res["threshold_value"] is not None
        assert res["achieved_metric"] <= target_beds + 2.0
    else:
        assert "Unreachable" in res["plain_language_summary"]
