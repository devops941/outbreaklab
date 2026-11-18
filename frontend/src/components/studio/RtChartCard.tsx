import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useScenario } from '../../context/ScenarioContext';

export const RtChartCard: React.FC = () => {
  const { seriesData, currentDay, activeRun } = useScenario();

  if (!seriesData || seriesData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-text-3 font-mono text-xs">
        <p>No reproduction number trajectory.</p>
      </div>
    );
  }

  const currentRt = seriesData[currentDay]?.Rt || 1.0;
  const initialR0 = activeRun?.metrics?.r0 || 2.5;

  const displayData = seriesData.filter((_, idx) => idx % Math.max(1, Math.floor(seriesData.length / 100)) === 0 || idx === currentDay);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-text-3">Baseline R0:</span>
          <span className="font-bold text-text">{initialR0.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-3">Day {currentDay} Rt:</span>
          <span className={`font-bold px-2 py-0.5 rounded-full border ${
            currentRt < 1.0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {currentRt.toFixed(2)} {currentRt < 1.0 ? '(Suppressed)' : '(Expanding)'}
          </span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="day" stroke="#DDD6EE" tick={{ fill: '#8479A3', fontSize: 10 }} />
            <YAxis stroke="#DDD6EE" tick={{ fill: '#8479A3', fontSize: 10 }} domain={[0, Math.max(3, Math.ceil(initialR0))]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6EE', borderRadius: '16px', boxShadow: '0 8px 24px rgba(91,33,182,0.1)' }}
              itemStyle={{ fontSize: '11px', fontFamily: 'DM Mono' }}
            />
            {/* Rt = 1.0 Epidemic Threshold Line */}
            <ReferenceLine y={1.0} stroke="#D97706" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: 'Epidemic Threshold (Rt = 1.0)', fill: '#D97706', fontSize: 10, position: 'insideBottomRight' }} />
            <ReferenceLine x={currentDay} stroke="#F0489B" strokeWidth={2} strokeDasharray="3 3" />
            <Line type="monotone" dataKey="Rt" stroke="#5B21B6" strokeWidth={2.5} dot={false} name="Effective Rt" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
