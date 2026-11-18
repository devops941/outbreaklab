import numpy as np
from scipy.integrate import solve_ivp
from typing import Dict, Any, List, Optional
from app.sim.model import unpack_state, pack_state, derivatives, COMPARTMENT_NAMES
from app.sim.r0 import calibrate_q_for_r0, compute_rt_series, herd_immunity_threshold
from app.sim.interventions import InterventionManager

def run_ode_simulation(
    population: Dict[str, Any],
    pathogen: Dict[str, Any],
    contact_matrix: Dict[str, Any],
    interventions: List[Dict[str, Any]],
    horizon_days: int = 180,
    initial_infected: Optional[List[int]] = None
) -> Dict[str, Any]:
    """
    Executes age-structured deterministic ODE simulation using scipy.integrate.solve_ivp.
    Handles intervention switching events seamlessly.
    """
    age_groups = population.get("age_groups", [])
    G = len(age_groups)
    N_vector = np.array([float(ag.get("count", 0)) for ag in age_groups], dtype=float)
    total_N = float(np.sum(N_vector))

    # Pathogen rates
    sigma = 1.0 / max(0.1, float(pathogen.get("latent_period_days", 3.0)))
    gamma = 1.0 / max(0.1, float(pathogen.get("infectious_period_days", 5.0)))
    p_asym = float(pathogen.get("asymptomatic_fraction", 0.3))
    rho = float(pathogen.get("relative_infectiousness_asym", 0.5))
    hospital_stay = max(0.5, float(pathogen.get("hospital_stay_days", 8.0)))
    waning_days = float(pathogen.get("waning_immunity_days", 0.0) or 0.0)
    waning_rate = (1.0 / waning_days) if waning_days > 0 else 0.0

    # Age-specific clinical rates
    h_rates = np.zeros(G, dtype=float)
    eta_rates = np.zeros(G, dtype=float)
    mu_rates = np.zeros(G, dtype=float)

    for i, ag in enumerate(age_groups):
        hosp_rate_fraction = float(ag.get("hospitalisation_rate", 0.03))
        # Rate of hospitalisation from symptomatic state I
        h_rates[i] = hosp_rate_fraction * gamma
        # In hospital: stay duration = 1 / (eta + mu)
        total_exit_rate = 1.0 / hospital_stay
        ifr = float(ag.get("ifr", 0.005))
        death_fraction_in_hosp = min(0.95, ifr / max(1e-4, hosp_rate_fraction))
        mu_rates[i] = total_exit_rate * death_fraction_in_hosp
        eta_rates[i] = total_exit_rate * (1.0 - death_fraction_in_hosp)

    # Base contact layers
    raw_layers = contact_matrix.get("layers", {})
    base_layers = {
        layer_name: np.array(mat, dtype=float)
        for layer_name, mat in raw_layers.items()
    }
    # If no layers specified, fallback to single total matrix
    if not base_layers:
        base_layers = {"community": np.ones((G, G), dtype=float) * 2.0}

    # Sum baseline contact matrix C_base for R0 calibration
    C_base = sum(base_layers.values())

    target_r0 = float(pathogen.get("r0", 2.5))
    q = calibrate_q_for_r0(target_r0, C_base, p_asym, rho, gamma, h_rates)

    # Intervention manager
    inv_mgr = InterventionManager(base_layers, interventions, N_vector)
    event_days = inv_mgr.get_event_days(horizon_days)

    # Initial condition setup
    if not initial_infected or len(initial_infected) != G:
        # Default: 10 infectious cases in active young-adult age group (e.g. index 2 or 0)
        initial_infected = [0] * G
        seed_group = min(2, G - 1)
        initial_infected[seed_group] = max(5, int(N_vector[seed_group] * 0.0005))

    I0 = np.array(initial_infected, dtype=float)
    E0 = I0 * 1.5
    A0 = I0 * 0.5
    H0 = np.zeros(G, dtype=float)
    R0_state = np.zeros(G, dtype=float)
    D0 = np.zeros(G, dtype=float)
    V0 = np.zeros(G, dtype=float)

    # Initial immunity fraction if configured in population
    for i, ag in enumerate(age_groups):
        init_imm = float(ag.get("initial_immunity", 0.0))
        if init_imm > 0:
            imm_count = N_vector[i] * init_imm
            R0_state[i] = imm_count

    S0 = np.maximum(0.0, N_vector - (E0 + A0 + I0 + H0 + R0_state + D0 + V0))
    y_current = pack_state(S0, E0, A0, I0, H0, R0_state, D0, V0)

    # Piecewise integration over intervals [t_k, t_{k+1}]
    all_t = []
    all_y = []

    for k in range(len(event_days) - 1):
        t_start = event_days[k]
        t_end = event_days[k + 1]
        if t_start >= t_end:
            continue

        t_eval = np.linspace(t_start, t_end, int(np.ceil(t_end - t_start)) + 1)
        # Avoid duplicate endpoints
        if all_t:
            t_eval = t_eval[1:]

        sol = solve_ivp(
            fun=lambda t, y: derivatives(
                t, y, G, N_vector, q, sigma, gamma, p_asym, rho,
                h_rates, eta_rates, mu_rates, waning_rate, inv_mgr
            ),
            t_span=(t_start, t_end),
            y0=y_current,
            t_eval=t_eval,
            method="LSODA",
            rtol=1e-5,
            atol=1e-5
        )

        all_t.extend(sol.t.tolist())
        for col_idx in range(sol.y.shape[1]):
            all_y.append(sol.y[:, col_idx])
        y_current = sol.y[:, -1]

    time_array = np.array(all_t)
    # y_matrix shape: (T, 8*G)
    y_matrix = np.array(all_y)
    T = len(time_array)

    # Reshape by compartment: series_by_compartment[comp_name] has shape (T, G)
    series_by_comp: Dict[str, np.ndarray] = {}
    for c_idx, c_name in enumerate(COMPARTMENT_NAMES):
        series_by_comp[c_name] = y_matrix[:, c_idx*G : (c_idx+1)*G]

    # Calculate Rt over time
    rt_series = compute_rt_series(
        time_points=time_array,
        S_series=series_by_comp["S"],
        V_series=series_by_comp["V"],
        N_vector=N_vector,
        C_at_t_func=inv_mgr.get_contact_matrix_at_t,
        q=q,
        p_asym=p_asym,
        rho=rho,
        gamma=gamma,
        h_rates=h_rates
    )

    # Package output time series as daily snapshots
    daily_results = []
    for step in range(T):
        day_val = int(round(time_array[step]))
        day_dict = {
            "day": day_val,
            "S": float(np.sum(series_by_comp["S"][step])),
            "E": float(np.sum(series_by_comp["E"][step])),
            "A": float(np.sum(series_by_comp["A"][step])),
            "I": float(np.sum(series_by_comp["I"][step])),
            "H": float(np.sum(series_by_comp["H"][step])),
            "R": float(np.sum(series_by_comp["R"][step])),
            "D": float(np.sum(series_by_comp["D"][step])),
            "V": float(np.sum(series_by_comp["V"][step])),
            "Rt": float(rt_series[step]),
            "by_age": {}
        }
        for i, ag in enumerate(age_groups):
            ag_name = ag.get("name", f"Group_{i}")
            day_dict["by_age"][ag_name] = {
                "S": float(series_by_comp["S"][step, i]),
                "I": float(series_by_comp["I"][step, i]),
                "H": float(series_by_comp["H"][step, i]),
                "D": float(series_by_comp["D"][step, i]),
                "V": float(series_by_comp["V"][step, i]),
            }
        daily_results.append(day_dict)

    return {
        "days": time_array.tolist(),
        "daily_results": daily_results,
        "series_by_comp": {k: v.tolist() for k, v in series_by_comp.items()},
        "rt_series": rt_series.tolist(),
        "q": q,
        "target_r0": target_r0,
        "herd_immunity_threshold": herd_immunity_threshold(target_r0)
    }
