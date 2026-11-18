import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Download, Sparkles, CheckCircle2,
  AlertCircle, Table, BarChart2, Share2, Save
} from 'lucide-react';
import { api } from '../api/client';
import { Brief, SimulationRun } from '../types';
import { EpidemicCurveCard } from '../components/studio/EpidemicCurveCard';
import { HospitalLoadCard } from '../components/studio/HospitalLoadCard';

export const BriefsPage: React.FC = () => {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [activeBrief, setActiveBrief] = useState<Brief | null>(null);
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.getBriefs().then((bList) => {
      setBriefs(bList);
      if (bList.length > 0) setActiveBrief(bList[0]);
    });
    api.getRuns().then((rList) => {
      setRuns(rList.filter((r) => r.status === 'completed'));
    });
  }, []);

  const handleCreateNew = async () => {
    const newBrief = await api.createBrief({
      title: 'Epidemic Preparedness Advisory Brief',
      summary: 'Executive overview of hospital bed demand and intervention recommendations.',
      content_json: {
        type: 'doc',
        blocks: [
          { type: 'heading', text: 'Scenario Overview & Objective' },
          {
            type: 'paragraph',
            text: 'This policy brief evaluates the epidemiological impact and economic feasibility of targeted interventions for infectious disease control. The goal is to avoid healthcare bed saturation and maintain essential public infrastructure.',
          },
          { type: 'chart_curve', title: 'Transmission Trajectory' },
          {
            type: 'callout',
            level: 'warning',
            text: 'Actionable Takeaway: Proactive community masking and phased school closures avert an estimated 48% of acute hospital admissions compared to the unmitigated trajectory.',
          },
        ],
      },
    });
    setBriefs((prev) => [newBrief, ...prev]);
    setActiveBrief(newBrief);
  };

  const handleExport = (format: 'csv' | 'excel' | 'json') => {
    const runId = activeBrief?.run_id || (runs.length > 0 ? runs[0].id : null);
    if (!runId) return;

    if (format === 'csv') {
      window.open(`/api/reports/export/${runId}/csv`, '_blank');
    } else if (format === 'excel') {
      window.open(`/api/reports/export/${runId}/excel`, '_blank');
    } else {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeBrief, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `outbreaklab_brief_${activeBrief?.id?.slice(0, 8)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };

  return (
    <div className="max-w-6xl mx-auto pt-8 pb-32 px-6">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <h1 className="font-sora text-2xl font-bold text-text">Policy Briefs Studio</h1>
          </div>
          <p className="text-xs font-mono text-text-3 mt-1">
            Block document editor with embedded live simulation blocks & multi-format exports
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white font-sora text-xs font-semibold shadow-soft flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Brief
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left 3 cols: Brief List */}
        <div className="md:col-span-3 bg-white p-4 rounded-3xl border border-border shadow-soft space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-text-3 px-2 mb-2">
            Documents ({briefs.length})
          </div>
          {briefs.map((b) => (
            <button
              key={b.id}
              onClick={() => setActiveBrief(b)}
              className={`w-full text-left p-3 rounded-2xl transition-all ${
                activeBrief?.id === b.id
                  ? 'bg-primary-soft text-primary border border-primary/30 font-semibold'
                  : 'bg-surface-2/40 hover:bg-surface-2 text-text border border-border'
              }`}
            >
              <div className="font-sora text-xs truncate">{b.title}</div>
              <div className="text-[10px] font-mono text-text-3 mt-1">
                {new Date(b.updated_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>

        {/* Right 9 cols: Block Editor View */}
        {activeBrief ? (
          <div className="md:col-span-9 bg-white p-8 sm:p-12 rounded-3xl border border-border shadow-elevated space-y-8 relative">
            {/* Title Block */}
            <div className="border-b border-border pb-6 space-y-3">
              <input
                type="text"
                value={activeBrief.title}
                onChange={(e) => setActiveBrief({ ...activeBrief, title: e.target.value })}
                className="font-sora text-2xl sm:text-3xl font-bold text-text w-full bg-transparent focus:outline-none"
                placeholder="Brief Title..."
              />
              <textarea
                value={activeBrief.summary || ''}
                onChange={(e) => setActiveBrief({ ...activeBrief, summary: e.target.value })}
                className="w-full text-xs font-mono text-text-3 bg-transparent resize-none focus:outline-none"
                placeholder="Brief Executive Summary..."
                rows={2}
              />
            </div>

            {/* Document Content Blocks */}
            <div className="space-y-6">
              {/* Block 1: Overview */}
              <div className="space-y-2">
                <h3 className="font-sora text-lg font-bold text-text">1. Context & Purpose</h3>
                <p className="text-sm font-sans text-text-2 leading-relaxed">
                  During an emerging infectious outbreak, policymakers require scenario analysis to balance public health protection with socioeconomic disruption. The models and outcomes presented herein represent hypothetical policy scenario exploration for preparedness education and do not constitute an empirical real-time epidemiological forecast.
                </p>
              </div>

              {/* Block 2: Live Embedded Outcome Chart */}
              <div className="p-6 rounded-2xl border border-border bg-surface-2/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-text-3">
                  <span className="font-bold text-text">FIGURE 1: Active Scenario Transmission Trajectory</span>
                  <span className="bg-white px-2 py-0.5 rounded-full border border-border">LIVE EMBED</span>
                </div>
                <EpidemicCurveCard />
              </div>

              {/* Block 3: Strategic Callout */}
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
                <div className="font-sora font-bold text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Key Policy Finding
                </div>
                <p className="text-xs font-sans leading-relaxed">
                  Combining early K-12 school closures with community mask mandates dampens peak healthcare load by 48%, successfully preserving emergency intensive care bed headroom across the projected timeline.
                </p>
              </div>

              {/* Block 4: Hospital Capacity */}
              <div className="space-y-2 pt-2">
                <h3 className="font-sora text-lg font-bold text-text">2. Healthcare Bed Headroom Analysis</h3>
                <p className="text-sm font-sans text-text-2 leading-relaxed">
                  Hospitalization demand under the baseline scenario breaches operational capacity (350 acute beds) within 42 days of sustained community transmission.
                </p>
                <div className="p-6 rounded-2xl border border-border bg-surface-2/30">
                  <HospitalLoadCard />
                </div>
              </div>
            </div>

            {/* Floating Export Capsule */}
            <div className="sticky bottom-6 flex justify-end gap-2 pt-6">
              <div className="flex items-center gap-2 bg-surface p-1.5 rounded-full border border-border shadow-elevated">
                <button
                  onClick={() => handleExport('csv')}
                  className="px-3.5 py-1.5 rounded-full bg-surface-2 hover:bg-border text-xs font-mono text-text flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV Data
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="px-3.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-xs font-mono text-emerald-800 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  Excel Brief
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="px-3.5 py-1.5 rounded-full bg-primary text-white hover:bg-primary-hover text-xs font-mono font-semibold flex items-center gap-1.5 shadow-soft"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  JSON Snapshot
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="md:col-span-9 h-96 flex items-center justify-center font-mono text-text-3">
            Select or create a policy brief.
          </div>
        )}
      </div>
    </div>
  );
};
