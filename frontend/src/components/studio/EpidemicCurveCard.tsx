import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend
} from 'recharts';
import { useScenario } from '../../context/ScenarioContext';

export const EpidemicCurveCard: React.FC = () => {
  const { seriesData, currentDay, activeRun } = useScenario();

  if (!seriesData || seriesData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-text-3 font-mono text-xs">
        <p>No active simulation series.</p>
        <p className="text-[11px] mt-1 text-primary">Click RUN SCENARIO to execute.</p>
      </div>
    );
  }

  // Downsample data if too dense for smooth canvas rendering
  const displayData = seriesData.filter((_, idx) => idx % Math.max(1, Math.floor(seriesData.length / 100)) === 0 || idx === currentDay);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-text-3">Daily Compartments (People)</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-comp-i" /> Infected</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-comp-h" /> Hospital</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-comp-r" /> Recovered</span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E11D48" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#E11D48" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorH" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#862E9C" stopOpacity={0.5}/>
                <stop offset="95%" stopColor="#862E9C" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#059669" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="day" stroke="#DDD6EE" tick={{ fill: '#8479A3', fontSize: 10 }} />
            <YAxis stroke="#DDD6EE" tick={{ fill: '#8479A3', fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6EE', borderRadius: '16px', boxShadow: '0 8px 24px rgba(91,33,182,0.1)' }}
              itemStyle={{ fontSize: '11px', fontFamily: 'DM Mono' }}
              labelStyle={{ fontWeight: 'bold', color: '#1E1535', fontSize: '12px' }}
            />
            <Area type="monotone" dataKey="I" stroke="#E11D48" strokeWidth={2} fillOpacity={1} fill="url(#colorI)" name="Symptomatic (I)" />
            <Area type="monotone" dataKey="H" stroke="#862E9C" strokeWidth={2} fillOpacity={1} fill="url(#colorH)" name="Hospitalised (H)" />
            <Area type="monotone" dataKey="R" stroke="#059669" strokeWidth={1.5} fillOpacity={1} fill="url(#colorR)" name="Recovered (R)" />
            <ReferenceLine x={currentDay} stroke="#F0489B" strokeWidth={2} strokeDasharray="3 3" label={{ value: `Day ${currentDay}`, fill: '#F0489B', fontSize: 10, position: 'top' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
