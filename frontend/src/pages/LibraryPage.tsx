import React, { useState, useEffect } from 'react';
import { Plus, Users, Flame, Grid, FileText, ChevronDown, ChevronUp, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { Population, Pathogen, ContactMatrix } from '../types';
import { AgePyramidEditor } from '../components/studio/AgePyramidEditor';
import { MatrixHeatmapEditor } from '../components/studio/MatrixHeatmapEditor';
import { PathogenEditor } from '../components/studio/PathogenEditor';

export const LibraryPage: React.FC = () => {
  const [populations, setPopulations] = useState<Population[]>([]);
  const [pathogens, setPathogens] = useState<Pathogen[]>([]);
  const [contactMatrices, setContactMatrices] = useState<ContactMatrix[]>([]);
  const [caseReports, setCaseReports] = useState<any[]>([]);

  // Accordion active rows: store active ID for each column
  const [expandedPop, setExpandedPop] = useState<string | null>(null);
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [expandedMat, setExpandedMat] = useState<string | null>(null);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      const [p1, p2, p3] = await Promise.all([
        api.getPopulations(),
        api.getPathogens(),
        api.getContactMatrices(),
      ]);
      setPopulations(p1);
      setPathogens(p2);
      setContactMatrices(p3);
    } catch (e) {
      console.error('Error fetching library datasets:', e);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Creation handlers
  const handleCreatePopulation = async () => {
    const newPop = await api.createPopulation({
      name: `New Population Archetype ${populations.length + 1}`,
      total_population: 50000,
      hospital_beds: 150,
      icu_beds: 30,
      age_groups: [
        { name: '0-17', count: 12000, initial_immunity: 0.0, hospitalisation_rate: 0.005, icu_fraction: 0.1, ifr: 0.0001 },
        { name: '18-64', count: 30000, initial_immunity: 0.0, hospitalisation_rate: 0.03, icu_fraction: 0.15, ifr: 0.002 },
        { name: '65+', count: 8000, initial_immunity: 0.0, hospitalisation_rate: 0.15, icu_fraction: 0.35, ifr: 0.04 },
      ],
      is_shared: false,
    });
    setPopulations((prev) => [newPop, ...prev]);
    setExpandedPop(newPop.id);
  };

  const handleCreatePathogen = async () => {
    const newPath = await api.createPathogen({
      name: `Novel Pathogen Archetype ${pathogens.length + 1}`,
      r0: 2.4,
      latent_period_days: 3.0,
      infectious_period_days: 5.0,
      hospital_stay_days: 8.0,
      asymptomatic_fraction: 0.3,
      relative_infectiousness_asym: 0.5,
      is_shared: false,
    });
    setPathogens((prev) => [newPath, ...prev]);
    setExpandedPath(newPath.id);
  };

  const handleCreateMatrix = async () => {
    const ageLabels = ['0-17', '18-64', '65+'];
    const newMat = await api.createContactMatrix({
      name: `Synthetic Stratified Matrix ${contactMatrices.length + 1}`,
      age_groups: ageLabels,
      layers: {
        community: [
          [3.0, 1.5, 0.5],
          [1.5, 4.0, 1.0],
          [0.5, 1.0, 2.0],
        ],
      },
      is_shared: false,
    });
    setContactMatrices((prev) => [newMat, ...prev]);
    setExpandedMat(newMat.id);
  };

  return (
    <div className="max-w-7xl mx-auto pt-8 pb-32 px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <h1 className="font-sora text-2xl font-bold text-text">Dataset Library</h1>
        </div>
        <p className="text-xs font-mono text-text-3 mt-1">
          Four-column dataset board • Expand any row inline into an accordion editor
        </p>
      </div>

      {/* Four Side-by-Side Scrolling Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {/* Column 1: Populations */}
        <div className="bg-white rounded-3xl border border-border shadow-soft p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="font-sora font-semibold text-sm text-text">Populations</h3>
              <span className="text-[11px] font-mono bg-surface-2 px-1.5 py-0.5 rounded-full text-text-3">
                {populations.length}
              </span>
            </div>
            <button
              onClick={handleCreatePopulation}
              className="p-1 rounded-full bg-primary-soft text-primary hover:bg-primary hover:text-white transition-colors"
              title="Add New Population"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
            {populations.map((pop) => (
              <div key={pop.id} className="rounded-2xl border border-border bg-surface-2/40 overflow-hidden">
                <button
                  onClick={() => setExpandedPop(expandedPop === pop.id ? null : pop.id)}
                  className="w-full text-left p-3 flex items-center justify-between hover:bg-surface-2/80 transition-colors"
                >
                  <div className="truncate mr-2">
                    <div className="font-sora font-semibold text-xs text-text truncate">{pop.name}</div>
                    <div className="text-[10px] font-mono text-text-3">N = {pop.total_population.toLocaleString()}</div>
                  </div>
                  {expandedPop === pop.id ? <ChevronUp className="w-4 h-4 text-text-3 shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-3 shrink-0" />}
                </button>

                {expandedPop === pop.id && (
                  <div className="p-3 bg-white border-t border-border space-y-3 animate-in fade-in">
                    <AgePyramidEditor
                      ageGroups={pop.age_groups}
                      totalPopulation={pop.total_population}
                      onChange={async (newGroups) => {
                        const updated = await api.updatePopulation(pop.id, { age_groups: newGroups });
                        setPopulations((prev) => prev.map((p) => (p.id === pop.id ? updated : p)));
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Pathogens */}
        <div className="bg-white rounded-3xl border border-border shadow-soft p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-signal" />
              <h3 className="font-sora font-semibold text-sm text-text">Pathogens</h3>
              <span className="text-[11px] font-mono bg-surface-2 px-1.5 py-0.5 rounded-full text-text-3">
                {pathogens.length}
              </span>
            </div>
            <button
              onClick={handleCreatePathogen}
              className="p-1 rounded-full bg-signal/10 text-signal hover:bg-signal hover:text-white transition-colors"
              title="Add New Pathogen"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
            {pathogens.map((path) => (
              <div key={path.id} className="rounded-2xl border border-border bg-surface-2/40 overflow-hidden">
                <button
                  onClick={() => setExpandedPath(expandedPath === path.id ? null : path.id)}
                  className="w-full text-left p-3 flex items-center justify-between hover:bg-surface-2/80 transition-colors"
                >
                  <div className="truncate mr-2">
                    <div className="font-sora font-semibold text-xs text-text truncate">{path.name}</div>
                    <div className="text-[10px] font-mono text-text-3">R0 = {path.r0.toFixed(2)} • Latent: {path.latent_period_days}d</div>
                  </div>
                  {expandedPath === path.id ? <ChevronUp className="w-4 h-4 text-text-3 shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-3 shrink-0" />}
                </button>

                {expandedPath === path.id && (
                  <div className="p-3 bg-white border-t border-border space-y-3 animate-in fade-in">
                    <PathogenEditor
                      pathogen={path}
                      onChange={async (newPath) => {
                        const updated = await api.updatePathogen(path.id, newPath);
                        setPathogens((prev) => prev.map((p) => (p.id === path.id ? updated : p)));
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Contact Matrices */}
        <div className="bg-white rounded-3xl border border-border shadow-soft p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-emerald-600" />
              <h3 className="font-sora font-semibold text-sm text-text">Contact Matrices</h3>
              <span className="text-[11px] font-mono bg-surface-2 px-1.5 py-0.5 rounded-full text-text-3">
                {contactMatrices.length}
              </span>
            </div>
            <button
              onClick={handleCreateMatrix}
              className="p-1 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
              title="Add New Matrix"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
            {contactMatrices.map((mat) => (
              <div key={mat.id} className="rounded-2xl border border-border bg-surface-2/40 overflow-hidden">
                <button
                  onClick={() => setExpandedMat(expandedMat === mat.id ? null : mat.id)}
                  className="w-full text-left p-3 flex items-center justify-between hover:bg-surface-2/80 transition-colors"
                >
                  <div className="truncate mr-2">
                    <div className="font-sora font-semibold text-xs text-text truncate">{mat.name}</div>
                    <div className="text-[10px] font-mono text-text-3">{mat.age_groups?.length || 5} strata groups</div>
                  </div>
                  {expandedMat === mat.id ? <ChevronUp className="w-4 h-4 text-text-3 shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-3 shrink-0" />}
                </button>

                {expandedMat === mat.id && (
                  <div className="p-3 bg-white border-t border-border space-y-3 animate-in fade-in">
                    <MatrixHeatmapEditor
                      ageGroups={mat.age_groups}
                      layers={mat.layers}
                      onChange={async (newLayers) => {
                        const updated = await api.updateContactMatrix(mat.id, { layers: newLayers });
                        setContactMatrices((prev) => prev.map((m) => (m.id === mat.id ? updated : m)));
                      }}
                      onBalance={async () => {
                        const res = await api.balanceContactMatrix(mat.id);
                        setContactMatrices((prev) => prev.map((m) => (m.id === mat.id ? { ...m, layers: res.layers } : m)));
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Column 4: Case Reports */}
        <div className="bg-white rounded-3xl border border-border shadow-soft p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <h3 className="font-sora font-semibold text-sm text-text">Surveillance Feeds</h3>
              <span className="text-[11px] font-mono bg-surface-2 px-1.5 py-0.5 rounded-full text-text-3">1</span>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
            <div className="p-4 rounded-2xl border border-border bg-surface-2/40 space-y-2">
              <div className="font-sora font-semibold text-xs text-text">Early Outbreak Sentinel Feeds</div>
              <p className="text-[11px] font-mono text-text-3">45 days of observed incidence for least-squares calibration.</p>
              <div className="pt-2">
                <a
                  href="#/upload"
                  className="text-xs font-mono font-medium text-primary hover:underline flex items-center gap-1"
                >
                  Upload New CSV Feed →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
