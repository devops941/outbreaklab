import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useScenario } from '../../context/ScenarioContext';

export const DeathsByAgeCard: React.FC = () => {
  const { seriesData, currentDay, activeRun } = useScenario();

  if (!seriesData || seriesData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-text-3 font-mono text-xs">
        <p>No mortality data available.</p>
      </div>
    );
  }

  const currentSnap = seriesData[currentDay];
  const byAge = currentSnap?.by_age || {};

  const barData = Object.entries(byAge).map(([groupName, data]) => ({
    age: groupName,
    deaths: Math.round(data.D),
  }));

  const totalDeaths = Math.round(currentSnap?.D || 0);
  const yllProxy = activeRun?.metrics?.yll_proxy || 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-text-3">Total Deaths:</span>
          <span className="font-bold text-text">{totalDeaths.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-text-3">YLL Proxy:</span>
          <span className="font-bold text-primary">{Math.round(yllProxy).toLocaleString()} yrs</span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="age" stroke="#DDD6EE" tick={{ fill: '#8479A3', fontSize: 10 }} />
            <YAxis stroke="#DDD6EE" tick={{ fill: '#8479A3', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6EE', borderRadius: '16px', boxShadow: '0 8px 24px rgba(91,33,182,0.1)' }}
              itemStyle={{ fontSize: '11px', fontFamily: 'DM Mono' }}
            />
            <Bar dataKey="deaths" fill="#334155" radius={[8, 8, 0, 0]} name="Deceased (D)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
