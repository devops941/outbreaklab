import {
  User, Population, Pathogen, ContactMatrix, Intervention, Scenario,
  SimulationRun, DailySnapshot, ThresholdResult, SensitivityResult,
  CalibrationResult, CSVPreview, CSVImportResult, Brief
} from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('outbreaklab_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers = { ...this.getHeaders(), ...options.headers };
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let errorMsg = `API request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorMsg;
      } catch {
        // ignore json parse error
      }
      throw new Error(errorMsg);
    }

    if (response.status === 204) {
      return {} as T;
    }
    return response.json();
  }

  // Auth Endpoints
  async register(data: { email: string; password: string; full_name: string; role?: string }) {
    return this.request<{ access_token: string; refresh_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }) {
    return this.request<{ access_token: string; refresh_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('outbreaklab_token');
      localStorage.removeItem('outbreaklab_refresh');
    }
  }

  // Populations
  async getPopulations(): Promise<Population[]> {
    return this.request<Population[]>('/populations');
  }

  async createPopulation(pop: Partial<Population>): Promise<Population> {
    return this.request<Population>('/populations', {
      method: 'POST',
      body: JSON.stringify(pop),
    });
  }

  async updatePopulation(id: string, pop: Partial<Population>): Promise<Population> {
    return this.request<Population>(`/populations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pop),
    });
  }

  async deletePopulation(id: string): Promise<void> {
    return this.request(`/populations/${id}`, { method: 'DELETE' });
  }

  // Pathogens
  async getPathogens(): Promise<Pathogen[]> {
    return this.request<Pathogen[]>('/pathogens');
  }

  async createPathogen(pathogen: Partial<Pathogen>): Promise<Pathogen> {
    return this.request<Pathogen>('/pathogens', {
      method: 'POST',
      body: JSON.stringify(pathogen),
    });
  }

  async updatePathogen(id: string, pathogen: Partial<Pathogen>): Promise<Pathogen> {
    return this.request<Pathogen>(`/pathogens/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pathogen),
    });
  }

  async deletePathogen(id: string): Promise<void> {
    return this.request(`/pathogens/${id}`, { method: 'DELETE' });
  }

  // Contact Matrices
  async getContactMatrices(): Promise<ContactMatrix[]> {
    return this.request<ContactMatrix[]>('/contact-matrices');
  }

  async createContactMatrix(mat: Partial<ContactMatrix>): Promise<ContactMatrix> {
    return this.request<ContactMatrix>('/contact-matrices', {
      method: 'POST',
      body: JSON.stringify(mat),
    });
  }

  async updateContactMatrix(id: string, mat: Partial<ContactMatrix>): Promise<ContactMatrix> {
    return this.request<ContactMatrix>(`/contact-matrices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(mat),
    });
  }

  async balanceContactMatrix(id: string, population_id?: string): Promise<{ message: string; layers: Record<string, number[][]> }> {
    return this.request(`/contact-matrices/${id}/balance`, {
      method: 'POST',
      body: JSON.stringify({ population_id }),
    });
  }

  async deleteContactMatrix(id: string): Promise<void> {
    return this.request(`/contact-matrices/${id}`, { method: 'DELETE' });
  }

  // Interventions
  async getInterventions(): Promise<Intervention[]> {
    return this.request<Intervention[]>('/interventions');
  }

  async createIntervention(inv: Partial<Intervention>): Promise<Intervention> {
    return this.request<Intervention>('/interventions', {
      method: 'POST',
      body: JSON.stringify(inv),
    });
  }

  async updateIntervention(id: string, inv: Partial<Intervention>): Promise<Intervention> {
    return this.request<Intervention>(`/interventions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(inv),
    });
  }

  async deleteIntervention(id: string): Promise<void> {
    return this.request(`/interventions/${id}`, { method: 'DELETE' });
  }

  // Scenarios
  async getScenarios(): Promise<Scenario[]> {
    return this.request<Scenario[]>('/scenarios');
  }

  async getScenario(id: string): Promise<Scenario> {
    return this.request<Scenario>(`/scenarios/${id}`);
  }

  async createScenario(scen: Partial<Scenario>): Promise<Scenario> {
    return this.request<Scenario>('/scenarios', {
      method: 'POST',
      body: JSON.stringify(scen),
    });
  }

  async updateScenario(id: string, scen: Partial<Scenario>): Promise<Scenario> {
    return this.request<Scenario>(`/scenarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(scen),
    });
  }

  async duplicateScenario(id: string): Promise<Scenario> {
    return this.request<Scenario>(`/scenarios/${id}/duplicate`, { method: 'POST' });
  }

  async deleteScenario(id: string): Promise<void> {
    return this.request(`/scenarios/${id}`, { method: 'DELETE' });
  }

  // Simulation Runs
  async simulate(params: {
    scenario_id?: string;
    population_id?: string;
    pathogen_id?: string;
    contact_matrix_id?: string;
    intervention_ids?: string[];
    engine?: 'ode' | 'stochastic';
    horizon_days?: number;
    seed?: number;
    monte_carlo_runs?: number;
  }): Promise<SimulationRun> {
    return this.request<SimulationRun>('/simulate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getRuns(scenario_id?: string): Promise<SimulationRun[]> {
    const query = scenario_id ? `?scenario_id=${scenario_id}` : '';
    return this.request<SimulationRun[]>(`/runs${query}`);
  }

  async getRun(id: string): Promise<SimulationRun> {
    return this.request<SimulationRun>(`/runs/${id}`);
  }

  async getRunSeries(id: string): Promise<{
    days: number[];
    daily_results: DailySnapshot[];
    rt_series: number[];
  }> {
    return this.request(`/runs/${id}/series`);
  }

  async previewR0(params: { pathogen_id: string; contact_matrix_id: string; population_id?: string }) {
    const qs = new URLSearchParams(params as any).toString();
    return this.request<{ target_r0: number; calibrated_q: number; spectral_radius_r0: number; herd_immunity_threshold: number }>(`/r0?${qs}`);
  }

  // Comparison
  async compareRuns(baseline_run_id: string, comparison_run_ids: string[]) {
    return this.request<{
      baseline_run_id: string;
      ranked_leaderboard: Array<{
        run_id: string;
        scenario_name: string;
        engine: string;
        metrics: any;
        delta_vs_baseline: Record<string, number>;
        is_pareto_optimal: boolean;
      }>;
      pareto_frontier: Array<any>;
    }>('/compare', {
      method: 'POST',
      body: JSON.stringify({ baseline_run_id, comparison_run_ids }),
    });
  }

  // Thresholds
  async findThreshold(data: {
    scenario_id: string;
    target_metric: string;
    target_value: number;
    parameter_to_vary: string;
    layer_name?: string;
    min_bound?: number;
    max_bound?: number;
  }): Promise<ThresholdResult> {
    return this.request<ThresholdResult>('/thresholds', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Sensitivity
  async runSensitivity(data: {
    scenario_id: string;
    target_metric: string;
    method?: string;
    samples?: number;
  }): Promise<SensitivityResult> {
    return this.request<SensitivityResult>('/sensitivity', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Calibration
  async calibrate(data: {
    scenario_id: string;
    case_reports: Array<{ day: number; reported_cases: number; reported_deaths?: number; hospital_admissions?: number }>;
    days_to_fit?: number;
  }): Promise<CalibrationResult> {
    return this.request<CalibrationResult>('/calibrate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // CSV Import
  async previewCSV(data: { dataset_type: string; file_content: string; filename?: string }): Promise<CSVPreview> {
    return this.request<CSVPreview>('/import/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadCSVFile(dataset_type: string, file: File): Promise<CSVPreview> {
    const formData = new FormData();
    formData.append('dataset_type', dataset_type);
    formData.append('file', file);

    const token = localStorage.getItem('outbreaklab_token');
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/import/file-upload`, {
      method: 'POST',
      body: formData,
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'File upload failed');
    }
    return res.json();
  }

  async commitImport(data: {
    dataset_type: string;
    column_mapping: Record<string, string>;
    raw_data: Array<Record<string, any>>;
    auto_balance_matrix?: boolean;
  }): Promise<CSVImportResult> {
    return this.request<CSVImportResult>('/import/commit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Briefs
  async getBriefs(): Promise<Brief[]> {
    return this.request<Brief[]>('/briefs');
  }

  async getBrief(id: string): Promise<Brief> {
    return this.request<Brief>(`/briefs/${id}`);
  }

  async createBrief(brief: Partial<Brief>): Promise<Brief> {
    return this.request<Brief>('/briefs', {
      method: 'POST',
      body: JSON.stringify(brief),
    });
  }

  async updateBrief(id: string, brief: Partial<Brief>): Promise<Brief> {
    return this.request<Brief>(`/briefs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(brief),
    });
  }

  async deleteBrief(id: string): Promise<void> {
    return this.request(`/briefs/${id}`, { method: 'DELETE' });
  }

  // Admin
  async getAdminSystem() {
    return this.request<{
      status: string;
      mongodb_connected: boolean;
      database_name: string;
      uptime_seconds: number;
      counts: Record<string, number>;
      environment: string;
    }>('/admin/system');
  }

  async getAdminUsers(): Promise<User[]> {
    return this.request<User[]>('/admin/users');
  }

  async getAdminAudit(limit: number = 100): Promise<Array<any>> {
    return this.request(`/admin/audit?limit=${limit}`);
  }

  async updateAdminUserRole(user_id: string, role: string) {
    return this.request(`/admin/users/${user_id}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }
}

export const api = new ApiClient();
