import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { CandidateDetailPage } from './pages/CandidateDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { AccountPage } from './pages/AccountPage';
import { ScoringPage } from './pages/ScoringPage';
import { AuthModal } from './components/AuthModal';
import { RankingSidebar } from './components/RankingSidebar';
import { MobileSearchModal } from './components/MobileSearchModal';
import { PwaInstallModal } from './components/PwaInstallModal';
import { WelcomeTutorialModal } from './components/WelcomeTutorialModal';
import { GuidedTutorialTour } from './components/GuidedTutorialTour';
import { LayoutDashboard, Trophy, Sliders, User as UserIcon, Award } from 'lucide-react';

import { fetchRankings } from './services/api';

const AppContent: React.FC = () => {
  const { user, setSelectedCargo, setSearchQuery } = useApp();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'candidate' | 'account' | 'scoring'>('dashboard');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);

  // Onboarding Welcome Modal & Guided Tutorial Tour States
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState<boolean>(() => {
    return localStorage.getItem('criterium_onboarding_completed') !== 'true';
  });
  const [isGuidedTourOpen, setIsGuidedTourOpen] = useState<boolean>(false);

  const handleSelectCandidate = (id: string) => {
    setSelectedCandidateId(id);
    setActiveTab('candidate');
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToDashboard = () => {
    setSelectedCandidateId(null);
    setActiveTab('dashboard');
  };

  const handleSkipWelcome = () => {
    localStorage.setItem('criterium_onboarding_completed', 'true');
    setIsWelcomeModalOpen(false);
    window.dispatchEvent(new Event('criterium_onboarding_finished'));
  };

  const handleStartTutorial = () => {
    setIsWelcomeModalOpen(false);
    setIsGuidedTourOpen(true);
  };

  const handleCloseTutorial = () => {
    localStorage.setItem('criterium_onboarding_completed', 'true');
    setIsGuidedTourOpen(false);
    setActiveTab('dashboard');
    setSelectedCandidateId(null);
    window.dispatchEvent(new Event('criterium_onboarding_finished'));
  };

  const handleNavigateStep = (stepIndex: number) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    switch (stepIndex) {
      case 0: // Dashboard
        setSelectedCandidateId(null);
        setActiveTab('dashboard');
        break;
      case 1: // Candidate Dossier (Dynamic first available candidate from DB)
        fetchRankings(2026, 'PRESIDENTE')
          .then((res) => {
            if (res && Array.isArray(res.leaderboard) && res.leaderboard.length > 0) {
              setSelectedCandidateId(res.leaderboard[0].id);
              setActiveTab('candidate');
            } else {
              setActiveTab('dashboard');
            }
          })
          .catch(() => setActiveTab('dashboard'));
        break;
      case 2: // Scoring Rules / Régua Pessoal
        if (user) setActiveTab('scoring');
        break;
      case 3: // Settings
        if (user) setActiveTab('settings');
        break;
      case 4: // Account / Profile (Handled via preview screenshot card in tour)
        if (user) setActiveTab('account');
        break;
    }
  };

  // Redirect guest if trying to access protected tabs directly
  if (!user && (activeTab === 'settings' || activeTab === 'account' || activeTab === 'scoring')) {
    setActiveTab('dashboard');
  }

  const isTutorialActive = isWelcomeModalOpen || isGuidedTourOpen;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ pointerEvents: isTutorialActive ? 'none' : 'auto', userSelect: isTutorialActive ? 'none' : 'auto' }}>
        <Header
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'dashboard') setSelectedCandidateId(null);
          }}
          onOpenAuth={() => setIsAuthOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenMobileSearch={() => setIsMobileSearchOpen(true)}
        />
      </div>

      {/* Main Content Area (Pointer events disabled during onboarding tutorial) */}
      <main style={{ flex: 1, width: '100%', pointerEvents: isTutorialActive ? 'none' : 'auto', userSelect: isTutorialActive ? 'none' : 'auto' }}>
        {activeTab === 'dashboard' && <DashboardPage onSelectCandidate={handleSelectCandidate} />}
        {activeTab === 'settings' && user && (
          <SettingsPage
            onRequireAuth={() => setIsAuthOpen(true)}
            onGoToDashboard={() => setActiveTab('dashboard')}
          />
        )}
        {activeTab === 'scoring' && user && (
          <ScoringPage
            onRequireAuth={() => setIsAuthOpen(true)}
            onGoToDashboard={() => setActiveTab('dashboard')}
          />
        )}
        {activeTab === 'account' && user && (
          <AccountPage
            onSelectCandidate={handleSelectCandidate}
            onGoToDashboard={(cargoCode) => {
              if (cargoCode) setSelectedCargo(cargoCode);
              setActiveTab('dashboard');
            }}
          />
        )}
        {activeTab === 'candidate' && selectedCandidateId && (
          <CandidateDetailPage
            candidateId={selectedCandidateId}
            onBack={handleBackToDashboard}
            onRequireAuth={() => setIsAuthOpen(true)}
          />
        )}
      </main>

      {/* First-Time Welcome Modal & Interactive Guided Tutorial Tour */}
      <WelcomeTutorialModal
        isOpen={isWelcomeModalOpen}
        onStartTutorial={handleStartTutorial}
        onSkip={handleSkipWelcome}
      />

      <GuidedTutorialTour
        isOpen={isGuidedTourOpen}
        onClose={handleCloseTutorial}
        onNavigateStep={handleNavigateStep}
      />

      {/* Mobile PWA Single-Time Install Modal */}
      <PwaInstallModal />

      {/* Floating Right Drawer Ranking Panel */}
      <RankingSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectCandidate={handleSelectCandidate}
      />

      {/* Full Screen Mobile Search Modal */}
      <MobileSearchModal
        isOpen={isMobileSearchOpen}
        onClose={() => setIsMobileSearchOpen(false)}
        onSelectCandidate={handleSelectCandidate}
        onNavigateToDashboard={handleBackToDashboard}
      />

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav
        className="hide-desktop"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '56px',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 90,
        }}
      >
        <button
          onClick={() => { setActiveTab('dashboard'); setSelectedCandidateId(null); }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            fontSize: '0.68rem',
            color: activeTab === 'dashboard' ? 'var(--text-main)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setIsSidebarOpen(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Trophy size={18} />
          <span>Ranking</span>
        </button>

        <button
          onClick={() => {
            if (user) {
              setActiveTab('scoring');
              setSelectedCandidateId(null);
            } else {
              setIsAuthOpen(true);
            }
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            fontSize: '0.68rem',
            color: activeTab === 'scoring' ? 'var(--text-main)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Award size={18} />
          <span>Pontuação</span>
        </button>

        {/* Configurações: Only visible on mobile if logged in */}
        {user && (
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              fontSize: '0.68rem',
              color: activeTab === 'settings' ? 'var(--text-main)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Sliders size={18} />
            <span>Config</span>
          </button>
        )}

        <button
          onClick={() => user ? setActiveTab('account') : setIsAuthOpen(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            fontSize: '0.68rem',
            color: activeTab === 'account' ? 'var(--text-main)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <UserIcon size={18} />
          <span>{user ? user.name.split(' ')[0] : 'Entrar'}</span>
        </button>
      </nav>

      {/* Simplified Clean Footer */}
      <footer style={{
        padding: '16px 16px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        marginBottom: '56px',
      }} className="hide-desktop-margin">
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <a
            href="https://henrik.dev.br"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600 }}
          >
            henrik.dev.br
          </a>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
