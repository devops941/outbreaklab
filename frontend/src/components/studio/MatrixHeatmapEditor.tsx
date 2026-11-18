import React, { useState } from 'react';
import { SlidersHorizontal, RefreshCw } from 'lucide-react';

interface MatrixHeatmapEditorProps {
  ageGroups: string[];
  layers: Record<string, number[][]>;
  onChange: (updatedLayers: Record<string, number[][]>) => void;
  onBalance?: () => void;
}

export const MatrixHeatmapEditor: React.FC<MatrixHeatmapEditorProps> = ({
  ageGroups,
  layers,
  onChange,
  onBalance,
}) => {
  const layerKeys = Object.keys(layers);
  const [activeLayer, setActiveLayer] = useState<string>(layerKeys[0] || 'community');

  const currentMatrix = layers[activeLayer] || [];

  const handleCellChange = (row: number, col: number, val: number) => {
    const nextLayer = currentMatrix.map((r) => [...r]);
    nextLayer[row][col] = Math.max(0, val);
    onChange({
      ...layers,
      [activeLayer]: nextLayer,
    });
  };

  const getHeatmapColor = (value: number) => {
    // 0 to 6 contacts range -> soft violet to rich aubergine
    const clamped = Math.min(6, Math.max(0, value));
    const intensity = clamped / 6;
    if (intensity < 0.1) return 'bg-[#FAF8FD] text-text-3';
    if (intensity < 0.3) return 'bg-[#E9E2F8] text-primary';
    if (intensity < 0.6) return 'bg-[#C4B2EC] text-[#3B0764] font-semibold';
    if (intensity < 0.85) return 'bg-[#8F6DE0] text-white font-semibold';
    return 'bg-[#5B21B6] text-white font-bold';
  };

  return (
    <div className="space-y-4">
      {/* Layer Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-full border border-border">
          {layerKeys.map((k) => (
            <button
              key={k}
              onClick={() => setActiveLayer(k)}
              className={`px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider transition-colors ${
                activeLayer === k ? 'bg-primary text-white font-semibold shadow-xs' : 'text-text-3 hover:text-text'
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {onBalance && (
          <button
            onClick={onBalance}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 hover:bg-border text-text font-mono text-xs border border-border transition-colors"
            title="Auto-balance contact reciprocity (C_ij * N_i = C_ji * N_j)"
          >
            <RefreshCw className="w-3.5 h-3.5 text-primary" />
            Auto-Balance
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto p-2 bg-white rounded-2xl border border-border shadow-xs">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-1.5 text-[10px] font-mono text-text-3">Age</th>
              {ageGroups.map((ag) => (
                <th key={ag} className="p-1.5 text-[11px] font-mono font-medium text-text-2 text-center">
                  {ag}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentMatrix.map((row, rIdx) => (
              <tr key={rIdx}>
                <td className="p-1.5 text-[11px] font-mono font-medium text-text-2">{ageGroups[rIdx]}</td>
                {row.map((cellVal, cIdx) => (
                  <td key={cIdx} className="p-1">
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      value={cellVal}
                      onChange={(e) => handleCellChange(rIdx, cIdx, parseFloat(e.target.value) || 0)}
                      className={`w-14 h-8 text-center text-xs font-mono rounded-lg border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary ${getHeatmapColor(
                        cellVal
                      )}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-text-3">
        <span>Heatmap: Average daily contacts per person</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-[#FAF8FD] border border-border" />
          <span>Low</span>
          <span className="w-3 h-3 rounded bg-[#5B21B6] ml-2" />
          <span>High</span>
        </div>
      </div>
    </div>
  );
};
