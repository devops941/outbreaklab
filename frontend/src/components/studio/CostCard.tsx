import React from 'react';
import { DollarSign, ShieldAlert, Award } from 'lucide-react';
import { useScenario } from '../../context/ScenarioContext';

export const CostCard: React.FC = () => {
  const { activeRun } = useScenario();

  if (!activeRun || !activeRun.metrics) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-text-3 font-mono text-xs">
        <p>No health-economic calculation available.</p>
      </div>
    );
  }

  const m = activeRun.metrics;
  const totalCost = m.total_cost || 0;
  const deathsAverted = m.deaths_averted_vs_baseline || 0;
  const costPerDeathAverted = m.cost_per_death_averted;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-surface-2 p-3.5 rounded-2xl border border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-text-3 uppercase tracking-wider">Total Scenario Cost</div>
            <div className="font-sora font-bold text-lg text-text">${totalCost.toLocaleString()}</div>
          </div>
        </div>

        {deathsAverted > 0 && (
          <div className="text-right">
            <div className="text-[11px] font-mono text-text-3 uppercase tracking-wider">Deaths Averted</div>
            <div className="font-sora font-bold text-lg text-emerald-600">+{deathsAverted.toLocaleString()}</div>
          </div>
        )}
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 bg-white rounded-xl border border-border">
          <div className="text-text-3 mb-1">Cost / Death Averted</div>
          <div className="font-bold text-sm text-primary">
            {costPerDeathAverted ? `$${costPerDeathAverted.toLocaleString()}` : 'Baseline / N/A'}
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-border">
          <div className="text-text-3 mb-1">Attack Rate</div>
          <div className="font-bold text-sm text-text">
            {(m.overall_attack_rate * 100).toFixed(1)}% of population
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-border">
          <div className="text-text-3 mb-1">Peak Day</div>
          <div className="font-bold text-sm text-text">Day {m.peak_infected_day}</div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-border">
          <div className="text-text-3 mb-1">Herd Immunity Ref</div>
          <div className="font-bold text-sm text-emerald-700">
            {(m.herd_immunity_threshold * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};
