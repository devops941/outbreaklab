import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useScenario } from '../../context/ScenarioContext';

export const HospitalLoadCard: React.FC = () => {
  const { seriesData, currentDay, activeRun } = useScenario();

  if (!seriesData || seriesData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-text-3 font-mono text-xs">
        <p>No active hospital occupancy data.</p>
      </div>
    );
  }

  const capacity = activeRun?.metrics?.hospital_bed_capacity || 350;
  const daysOver = activeRun?.metrics?.days_over_hospital_capacity || 0;
  const peakHosp = activeRun?.metrics?.peak_hospital_occupancy || 0;

  const displayData = seriesData.filter((_, idx) => idx % Math.max(1, Math.floor(seriesData.length / 100)) === 0 || idx === currentDay);
  const currentOccupancy = Math.round(seriesData[currentDay]?.H || 0);
  const isOverCurrent = currentOccupancy > capacity;

  return (
    <div className="space-y-3">
      {/* Header Badges */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-text-3">Capacity:</span>
          <span className="font-bold text-text">{capacity} beds</span>
        </div>
        <div className="flex items-center gap-2">
          {daysOver > 0 ? (
            <span className="flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              <AlertCircle className="w-3.5 h-3.5" />
              {daysOver} Days Over Capacity
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Within Bed Capacity
            </span>
          )}
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorHosp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#862E9C" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#862E9C" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="day" stroke="#DDD6EE" tick={{ fill: '#8479A3', fontSize: 10 }} />
            <YAxis stroke="#DDD6EE" tick={{ fill: '#8479A3', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6EE', borderRadius: '16px', boxShadow: '0 8px 24px rgba(91,33,182,0.1)' }}
              itemStyle={{ fontSize: '11px', fontFamily: 'DM Mono' }}
            />
            <ReferenceLine y={capacity} stroke="#C92A2A" strokeWidth={2} strokeDasharray="4 4" label={{ value: `Max Beds: ${capacity}`, fill: '#C92A2A', fontSize: 10, position: 'insideTopRight' }} />
            <ReferenceLine x={currentDay} stroke="#F0489B" strokeWidth={2} strokeDasharray="3 3" />
            <Area type="monotone" dataKey="H" stroke="#862E9C" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHosp)" name="Hospital Occupancy" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Pill */}
      <div className="flex items-center justify-between text-xs font-mono bg-surface-2 p-2 rounded-xl">
        <span className="text-text-3">Day {currentDay} Demand:</span>
        <span className={`font-bold ${isOverCurrent ? 'text-rose-600' : 'text-emerald-700'}`}>
          {currentOccupancy.toLocaleString()} beds ({((currentOccupancy / capacity) * 100).toFixed(0)}% occupancy)
        </span>
      </div>
    </div>
  );
};
