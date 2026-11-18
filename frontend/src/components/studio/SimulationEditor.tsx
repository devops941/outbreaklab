import React from 'react';
import { Cpu, Dna } from 'lucide-react';
import { Scenario } from '../../types';

interface SimulationEditorProps {
  scenario: Scenario;
  onChange: (updated: Scenario) => void;
}

export const SimulationEditor: React.FC<SimulationEditorProps> = ({ scenario, onChange }) => {
  const update = (field: keyof Scenario, val: any) => {
    onChange({ ...scenario, [field]: val });
  };

  return (
    <div className="space-y-4">
      {/* Engine Selection */}
      <div className="space-y-1.5">
        <label className="text-xs font-sora font-semibold text-text block">Simulation Engine</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => update('engine', 'ode')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              scenario.engine === 'ode'
                ? 'bg-primary-soft border-primary text-primary shadow-xs'
                : 'bg-surface-2 border-border text-text hover:border-primary/40'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4 text-primary" />
              <span className="font-sora font-bold text-xs">Deterministic ODE</span>
            </div>
            <p className="text-[10px] text-text-3 leading-tight">SciPy LSODA piecewise integration. Fast & exact.</p>
          </button>

          <button
            type="button"
            onClick={() => update('engine', 'stochastic')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              scenario.engine === 'stochastic'
                ? 'bg-primary-soft border-primary text-primary shadow-xs'
                : 'bg-surface-2 border-border text-text hover:border-primary/40'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Dna className="w-4 h-4 text-signal" />
              <span className="font-sora font-bold text-xs">Monte Carlo</span>
            </div>
            <p className="text-[10px] text-text-3 leading-tight">Daily binomial transitions & 5/95 percentile bands.</p>
          </button>
        </div>
      </div>

      {/* Horizon Days */}
      <div className="bg-surface-2/60 p-3 rounded-xl border border-border/50">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-sora font-semibold text-text">Simulation Horizon</span>
          <span className="font-mono font-bold text-xs text-primary">{scenario.horizon_days} days</span>
        </div>
        <input
          type="range"
          min={30}
          max={365}
          step={15}
          value={scenario.horizon_days}
          onChange={(e) => update('horizon_days', parseInt(e.target.value) || 180)}
          className="w-full accent-primary h-1.5 bg-border rounded-lg"
        />
      </div>

      {/* Seed and Monte Carlo Runs */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="bg-surface-2/60 p-2.5 rounded-xl border border-border/50">
          <label className="text-[10px] text-text-3 block mb-1">RNG Seed</label>
          <input
            type="number"
            value={scenario.seed}
            onChange={(e) => update('seed', parseInt(e.target.value) || 42)}
            className="w-full px-2 py-1 text-xs rounded-lg border border-border bg-white"
          />
        </div>

        {scenario.engine === 'stochastic' && (
          <div className="bg-surface-2/60 p-2.5 rounded-xl border border-border/50">
            <label className="text-[10px] text-text-3 block mb-1">MC Ensembles</label>
            <input
              type="number"
              min={10}
              max={1000}
              step={10}
              value={scenario.monte_carlo_runs || 100}
              onChange={(e) => update('monte_carlo_runs', parseInt(e.target.value) || 100)}
              className="w-full px-2 py-1 text-xs rounded-lg border border-border bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
};
