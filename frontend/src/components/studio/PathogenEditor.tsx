import React from 'react';
import { Pathogen } from '../../types';

interface PathogenEditorProps {
  pathogen: Pathogen;
  onChange: (updated: Pathogen) => void;
}

export const PathogenEditor: React.FC<PathogenEditorProps> = ({ pathogen, onChange }) => {
  const updateField = (field: keyof Pathogen, value: any) => {
    onChange({ ...pathogen, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* R0 Slider */}
        <div className="bg-surface-2/60 p-3 rounded-xl border border-border/50">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-sora font-semibold text-text">Basic Reproduction Number (R0)</span>
            <span className="font-mono font-bold text-sm text-primary">{pathogen.r0.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.8}
            max={8.0}
            step={0.1}
            value={pathogen.r0}
            onChange={(e) => updateField('r0', parseFloat(e.target.value))}
            className="w-full accent-primary h-2 bg-border rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-text-3 mt-1">
            <span>0.8 (Controlled)</span>
            <span>2.5 (Typical Flu/COVID)</span>
            <span>8.0 (Measles-like)</span>
          </div>
        </div>

        {/* Latent Period */}
        <div className="bg-surface-2/60 p-3 rounded-xl border border-border/50">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-sora font-semibold text-text">Latent Period (Incubation)</span>
            <span className="font-mono font-bold text-xs text-text">{pathogen.latent_period_days.toFixed(1)} days</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={14.0}
            step={0.5}
            value={pathogen.latent_period_days}
            onChange={(e) => updateField('latent_period_days', parseFloat(e.target.value))}
            className="w-full accent-primary h-1.5 bg-border rounded-lg"
          />
        </div>

        {/* Infectious Period */}
        <div className="bg-surface-2/60 p-3 rounded-xl border border-border/50">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-sora font-semibold text-text">Infectious Duration</span>
            <span className="font-mono font-bold text-xs text-text">{pathogen.infectious_period_days.toFixed(1)} days</span>
          </div>
          <input
            type="range"
            min={1.0}
            max={14.0}
            step={0.5}
            value={pathogen.infectious_period_days}
            onChange={(e) => updateField('infectious_period_days', parseFloat(e.target.value))}
            className="w-full accent-primary h-1.5 bg-border rounded-lg"
          />
        </div>

        {/* Asymptomatic Fraction & Hospital Stay */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-2/60 p-2.5 rounded-xl border border-border/50">
            <label className="text-[11px] font-sora font-medium text-text block mb-1">
              Asymptomatic: {(pathogen.asymptomatic_fraction * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min={0.0}
              max={0.9}
              step={0.05}
              value={pathogen.asymptomatic_fraction}
              onChange={(e) => updateField('asymptomatic_fraction', parseFloat(e.target.value))}
              className="w-full accent-signal h-1.5 bg-border rounded-lg"
            />
          </div>
          <div className="bg-surface-2/60 p-2.5 rounded-xl border border-border/50">
            <label className="text-[11px] font-sora font-medium text-text block mb-1">
              Hosp Stay: {pathogen.hospital_stay_days.toFixed(0)}d
            </label>
            <input
              type="range"
              min={2}
              max={21}
              step={1}
              value={pathogen.hospital_stay_days}
              onChange={(e) => updateField('hospital_stay_days', parseFloat(e.target.value))}
              className="w-full accent-primary h-1.5 bg-border rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
