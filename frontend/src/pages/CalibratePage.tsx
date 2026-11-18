import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Scatter, Legend
} from 'recharts';
import { CheckCircle, ArrowRight, ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { Scenario, CalibrationResult } from '../types';

export const CalibratePage: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');

  // Step 1: Raw Cases Text
  const [rawCasesText, setRawCasesText] = useState<string>(
    `Day 1: 5\nDay 2: 7\nDay 3: 11\nDay 4: 16\nDay 5: 22\nDay 6: 28\nDay 7: 39\nDay 8: 51\nDay 9: 64\nDay 10: 82\nDay 11: 104\nDay 12: 130\nDay 13: 162\nDay 14: 198`
  );

  // Step 2: Days to fit
  const [daysToFit, setDaysToFit] = useState<number>(30);

  // Step 3: Result
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<CalibrationResult | null>(null);

  useEffect(() => {
    api.getScenarios().then((list) => {
      setScenarios(list);
      if (list.length > 0) setSelectedScenarioId(list[0].id);
    });
  }, []);

  const handleExecuteFit = async () => {
    setLoading(true);
    try {
      // Parse raw text
      const parsedReports: any[] = [];
      const lines = rawCasesText.split('\n');
      for (const line of lines) {
        const matches = line.match(/(\d+)[^\d]+(\d+)/);
        if (matches) {
          parsedReports.push({
            day: parseInt(matches[1]),
            reported_cases: parseInt(matches[2]),
          });
        }
      }

      const res = await api.calibrate({
        scenario_id: selectedScenarioId,
        case_reports: parsedReports,
        days_to_fit: daysToFit,
      });
      setResult(res);
      setStep(3);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-8 pb-32 px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
          <h1 className="font-sora text-2xl font-bold text-text">Model Calibration Wizard</h1>
        </div>
        <p className="text-xs font-mono text-text-3 mt-1">
          Least-squares non-linear curve fitting for transmissibility (q) and reporting fraction
        </p>
      </div>

      {/* 3-Step Wizard Container */}
      <div className="bg-white p-8 sm:p-12 rounded-3xl border border-border shadow-soft space-y-8">
        {/* Progress Tracker */}
        <div className="flex items-center justify-between border-b border-border pb-6 text-xs font-mono">
          {[
            { num: 1, title: 'Case Incidence' },
            { num: 2, title: 'Fitting Window' },
            { num: 3, title: 'Calibrated Curve' },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  step === s.num
                    ? 'bg-primary text-white'
                    : step > s.num
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-surface-2 text-text-3'
                }`}
              >
                {s.num}
              </span>
              <span className={`font-sora font-semibold ${step === s.num ? 'text-primary' : 'text-text-3'}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Input Daily Cases */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-sora text-xl font-bold text-text">Step 1: Paste Your Observed Daily Cases</h2>
              <p className="text-xs font-mono text-text-3 mt-1">
                Enter surveillance incidence day-by-day (e.g. Day 1: 15, Day 2: 24...)
              </p>
            </div>

            <textarea
              value={rawCasesText}
              onChange={(e) => setRawCasesText(e.target.value)}
              rows={8}
              className="w-full p-4 rounded-2xl border border-border font-mono text-xs text-text bg-surface-2/40 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Paste daily observed case records..."
            />

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white font-sora font-semibold text-xs shadow-soft flex items-center gap-2"
              >
                Continue to Window
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Fitting Window */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-sora text-xl font-bold text-text">Step 2: How Many Days To Fit?</h2>
              <p className="text-xs font-mono text-text-3 mt-1">
                Select calibration horizon to bound least-squares parameter estimation.
              </p>
            </div>

            <div className="bg-surface-2 p-6 rounded-2xl border border-border space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-text">Fitting Window:</span>
                <span className="font-bold text-primary">{daysToFit} Days</span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={daysToFit}
                onChange={(e) => setDaysToFit(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-border rounded-lg"
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-full bg-surface-2 hover:bg-border text-text font-mono text-xs flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleExecuteFit}
                disabled={loading}
                className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white font-sora font-semibold text-xs shadow-soft flex items-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-signal" />}
                {loading ? 'Optimizing Least-Squares...' : 'Calibrate Model'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Calibrated Results Overlay */}
        {step === 3 && result && (
          <div className="space-y-6">
            <div>
              <h2 className="font-sora text-xl font-bold text-text">Calibration Fit Review</h2>
              <p className="text-xs font-mono text-text-3 mt-1 leading-relaxed">
                {result.plain_language_summary}
              </p>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-2xl bg-surface-2 border border-border">
                <span className="text-text-3 block mb-1">Implied R0</span>
                <span className="font-sora font-bold text-lg text-primary">{result.implied_r0.toFixed(2)}</span>
              </div>
              <div className="p-4 rounded-2xl bg-surface-2 border border-border">
                <span className="text-text-3 block mb-1">Reporting Fraction</span>
                <span className="font-sora font-bold text-lg text-emerald-700">
                  {(result.reporting_fraction * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-surface-2 border border-border">
                <span className="text-text-3 block mb-1">RMSE Error</span>
                <span className="font-sora font-bold text-lg text-text">{result.rmse.toFixed(1)}</span>
              </div>
            </div>

            {/* Overlay Chart */}
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.fitted_curve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="day" stroke="#DDD6EE" tick={{ fill: '#8479A3', fontSize: 10 }} />
                  <YAxis stroke="#DDD6EE" tick={{ fill: '#8479A3', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6EE', borderRadius: '16px' }}
                    itemStyle={{ fontSize: '11px', fontFamily: 'DM Mono' }}
                  />
                  <Line type="monotone" dataKey="fitted_cases" stroke="#5B21B6" strokeWidth={2.5} name="Calibrated Model Curve" dot={false} />
                  <Line type="monotone" dataKey="observed_cases" stroke="#E11D48" strokeWidth={0} dot={{ fill: '#E11D48', r: 4 }} name="Observed Sentinel Cases" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-full bg-surface-2 hover:bg-border text-text font-mono text-xs"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
