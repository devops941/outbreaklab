import React, { useEffect } from 'react';
import { X, Network, Database, Scale, Sliders, Target, FileText, CheckCircle, UploadCloud, Shield, HelpCircle } from 'lucide-react';

interface IndexOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

interface IndexItem {
  key: string;
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'core' | 'analysis' | 'tools';
}

export const IndexOverlay: React.FC<IndexOverlayProps> = ({ isOpen, onClose, onNavigate, currentPage }) => {
  const items: IndexItem[] = [
    {
      key: 'S',
      id: 'studio',
      title: 'Scenario Studio',
      description: 'Node-graph visual workspace connecting populations, pathogens, contacts, and interventions.',
      icon: <Network className="w-5 h-5 text-primary" />,
      category: 'core',
    },
    {
      key: 'L',
      id: 'library',
      title: 'Data Library',
      description: 'Four-column dataset board for populations, pathogen archetypes, contact matrices, and case reports.',
      icon: <Database className="w-5 h-5 text-emerald-600" />,
      category: 'core',
    },
    {
      key: 'U',
      id: 'upload',
      title: 'Upload & Ingest Hub',
      description: 'Drag-and-drop CSV / Excel data import wizard with column mapping and row-level validation.',
      icon: <UploadCloud className="w-5 h-5 text-signal" />,
      category: 'core',
    },
    {
      key: 'C',
      id: 'compare',
      title: 'Scenario Comparison',
      description: 'Dynamic leaderboard ranking and 2D Pareto frontier of cost versus deaths averted.',
      icon: <Scale className="w-5 h-5 text-amber-600" />,
      category: 'analysis',
    },
    {
      key: 'T',
      id: 'thresholds',
      title: 'Threshold Finder',
      description: '"Find the line": Brent’s method root-finding for minimum intervention strength needed.',
      icon: <Target className="w-5 h-5 text-rose-600" />,
      category: 'analysis',
    },
    {
      key: 'V',
      id: 'sensitivity',
      title: 'Sensitivity Analysis',
      description: 'Global Latin Hypercube sampling and radial Tornado spokes ranked by Spearman correlation.',
      icon: <Sliders className="w-5 h-5 text-purple-600" />,
      category: 'analysis',
    },
    {
      key: 'M',
      id: 'calibrate',
      title: 'Model Calibration',
      description: 'Conversational least-squares fitting of transmissibility and reporting fraction to empirical data.',
      icon: <CheckCircle className="w-5 h-5 text-teal-600" />,
      category: 'analysis',
    },
    {
      key: 'B',
      id: 'briefs',
      title: 'Policy Briefs',
      description: 'Block-editor policy brief composer with embedded live charts and instant PDF/Excel exports.',
      icon: <FileText className="w-5 h-5 text-primary" />,
      category: 'tools',
    },
    {
      key: 'A',
      id: 'admin',
      title: 'Admin Console',
      description: '2×2 quadrant console monitoring users, background jobs, audit logs, and system health.',
      icon: <Shield className="w-5 h-5 text-slate-700" />,
      category: 'tools',
    },
    {
      key: 'H',
      id: 'about',
      title: 'Methodology & Ethics',
      description: 'Mathematical equations, assumptions, educational disclaimers, and project documentation.',
      icon: <HelpCircle className="w-5 h-5 text-text-3" />,
      category: 'tools',
    },
  ];

  // Keyboard navigation: Esc closes, key jumps
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const pressedKey = e.key.toUpperCase();
      const match = items.find((i) => i.key === pressedKey);
      if (match) {
        onNavigate(match.id);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNavigate]);

  if (!isOpen) return null;

  const col1 = items.slice(0, 5);
  const col2 = items.slice(5);

  return (
    <div className="fixed inset-0 z-50 bg-[#1E1535]/70 backdrop-blur-xl flex flex-col justify-between p-8 sm:p-14 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full bg-signal" />
          <h1 className="font-sora text-2xl font-bold text-white tracking-wide">
            OUTBREAKLAB <span className="text-white/40 font-normal">STUDIO INDEX</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-white/50 bg-white/10 px-3 py-1.5 rounded-full">
            <span>PRESS</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-white font-bold">[LETTER]</kbd>
            <span>OR CLICK TO JUMP</span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Two Column Typographic Page Grid */}
      <div className="max-w-6xl w-full mx-auto my-auto py-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        {/* Column 1 */}
        <div className="space-y-4">
          {col1.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
              className={`w-full group text-left p-4 rounded-2xl transition-all duration-200 flex items-start gap-4 border ${
                currentPage === item.id
                  ? 'bg-white/15 border-white/30 text-white shadow-elevated'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15 text-white/80'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-sora text-lg font-semibold text-white group-hover:text-signal transition-colors">
                    {item.title}
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/10 group-hover:bg-signal group-hover:text-white transition-colors">
                    {item.key}
                  </span>
                </div>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">{item.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Column 2 */}
        <div className="space-y-4">
          {col2.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
              className={`w-full group text-left p-4 rounded-2xl transition-all duration-200 flex items-start gap-4 border ${
                currentPage === item.id
                  ? 'bg-white/15 border-white/30 text-white shadow-elevated'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15 text-white/80'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-sora text-lg font-semibold text-white group-hover:text-signal transition-colors">
                    {item.title}
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/10 group-hover:bg-signal group-hover:text-white transition-colors">
                    {item.key}
                  </span>
                </div>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">{item.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="border-t border-white/10 pt-4 max-w-6xl w-full mx-auto flex items-center justify-between text-xs font-mono text-white/40">
        <div>OutbreakLab v2.0 • Preparedness Education Scenario Studio</div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>MongoDB Atlas Connected</span>
        </div>
      </div>
    </div>
  );
};
