import React from 'react';
import { AgeGroup } from '../../types';

interface AgePyramidEditorProps {
  ageGroups: AgeGroup[];
  totalPopulation: number;
  onChange: (updatedGroups: AgeGroup[]) => void;
}

export const AgePyramidEditor: React.FC<AgePyramidEditorProps> = ({ ageGroups, totalPopulation, onChange }) => {
  const maxCount = Math.max(...ageGroups.map((g) => g.count), 1);

  const handleCountChange = (index: number, newCount: number) => {
    const next = [...ageGroups];
    next[index] = { ...next[index], count: Math.max(0, newCount) };
    onChange(next);
  };

  const handleImmunityChange = (index: number, newImmunity: number) => {
    const next = [...ageGroups];
    next[index] = { ...next[index], initial_immunity: Math.max(0, Math.min(1, newImmunity)) };
    onChange(next);
  };

  const currentTotal = ageGroups.reduce((acc, g) => acc + g.count, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-text-3">Age Strata Distribution</span>
        <span className={currentTotal === totalPopulation ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
          Sum: {currentTotal.toLocaleString()} / {totalPopulation.toLocaleString()}
        </span>
      </div>

      <div className="space-y-3">
        {ageGroups.map((group, idx) => {
          const widthPercent = (group.count / maxCount) * 100;
          return (
            <div key={group.name} className="space-y-1 bg-surface-2/60 p-2.5 rounded-xl border border-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-sora font-semibold text-text">{group.name} yrs</span>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-text font-medium">{group.count.toLocaleString()}</span>
                  <span className="text-text-3">({((group.count / Math.max(1, currentTotal)) * 100).toFixed(1)}%)</span>
                </div>
              </div>

              {/* Bar visualization */}
              <div className="w-full bg-border/40 h-3 rounded-full overflow-hidden flex">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-150"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] font-mono">
                <div>
                  <label className="text-text-3 block text-[10px]">Cohort Size</label>
                  <input
                    type="range"
                    min={0}
                    max={totalPopulation}
                    step={100}
                    value={group.count}
                    onChange={(e) => handleCountChange(idx, Number(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-text-3 block text-[10px]">
                    Immunity: {(group.initial_immunity * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={group.initial_immunity}
                    onChange={(e) => handleImmunityChange(idx, Number(e.target.value))}
                    className="w-full accent-signal h-1.5 bg-border rounded-lg"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
