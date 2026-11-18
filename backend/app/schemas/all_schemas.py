from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, model_validator

# ----------------- AUTH SCHEMAS -----------------
class UserCreate(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    role: str = Field(default="analyst", pattern="^(analyst|admin)$")

class UserLogin(BaseModel):
    email: str = Field(..., min_length=3)
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    created_at: str
    last_login: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

# ----------------- POPULATION SCHEMAS -----------------
class AgeGroupData(BaseModel):
    name: str # e.g. "0-4", "5-17", "18-49", "50-64", "65+"
    count: int = Field(..., ge=0)
    initial_immunity: float = Field(default=0.0, ge=0.0, le=1.0)
    hospitalisation_rate: float = Field(default=0.02, ge=0.0, le=1.0)
    icu_fraction: float = Field(default=0.2, ge=0.0, le=1.0)
    ifr: float = Field(default=0.005, ge=0.0, le=1.0)

class PopulationCreate(BaseModel):
    name: str = Field(..., min_length=2)
    description: Optional[str] = ""
    total_population: int = Field(..., gt=0)
    hospital_beds: int = Field(..., ge=0)
    icu_beds: int = Field(..., ge=0)
    age_groups: List[AgeGroupData]
    is_shared: bool = False

    @model_validator(mode="after")
    def validate_sum(self):
        computed_sum = sum(ag.count for ag in self.age_groups)
        if abs(computed_sum - self.total_population) > max(5, self.total_population * 0.001):
            raise ValueError(f"Sum of age group counts ({computed_sum}) must match total_population ({self.total_population}).")
        return self

class PopulationOut(PopulationCreate):
    id: str
    owner_id: Optional[str] = None
    created_at: str
    updated_at: str

# ----------------- PATHOGEN SCHEMAS -----------------
class PathogenCreate(BaseModel):
    name: str = Field(..., min_length=2)
    description: Optional[str] = ""
    r0: float = Field(..., ge=0.5, le=20.0, description="Basic reproduction number")
    latent_period_days: float = Field(..., gt=0.1, le=30.0) # 1 / sigma
    infectious_period_days: float = Field(..., gt=0.1, le=30.0) # 1 / gamma
    hospital_stay_days: float = Field(default=8.0, gt=0.5, le=60.0) # 1 / eta
    asymptomatic_fraction: float = Field(default=0.3, ge=0.0, le=0.99) # p_asym
    relative_infectiousness_asym: float = Field(default=0.5, ge=0.0, le=2.0) # rho
    waning_immunity_days: Optional[float] = Field(default=0.0, ge=0.0) # 0 = no waning
    is_shared: bool = False

class PathogenOut(PathogenCreate):
    id: str
    owner_id: Optional[str] = None
    created_at: str
    updated_at: str

# ----------------- CONTACT MATRIX SCHEMAS -----------------
class ContactMatrixCreate(BaseModel):
    name: str = Field(..., min_length=2)
    description: Optional[str] = ""
    age_groups: List[str] # ["0-4", "5-17", "18-49", "50-64", "65+"]
    layers: Dict[str, List[List[float]]] # {"home": [...], "school": [...], "work": [...], "community": [...]}
    is_shared: bool = False

    @model_validator(mode="after")
    def validate_layers(self):
        size = len(self.age_groups)
        for layer_name, mat in self.layers.items():
            if len(mat) != size:
                raise ValueError(f"Layer '{layer_name}' row count ({len(mat)}) must equal number of age groups ({size}).")
            for row in mat:
                if len(row) != size:
                    raise ValueError(f"Layer '{layer_name}' column count must equal number of age groups ({size}).")
                for cell in row:
                    if cell < 0:
                        raise ValueError(f"Contact matrix cell values cannot be negative.")
        return self

class ContactMatrixOut(ContactMatrixCreate):
    id: str
    owner_id: Optional[str] = None
    created_at: str
    updated_at: str

# ----------------- INTERVENTION SCHEMAS -----------------
class InterventionCreate(BaseModel):
    name: str = Field(..., min_length=2)
    intervention_type: str = Field(..., pattern="^(contact_reduction|vaccination|testing_isolation|quarantine|custom)$")
    description: Optional[str] = ""
    start_day: int = Field(..., ge=0)
    end_day: int = Field(..., ge=1)
    compliance: float = Field(default=0.8, ge=0.0, le=1.0)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    # Examples of parameters:
    # contact_reduction: {"layer_reductions": {"school": 0.7, "work": 0.5, "community": 0.4}}
    # vaccination: {"daily_doses": 500, "efficacy": 0.85, "priority_order": [4, 3, 2, 1, 0], "coverage_cap": 0.8}
    # testing_isolation: {"detection_rate": 0.4, "isolation_reduction": 0.8, "delay_days": 1}
    cost_per_day: float = Field(default=0.0, ge=0.0)
    cost_per_dose: float = Field(default=0.0, ge=0.0)
    is_shared: bool = False

    @model_validator(mode="after")
    def check_dates(self):
        if self.start_day >= self.end_day:
            raise ValueError("start_day must be less than end_day.")
        return self

class InterventionOut(InterventionCreate):
    id: str
    owner_id: Optional[str] = None
    created_at: str
    updated_at: str

# ----------------- SCENARIO SCHEMAS -----------------
class StudioNode(BaseModel):
    id: str
    type: str # population, pathogen, contacts, intervention, simulation, outcome
    position: Dict[str, float]
    data: Dict[str, Any]

class StudioEdge(BaseModel):
    id: str
    source: str
    target: str

class ScenarioCreate(BaseModel):
    name: str = Field(..., min_length=2)
    description: Optional[str] = ""
    population_id: str
    pathogen_id: str
    contact_matrix_id: str
    intervention_ids: List[str] = Field(default_factory=list)
    engine: str = Field(default="ode", pattern="^(ode|stochastic)$")
    horizon_days: int = Field(default=180, ge=10, le=730)
    seed: int = Field(default=42)
    monte_carlo_runs: int = Field(default=100, ge=10, le=5000)
    initial_infected_per_group: List[int] = Field(default_factory=list)
    nodes: Optional[List[StudioNode]] = None
    edges: Optional[List[StudioEdge]] = None

class ScenarioOut(ScenarioCreate):
    id: str
    owner_id: Optional[str] = None
    created_at: str
    updated_at: str

# ----------------- SIMULATION & RUN SCHEMAS -----------------
class SimulateRequest(BaseModel):
    scenario_id: Optional[str] = None
    # Can also pass inline configuration
    population_id: Optional[str] = None
    pathogen_id: Optional[str] = None
    contact_matrix_id: Optional[str] = None
    intervention_ids: Optional[List[str]] = None
    engine: str = "ode"
    horizon_days: int = 180
    seed: int = 42
    monte_carlo_runs: int = 100
    initial_infected_per_group: Optional[List[int]] = None

class RunMetrics(BaseModel):
    peak_infected: int
    peak_infected_day: int
    total_cases: int
    overall_attack_rate: float
    attack_rate_by_age: Dict[str, float]
    peak_hospital_occupancy: int
    peak_hospital_day: int
    hospital_bed_capacity: int
    days_over_hospital_capacity: int
    peak_icu_occupancy: int
    icu_capacity: int
    days_over_icu_capacity: int
    total_deaths: int
    yll_proxy: float
    total_cost: float
    cost_per_death_averted: Optional[float] = None
    deaths_averted_vs_baseline: Optional[int] = None
    r0: float
    herd_immunity_threshold: float

class RunOut(BaseModel):
    id: str
    scenario_id: Optional[str] = None
    owner_id: Optional[str] = None
    status: str # queued, running, completed, failed, cancelled
    progress: float # 0.0 - 1.0
    engine: str
    horizon_days: int
    seed: int
    metrics: Optional[RunMetrics] = None
    error: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None

# ----------------- THRESHOLD & SENSITIVITY SCHEMAS -----------------
class ThresholdRequest(BaseModel):
    scenario_id: str
    target_metric: str = "peak_hospital_occupancy" # peak_hospital_occupancy, overall_attack_rate
    target_value: float
    parameter_to_vary: str = "contact_reduction" # contact_reduction, vaccination_rate, start_day
    layer_name: Optional[str] = "school"
    min_bound: float = 0.0
    max_bound: float = 0.95

class ThresholdOut(BaseModel):
    success: bool
    threshold_value: Optional[float]
    achieved_metric: Optional[float]
    target_metric: str
    target_value: float
    parameter_to_vary: str
    curve: List[Dict[str, float]] # [{"parameter": 0.1, "metric": 1500}, ...]
    plain_language_summary: str

class SensitivityRequest(BaseModel):
    scenario_id: str
    target_metric: str = "total_deaths" # total_deaths, peak_hospital_occupancy, overall_attack_rate
    method: str = "latin_hypercube" # one_at_a_time, latin_hypercube
    samples: int = Field(default=100, ge=20, le=1000)

class SensitivityOut(BaseModel):
    target_metric: str
    method: str
    spokes: List[Dict[str, Any]] # [{"param": "R0", "correlation": 0.82, "p_value": 0.001, "scatter": [...]}]
    most_influential: List[str]
    plain_language_summary: str

# ----------------- CALIBRATION SCHEMAS -----------------
class CaseReportItem(BaseModel):
    day: int
    reported_cases: int
    reported_deaths: Optional[int] = 0
    hospital_admissions: Optional[int] = 0

class CalibrationRequest(BaseModel):
    scenario_id: str
    case_reports: List[CaseReportItem]
    days_to_fit: int = 60

class CalibrationOut(BaseModel):
    fitted_q: float
    implied_r0: float
    reporting_fraction: float
    rmse: float
    fitted_curve: List[Dict[str, Any]]
    plain_language_summary: str

# ----------------- COMPARISON SCHEMAS -----------------
class CompareRequest(BaseModel):
    baseline_run_id: str
    comparison_run_ids: List[str]

class ScenarioComparisonItem(BaseModel):
    run_id: str
    scenario_name: str
    engine: str
    metrics: RunMetrics
    delta_vs_baseline: Dict[str, float]
    is_pareto_optimal: bool

class CompareOut(BaseModel):
    baseline_run_id: str
    ranked_leaderboard: List[ScenarioComparisonItem]
    pareto_frontier: List[Dict[str, Any]]

# ----------------- CSV IMPORT SCHEMAS -----------------
class CSVImportPreviewRequest(BaseModel):
    dataset_type: str # populations, pathogens, contact_matrices, case_reports
    file_content: str # Raw CSV text
    filename: Optional[str] = "upload.csv"

class CSVColumnMapping(BaseModel):
    dataset_type: str
    column_mapping: Dict[str, str] # {target_field: source_column}
    raw_data: List[Dict[str, Any]]
    auto_balance_matrix: bool = False

class CSVRowIssue(BaseModel):
    row_number: int
    field: str
    error: str
    raw_value: Any

class CSVImportResult(BaseModel):
    success: bool
    total_rows: int
    valid_rows: int
    invalid_rows: int
    issues: List[CSVRowIssue]
    committed_id: Optional[str] = None
    preview_data: Optional[List[Dict[str, Any]]] = None

# ----------------- BRIEFS & REPORTS SCHEMAS -----------------
class BriefCreate(BaseModel):
    title: str = Field(..., min_length=2)
    scenario_id: Optional[str] = None
    run_id: Optional[str] = None
    content_json: Dict[str, Any] = Field(default_factory=dict)
    summary: Optional[str] = ""

class BriefOut(BriefCreate):
    id: str
    owner_id: Optional[str] = None
    created_at: str
    updated_at: str
