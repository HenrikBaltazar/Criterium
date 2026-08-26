import React, { useEffect, useState } from 'react';
import { X, Trophy, ChevronDown, ChevronRight, User } from 'lucide-react';
import { fetchCandidatesPaginated } from '../services/api';
import { Candidate, Cargo } from '../types';
import { useApp } from '../context/AppContext';

interface RankingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCandidate: (candidateId: string) => void;
}

// Strict requested cargo order
const CARGO_PRIORITY_ORDER = [
  'PRESIDENTE',
  'SENADOR',
  'DEP_FEDERAL',
  'GOVERNADOR',
  'DEP_ESTADUAL',
  'PREFEITO',
  'VEREADOR',
];

export const RankingSidebar: React.FC<RankingSidebarProps> = ({ isOpen, onClose, onSelectCandidate }) => {
  const { selectedYear, selectedState, cargos, settings } = useApp();
  const [cargoCandidatesMap, setCargoCandidatesMap] = useState<Record<string, Candidate[]>>({});
  const [cargoTotalsMap, setCargoTotalsMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [openCargo, setOpenCargo] = useState<string | null>(null);

  // Deduplicate and sort cargos by strict priority order
  const sortedCargos = React.useMemo(() => {
    const map = new Map<string, Cargo>();
    for (const c of cargos) {
      const canonicalCode = c.code === 'DEPUTADO_FEDERAL' ? 'DEP_FEDERAL' : c.code === 'DEPUTADO_ESTADUAL' ? 'DEP_ESTADUAL' : c.code;
      if (!map.has(canonicalCode)) {
        map.set(canonicalCode, { ...c, code: canonicalCode });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const indexA = CARGO_PRIORITY_ORDER.indexOf(a.code);
      const indexB = CARGO_PRIORITY_ORDER.indexOf(b.code);
      const posA = indexA !== -1 ? indexA : 999;
      const posB = indexB !== -1 ? indexB : 999;
      return posA - posB;
    });
  }, [cargos]);

  const loadRankingData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const targetCargos = sortedCargos.length > 0 ? sortedCargos : [];
      const newMap: Record<string, Candidate[]> = {};
      const newTotals: Record<string, number> = {};

      await Promise.all(
        targetCargos.map(async (cargo) => {
          try {
            const res = await fetchCandidatesPaginated({
              year: selectedYear,
              cargoCode: cargo.code,
              state: cargo.code === 'PRESIDENTE' ? undefined : selectedState,
              limit: 100,
              page: 1,
            });
            newMap[cargo.code] = res.data;
            newTotals[cargo.code] = res.total;
          } catch (e) {
            newMap[cargo.code] = [];
            newTotals[cargo.code] = 0;
          }
        })
      );

      setCargoCandidatesMap(newMap);
      setCargoTotalsMap(newTotals);

      if (sortedCargos.length > 0 && !openCargo) {
        setOpenCargo(sortedCargos[0].code);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRankingData(false);
    }

    const handleRulesUpdated = () => {
      if (isOpen) loadRankingData(false);
    };

    window.addEventListener('criterium_rules_updated', handleRulesUpdated);
    return () => window.removeEventListener('criterium_rules_updated', handleRulesUpdated);
  }, [isOpen, selectedYear, selectedState, settings]);

  if (!isOpen) return null;

  const toggleCargo = (code: string) => {
    setOpenCargo((prev) => (prev === code ? null : code));
  };

  const totalCandidatesAcrossAllCargos = Object.values(cargoTotalsMap).reduce((acc, count) => acc + count, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1100,
        }}
      />

      {/* Floating Ranking Drawer Panel */}
      <div
        className="glass-card"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '480px',
          zIndex: 1101,
          borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={22} style={{ color: 'var(--accent-gold)' }} className="desktop-icon-allow" />
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800, color: 'var(--text-main)' }}>
                Ranking Geral da Eleição
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {totalCandidatesAcrossAllCargos} candidato(s) avaliados
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar ranking"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} className="desktop-icon-allow" />
          </button>
        </div>

        {/* Accordion Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Carregando ranking técnico dos candidatos...
            </div>
          ) : sortedCargos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Nenhum cargo disponível.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sortedCargos.map((cargo) => {
                const list = cargoCandidatesMap[cargo.code] || [];
                const totalForCargo = cargoTotalsMap[cargo.code] || list.length;

                const cargoCandidates = [...list].sort(
                  (a, b) => b.score.totalCompositeScore - a.score.totalCompositeScore
                );

                const isExpanded = openCargo === cargo.code;

                return (
                  <div
                    key={cargo.code}
                    style={{
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Cargo Header Toggle */}
                    <button
                      onClick={() => toggleCargo(cargo.code)}
                      style={{
                        width: '100%',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>{cargo.name}</span>
                        {/* Total Count matching Dashboard */}
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                          {totalForCargo} candidato(s)
                        </span>
                      </div>

                      <div style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? (
                          <ChevronDown size={18} className="desktop-icon-allow" />
                        ) : (
                          <ChevronRight size={18} className="desktop-icon-allow" />
                        )}
                      </div>
                    </button>

                    {/* Candidate Leaderboard List inside Accordion */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: '0 12px 14px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          borderTop: '1px solid var(--border-subtle)',
                          background: 'var(--bg-secondary)',
                        }}
                      >
                        {cargoCandidates.length === 0 ? (
                          <div style={{ padding: '12px 6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Nenhum candidato para este cargo nesta localização.
                          </div>
                        ) : (
                          cargoCandidates.map((cand, index) => {
                            const rank = index + 1;
                            const isTop3 = rank <= 3;
                            const scoreVal = cand.score.totalCompositeScore;

                            return (
                              <div
                                key={cand.id}
                                onClick={() => {
                                  onSelectCandidate(cand.id);
                                  onClose();
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '10px 12px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--bg-primary)',
                                  border: '1px solid var(--border-subtle)',
                                  cursor: 'pointer',
                                  transition: 'var(--transition)',
                                }}
                              >
                                {/* Rank Medal / Position */}
                                <div
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: 'var(--radius-full)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-subtle)',
                                    color: rank <= 3 ? 'var(--text-main)' : 'var(--text-muted)',
                                  }}
                                >
                                  {rank}
                                </div>

                                {/* Candidate Mini Avatar */}
                                <div
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-subtle)',
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {cand.photoUrl ? (
                                    <img
                                      src={cand.photoUrl}
                                      alt={cand.popularName}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <User size={18} color="var(--text-muted)" className="desktop-icon-allow" />
                                  )}
                                </div>

                                {/* Name & Party */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: '0.88rem',
                                      fontWeight: 700,
                                      color: 'var(--text-main)',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {cand.popularName}
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                    {cand.party} • {cand.candidateNumber}
                                  </div>
                                </div>

                                {/* Score Badge */}
                                <div
                                  style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 800,
                                    color: 'var(--text-main)',
                                    padding: '4px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'var(--bg-tertiary)',
                                    flexShrink: 0,
                                  }}
                                >
                                  {scoreVal > 0 ? `+${scoreVal}` : scoreVal} pts
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
