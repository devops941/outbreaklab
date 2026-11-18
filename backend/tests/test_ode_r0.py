import numpy as np
import pytest
from app.sim.model import unpack_state
from app.sim.r0 import calibrate_q_for_r0, compute_next_generation_matrix, compute_spectral_radius, herd_immunity_threshold
from app.sim.ode import run_ode_simulation
from app.sim.metrics import compute_outcome_metrics

@pytest.fixture
def sample_setup():
    population = {
        "total_population": 10000,
        "hospital_beds": 100,
        "icu_beds": 20,
        "age_groups": [
            {"name": "Youth", "count": 3000, "initial_immunity": 0.0, "hospitalisation_rate": 0.01, "ifr": 0.0002},
            {"name": "Adult", "count": 5000, "initial_immunity": 0.0, "hospitalisation_rate": 0.03, "ifr": 0.002},
            {"name": "Senior", "count": 2000, "initial_immunity": 0.0, "hospitalisation_rate": 0.15, "ifr": 0.03}
        ]
    }
    pathogen = {
        "r0": 2.5,
        "latent_period_days": 3.0,
        "infectious_period_days": 5.0,
        "hospital_stay_days": 8.0,
        "asymptomatic_fraction": 0.3,
        "relative_infectiousness_asym": 0.5,
        "waning_immunity_days": 0.0
    }
    contact_matrix = {
        "age_groups": ["Youth", "Adult", "Senior"],
        "layers": {
            "community": [
                [3.0, 1.5, 0.5],
                [1.5, 4.0, 1.2],
                [0.5, 1.2, 2.0]
            ]
        }
    }
    return population, pathogen, contact_matrix

def test_population_conservation(sample_setup):
    pop, path, mat = sample_setup
    total_N = pop["total_population"]

    res = run_ode_simulation(
        population=pop,
        pathogen=path,
        contact_matrix=mat,
        interventions=[],
        horizon_days=60
    )

    daily = res["daily_results"]
    for d in daily:
        total_in_day = d["S"] + d["E"] + d["A"] + d["I"] + d["H"] + d["R"] + d["D"] + d["V"]
        assert np.isclose(total_in_day, total_N, rtol=1e-3), f"Population not conserved on day {d['day']}: {total_in_day} != {total_N}"

def test_r0_calibration_accuracy(sample_setup):
    pop, path, mat = sample_setup
    target_r0 = 2.8
    path["r0"] = target_r0

    C_base = np.array(mat["layers"]["community"])
    p_asym = path["asymptomatic_fraction"]
    rho = path["relative_infectiousness_asym"]
    gamma = 1.0 / path["infectious_period_days"]
    h_rates = np.array([0.01 * gamma, 0.03 * gamma, 0.15 * gamma])

    q = calibrate_q_for_r0(target_r0, C_base, p_asym, rho, gamma, h_rates)
    K = compute_next_generation_matrix(C_base, p_asym, rho, gamma, h_rates, q=q)
    computed_r0 = compute_spectral_radius(K)

    assert np.isclose(computed_r0, target_r0, rtol=1e-4)

def test_subcritical_r0_decay(sample_setup):
    pop, path, mat = sample_setup
    path["r0"] = 0.7 # Subcritical R0 < 1.0

    res = run_ode_simulation(
        population=pop,
        pathogen=path,
        contact_matrix=mat,
        interventions=[],
        horizon_days=60,
        initial_infected=[5, 5, 5]
    )

    metrics = compute_outcome_metrics(pop, res)
    # Attack rate should remain negligible (< 1%) when R0 < 1
    assert metrics["overall_attack_rate"] < 0.015

def test_monotonic_intervention_efficacy(sample_setup):
    pop, path, mat = sample_setup
    # Baseline
    res_base = run_ode_simulation(pop, path, mat, interventions=[], horizon_days=90)
    m_base = compute_outcome_metrics(pop, res_base)

    # Mild intervention
    mild_inv = [{
        "intervention_type": "contact_reduction",
        "start_day": 10,
        "end_day": 90,
        "compliance": 0.8,
        "parameters": {"layer_reductions": {"community": 0.25}}
    }]
    res_mild = run_ode_simulation(pop, path, mat, interventions=mild_inv, horizon_days=90)
    m_mild = compute_outcome_metrics(pop, res_mild)

    # Strong intervention
    strong_inv = [{
        "intervention_type": "contact_reduction",
        "start_day": 10,
        "end_day": 90,
        "compliance": 0.8,
        "parameters": {"layer_reductions": {"community": 0.65}}
    }]
    res_strong = run_ode_simulation(pop, path, mat, interventions=strong_inv, horizon_days=90)
    m_strong = compute_outcome_metrics(pop, res_strong)

    # Stronger intervention should produce strictly fewer deaths and lower peak hospital occupancy
    assert m_base["total_deaths"] >= m_mild["total_deaths"]
    assert m_mild["total_deaths"] >= m_strong["total_deaths"]
    assert m_base["peak_hospital_occupancy"] >= m_mild["peak_hospital_occupancy"]
    assert m_mild["peak_hospital_occupancy"] >= m_strong["peak_hospital_occupancy"]
