import numpy as np
from scipy import linalg
from typing import Dict, List, Tuple

def compute_next_generation_matrix(
    C: np.ndarray,
    p_asym: float,
    rho: float,
    gamma: float,
    h_rates: np.ndarray,
    q: float = 1.0
) -> np.ndarray:
    """
    Computes Next-Generation Matrix K_ij = q * C_ij * (rho * p_asym / gamma + (1 - p_asym) / (gamma + h_i))
    where:
    - C is the age-by-age contact matrix (C_ij = average contacts in group j made by an individual in group i)
    - p_asym is fraction of infections that are asymptomatic
    - rho is relative infectiousness of asymptomatic vs symptomatic
    - gamma is recovery rate (1 / infectious_period_days)
    - h_rates is hospitalisation rate vector by age group
    - q is transmissibility per contact
    """
    G = C.shape[0]
    K = np.zeros((G, G), dtype=float)
    for i in range(G):
        h_i = h_rates[i] if i < len(h_rates) else 0.0
        # Average duration of infectiousness weighted by symptom state
        infectious_weight = (rho * p_asym / gamma) + ((1.0 - p_asym) / (gamma + h_i))
        for j in range(G):
            K[i, j] = q * C[i, j] * infectious_weight
    return K

def compute_spectral_radius(K: np.ndarray) -> float:
    """
    Computes spectral radius (dominant eigenvalue magnitude) of matrix K using scipy.linalg.eigvals.
    """
    eigenvalues = linalg.eigvals(K)
    return float(np.max(np.abs(np.real(eigenvalues))))

def calibrate_q_for_r0(
    target_r0: float,
    C: np.ndarray,
    p_asym: float,
    rho: float,
    gamma: float,
    h_rates: np.ndarray
) -> float:
    """
    Calibrates transmissibility scaling factor q such that spectral_radius(K) == target_r0.
    For unit q=1.0, K_unit has spectral radius R0_unit.
    Then q = target_r0 / R0_unit.
    """
    K_unit = compute_next_generation_matrix(C, p_asym, rho, gamma, h_rates, q=1.0)
    r0_unit = compute_spectral_radius(K_unit)
    if r0_unit <= 1e-12:
        return 0.0
    return float(target_r0 / r0_unit)

def compute_rt_series(
    time_points: np.ndarray,
    S_series: np.ndarray, # shape (T, G)
    V_series: np.ndarray, # shape (T, G)
    N_vector: np.ndarray, # shape (G,)
    C_at_t_func,
    q: float,
    p_asym: float,
    rho: float,
    gamma: float,
    h_rates: np.ndarray,
    vaccine_efficacy: float = 0.85
) -> np.ndarray:
    """
    Computes Rt (effective reproduction number) at each time point by scaling
    the next generation matrix by the fraction of susceptibles (and leaky vaccinated)
    and current contact matrix.
    """
    T = len(time_points)
    G = len(N_vector)
    rt_values = np.zeros(T, dtype=float)

    for idx, t in enumerate(time_points):
        C_t = C_at_t_func(t)
        K_t = np.zeros((G, G), dtype=float)
        for i in range(G):
            h_i = h_rates[i] if i < len(h_rates) else 0.0
            infectious_weight = (rho * p_asym / gamma) + ((1.0 - p_asym) / (gamma + h_i))
            susc_frac = (S_series[idx, i] + (1.0 - vaccine_efficacy) * V_series[idx, i]) / max(1.0, N_vector[i])
            susc_frac = max(0.0, min(1.0, susc_frac))
            for j in range(G):
                K_t[i, j] = q * C_t[i, j] * susc_frac * infectious_weight

        rt_values[idx] = compute_spectral_radius(K_t)

    return rt_values

def herd_immunity_threshold(r0: float) -> float:
    """
    Homogeneous reference herd immunity threshold: 1 - 1 / R0
    """
    if r0 <= 1.0:
        return 0.0
    return float(1.0 - (1.0 / r0))
