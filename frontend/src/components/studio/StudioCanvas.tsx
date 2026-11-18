import React, { useState, useEffect } from 'react';
import {
  Users, Flame, Grid, ShieldAlert, Cpu, Activity,
  Maximize2, X, Plus, Move, Sparkles, ChevronRight
} from 'lucide-react';
import { useScenario } from '../../context/ScenarioContext';
import { api } from '../../api/client';
import { Population, Pathogen, ContactMatrix, Intervention } from '../../types';
import { AgePyramidEditor } from './AgePyramidEditor';
import { MatrixHeatmapEditor } from './MatrixHeatmapEditor';
import { PathogenEditor } from './PathogenEditor';
import { InterventionEditor } from './InterventionEditor';
import { SimulationEditor } from './SimulationEditor';
import { EpidemicCurveCard } from './EpidemicCurveCard';
import { HospitalLoadCard } from './HospitalLoadCard';
import { DeathsByAgeCard } from './DeathsByAgeCard';
import { RtChartCard } from './RtChartCard';
import { CostCard } from './CostCard';

export const StudioCanvas: React.FC = () => {
  const { activeScenario, updateActiveScenario, runActiveScenario, isSimulating, activeRun } = useScenario();

  // Active popover modal for node editor
  const [activeEditorNode, setActiveEditorNode] = useState<string | null>(null);
  const [expandedOutcome, setExpandedOutcome] = useState<string | null>(null);

  // Loaded dataset entities
  const [population, setPopulation] = useState<Population | null>(null);
  const [pathogen, setPathogen] = useState<Pathogen | null>(null);
  const [contactMatrix, setContactMatrix] = useState<ContactMatrix | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);

  // Fetch current scenario datasets
  useEffect(() => {
    if (!activeScenario) return;

    if (activeScenario.population_id) {
      api.getPopulations().then((pops) => {
        const found = pops.find((p) => p.id === activeScenario.population_id);
        if (found) setPopulation(found);
      });
    }

    if (activeScenario.pathogen_id) {
      api.getPathogens().then((paths) => {
        const found = paths.find((p) => p.id === activeScenario.pathogen_id);
        if (found) setPathogen(found);
      });
    }

    if (activeScenario.contact_matrix_id) {
      api.getContactMatrices().then((mats) => {
        const found = mats.find((m) => m.id === activeScenario.contact_matrix_id);
        if (found) setContactMatrix(found);
      });
    }

    if (activeScenario.intervention_ids) {
      api.getInterventions().then((invs) => {
        const matching = invs.filter((i) => activeScenario.intervention_ids.includes(i.id));
        setInterventions(matching);
      });
    }
  }, [activeScenario]);

  if (!activeScenario) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center font-mono text-text-3">
        Loading scenario canvas...
      </div>
    );
  }

  // Node Click Handlers
  const openEditor = (nodeId: string) => {
    setActiveEditorNode(nodeId);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-dot-pattern pt-8 pb-32 px-6 overflow-x-auto">
      {/* Canvas Top Bar */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <h2 className="font-sora text-xl font-bold text-text">Scenario Studio Graph</h2>
          </div>
          <p className="text-xs font-mono text-text-3 mt-1">
            Visual intervention pipeline • Click any node to configure parameters in real time
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono bg-white px-3 py-1.5 rounded-full border border-border shadow-xs text-text-2">
            Engine: <span className="font-bold text-primary uppercase">{activeScenario.engine}</span> • {activeScenario.horizon_days} Days
          </div>
          <button
            onClick={() => runActiveScenario()}
            disabled={isSimulating}
            className="px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white font-sora text-xs font-semibold shadow-soft flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-signal" />
            Simulate Now
          </button>
        </div>
      </div>

      {/* Visual Pipeline Flow Grid */}
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Row 1: Structural Setup Pipeline (Population -> Pathogen -> Contacts -> Interventions -> Simulation) */}
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-text-3 mb-3 flex items-center gap-2">
            <span>INPUT PIPELINE NODES</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {/* 1. Population Node */}
            <div
              onClick={() => openEditor('population')}
              className="group cursor-pointer bg-white p-5 rounded-2xl border border-border hover:border-primary shadow-soft hover:shadow-elevated transition-all relative overflow-hidden"
            >
              <div className="w-1.5 h-full bg-primary absolute top-0 left-0" />
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-2 text-text-3">NODE 01</span>
              </div>
              <h3 className="font-sora font-semibold text-sm text-text group-hover:text-primary transition-colors truncate">
                {population?.name || 'Population'}
              </h3>
              <p className="text-xs font-mono text-text-3 mt-1">
                N = {population?.total_population?.toLocaleString() || '100,000'}
              </p>
              <div className="mt-3 text-[11px] font-mono text-primary font-medium flex items-center gap-1 group-hover:underline">
                Edit Age Pyramid →
              </div>
            </div>

            {/* 2. Pathogen Node */}
            <div
              onClick={() => openEditor('pathogen')}
              className="group cursor-pointer bg-white p-5 rounded-2xl border border-border hover:border-primary shadow-soft hover:shadow-elevated transition-all relative overflow-hidden"
            >
              <div className="w-1.5 h-full bg-signal absolute top-0 left-0" />
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-signal/10 text-signal flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-2 text-text-3">NODE 02</span>
              </div>
              <h3 className="font-sora font-semibold text-sm text-text group-hover:text-signal transition-colors truncate">
                {pathogen?.name || 'Pathogen'}
              </h3>
              <p className="text-xs font-mono text-text-3 mt-1">
                R0 = {pathogen?.r0?.toFixed(2) || '2.50'} • Latent: {pathogen?.latent_period_days || 3}d
              </p>
              <div className="mt-3 text-[11px] font-mono text-signal font-medium flex items-center gap-1 group-hover:underline">
                Edit Parameters →
              </div>
            </div>

            {/* 3. Contact Matrix Node */}
            <div
              onClick={() => openEditor('contacts')}
              className="group cursor-pointer bg-white p-5 rounded-2xl border border-border hover:border-primary shadow-soft hover:shadow-elevated transition-all relative overflow-hidden"
            >
              <div className="w-1.5 h-full bg-emerald-500 absolute top-0 left-0" />
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Grid className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-2 text-text-3">NODE 03</span>
              </div>
              <h3 className="font-sora font-semibold text-sm text-text group-hover:text-emerald-600 transition-colors truncate">
                {contactMatrix?.name || 'Contacts'}
              </h3>
              <p className="text-xs font-mono text-text-3 mt-1">
                4 Stratified Layers (Home/Work/School)
              </p>
              <div className="mt-3 text-[11px] font-mono text-emerald-600 font-medium flex items-center gap-1 group-hover:underline">
                Edit Heatmap →
              </div>
            </div>

            {/* 4. Interventions Node */}
            <div
              onClick={() => openEditor('interventions')}
              className="group cursor-pointer bg-white p-5 rounded-2xl border border-border hover:border-primary shadow-soft hover:shadow-elevated transition-all relative overflow-hidden"
            >
              <div className="w-1.5 h-full bg-amber-500 absolute top-0 left-0" />
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-2 text-text-3">NODE 04</span>
              </div>
              <h3 className="font-sora font-semibold text-sm text-text group-hover:text-amber-600 transition-colors truncate">
                Interventions ({interventions.length})
              </h3>
              <p className="text-xs font-mono text-text-3 mt-1 truncate">
                {interventions.length > 0 ? interventions[0].name : 'Unmitigated'}
              </p>
              <div className="mt-3 text-[11px] font-mono text-amber-600 font-medium flex items-center gap-1 group-hover:underline">
                Configure Policy →
              </div>
            </div>

            {/* 5. Simulation Settings Node */}
            <div
              onClick={() => openEditor('simulation')}
              className="group cursor-pointer bg-white p-5 rounded-2xl border border-border hover:border-primary shadow-soft hover:shadow-elevated transition-all relative overflow-hidden"
            >
              <div className="w-1.5 h-full bg-purple-600 absolute top-0 left-0" />
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-2 text-text-3">NODE 05</span>
              </div>
              <h3 className="font-sora font-semibold text-sm text-text group-hover:text-purple-600 transition-colors truncate">
                {activeScenario.engine.toUpperCase()} Engine
              </h3>
              <p className="text-xs font-mono text-text-3 mt-1">
                {activeScenario.horizon_days}d Horizon • Seed {activeScenario.seed}
              </p>
              <div className="mt-3 text-[11px] font-mono text-purple-600 font-medium flex items-center gap-1 group-hover:underline">
                Engine Settings →
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Live Outcome Nodes Grid */}
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-text-3 mb-3 flex items-center gap-2">
            <span>LIVE OUTCOME NODES</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Outcome 1: Epidemic Curve */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-comp-i" />
                  <h3 className="font-sora font-semibold text-sm text-text">Epidemic Curve</h3>
                </div>
                <button
                  onClick={() => setExpandedOutcome('curve')}
                  className="p-1 rounded-lg hover:bg-surface-2 text-text-3 hover:text-text"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <EpidemicCurveCard />
            </div>

            {/* Outcome 2: Hospital Bed Demand vs Capacity */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-comp-h" />
                  <h3 className="font-sora font-semibold text-sm text-text">Hospital Capacity</h3>
                </div>
                <button
                  onClick={() => setExpandedOutcome('hospital')}
                  className="p-1 rounded-lg hover:bg-surface-2 text-text-3 hover:text-text"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <HospitalLoadCard />
            </div>

            {/* Outcome 3: Mortality Stratified by Age */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-comp-d" />
                  <h3 className="font-sora font-semibold text-sm text-text">Mortality by Age</h3>
                </div>
                <button
                  onClick={() => setExpandedOutcome('deaths')}
                  className="p-1 rounded-lg hover:bg-surface-2 text-text-3 hover:text-text"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <DeathsByAgeCard />
            </div>

            {/* Outcome 4: Reproduction Number Rt */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <h3 className="font-sora font-semibold text-sm text-text">Effective Rt Over Time</h3>
                </div>
                <button
                  onClick={() => setExpandedOutcome('rt')}
                  className="p-1 rounded-lg hover:bg-surface-2 text-text-3 hover:text-text"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <RtChartCard />
            </div>

            {/* Outcome 5: Health Economics & Cost */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="font-sora font-semibold text-sm text-text">Economic & Policy Cost</h3>
                </div>
                <button
                  onClick={() => setExpandedOutcome('cost')}
                  className="p-1 rounded-lg hover:bg-surface-2 text-text-3 hover:text-text"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <CostCard />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Anchored Popover Modal for Node Editing */}
      {activeEditorNode && (
        <div className="fixed inset-0 z-50 bg-[#1E1535]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-border shadow-elevated w-full max-w-xl p-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div>
                <h3 className="font-sora font-bold text-base text-text capitalize">
                  Configure {activeEditorNode} Node
                </h3>
                <p className="text-xs font-mono text-text-3">Modify scenario parameters in-memory</p>
              </div>
              <button
                onClick={() => setActiveEditorNode(null)}
                className="w-8 h-8 rounded-full bg-surface-2 hover:bg-border text-text flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Editor Switch */}
            {activeEditorNode === 'population' && population && (
              <AgePyramidEditor
                ageGroups={population.age_groups}
                totalPopulation={population.total_population}
                onChange={(updatedGroups) => setPopulation({ ...population, age_groups: updatedGroups })}
              />
            )}

            {activeEditorNode === 'pathogen' && pathogen && (
              <PathogenEditor
                pathogen={pathogen}
                onChange={(updated) => setPathogen(updated)}
              />
            )}

            {activeEditorNode === 'contacts' && contactMatrix && (
              <MatrixHeatmapEditor
                ageGroups={contactMatrix.age_groups}
                layers={contactMatrix.layers}
                onChange={(updatedLayers) => setContactMatrix({ ...contactMatrix, layers: updatedLayers })}
                onBalance={() => {
                  api.balanceContactMatrix(contactMatrix.id, population?.id).then((res) => {
                    setContactMatrix({ ...contactMatrix, layers: res.layers });
                  });
                }}
              />
            )}

            {activeEditorNode === 'interventions' && (
              <div className="space-y-4">
                {interventions.length === 0 ? (
                  <p className="text-xs font-mono text-text-3">No interventions active in this scenario.</p>
                ) : (
                  interventions.map((inv, idx) => (
                    <div key={inv.id} className="p-3 bg-surface-2 rounded-2xl border border-border">
                      <div className="font-sora font-semibold text-xs text-text mb-2">{inv.name}</div>
                      <InterventionEditor
                        intervention={inv}
                        onChange={(updated) => {
                          const next = [...interventions];
                          next[idx] = updated;
                          setInterventions(next);
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {activeEditorNode === 'simulation' && (
              <SimulationEditor
                scenario={activeScenario}
                onChange={(updated) => updateActiveScenario(updated)}
              />
            )}

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setActiveEditorNode(null)}
                className="px-4 py-2 rounded-full bg-surface-2 hover:bg-border text-text font-mono text-xs"
              >
                Done
              </button>
              <button
                onClick={() => {
                  setActiveEditorNode(null);
                  runActiveScenario();
                }}
                className="px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white font-sora font-semibold text-xs shadow-soft"
              >
                Apply & Re-Simulate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Expanded Outcome Modal */}
      {expandedOutcome && (
        <div className="fixed inset-0 z-50 bg-[#1E1535]/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl border border-border shadow-elevated w-full max-w-4xl p-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <h3 className="font-sora font-bold text-lg text-text capitalize">
                Full-View: {expandedOutcome} Outcome Chart
              </h3>
              <button
                onClick={() => setExpandedOutcome(null)}
                className="w-9 h-9 rounded-full bg-surface-2 hover:bg-border text-text flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-96">
              {expandedOutcome === 'curve' && <EpidemicCurveCard />}
              {expandedOutcome === 'hospital' && <HospitalLoadCard />}
              {expandedOutcome === 'deaths' && <DeathsByAgeCard />}
              {expandedOutcome === 'rt' && <RtChartCard />}
              {expandedOutcome === 'cost' && <CostCard />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
