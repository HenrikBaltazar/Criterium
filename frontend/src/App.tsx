import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { CandidateDetailPage } from './pages/CandidateDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { AccountPage } from './pages/AccountPage';
import { ScoringPage } from './pages/ScoringPage';
import { InformationPage } from './pages/InformationPage';
import { AuthModal } from './components/AuthModal';
import { RankingSidebar } from './components/RankingSidebar';
import { MobileSearchModal } from './components/MobileSearchModal';
import { PwaInstallModal } from './components/PwaInstallModal';
import { WelcomeTutorialModal } from './components/WelcomeTutorialModal';
import { GuidedTutorialTour } from './components/GuidedTutorialTour';
import { LayoutDashboard, Trophy, Sliders, User as UserIcon, Award, Info, LogOut } from 'lucide-react';

import { fetchRankings } from './services/api';

const AppContent: React.FC = () => {
  const { user, setSelectedCargo, setSearchQuery, logout } = useApp();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'candidate' | 'account' | 'scoring' | 'info'>('dashboard');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check URL query parameters for direct candidate sharing link (?candidateId=xyz)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const candIdFromUrl = params.get('candidateId') || params.get('candidate');
    if (candIdFromUrl) {
      setSelectedCandidateId(candIdFromUrl);
      setActiveTab('candidate');
    }
  }, []);
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'login' | 'register' }>({
    isOpen: false,
    mode: 'login',
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);

  const handleOpenLogin = () => setAuthModal({ isOpen: true, mode: 'login' });
  const handleOpenRegister = () => setAuthModal({ isOpen: true, mode: 'register' });
  const handleCloseAuthModal = () => setAuthModal((prev) => ({ ...prev, isOpen: false }));

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
        setSelectedCandidateId(null);
        setActiveTab('scoring');
        break;
      case 3: // Settings
        setSelectedCandidateId(null);
        setActiveTab('settings');
        break;
      case 4: // Account / Profile (Renders live component seamlessly for all screen sizes)
        setSelectedCandidateId(null);
        setActiveTab('account');
        break;
    }
  };

  // Redirect guest if trying to access protected account tab directly (except during guided tutorial)
  if (!user && !isGuidedTourOpen && activeTab === 'account') {
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
          onOpenAuth={handleOpenLogin}
          onOpenRegister={handleOpenRegister}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenMobileSearch={() => setIsMobileSearchOpen(true)}
        />
      </div>

      {/* Main Content Area (Pointer events disabled during onboarding tutorial) */}
      <main style={{ flex: 1, width: '100%', pointerEvents: isTutorialActive ? 'none' : 'auto', userSelect: isTutorialActive ? 'none' : 'auto' }}>
        {activeTab === 'dashboard' && (
          <DashboardPage
            onSelectCandidate={handleSelectCandidate}
            onRequireAuth={handleOpenRegister}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsPage
            onRequireAuth={handleOpenRegister}
            onGoToDashboard={() => setActiveTab('dashboard')}
          />
        )}
        {activeTab === 'scoring' && (
          <ScoringPage
            onRequireAuth={handleOpenRegister}
            onGoToDashboard={() => setActiveTab('dashboard')}
          />
        )}
        {activeTab === 'account' && (user || isGuidedTourOpen) && (
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
            onRequireAuth={handleOpenRegister}
          />
        )}
        {activeTab === 'info' && (
          <InformationPage />
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
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={handleCloseAuthModal}
        initialMode={authModal.mode}
      />

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav
        className="hide-desktop"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: '56px',
        }}
      >
        <button
          onClick={() => {
            setSelectedCandidateId(null);
            setActiveTab('dashboard');
          }}
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
          onClick={() => {
            if (!user) {
              handleOpenRegister();
            } else {
              setIsSidebarOpen(true);
            }
          }}
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
            setActiveTab('scoring');
            setSelectedCandidateId(null);
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

        <button
          onClick={() => {
            setActiveTab('info');
            setSelectedCandidateId(null);
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            fontSize: '0.68rem',
            color: activeTab === 'info' ? 'var(--text-main)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Info size={18} />
          <span>Info</span>
        </button>

        {/* Configurações & Conta (Dropup) */}
        <div style={{ position: 'relative' }}>
          {isMobileMenuOpen && (
            <>
              {/* Overlay invisível para fechar ao clicar fora */}
              <div 
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  position: 'fixed',
                  top: 0, left: 0, right: 0, bottom: '56px',
                  zIndex: 90
                }}
              />
              
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: '50%',
                  transform: 'translateX(50%)',
                  marginBottom: '8px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 100,
                  minWidth: '140px'
                }}
              >
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (user) setActiveTab('account');
                    else handleOpenLogin();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    color: activeTab === 'account' ? 'var(--text-main)' : 'var(--text-muted)',
                    textAlign: 'left',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  <UserIcon size={16} /> Meu Perfil
                </button>

                {user && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setActiveTab('settings');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      color: activeTab === 'settings' ? 'var(--text-main)' : 'var(--text-muted)',
                      textAlign: 'left',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    <Sliders size={16} /> Configurações
                  </button>
                )}

                {user && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                      setActiveTab('dashboard');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      textAlign: 'left',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    <LogOut size={16} /> Sair
                  </button>
                )}
              </div>
            </>
          )}

          <button
            onClick={() => {
              if (user) {
                setIsMobileMenuOpen(!isMobileMenuOpen);
              } else {
                handleOpenLogin();
              }
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              fontSize: '0.68rem',
              color: (activeTab === 'account' || activeTab === 'settings') ? 'var(--text-main)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <UserIcon size={18} />
            <span>{user ? user.name.split(' ')[0] : 'Entrar'}</span>
          </button>
        </div>
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
