import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ScenarioProvider } from './context/ScenarioContext';
import { HeaderBar } from './components/nav/HeaderBar';
import { IndexOverlay } from './components/nav/IndexOverlay';
import { TimeScrubber } from './components/nav/TimeScrubber';
import { AuthPage } from './pages/AuthPage';
import { StudioCanvas } from './components/studio/StudioCanvas';
import { LibraryPage } from './pages/LibraryPage';
import { DataUploadPage } from './pages/DataUploadPage';
import { ComparePage } from './pages/ComparePage';
import { ThresholdsPage } from './pages/ThresholdsPage';
import { SensitivityPage } from './pages/SensitivityPage';
import { CalibratePage } from './pages/CalibratePage';
import { BriefsPage } from './pages/BriefsPage';
import { AdminPage } from './pages/AdminPage';
import { AboutPage } from './pages/AboutPage';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('studio');
  const [isIndexOpen, setIsIndexOpen] = useState<boolean>(false);

  // Global keyboard shortcut G to open IndexOverlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'g' || e.key === 'G') {
        setIsIndexOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center font-mono text-xs text-text-3 space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <div>Connecting to OutbreakLab Workspace...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-base text-text flex flex-col">
      {/* Pinned Top Bar with Round INDEX Button and Case-File Pill */}
      <HeaderBar
        activePage={currentPage}
        onOpenIndex={() => setIsIndexOpen(true)}
        onNavigate={(p) => setCurrentPage(p)}
      />

      {/* Fullscreen Typographic Index Overlay */}
      <IndexOverlay
        isOpen={isIndexOpen}
        onClose={() => setIsIndexOpen(false)}
        onNavigate={(p) => setCurrentPage(p)}
        currentPage={currentPage}
      />

      {/* Page Content View */}
      <main className="flex-1 pt-16">
        {currentPage === 'studio' && <StudioCanvas />}
        {currentPage === 'library' && <LibraryPage />}
        {currentPage === 'upload' && <DataUploadPage />}
        {currentPage === 'compare' && <ComparePage />}
        {currentPage === 'thresholds' && <ThresholdsPage />}
        {currentPage === 'sensitivity' && <SensitivityPage />}
        {currentPage === 'calibrate' && <CalibratePage />}
        {currentPage === 'briefs' && <BriefsPage />}
        {currentPage === 'admin' && <AdminPage />}
        {currentPage === 'about' && <AboutPage />}
      </main>

      {/* Persistent Global Time Scrubber pinned at bottom on analytical pages */}
      {['studio', 'compare', 'briefs'].includes(currentPage) && <TimeScrubber />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ScenarioProvider>
        <AppContent />
      </ScenarioProvider>
    </AuthProvider>
  );
};

export default App;
