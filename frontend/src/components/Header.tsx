import React, { useState, useEffect, useRef } from 'react';
import { Download, Search, Lock, Sliders, Award, User as UserIcon, LogOut, ChevronDown, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  activeTab: 'dashboard' | 'settings' | 'candidate' | 'account' | 'scoring';
  setActiveTab: (tab: 'dashboard' | 'settings' | 'account' | 'scoring') => void;
  onOpenAuth: () => void;
  onToggleSidebar?: () => void;
  onOpenMobileSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenAuth,
  onToggleSidebar,
  onOpenMobileSearch,
}) => {
  const {
    user,
    logout,
    selectedState,
    searchQuery,
    setSearchQuery,
    isInstallable,
    installPWA,
  } = useApp();

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {/* Top Bar */}
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '66px',
        gap: '12px',
      }}>
        {/* Logo Name `criterium` */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            onClick={() => setActiveTab('dashboard')}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            title="Criterium - Ir para Dashboard"
          >
            <h1 style={{ fontSize: '1.45rem', margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>
              criterium
            </h1>
          </div>
        </div>

        {/* Desktop Search Bar (Hidden on Mobile) */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '580px' }}>
          {/* Election Year Dropdown to the LEFT of search bar (Locked at 2026) */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              disabled
              value={2026}
              style={{
                padding: '7px 26px 7px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontWeight: 700,
                fontSize: '0.82rem',
                appearance: 'none',
                WebkitAppearance: 'none',
                cursor: 'not-allowed',
                opacity: 0.9,
              }}
              title="Eleição 2026"
            >
              <option value={2026}>2026</option>
            </select>
            <Lock size={12} color="var(--text-muted)" style={{ position: 'absolute', right: '9px', pointerEvents: 'none' }} />
          </div>

          {/* Desktop Search Input */}
          <div style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
          }}>
            <Search size={15} color="var(--text-muted)" className="desktop-icon-allow" style={{ position: 'absolute', left: '12px' }} />
            <input
              type="text"
              placeholder="Buscar candidato ou partido..."
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val.trim() && activeTab !== 'dashboard') {
                  setActiveTab('dashboard');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setActiveTab('dashboard');
                }
              }}
              style={{
                width: '100%',
                padding: searchQuery ? '7px 32px 7px 34px' : '7px 12px 7px 34px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                }}
                title="Limpar pesquisa"
                aria-label="Limpar barra de pesquisa"
                style={{
                  position: 'absolute',
                  right: '10px',
                  zIndex: 10,
                  background: 'var(--border-strong)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  transition: 'var(--transition)',
                }}
              >
                <X size={12} strokeWidth={2.5} className="desktop-icon-allow" />
              </button>
            )}
          </div>
        </div>

        {/* Display Current State Indicator if filtered */}
        {selectedState !== 'ALL' && (
          <div
            className="hide-mobile"
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>Estado: {selectedState}</span>
          </div>
        )}

        {/* Mobile-Only Search Glass Icon Triggering Full-Screen Search Modal */}
        <div className="mobile-only-icon" style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={onOpenMobileSearch}
            style={{
              padding: '8px',
              borderRadius: '50%',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Abrir Pesquisa em Tela Cheia"
          >
            <Search size={18} />
          </button>
        </div>

        {/* Actions Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Account Button & Dropdown Menu */}
          <div className="hide-mobile" ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => {
                if (!user) {
                  onOpenAuth();
                } else {
                  setIsDropdownOpen(!isDropdownOpen);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: 'var(--radius-full)',
                background: user && (activeTab === 'account' || activeTab === 'settings' || activeTab === 'scoring')
                  ? 'var(--border-strong)'
                  : 'var(--text-main)',
                color: user && (activeTab === 'account' || activeTab === 'settings' || activeTab === 'scoring')
                  ? 'var(--text-main)'
                  : 'var(--bg-primary)',
                fontWeight: 700,
                fontSize: '0.82rem',
                border: user && (activeTab === 'account' || activeTab === 'settings' || activeTab === 'scoring')
                  ? '1px solid var(--border-strong)'
                  : 'none',
                cursor: 'pointer',
              }}
              title={user ? "Menu de Conta & Configurações" : "Entrar ou Cadastrar"}
            >
              <span>{user ? user.name.split(' ')[0] : 'Entrar'}</span>
              {user && <ChevronDown size={14} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
            </button>

            {/* Dropdown Overlay Menu for Logged-In User */}
            {user && isDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '200px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
                  padding: '6px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: activeTab === 'settings' ? 'var(--bg-tertiary)' : 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '0.84rem',
                    fontWeight: activeTab === 'settings' ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <Sliders size={15} color="var(--text-muted)" />
                  <span>Configurações</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('scoring');
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: activeTab === 'scoring' ? 'var(--bg-tertiary)' : 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '0.84rem',
                    fontWeight: activeTab === 'scoring' ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <Award size={15} color="var(--text-muted)" />
                  <span>Pontuação</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('account');
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: activeTab === 'account' ? 'var(--bg-tertiary)' : 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '0.84rem',
                    fontWeight: activeTab === 'account' ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <UserIcon size={15} color="var(--text-muted)" />
                  <span>Minha Conta</span>
                </button>

                <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />

                <button
                  onClick={() => {
                    logout();
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '0.84rem',
                    fontWeight: 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={15} color="var(--text-muted)" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            )}
          </div>

          {/* Ranking Button at EXTREME RIGHT */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Abrir Painel do Ranking Técnico"
            >
              <span>Ranking</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
