import React, { useState } from 'react';
import { Play, RotateCw, CheckCircle2, ChevronDown, Bell, User as UserIcon, LogOut, ShieldCheck, Sparkles, AlertTriangle } from 'lucide-react';
import { useScenario } from '../../context/ScenarioContext';
import { useAuth } from '../../context/AuthContext';

interface HeaderBarProps {
  onOpenIndex: () => void;
  activePage: string;
  onNavigate: (page: string) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onOpenIndex, activePage, onNavigate }) => {
  const { activeScenario, scenarios, selectScenario, isSimulating, runActiveScenario, activeRun } = useScenario();
  const { user, logout, isAdmin } = useAuth();
  const [showScenarioDropdown, setShowScenarioDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-white/80 backdrop-blur-md border-b border-border px-6 flex items-center justify-between shadow-soft">
      {/* Left: Round INDEX Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenIndex}
          className="group flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary text-white hover:bg-primary-hover shadow-soft transition-all duration-200 active:scale-95"
          title="Open Fullscreen Page Index (Press G)"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-signal animate-pulse" />
          <span className="font-sora font-semibold text-sm tracking-wider uppercase">INDEX</span>
          <span className="text-[11px] font-mono bg-white/20 px-1.5 py-0.5 rounded-full text-white/90">G</span>
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-text-3">
          <span>/</span>
          <span className="text-text font-medium capitalize">{activePage.replace('-', ' ')}</span>
        </div>
      </div>

      {/* Center: Case-File Pill (Active Scenario Selector & Autosave Status) */}
      <div className="relative">
        <button
          onClick={() => setShowScenarioDropdown(!showScenarioDropdown)}
          className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-surface-2 border border-border hover:border-primary/40 transition-all shadow-sm"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-mono text-text-3 uppercase tracking-wider">CASE FILE:</span>
          </div>
          <span className="font-sora font-medium text-sm text-text max-w-[220px] truncate">
            {activeScenario ? activeScenario.name : 'Select Scenario'}
          </span>
          <ChevronDown className="w-4 h-4 text-text-3" />
        </button>

        {showScenarioDropdown && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-80 bg-white rounded-2xl border border-border shadow-elevated p-2 z-50 animate-in fade-in zoom-in-95">
            <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-text-3 border-b border-border/50">
              Active Scenarios ({scenarios.length})
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {scenarios.map((scen) => (
                <button
                  key={scen.id}
                  onClick={() => {
                    selectScenario(scen.id);
                    setShowScenarioDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between transition-colors ${
                    activeScenario?.id === scen.id ? 'bg-primary-soft text-primary font-medium' : 'hover:bg-surface-2 text-text'
                  }`}
                >
                  <span className="truncate">{scen.name}</span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white border border-border text-text-3">
                    {scen.engine}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Run Capsule + User Controls */}
      <div className="flex items-center gap-4">
        {/* Run Capsule Button */}
        <button
          onClick={runActiveScenario}
          disabled={isSimulating || !activeScenario}
          className={`flex items-center gap-2.5 px-4 py-1.5 rounded-full border transition-all duration-200 shadow-sm ${
            isSimulating
              ? 'bg-signal/10 border-signal text-signal'
              : 'bg-white border-primary text-primary hover:bg-primary-soft active:scale-95'
          }`}
          title="Run Simulation Scenario"
        >
          {isSimulating ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin text-signal" />
              <span className="font-sora text-xs font-semibold">SIMULATING...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="font-sora text-xs font-semibold">RUN SCENARIO</span>
              {activeRun?.metrics && (
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  READY
                </span>
              )}
            </>
          )}
        </button>

        {/* User Pill */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-surface-2 border border-border hover:border-primary/40 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-sora font-semibold text-xs">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-medium text-text truncate max-w-[100px]">{user?.full_name || 'User'}</div>
              <div className="text-[10px] font-mono text-text-3 capitalize">{user?.role || 'Analyst'}</div>
            </div>
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-border shadow-elevated p-2 z-50">
              <div className="px-3 py-2 border-b border-border/60">
                <p className="text-xs font-medium text-text truncate">{user?.full_name}</p>
                <p className="text-[11px] font-mono text-text-3 truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                {isAdmin && (
                  <button
                    onClick={() => {
                      onNavigate('admin');
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-surface-2 flex items-center gap-2 text-text"
                  >
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Admin Console
                  </button>
                )}
                <button
                  onClick={() => {
                    onNavigate('upload');
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-surface-2 flex items-center gap-2 text-text"
                >
                  <Sparkles className="w-4 h-4 text-signal" />
                  Upload Data Hub
                </button>
                <button
                  onClick={() => {
                    logout();
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
