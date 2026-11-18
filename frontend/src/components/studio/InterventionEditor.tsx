import React from 'react';
import { Intervention } from '../../types';

interface InterventionEditorProps {
  intervention: Intervention;
  onChange: (updated: Intervention) => void;
}

export const InterventionEditor: React.FC<InterventionEditorProps> = ({ intervention, onChange }) => {
  const updateField = (field: keyof Intervention, value: any) => {
    onChange({ ...intervention, [field]: value });
  };

  const updateParam = (key: string, val: any) => {
    onChange({
      ...intervention,
      parameters: {
        ...intervention.parameters,
        [key]: val,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Time Window [Start Day, End Day] */}
      <div className="bg-surface-2/60 p-3 rounded-xl border border-border/50 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-sora font-semibold text-text">Active Time Window</span>
          <span className="font-mono text-primary font-bold text-xs">
            Day {intervention.start_day} → Day {intervention.end_day} ({intervention.end_day - intervention.start_day} days)
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-[10px] font-mono text-text-3 block mb-1">Start Day</label>
            <input
              type="number"
              min={0}
              max={intervention.end_day - 1}
              value={intervention.start_day}
              onChange={(e) => updateField('start_day', Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-border bg-white text-text"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-text-3 block mb-1">End Day</label>
            <input
              type="number"
              min={intervention.start_day + 1}
              max={730}
              value={intervention.end_day}
              onChange={(e) => updateField('end_day', Math.max(intervention.start_day + 1, parseInt(e.target.value) || 1))}
              className="w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-border bg-white text-text"
            />
          </div>
        </div>
      </div>

      {/* Compliance Slider */}
      <div className="bg-surface-2/60 p-3 rounded-xl border border-border/50">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-sora font-semibold text-text">Population Compliance</span>
          <span className="font-mono font-bold text-xs text-primary">{(intervention.compliance * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={1.0}
          step={0.05}
          value={intervention.compliance}
          onChange={(e) => updateField('compliance', parseFloat(e.target.value))}
          className="w-full accent-primary h-1.5 bg-border rounded-lg"
        />
      </div>

      {/* Type Specific Parameters */}
      {intervention.intervention_type === 'contact_reduction' && (
        <div className="bg-surface-2/60 p-3 rounded-xl border border-border/50 space-y-2">
          <span className="text-xs font-sora font-semibold text-text block">Layer Contact Reductions</span>
          {['school', 'work', 'community', 'home'].map((layer) => {
            const currentVal = intervention.parameters?.layer_reductions?.[layer] || 0.0;
            return (
              <div key={layer} className="flex items-center justify-between text-xs font-mono">
                <span className="capitalize text-text-2">{layer}:</span>
                <div className="flex items-center gap-2 w-32">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={currentVal}
                    onChange={(e) => {
                      const nextReds = {
                        ...(intervention.parameters?.layer_reductions || {}),
                        [layer]: parseFloat(e.target.value),
                      };
                      updateParam('layer_reductions', nextReds);
                    }}
                    className="w-full accent-primary h-1.5 bg-border rounded-lg"
                  />
                  <span className="w-9 text-right font-bold text-text">{(currentVal * 100).toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {intervention.intervention_type === 'vaccination' && (
        <div className="bg-surface-2/60 p-3 rounded-xl border border-border/50 space-y-2">
          <span className="text-xs font-sora font-semibold text-text block">Vaccination Delivery</span>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <label className="text-[10px] text-text-3 block">Daily Doses</label>
              <input
                type="number"
                step={50}
                min={0}
                value={intervention.parameters?.daily_doses || 500}
                onChange={(e) => updateParam('daily_doses', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 text-xs rounded-lg border border-border bg-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-3 block">Efficacy</label>
              <input
                type="number"
                step={0.05}
                min={0}
                max={1}
                value={intervention.parameters?.efficacy || 0.85}
                onChange={(e) => updateParam('efficacy', parseFloat(e.target.value) || 0.85)}
                className="w-full px-2 py-1 text-xs rounded-lg border border-border bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Cost inputs */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="bg-surface-2/60 p-2.5 rounded-xl border border-border/50">
          <label className="text-[10px] text-text-3 block mb-1">Cost / Day ($)</label>
          <input
            type="number"
            min={0}
            step={500}
            value={intervention.cost_per_day}
            onChange={(e) => updateField('cost_per_day', parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1 text-xs rounded-lg border border-border bg-white"
          />
        </div>
        <div className="bg-surface-2/60 p-2.5 rounded-xl border border-border/50">
          <label className="text-[10px] text-text-3 block mb-1">Cost / Dose ($)</label>
          <input
            type="number"
            min={0}
            step={5}
            value={intervention.cost_per_dose}
            onChange={(e) => updateField('cost_per_dose', parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1 text-xs rounded-lg border border-border bg-white"
          />
        </div>
      </div>
    </div>
  );
};
