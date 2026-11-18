import numpy as np
from typing import Dict, Any, List, Optional
from app.sim.r0 import calibrate_q_for_r0, herd_immunity_threshold
from app.sim.interventions import InterventionManager

def run_stochastic_simulation(
    population: Dict[str, Any],
    pathogen: Dict[str, Any],
    contact_matrix: Dict[str, Any],
    interventions: List[Dict[str, Any]],
    horizon_days: int = 180,
    mc_runs: int = 100,
    seed: int = 42,
    initial_infected: Optional[List[int]] = None
) -> Dict[str, Any]:
    """
    Executes age-structured stochastic Monte Carlo simulation using daily binomial transitions.
    Computes 5th, 50th (median), and 95th percentile trajectories.
    """
    rng = np.random.default_rng(seed)

    age_groups = population.get("age_groups", [])
    G = len(age_groups)
    N_vector = np.array([float(ag.get("count", 0)) for ag in age_groups], dtype=float)
    total_N = float(np.sum(N_vector))
    hospital_beds = int(population.get("hospital_beds", 100))

    # Pathogen parameters
    sigma = 1.0 / max(0.1, float(pathogen.get("latent_period_days", 3.0)))
    gamma = 1.0 / max(0.1, float(pathogen.get("infectious_period_days", 5.0)))
    p_asym = float(pathogen.get("asymptomatic_fraction", 0.3))
    rho = float(pathogen.get("relative_infectiousness_asym", 0.5))
    hospital_stay = max(0.5, float(pathogen.get("hospital_stay_days", 8.0)))
    waning_days = float(pathogen.get("waning_immunity_days", 0.0) or 0.0)
    waning_prob = (1.0 - np.exp(-1.0 / waning_days)) if waning_days > 0 else 0.0

    # Age-specific clinical rates
    h_rates = np.zeros(G, dtype=float)
    eta_rates = np.zeros(G, dtype=float)
    mu_rates = np.zeros(G, dtype=float)

    for i, ag in enumerate(age_groups):
        hosp_rate_fraction = float(ag.get("hospitalisation_rate", 0.03))
        h_rates[i] = hosp_rate_fraction * gamma
        total_exit_rate = 1.0 / hospital_stay
        ifr = float(ag.get("ifr", 0.005))
        death_fraction = min(0.95, ifr / max(1e-4, hosp_rate_fraction))
        mu_rates[i] = total_exit_rate * death_fraction
        eta_rates[i] = total_exit_rate * (1.0 - death_fraction)

    # Base contact layers
    raw_layers = contact_matrix.get("layers", {})
    base_layers = {layer: np.array(mat, dtype=float) for layer, mat in raw_layers.items()}
    if not base_layers:
        base_layers = {"community": np.ones((G, G), dtype=float) * 2.0}
    C_base = sum(base_layers.values())

    target_r0 = float(pathogen.get("r0", 2.5))
    q = calibrate_q_for_r0(target_r0, C_base, p_asym, rho, gamma, h_rates)

    inv_mgr = InterventionManager(base_layers, interventions, N_vector)

    if not initial_infected or len(initial_infected) != G:
        initial_infected = [0] * G
        seed_group = min(2, G - 1)
        initial_infected[seed_group] = max(5, int(N_vector[seed_group] * 0.0005))

    init_I = np.array(initial_infected, dtype=int)
    init_E = (init_I * 1.5).astype(int)
    init_A = (init_I * 0.5).astype(int)
    init_R = np.zeros(G, dtype=int)
    for i, ag in enumerate(age_groups):
        imm = float(ag.get("initial_immunity", 0.0))
        if imm > 0:
            init_R[i] = int(N_vector[i] * imm)

    init_S = np.maximum(0, N_vector.astype(int) - (init_E + init_A + init_I + init_R))

    # Storage across MC runs: arrays of shape (mc_runs, horizon_days)
    all_I = np.zeros((mc_runs, horizon_days), dtype=float)
    all_H = np.zeros((mc_runs, horizon_days), dtype=float)
    all_D = np.zeros((mc_runs, horizon_days), dtype=float)
    all_S = np.zeros((mc_runs, horizon_days), dtype=float)

    extinction_count = 0
    exceed_capacity_count = 0

    p_E_to_next = 1.0 - np.exp(-sigma)
    p_A_to_R = 1.0 - np.exp(-gamma)

    for run_idx in range(mc_runs):
        S = init_S.copy()
        E = init_E.copy()
        A = init_A.copy()
        I = init_I.copy()
        H = np.zeros(G, dtype=int)
        R = init_R.copy()
        D = np.zeros(G, dtype=int)
        V = np.zeros(G, dtype=int)

        run_peak_H = 0

        for day in range(horizon_days):
            t = float(day)
            C_t = inv_mgr.get_contact_matrix_at_t(t)
            nu_t, eff_t = inv_mgr.get_vaccination_rate_at_t(t, S.astype(float), V.astype(float))
            iso_factor = inv_mgr.get_testing_isolation_factor_at_t(t)

            # Record state
            all_S[run_idx, day] = np.sum(S)
            all_I[run_idx, day] = np.sum(I)
            all_H[run_idx, day] = np.sum(H)
            all_D[run_idx, day] = np.sum(D)
            run_peak_H = max(run_peak_H, np.sum(H))

            # Force of infection
            eff_inf = (iso_factor * I.astype(float) + rho * A.astype(float)) / np.maximum(1.0, N_vector)
            lambda_vec = q * np.dot(C_t, eff_inf)
            p_inf = 1.0 - np.exp(-np.maximum(0.0, lambda_vec))

            # S -> E and V -> E
            new_E_from_S = rng.binomial(S, p_inf)
            p_inf_V = 1.0 - np.exp(-np.maximum(0.0, lambda_vec * (1.0 - eff_t)))
            new_E_from_V = rng.binomial(V, p_inf_V)

            # Vaccination: S -> V
            daily_vacc = np.minimum(S - new_E_from_S, nu_t.astype(int))
            new_V = rng.binomial(daily_vacc, eff_t)

            # E -> A or I
            e_progressing = rng.binomial(E, p_E_to_next)
            new_A = rng.binomial(e_progressing, p_asym)
            new_I = e_progressing - new_A

            # A -> R
            new_R_from_A = rng.binomial(A, p_A_to_R)

            # I -> H or R
            p_I_exit = 1.0 - np.exp(-(gamma + h_rates))
            i_exiting = rng.binomial(I, p_I_exit)
            # Fraction going to hospital vs recovering
            frac_to_H = h_rates / np.maximum(1e-6, (gamma + h_rates))
            new_H = rng.binomial(i_exiting, frac_to_H)
            new_R_from_I = i_exiting - new_H

            # H -> D or R
            p_H_exit = 1.0 - np.exp(-(eta_rates + mu_rates))
            h_exiting = rng.binomial(H, p_H_exit)
            frac_to_D = mu_rates / np.maximum(1e-6, (eta_rates + mu_rates))
            new_D = rng.binomial(h_exiting, frac_to_D)
            new_R_from_H = h_exiting - new_D

            # Waning immunity: V -> S
            waning_V = rng.binomial(V, waning_prob) if waning_prob > 0 else 0

            # State updates
            S = np.maximum(0, S - new_E_from_S - new_V + waning_V)
            V = np.maximum(0, V + new_V - new_E_from_V - waning_V)
            E = np.maximum(0, E + new_E_from_S + new_E_from_V - e_progressing)
            A = np.maximum(0, A + new_A - new_R_from_A)
            I = np.maximum(0, I + new_I - i_exiting)
            H = np.maximum(0, H + new_H - h_exiting)
            R = R + new_R_from_A + new_R_from_I + new_R_from_H
            D = D + new_D

        # Check extinction condition (less than 2% attack rate)
        final_cases = total_N - np.sum(S) - np.sum(V)
        if final_cases < max(20, total_N * 0.02):
            extinction_count += 1

        if run_peak_H > hospital_beds:
            exceed_capacity_count += 1

    # Compute percentiles across runs (5th, 50th, 95th)
    p5_I = np.percentile(all_I, 5, axis=0)
    p50_I = np.percentile(all_I, 50, axis=0)
    p95_I = np.percentile(all_I, 95, axis=0)

    p5_H = np.percentile(all_H, 5, axis=0)
    p50_H = np.percentile(all_H, 50, axis=0)
    p95_H = np.percentile(all_H, 95, axis=0)

    p5_D = np.percentile(all_D, 5, axis=0)
    p50_D = np.percentile(all_D, 50, axis=0)
    p95_D = np.percentile(all_D, 95, axis=0)

    daily_results = []
    for day in range(horizon_days):
        daily_results.append({
            "day": day,
            "I": float(p50_I[day]),
            "I_p5": float(p5_I[day]),
            "I_p95": float(p95_I[day]),
            "H": float(p50_H[day]),
            "H_p5": float(p5_H[day]),
            "H_p95": float(p95_H[day]),
            "D": float(p50_D[day]),
            "D_p5": float(p5_D[day]),
            "D_p95": float(p95_D[day]),
            "S": float(np.percentile(all_S, 50, axis=0)[day]),
            "Rt": 1.0,
            "by_age": {}
        })

    prob_extinction = float(round(extinction_count / mc_runs, 4))
    prob_exceed_capacity = float(round(exceed_capacity_count / mc_runs, 4))

    return {
        "days": list(range(horizon_days)),
        "daily_results": daily_results,
        "prob_extinction": prob_extinction,
        "prob_major_outbreak": round(1.0 - prob_extinction, 4),
        "prob_exceed_capacity": prob_exceed_capacity,
        "mc_runs": mc_runs,
        "target_r0": target_r0,
        "herd_immunity_threshold": herd_immunity_threshold(target_r0)
    }
