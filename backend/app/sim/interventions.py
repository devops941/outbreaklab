from typing import Any, Dict, List, Optional, Tuple
import numpy as np

class InterventionManager:
    def __init__(
        self,
        base_layers: Dict[str, np.ndarray],
        interventions: List[Dict[str, Any]],
        age_group_counts: np.ndarray
    ):
        """
        base_layers: dict like {"home": matrix, "school": matrix, "work": matrix, "community": matrix}
        interventions: list of intervention dictionaries
        age_group_counts: vector N_i
        """
        self.base_layers = base_layers
        self.interventions = interventions
        self.N = age_group_counts
        self.G = len(age_group_counts)

    def get_event_days(self, max_horizon: int) -> List[float]:
        """
        Returns sorted list of discrete transition days where interventions start or end.
        """
        days = {0.0, float(max_horizon)}
        for inv in self.interventions:
            start = float(inv.get("start_day", 0))
            end = float(inv.get("end_day", max_horizon))
            if 0 <= start <= max_horizon:
                days.add(start)
            if 0 <= end <= max_horizon:
                days.add(end)
        return sorted(list(days))

    def get_contact_matrix_at_t(self, t: float) -> np.ndarray:
        """
        Computes overall contact matrix C(t) summing layers with active reductions.
        """
        active_reductions = {"home": 0.0, "school": 0.0, "work": 0.0, "community": 0.0}

        for inv in self.interventions:
            start = inv.get("start_day", 0)
            end = inv.get("end_day", 9999)
            if start <= t < end:
                compliance = float(inv.get("compliance", 1.0))
                itype = inv.get("intervention_type")
                params = inv.get("parameters", {})

                if itype == "contact_reduction":
                    layer_reds = params.get("layer_reductions", {})
                    for layer, red in layer_reds.items():
                        if layer in active_reductions:
                            active_reductions[layer] = max(
                                active_reductions[layer],
                                min(0.99, float(red) * compliance)
                            )
                elif itype == "quarantine":
                    # Quarantine can also apply a general reduction across community/work
                    comm_red = float(params.get("reduction", 0.3)) * compliance
                    active_reductions["community"] = max(active_reductions["community"], comm_red)

        total_C = np.zeros((self.G, self.G), dtype=float)
        for layer_name, layer_mat in self.base_layers.items():
            reduction = active_reductions.get(layer_name, 0.0)
            total_C += layer_mat * (1.0 - reduction)

        return total_C

    def get_vaccination_rate_at_t(self, t: float, current_S: np.ndarray, current_V: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Returns (nu_vector, efficacy) for time t.
        nu_i is the rate of individuals vaccinated per day in age group i.
        """
        nu = np.zeros(self.G, dtype=float)
        overall_efficacy = 0.85

        for inv in self.interventions:
            start = inv.get("start_day", 0)
            end = inv.get("end_day", 9999)
            if start <= t < end and inv.get("intervention_type") == "vaccination":
                compliance = float(inv.get("compliance", 1.0))
                params = inv.get("parameters", {})
                daily_doses = float(params.get("daily_doses", 0)) * compliance
                overall_efficacy = float(params.get("efficacy", 0.85))
                coverage_cap = float(params.get("coverage_cap", 0.85))
                priority_order = params.get("priority_order", list(range(self.G - 1, -1, -1)))

                remaining_doses = daily_doses
                for group_idx in priority_order:
                    if group_idx >= self.G or remaining_doses <= 0:
                        continue
                    group_N = self.N[group_idx]
                    already_vaccinated = current_V[group_idx]
                    max_allowed = group_N * coverage_cap

                    eligible_unvaccinated = max(0.0, min(current_S[group_idx], max_allowed - already_vaccinated))
                    if eligible_unvaccinated > 0:
                        alloc = min(remaining_doses, eligible_unvaccinated)
                        nu[group_idx] += alloc
                        remaining_doses -= alloc

        return nu, overall_efficacy

    def get_testing_isolation_factor_at_t(self, t: float) -> float:
        """
        Returns reduction factor for symptomatic individuals due to testing & rapid isolation.
        Default 1.0 (no reduction in symptomatic contact).
        If testing catches 40% and isolates them by 80%, factor = (1 - 0.4*0.8) = 0.68.
        """
        factor = 1.0
        for inv in self.interventions:
            start = inv.get("start_day", 0)
            end = inv.get("end_day", 9999)
            if start <= t < end and inv.get("intervention_type") == "testing_isolation":
                compliance = float(inv.get("compliance", 1.0))
                params = inv.get("parameters", {})
                detection_rate = float(params.get("detection_rate", 0.3)) * compliance
                isolation_reduction = float(params.get("isolation_reduction", 0.7))
                factor *= max(0.05, 1.0 - (detection_rate * isolation_reduction))
        return factor
