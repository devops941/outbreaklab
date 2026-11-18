import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceDot
} from 'recharts';
import { Target, Search, Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { Scenario, ThresholdResult } from '../types';

export const ThresholdsPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');

  // Sentence-style form state
  const [targetMetric, setTargetMetric] = useState<string>('peak_hospital_occupancy');
  const [targetValue, setTargetValue] = useState<number>(350);
  const [paramToVary, setParamToVary] = useState<string>('contact_reduction');
  const [layerName, setLayerName] = useState<string>('school');
  const [minBound, setMinBound] = useState<number>(0.0);
  const [maxBound, setMaxBound] = useState<number>(0.9);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ThresholdResult | null>(null);

  useEffect(() => {
    api.getScenarios().then((list) => {
      setScenarios(list);
      if (list.length > 0) {
        setSelectedScenarioId(list[0].id);
        handleSolve(list[0].id);
      }
    });
  }, []);

  const handleSolve = async (scenId?: string) => {
    const id = scenId || selectedScenarioId;
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.findThreshold({
        scenario_id: id,
        target_metric: targetMetric,
        target_value: targetValue,
        parameter_to_vary: paramToVary,
        layer_name: layerName,
        min_bound: minBound,
        max_bound: maxBound,
      });
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pt-8 pb-32 px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
          <h1 className="font-sora text-2xl font-bold text-text">Threshold Finder ("Find The Line")</h1>
        </div>
        <p className="text-xs font-mono text-text-3 mt-1">
          Root-finding optimization via SciPy Brent’s method • Pinpoint minimum intervention thresholds
        </p>
      </div>

      {/* Large Interactive Sentence-Style Form */}
      <div className="bg-white p-8 rounded-3xl border border-border shadow-soft mb-8 space-y-6">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-text-3">
          <Target className="w-4 h-4 text-primary" />
          <span>Interactive Policy Optimization Sentence</span>
        </div>

        <div className="font-sora text-lg sm:text-xl md:text-2xl font-medium leading-relaxed text-text">
          Keep{' '}
          <span className="inline-block px-3 py-1 bg-surface-2 rounded-full border border-border text-primary font-bold text-base sm:text-lg">
            peak hospital occupancy
          </span>{' '}
          under{' '}
          <input
            type="number"
            value={targetValue}
            onChange={(e) => setTargetValue(Number(e.target.value))}
            className="inline-block w-28 px-3 py-1 bg-surface-2 rounded-full border border-border text-primary font-mono font-bold text-base sm:text-lg text-center focus:outline-none focus:ring-2 focus:ring-primary"
          />{' '}
          beds by modulating{' '}
          <span className="inline-block px-3 py-1 bg-surface-2 rounded-full border border-border text-signal font-bold text-base sm:text-lg">
            {layerName} contact reduction
          </span>{' '}
          between{' '}
          <span className="font-mono text-text font-bold">{(minBound * 100).toFixed(0)}%</span> and{' '}
          <span className="font-mono text-text font-bold">{(maxBound * 100).toFixed(0)}%</span>.
        </div>

        {/* Controls row */}
        <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-text-3">Target Layer:</span>
            <div className="flex gap-1.5 bg-surface-2 p-1 rounded-full border border-border">
              {['school', 'work', 'community'].map((l) => (
                <button
                  key={l}
                  onClick={() => setLayerName(l)}
                  className={`px-3 py-1 rounded-full text-xs font-mono uppercase ${
                    layerName === l ? 'bg-primary text-white font-semibold' : 'text-text-3 hover:text-text'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleSolve()}
            disabled={loading}
            className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white font-sora font-semibold text-xs shadow-soft flex items-center gap-2"
          >
            {loading ? <Search className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Solve Threshold Line
          </button>
        </div>
      </div>

      {/* Result Display: Big Dial + Curve */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Big Visual Dial (4 cols) */}
          <div className="md:col-span-4 bg-white p-8 rounded-3xl border border-border shadow-soft text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-36 h-36 rounded-full border-8 border-surface-2 flex items-center justify-center relative shadow-inner">
              <div
                className={`w-28 h-28 rounded-full flex flex-col items-center justify-center ${
                  result.success ? 'bg-primary-soft text-primary' : 'bg-rose-50 text-rose-600'
                }`}
              >
                <span className="font-sora font-bold text-3xl">
                  {result.threshold_value !== null ? `${(result.threshold_value * 100).toFixed(1)}%` : 'N/A'}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-3">Threshold</span>
              </div>
            </div>

            <div>
              <h4 className="font-sora font-bold text-base text-text">
                {result.success ? 'Threshold Found' : 'Goal Unreachable'}
              </h4>
              <p className="text-xs font-mono text-text-3 mt-1 leading-relaxed">
                {result.plain_language_summary}
              </p>
            </div>
          </div>

          {/* Metric vs Strength Curve Chart (8 cols) */}
          <div className="md:col-span-8 bg-white p-6 rounded-3xl border border-border shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-sora font-bold text-sm text-text">Response Curve: Metric vs Strength</h4>
                <p className="text-xs font-mono text-text-3">Hospital occupancy response as intervention scales</p>
              </div>
              <div className="text-xs font-mono bg-surface-2 px-3 py-1 rounded-full text-text">
                Target Line: {targetValue} beds
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.curve} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <XAxis
                    dataKey="parameter"
                    stroke="#DDD6EE"
                    tick={{ fill: '#8479A3', fontSize: 10 }}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    label={{ value: 'Intervention Reduction Strength', position: 'insideBottom', offset: -10, fill: '#8479A3', fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#DDD6EE"
                    tick={{ fill: '#8479A3', fontSize: 10 }}
                    label={{ value: 'Peak Occupancy (Beds)', angle: -90, position: 'insideLeft', fill: '#8479A3', fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload || payload.length === 0) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-2.5 rounded-xl border border-border shadow-elevated text-xs font-mono">
                          <div>Strength: {(d.parameter * 100).toFixed(1)}%</div>
                          <div className="font-bold text-primary">Peak: {d.metric} beds</div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    y={targetValue}
                    stroke="#E11D48"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    label={{ value: `Goal (${targetValue})`, fill: '#E11D48', fontSize: 10, position: 'top' }}
                  />
                  <Line type="monotone" dataKey="metric" stroke="#5B21B6" strokeWidth={2.5} dot={{ fill: '#5B21B6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
