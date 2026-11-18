import React, { createContext, useContext, useState, useEffect } from 'react';
import { Scenario, SimulationRun, DailySnapshot } from '../types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface ScenarioContextType {
  scenarios: Scenario[];
  activeScenario: Scenario | null;
  activeRun: SimulationRun | null;
  seriesData: DailySnapshot[];
  loading: boolean;
  isSimulating: boolean;
  simulationProgress: number;
  // Global time scrubber
  currentDay: number;
  setCurrentDay: (day: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playSpeed: number;
  setPlaySpeed: (speed: number) => void;
  // Actions
  selectScenario: (scenId: string) => Promise<void>;
  updateActiveScenario: (updates: Partial<Scenario>) => Promise<void>;
  runActiveScenario: () => Promise<void>;
  refreshScenarios: () => Promise<void>;
}

const ScenarioContext = createContext<ScenarioContextType | undefined>(undefined);

export const ScenarioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [activeRun, setActiveRun] = useState<SimulationRun | null>(null);
  const [seriesData, setSeriesData] = useState<DailySnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);

  // Time scrubber state
  const [currentDay, setCurrentDay] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);

  const refreshScenarios = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const list = await api.getScenarios();
      setScenarios(list);
      if (list.length > 0 && !activeScenario) {
        await selectScenario(list[0].id);
      }
    } catch (e) {
      console.error('Error fetching scenarios:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshScenarios();
    }
  }, [user]);

  const selectScenario = async (scenId: string) => {
    try {
      setLoading(true);
      const scen = await api.getScenario(scenId);
      setActiveScenario(scen);

      // Check for latest run
      const runs = await api.getRuns(scenId);
      if (runs.length > 0) {
        const latest = runs[0];
        setActiveRun(latest);
        if (latest.status === 'completed') {
          const res = await api.getRunSeries(latest.id);
          setSeriesData(res.daily_results || []);
          setCurrentDay(0);
        }
      } else {
        setActiveRun(null);
        setSeriesData([]);
      }
    } catch (err) {
      console.error('Failed to select scenario:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateActiveScenario = async (updates: Partial<Scenario>) => {
    if (!activeScenario) return;
    try {
      const updated = await api.updateScenario(activeScenario.id, updates);
      setActiveScenario(updated);
      setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      console.error('Failed to update scenario:', err);
      throw err;
    }
  };

  const runActiveScenario = async () => {
    if (!activeScenario) return;
    try {
      setIsSimulating(true);
      setSimulationProgress(0.2);

      const run = await api.simulate({
        scenario_id: activeScenario.id,
        engine: activeScenario.engine,
        horizon_days: activeScenario.horizon_days,
        seed: activeScenario.seed,
      });

      setActiveRun(run);
      setSimulationProgress(1.0);

      if (run.status === 'completed') {
        const res = await api.getRunSeries(run.id);
        setSeriesData(res.daily_results || []);
        setCurrentDay(0);
      }
    } catch (err) {
      console.error('Simulation error:', err);
      throw err;
    } finally {
      setIsSimulating(false);
      setSimulationProgress(0);
    }
  };

  // Scrubber animation ticker
  useEffect(() => {
    if (!isPlaying || seriesData.length === 0) return;
    const interval = setInterval(() => {
      setCurrentDay((prev) => {
        if (prev >= seriesData.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 100 / playSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, playSpeed, seriesData.length]);

  return (
    <ScenarioContext.Provider
      value={{
        scenarios,
        activeScenario,
        activeRun,
        seriesData,
        loading,
        isSimulating,
        simulationProgress,
        currentDay,
        setCurrentDay,
        isPlaying,
        setIsPlaying,
        playSpeed,
        setPlaySpeed,
        selectScenario,
        updateActiveScenario,
        runActiveScenario,
        refreshScenarios,
      }}
    >
      {children}
    </ScenarioContext.Provider>
  );
};

export const useScenario = () => {
  const context = useContext(ScenarioContext);
  if (!context) throw new Error('useScenario must be used within ScenarioProvider');
  return context;
};
