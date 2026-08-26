import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { FaUserAlt } from './FaUserAlt';
import { useApp } from '../context/AppContext';
import { fetchCandidates } from '../services/api';
import { Candidate } from '../types';

interface MobileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCandidate: (candidateId: string) => void;
  onNavigateToDashboard?: () => void;
}

export const MobileSearchModal: React.FC<MobileSearchModalProps> = ({ isOpen, onClose, onSelectCandidate, onNavigateToDashboard }) => {
  const { searchQuery, setSearchQuery, selectedYear, selectedState } = useApp();
  const [results, setResults] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }
      try {
        setLoading(true);
        const data = await fetchCandidates({
          year: selectedYear,
          state: selectedState,
          search: searchQuery,
        });
        const list = Array.isArray(data) ? data : (data as any)?.data || [];
        setResults(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, selectedYear, selectedState]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 300,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* Header Search Input Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search size={18} color="var(--text-muted)" className="desktop-icon-allow" style={{ position: 'absolute', left: '14px' }} />
          <input
            type="text"
            autoFocus
            placeholder="Buscar por candidato ou partido..."
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              if (val.trim()) {
                onNavigateToDashboard?.();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onClose();
                onNavigateToDashboard?.();
              }
            }}
            style={{
              width: '100%',
              padding: searchQuery ? '12px 38px 12px 42px' : '12px 14px 12px 42px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
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
              aria-label="Limpar pesquisa"
              style={{
                position: 'absolute',
                right: '12px',
                zIndex: 10,
                background: 'var(--border-strong)',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <X size={14} strokeWidth={2.5} className="desktop-icon-allow" />
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '10px',
            borderRadius: '50%',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Fechar Pesquisa"
        >
          <X size={20} />
        </button>
      </div>

      {/* Results List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Pesquisando candidatos...
          </div>
        ) : searchQuery.trim() && results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Nenhum candidato encontrado para "{searchQuery}"
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {results.map((cand) => (
              <div
                key={cand.id}
                onClick={() => {
                  onSelectCandidate(cand.id);
                  onClose();
                }}
                className="glass-card"
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  flexShrink: 0,
                }}>
                  {cand.photoUrl ? (
                    <img src={cand.photoUrl} alt={cand.popularName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FaUserAlt size={20} color="var(--text-muted)" />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                    {cand.popularName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {cand.party} • {cand.cargo?.name} ({cand.state})
                  </div>
                </div>

                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  {cand.score.totalCompositeScore > 0 ? `+${cand.score.totalCompositeScore}` : cand.score.totalCompositeScore} pts
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
