import React from 'react';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import { useScenario } from '../../context/ScenarioContext';

export const TimeScrubber: React.FC = () => {
  const {
    seriesData,
    currentDay,
    setCurrentDay,
    isPlaying,
    setIsPlaying,
    playSpeed,
    setPlaySpeed,
    activeRun,
    activeScenario
  } = useScenario();

  const totalDays = seriesData.length > 0 ? seriesData.length - 1 : activeScenario?.horizon_days || 180;
  const currentSnapshot = seriesData[currentDay];

  if (!activeRun || activeRun.status !== 'completed' || seriesData.length === 0) {
    return null;
  }

  const handleSpeedToggle = () => {
    if (playSpeed === 1) setPlaySpeed(2);
    else if (playSpeed === 2) setPlaySpeed(5);
    else setPlaySpeed(1);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border px-8 py-3.5 shadow-elevated">
      <div className="max-w-7xl mx-auto flex items-center gap-6">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDay(0)}
            className="w-8 h-8 rounded-full bg-surface-2 hover:bg-border text-text flex items-center justify-center transition-colors"
            title="Reset to Day 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-soft transition-all active:scale-95"
            title={isPlaying ? 'Pause' : 'Play Timeline'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <button
            onClick={handleSpeedToggle}
            className="px-2.5 py-1 rounded-full bg-surface-2 hover:bg-border font-mono text-xs font-semibold text-text flex items-center gap-1 transition-colors"
            title="Toggle playback speed"
          >
            <FastForward className="w-3 h-3 text-text-3" />
            {playSpeed}x
          </button>
        </div>

        {/* Day Indicator Pill */}
        <div className="flex items-center gap-2 bg-surface-2 px-3 py-1.5 rounded-full border border-border shrink-0">
          <span className="text-[11px] font-mono text-text-3 uppercase tracking-wider">DAY</span>
          <span className="font-sora font-bold text-sm text-primary">{currentDay}</span>
          <span className="text-xs text-text-3 font-mono">/ {totalDays}</span>
        </div>

        {/* Interactive Track with Pink Thumb */}
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min={0}
            max={totalDays}
            value={currentDay}
            onChange={(e) => setCurrentDay(Number(e.target.value))}
            className="w-full h-2 bg-surface-2 rounded-full appearance-none cursor-pointer accent-signal focus:outline-none"
            style={{
              background: `linear-gradient(to right, #F0489B 0%, #F0489B ${(currentDay / totalDays) * 100}%, #DDD6EE ${(currentDay / totalDays) * 100}%, #DDD6EE 100%)`
            }}
          />
        </div>

        {/* Live Metrics at Current Day */}
        {currentSnapshot && (
          <div className="hidden lg:flex items-center gap-5 text-xs font-mono shrink-0 border-l border-border pl-6">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-comp-i" />
              <span className="text-text-3">Infected:</span>
              <span className="font-bold text-text">{Math.round(currentSnapshot.I).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-comp-h" />
              <span className="text-text-3">Hospitalised:</span>
              <span className="font-bold text-text">{Math.round(currentSnapshot.H).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-comp-d" />
              <span className="text-text-3">Deaths:</span>
              <span className="font-bold text-text">{Math.round(currentSnapshot.D).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-text-3">Rt:</span>
              <span className={`font-bold ${currentSnapshot.Rt > 1.0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {currentSnapshot.Rt.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
