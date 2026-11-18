export type UserRole = 'analyst' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  last_login?: string;
}

export interface AgeGroup {
  name: string;
  count: number;
  initial_immunity: number;
  hospitalisation_rate: number;
  icu_fraction: number;
  ifr: number;
}

export interface Population {
  id: string;
  name: string;
  description?: string;
  total_population: number;
  hospital_beds: number;
  icu_beds: number;
  age_groups: AgeGroup[];
  is_shared: boolean;
  owner_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Pathogen {
  id: string;
  name: string;
  description?: string;
  r0: number;
  latent_period_days: number;
  infectious_period_days: number;
  hospital_stay_days: number;
  asymptomatic_fraction: number;
  relative_infectiousness_asym: number;
  waning_immunity_days?: number;
  is_shared: boolean;
  owner_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactMatrix {
  id: string;
  name: string;
  description?: string;
  age_groups: string[];
  layers: Record<string, number[][]>;
  is_shared: boolean;
  owner_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Intervention {
  id: string;
  name: string;
  intervention_type: 'contact_reduction' | 'vaccination' | 'testing_isolation' | 'quarantine' | 'custom';
  description?: string;
  start_day: number;
  end_day: number;
  compliance: number;
  parameters: Record<string, any>;
  cost_per_day: number;
  cost_per_dose: number;
  is_shared: boolean;
  owner_id?: string;
  created_at: string;
  updated_at: string;
}

export interface StudioNodeData {
  id: string;
  type: 'population' | 'pathogen' | 'contacts' | 'intervention' | 'simulation' | 'outcome';
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface StudioEdgeData {
  id: string;
  source: string;
  target: string;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  population_id: string;
  pathogen_id: string;
  contact_matrix_id: string;
  intervention_ids: string[];
  engine: 'ode' | 'stochastic';
  horizon_days: number;
  seed: number;
  monte_carlo_runs: number;
  initial_infected_per_group?: number[];
  nodes?: StudioNodeData[];
  edges?: StudioEdgeData[];
  owner_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DailySnapshot {
  day: number;
  S: number;
  E: number;
  A: number;
  I: number;
  H: number;
  R: number;
  D: number;
  V: number;
  Rt: number;
  by_age: Record<string, {
    S: number;
    I: number;
    H: number;
    D: number;
    V: number;
  }>;
  // Stochastic percentile envelopes
  I_p5?: number;
  I_p95?: number;
  H_p5?: number;
  H_p95?: number;
  D_p5?: number;
  D_p95?: number;
}

export interface RunMetrics {
  peak_infected: number;
  peak_infected_day: number;
  total_cases: number;
  overall_attack_rate: number;
  attack_rate_by_age: Record<string, number>;
  peak_hospital_occupancy: number;
  peak_hospital_day: number;
  hospital_bed_capacity: number;
  days_over_hospital_capacity: number;
  peak_icu_occupancy: number;
  icu_capacity: number;
  days_over_icu_capacity: number;
  total_deaths: number;
  yll_proxy: number;
  total_cost: number;
  cost_per_death_averted?: number;
  deaths_averted_vs_baseline?: number;
  r0: number;
  herd_immunity_threshold: number;
}

export interface SimulationRun {
  id: string;
  scenario_id?: string;
  scenario_name?: string;
  owner_id?: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  engine: 'ode' | 'stochastic';
  horizon_days: number;
  seed: number;
  metrics?: RunMetrics;
  error?: string;
  created_at: string;
  completed_at?: string;
}

export interface ThresholdResult {
  success: boolean;
  threshold_value: number | null;
  achieved_metric: number | null;
  target_metric: string;
  target_value: number;
  parameter_to_vary: string;
  curve: Array<{ parameter: number; metric: number }>;
  plain_language_summary: string;
}

export interface SensitivitySpoke {
  param: string;
  correlation: number;
  abs_correlation: number;
  p_value: number;
  scatter: Array<{ x: number; y: number }>;
}

export interface SensitivityResult {
  target_metric: string;
  method: string;
  spokes: SensitivitySpoke[];
  most_influential: string[];
  plain_language_summary: string;
}

export interface CalibrationResult {
  fitted_q: number;
  implied_r0: number;
  reporting_fraction: number;
  rmse: number;
  fitted_curve: Array<{
    day: number;
    fitted_cases: number;
    observed_cases: number | null;
  }>;
  plain_language_summary: string;
}

export interface CSVPreview {
  dataset_type: string;
  filename: string;
  headers: string[];
  total_rows: number;
  suggested_mapping: Record<string, string>;
  preview_rows: Array<Record<string, any>>;
}

export interface CSVRowIssue {
  row_number: number;
  field: string;
  error: string;
  raw_value: any;
}

export interface CSVImportResult {
  success: boolean;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  issues: CSVRowIssue[];
  committed_id: string | null;
  preview_data?: any[];
}

export interface Brief {
  id: string;
  title: string;
  scenario_id?: string;
  run_id?: string;
  summary?: string;
  content_json: Record<string, any>;
  owner_id?: string;
  created_at: string;
  updated_at: string;
}
