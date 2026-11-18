import numpy as np
from typing import Tuple, Dict, Any, List

# Indices for 8 compartments in state vector per age group
COMPARTMENT_NAMES = ["S", "E", "A", "I", "H", "R", "D", "V"]
NUM_COMPARTMENTS = len(COMPARTMENT_NAMES)

def unpack_state(y: np.ndarray, G: int) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Unpacks 1D state array of size (8*G) into (S, E, A, I, H, R, D, V) each of shape (G,).
    """
    S = y[0*G : 1*G]
    E = y[1*G : 2*G]
    A = y[2*G : 3*G]
    I = y[3*G : 4*G]
    H = y[4*G : 5*G]
    R = y[5*G : 6*G]
    D = y[6*G : 7*G]
    V = y[7*G : 8*G]
    return S, E, A, I, H, R, D, V

def pack_state(S: np.ndarray, E: np.ndarray, A: np.ndarray, I: np.ndarray, H: np.ndarray, R: np.ndarray, D: np.ndarray, V: np.ndarray) -> np.ndarray:
    return np.concatenate([S, E, A, I, H, R, D, V])

def derivatives(
    t: float,
    y: np.ndarray,
    G: int,
    N: np.ndarray,
    q: float,
    sigma: float,
    gamma: float,
    p_asym: float,
    rho: float,
    h_rates: np.ndarray,
    eta_rates: np.ndarray,
    mu_rates: np.ndarray,
    waning_rate: float,
    intervention_mgr
) -> np.ndarray:
    """
    Computes time derivatives dy/dt for the age-structured SEIR-H-D-V system.
    """
    S, E, A, I, H, R, D, V = unpack_state(y, G)

    # 1. Evaluate interventions at time t
    C_t = intervention_mgr.get_contact_matrix_at_t(t)
    nu_t, eff_t = intervention_mgr.get_vaccination_rate_at_t(t, S, V)
    iso_factor = intervention_mgr.get_testing_isolation_factor_at_t(t)

    # 2. Force of infection lambda_i for each group i:
    # lambda_i = q * sum_j [ C_ij(t) * ( iso_factor * I_j + rho * A_j ) / N_j ]
    effective_infectious_frac = (iso_factor * I + rho * A) / np.maximum(1.0, N)
    lambda_vec = q * np.dot(C_t, effective_infectious_frac)

    # Prevent negative values due to numerical precision
    S_safe = np.maximum(0.0, S)
    E_safe = np.maximum(0.0, E)
    A_safe = np.maximum(0.0, A)
    I_safe = np.maximum(0.0, I)
    H_safe = np.maximum(0.0, H)
    V_safe = np.maximum(0.0, V)

    # 3. Compartment rate of change
    # dS/dt = - lambda * S - nu * eff + waning * V (if waning)
    dS = - lambda_vec * S_safe - nu_t * eff_t + waning_rate * V_safe
    # dV/dt = nu * eff - waning * V
    dV = nu_t * eff_t - waning_rate * V_safe
    # dE/dt = lambda * (S + (1 - eff) * V) - sigma * E
    dE = lambda_vec * (S_safe + (1.0 - eff_t) * V_safe) - sigma * E_safe
    # dA/dt = p_asym * sigma * E - gamma * A
    dA = p_asym * sigma * E_safe - gamma * A_safe
    # dI/dt = (1 - p_asym) * sigma * E - (gamma + h) * I
    dI = (1.0 - p_asym) * sigma * E_safe - (gamma + h_rates) * I_safe
    # dH/dt = h * I - (eta + mu) * H
    dH = h_rates * I_safe - (eta_rates + mu_rates) * H_safe
    # dR/dt = gamma * (A + I) + eta * H
    dR = gamma * (A_safe + I_safe) + eta_rates * H_safe
    # dD/dt = mu * H
    dD = mu_rates * H_safe

    return pack_state(dS, dE, dA, dI, dH, dR, dD, dV)
