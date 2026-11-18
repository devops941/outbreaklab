import React from 'react';
import { AlertTriangle, BookOpen, CheckCircle, ShieldAlert } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto pt-8 pb-32 px-6">
      {/* Educational Disclaimer Banner */}
      <div className="mb-8 p-6 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
        <div className="flex items-center gap-2 font-sora font-bold text-base text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Crucial Educational & Analytical Notice</span>
        </div>
        <p className="text-xs font-sans leading-relaxed">
          OutbreakLab is an academic scenario exploration and policy workshop platform engineered strictly for infectious disease preparedness education and countermeasure comparison. All trajectories, pathogen archetypes, and metrics represent <strong>hypothetical simulation scenarios</strong> and are <strong>NOT real-time epidemiological forecasts or individual risk predictions</strong>.
        </p>
      </div>

      <div className="bg-white p-8 sm:p-12 rounded-3xl border border-border shadow-soft space-y-10">
        {/* Title */}
        <div className="border-b border-border pb-6">
          <h1 className="font-sora text-3xl font-bold text-text">Mathematical Methodology & Assumptions</h1>
          <p className="text-xs font-mono text-text-3 mt-1">
            Deterministic SEIR-H-D-V System Dynamics, Next-Generation Matrix Spectral Calibration & Monte Carlo
          </p>
        </div>

        {/* Section 1: Compartmental Equations */}
        <div className="space-y-4">
          <h2 className="font-sora text-xl font-bold text-text">1. Age-Structured SEIR-H-D-V Model</h2>
          <p className="text-sm font-sans text-text-2 leading-relaxed">
            The deterministic engine simulates an age-stratified population across 8 distinct clinical compartments for each demographic group <code className="bg-surface-2 px-1.5 py-0.5 rounded text-xs font-mono">i = 1..G</code>:
          </p>
          <div className="bg-surface-2 p-5 rounded-2xl border border-border font-mono text-xs text-text space-y-2 overflow-x-auto">
            <div>λ_i(t) = q · Σ_j C_ij(t) · [ I_j(t) + ρ · A_j(t) ] / N_j  (Force of Infection)</div>
            <div>dS_i/dt = - λ_i S_i - ν_i(t) · eff + ω · V_i</div>
            <div>dV_i/dt = ν_i(t) · eff - ω · V_i</div>
            <div>dE_i/dt = λ_i · [ S_i + (1 - eff) · V_i ] - σ · E_i</div>
            <div>dA_i/dt = p_asym · σ · E_i - γ · A_i</div>
            <div>dI_i/dt = (1 - p_asym) · σ · E_i - (γ + h_i) · I_i</div>
            <div>dH_i/dt = h_i · I_i - (η_i + μ_i) · H_i</div>
            <div>dR_i/dt = γ · (A_i + I_i) + η_i · H_i</div>
            <div>dD_i/dt = μ_i · H_i</div>
          </div>
        </div>

        {/* Section 2: R0 & Spectral Radius */}
        <div className="space-y-4">
          <h2 className="font-sora text-xl font-bold text-text">2. Next-Generation Matrix & Target R0</h2>
          <p className="text-sm font-sans text-text-2 leading-relaxed">
            To ensure scientific validity, the transmissibility scaling parameter <code className="bg-surface-2 px-1.5 py-0.5 rounded text-xs font-mono">q</code> is automatically calibrated against the Next-Generation Matrix:
          </p>
          <div className="bg-surface-2 p-5 rounded-2xl border border-border font-mono text-xs text-text space-y-1 overflow-x-auto">
            <div>K_ij = q · C_ij · [ (ρ · p_asym / γ) + ((1 - p_asym) / (γ + h_i)) ]</div>
            <div>R0 = spectral_radius(K) = max(|Re(λ_k)|)</div>
            <div>q = target_R0 / spectral_radius(K_unit)</div>
          </div>
          <p className="text-xs font-sans text-text-3">
            In homogeneous conditions with G=1, this mathematically simplifies to the classic Kermack-McKendrick relation R0 = β / γ.
          </p>
        </div>

        {/* Section 3: Monte Carlo Ensembles */}
        <div className="space-y-4">
          <h2 className="font-sora text-xl font-bold text-text">3. Stochastic Ensembles</h2>
          <p className="text-sm font-sans text-text-2 leading-relaxed">
            The Monte Carlo simulator applies daily binomial random draws per age bracket to capture early stochastic fade-out / extinction versus epidemic take-off, providing 5th, median (50th), and 95th percentile confidence bands.
          </p>
        </div>

        {/* Section 4: 2026 Atlas Violet Design Tokens */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h2 className="font-sora text-xl font-bold text-text">4. Atlas Violet Design Architecture</h2>
          <p className="text-sm font-sans text-text-2 leading-relaxed">
            OutbreakLab adheres strictly to modern 2026 user interface guidelines with high visual hierarchy, clean light mode surfaces, and <strong>zero generic blue palettes</strong>:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-primary text-white font-bold">Royal Violet (#5B21B6)</div>
            <div className="p-3 rounded-xl bg-signal text-white font-bold">Signal Pink (#F0489B)</div>
            <div className="p-3 rounded-xl bg-emerald-600 text-white font-bold">Emerald Jade (#059669)</div>
            <div className="p-3 rounded-xl bg-comp-i text-white font-bold">Infected Crimson (#E11D48)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
