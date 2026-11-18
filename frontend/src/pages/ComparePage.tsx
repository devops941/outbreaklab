import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Award, TrendingDown, ArrowDownRight, ArrowUpRight, CheckCircle2, Shield } from 'lucide-react';
import { api } from '../api/client';
import { SimulationRun } from '../types';

export const ComparePage: React.FC = () => {
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [baselineId, setBaselineId] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [rankingMetric, setRankingMetric] = useState<string>('total_deaths');

  useEffect(() => {
    api.getRuns().then((allRuns) => {
      const completed = allRuns.filter((r) => r.status === 'completed' && r.metrics);
      setRuns(completed);
      if (completed.length > 0) {
        setBaselineId(completed[0].id);
        const others = completed.map((r) => r.id);
        api.compareRuns(completed[0].id, others).then((res) => {
          setComparisonResult(res);
        });
      }
    });
  }, []);

  const handleBaselineChange = (newBaselineId: string) => {
    setBaselineId(newBaselineId);
    const others = runs.map((r) => r.id);
    api.compareRuns(newBaselineId, others).then((res) => {
      setComparisonResult(res);
    });
  };

  const metricPills = [
    { id: 'total_deaths', label: 'Fewest Deaths' },
    { id: 'peak_hospital_occupancy', label: 'Lowest Bed Peak' },
    { id: 'overall_attack_rate', label: 'Lowest Attack Rate' },
    { id: 'total_cost', label: 'Lowest Cost' },
  ];

  const sortedLeaderboard = comparisonResult?.ranked_leaderboard
    ? [...comparisonResult.ranked_leaderboard].sort((a: any, b: any) => {
        if (rankingMetric === 'total_deaths') return a.metrics.total_deaths - b.metrics.total_deaths;
        if (rankingMetric === 'peak_hospital_occupancy') return a.metrics.peak_hospital_occupancy - b.metrics.peak_hospital_occupancy;
        if (rankingMetric === 'overall_attack_rate') return a.metrics.overall_attack_rate - b.metrics.overall_attack_rate;
        if (rankingMetric === 'total_cost') return a.metrics.total_cost - b.metrics.total_cost;
        return 0;
      })
    : [];

  const paretoPoints = (comparisonResult?.pareto_frontier || []).map((p: any) => ({
    name: p.scenario_name,
    cost: p.cost,
    deaths_averted: p.deaths_averted,
  }));

  return (
    <div className="max-w-7xl mx-auto pt-8 pb-32 px-6">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h1 className="font-sora text-2xl font-bold text-text">Scenario Comparison & Pareto Frontier</h1>
          </div>
          <p className="text-xs font-mono text-text-3 mt-1">
            Compare public health policy trade-offs • Highlight non-dominated Pareto efficient strategies
          </p>
        </div>

        {/* Baseline Selector */}
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-border shadow-xs">
          <span className="text-xs font-mono text-text-3">Baseline:</span>
          <select
            value={baselineId}
            onChange={(e) => handleBaselineChange(e.target.value)}
            className="text-xs font-sora font-semibold text-text bg-transparent focus:outline-none"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.scenario_name || r.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 40% (5 cols): Leaderboard */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-border shadow-soft space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-sora font-bold text-base text-text">Scenario Leaderboard</h3>
            <span className="text-xs font-mono text-text-3">{sortedLeaderboard.length} Scenarios</span>
          </div>

          {/* Metric Pill Selector */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-surface-2 rounded-2xl border border-border">
            {metricPills.map((m) => (
              <button
                key={m.id}
                onClick={() => setRankingMetric(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                  rankingMetric === m.id
                    ? 'bg-primary text-white font-semibold shadow-xs'
                    : 'text-text-3 hover:text-text'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Leaderboard List */}
          <div className="space-y-3">
            {sortedLeaderboard.map((item: any, idx: number) => {
              const deltaDeaths = item.delta_vs_baseline?.delta_deaths || 0;
              const averted = item.delta_vs_baseline?.deaths_averted || 0;
              const isBaseline = item.run_id === baselineId;

              return (
                <div
                  key={item.run_id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isBaseline
                      ? 'bg-surface-2/60 border-primary/40'
                      : item.is_pareto_optimal
                      ? 'bg-emerald-50/40 border-emerald-300'
                      : 'bg-white border-border hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono font-bold text-xs w-5 h-5 rounded-full bg-surface-2 flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="font-sora font-semibold text-xs text-text truncate">
                        {item.scenario_name}
                      </h4>
                    </div>
                    {item.is_pareto_optimal && (
                      <span className="shrink-0 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        PARETO
                      </span>
                    )}
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1">
                    <div>
                      <span className="text-text-3 block text-[10px]">Deaths</span>
                      <span className="font-bold text-text">{item.metrics.total_deaths.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-text-3 block text-[10px]">Peak Hosp</span>
                      <span className="font-bold text-text">{item.metrics.peak_hospital_occupancy} beds</span>
                    </div>
                    <div>
                      <span className="text-text-3 block text-[10px]">Cost</span>
                      <span className="font-bold text-text">${item.metrics.total_cost.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Delta Chip */}
                  {!isBaseline && (
                    <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-text-3">Vs Baseline:</span>
                      {deltaDeaths < 0 ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          {Math.abs(deltaDeaths)} Deaths Averted
                        </span>
                      ) : (
                        <span className="text-text-3">Equal Deaths</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 60% (7 cols): Pareto Frontier Scatter */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-border shadow-soft space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-sora font-bold text-base text-text">Pareto Frontier Analysis</h3>
              <p className="text-xs font-mono text-text-3 mt-0.5">
                Economic Cost ($) vs Lives Saved (Deaths Averted). Non-dominated choices yield maximum impact per dollar.
              </p>
            </div>
          </div>

          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <XAxis
                  type="number"
                  dataKey="cost"
                  name="Cost"
                  stroke="#DDD6EE"
                  tick={{ fill: '#8479A3', fontSize: 10 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  label={{ value: 'Total Cost ($)', position: 'insideBottom', offset: -10, fill: '#8479A3', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="deaths_averted"
                  name="Deaths Averted"
                  stroke="#DDD6EE"
                  tick={{ fill: '#8479A3', fontSize: 10 }}
                  label={{ value: 'Deaths Averted (Lives Saved)', angle: -90, position: 'insideLeft', fill: '#8479A3', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white p-3 rounded-2xl border border-border shadow-elevated text-xs font-mono">
                        <div className="font-sora font-bold text-text mb-1">{d.name}</div>
                        <div>Cost: ${d.cost?.toLocaleString()}</div>
                        <div className="text-emerald-600 font-bold">Deaths Averted: +{d.deaths_averted}</div>
                      </div>
                    );
                  }}
                />
                <Scatter name="Scenarios" data={paretoPoints} fill="#5B21B6">
                  {paretoPoints.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill="#059669" />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="p-4 rounded-2xl bg-surface-2 border border-border flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <span className="text-text font-medium">Pareto Optimal Frontier Highlighted</span>
            </div>
            <span className="text-text-3">Dominating Strategies</span>
          </div>
        </div>
      </div>
    </div>
  );
};
