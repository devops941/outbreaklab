import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Sliders, HelpCircle, Activity, Sparkles, X } from 'lucide-react';
import { api } from '../api/client';
import { Scenario, SensitivityResult, SensitivitySpoke } from '../types';

export const SensitivityPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [targetMetric, setTargetMetric] = useState<string>('total_deaths');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SensitivityResult | null>(null);
  const [activeSpoke, setActiveSpoke] = useState<SensitivitySpoke | null>(null);
  const [viewMode, setViewMode] = useState<'ring' | 'bars'>('ring');

  useEffect(() => {
    api.getScenarios().then((list) => {
      setScenarios(list);
      if (list.length > 0) {
        setSelectedScenarioId(list[0].id);
        handleRun(list[0].id);
      }
    });
  }, []);

  const handleRun = async (scenId?: string) => {
    const id = scenId || selectedScenarioId;
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.runSensitivity({
        scenario_id: id,
        target_metric: targetMetric,
        samples: 40,
      });
      setResult(res);
      if (res.spokes.length > 0) {
        setActiveSpoke(res.spokes[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pt-8 pb-32 px-6">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
            <h1 className="font-sora text-2xl font-bold text-text">Global Sensitivity & Tornado Radial</h1>
          </div>
          <p className="text-xs font-mono text-text-3 mt-1">
            Latin Hypercube parameter sampling (LHS) • Spearman partial rank correlation analysis
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-full border border-border">
          <button
            onClick={() => setViewMode('ring')}
            className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
              viewMode === 'ring' ? 'bg-primary text-white font-semibold' : 'text-text-3 hover:text-text'
            }`}
          >
            Radial Spokes
          </button>
          <button
            onClick={() => setViewMode('bars')}
            className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
              viewMode === 'bars' ? 'bg-primary text-white font-semibold' : 'text-text-3 hover:text-text'
            }`}
          >
            Tornado Bars
          </button>
        </div>
      </div>

      {/* Target Metric Selector */}
      <div className="bg-white p-4 rounded-2xl border border-border shadow-xs mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-3">Outcome Metric:</span>
          <div className="flex gap-1.5 bg-surface-2 p-1 rounded-full border border-border">
            {[
              { id: 'total_deaths', label: 'Total Deaths' },
              { id: 'peak_hospital_occupancy', label: 'Peak Hospital Load' },
              { id: 'overall_attack_rate', label: 'Attack Rate' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setTargetMetric(m.id);
                  handleRun();
                }}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
                  targetMetric === m.id ? 'bg-primary text-white font-semibold' : 'text-text-3 hover:text-text'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => handleRun()}
          disabled={loading}
          className="px-5 py-2 rounded-full bg-primary hover:bg-primary-hover text-white font-sora text-xs font-semibold shadow-soft flex items-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5 text-signal" />
          {loading ? 'Sampling...' : 'Re-sample (LHS)'}
        </button>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Main Visual Display (Radial Spokes or Tornado Bars) */}
          <div className="md:col-span-7 bg-white p-6 rounded-3xl border border-border shadow-soft space-y-6">
            <h3 className="font-sora font-bold text-sm text-text">
              Influence Ranking: Spearman Correlation (r)
            </h3>

            {viewMode === 'ring' ? (
              /* Radial Spokes View */
              <div className="relative w-80 h-80 mx-auto flex items-center justify-center">
                {/* Center Target Bubble */}
                <div className="w-24 h-24 rounded-full bg-primary-soft border-2 border-primary text-primary flex flex-col items-center justify-center p-2 text-center z-10 shadow-soft">
                  <span className="text-[10px] font-mono text-text-3 uppercase">Target</span>
                  <span className="font-sora font-bold text-xs capitalize leading-tight">
                    {targetMetric.replace('_', ' ')}
                  </span>
                </div>

                {/* Radiating Spoke Chips */}
                {result.spokes.map((spoke, idx) => {
                  const angle = (idx / result.spokes.length) * 2 * Math.PI - Math.PI / 2;
                  const radius = 120;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;

                  const isSelected = activeSpoke?.param === spoke.param;

                  return (
                    <button
                      key={spoke.param}
                      onClick={() => setActiveSpoke(spoke)}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                      }}
                      className={`absolute px-3 py-1.5 rounded-full text-xs font-mono border transition-all duration-150 active:scale-95 shadow-sm ${
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-glow-primary scale-110 z-20'
                          : 'bg-white border-border text-text hover:border-primary/60'
                      }`}
                    >
                      <span className="font-bold">{spoke.param}</span>{' '}
                      <span className={isSelected ? 'text-white/80' : 'text-primary font-bold'}>
                        {spoke.correlation > 0 ? `+${spoke.correlation.toFixed(2)}` : spoke.correlation.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Tornado Horizontal Bars View */
              <div className="space-y-3">
                {result.spokes.map((spoke) => (
                  <button
                    key={spoke.param}
                    onClick={() => setActiveSpoke(spoke)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all ${
                      activeSpoke?.param === spoke.param
                        ? 'bg-primary-soft border-primary text-primary'
                        : 'bg-surface-2/40 border-border hover:bg-surface-2 text-text'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                      <span className="font-sora font-semibold">{spoke.param}</span>
                      <span className="font-bold">r = {spoke.correlation > 0 ? `+${spoke.correlation}` : spoke.correlation}</span>
                    </div>
                    <div className="w-full bg-border/40 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${Math.abs(spoke.correlation) * 100}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-surface-2 text-xs font-mono text-text-2 leading-relaxed">
              {result.plain_language_summary}
            </div>
          </div>

          {/* Right 5 Cols: Scatter Plot of Active Spoke */}
          <div className="md:col-span-5 bg-white p-6 rounded-3xl border border-border shadow-soft space-y-4">
            {activeSpoke ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-sora font-bold text-sm text-text">Scatter Distribution</h4>
                    <p className="text-xs font-mono text-text-3">
                      {activeSpoke.param} vs {targetMetric.replace('_', ' ')}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-primary bg-primary-soft px-2.5 py-1 rounded-full">
                    r = {activeSpoke.correlation > 0 ? `+${activeSpoke.correlation}` : activeSpoke.correlation}
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 15, right: 15, bottom: 15, left: 15 }}>
                      <XAxis
                        type="number"
                        dataKey="x"
                        name={activeSpoke.param}
                        stroke="#DDD6EE"
                        tick={{ fill: '#8479A3', fontSize: 10 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name={targetMetric}
                        stroke="#DDD6EE"
                        tick={{ fill: '#8479A3', fontSize: 10 }}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ payload }) => {
                          if (!payload || payload.length === 0) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white p-2.5 rounded-xl border border-border shadow-elevated text-xs font-mono">
                              <div>{activeSpoke.param}: {d.x}</div>
                              <div className="font-bold text-primary">{targetMetric}: {d.y}</div>
                            </div>
                          );
                        }}
                      />
                      <Scatter data={activeSpoke.scatter} fill="#5B21B6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-[11px] font-mono text-text-3">
                  Each dot represents one Latin Hypercube parameter draw. Tight grouping indicates higher deterministic leverage over the outcome.
                </p>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center font-mono text-xs text-text-3">
                Click a spoke on the left to inspect scatter.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
