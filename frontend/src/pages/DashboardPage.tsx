import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Plus } from 'lucide-react';
import { CandidateCard } from '../components/CandidateCard';
import { fetchCandidatesPaginated } from '../services/api';
import { Candidate } from '../types';
import { useApp } from '../context/AppContext';

interface DashboardPageProps {
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

// TSE Official Candidate Registration Totals on DivulgaCandContas per cargo
const CARGO_TSE_REGISTERED_TARGETS: Record<string, number> = {
  PRESIDENTE: 13,
  GOVERNADOR: 198,
  SENADOR: 316,
  DEP_FEDERAL: 7708,
  DEP_ESTADUAL: 11625,
  PREFEITO: 5568,
  VEREADOR: 58000,
};

const BATCH_SIZE = 24;

export const DashboardPage: React.FC<DashboardPageProps> = ({ onSelectCandidate }) => {
  const { selectedYear, selectedCargo, selectedState, searchQuery, cargos, settings, collapsedCargos, toggleCargoCollapse } = useApp();
  const [cargoCandidatesMap, setCargoCandidatesMap] = useState<Record<string, Candidate[]>>({});
  const [cargoTotalsMap, setCargoTotalsMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [batchLimits, setBatchLimits] = useState<Record<string, number>>({});

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const availableCargos = cargos && cargos.length > 0
        ? cargos
        : [
            { id: '1', code: 'PRESIDENTE', name: 'Presidente da República', scope: 'FEDERAL' },
            { id: '2', code: 'SENADOR', name: 'Senador', scope: 'FEDERAL' },
            { id: '3', code: 'DEP_FEDERAL', name: 'Deputado Federal', scope: 'FEDERAL' },
            { id: '4', code: 'GOVERNADOR', name: 'Governador', scope: 'ESTADUAL' },
            { id: '5', code: 'DEP_ESTADUAL', name: 'Deputado Estadual', scope: 'ESTADUAL' },
          ];

      const canonicalCargosMap = new Map<string, any>();
      for (const c of availableCargos) {
        const canonicalCode = c.code === 'DEPUTADO_FEDERAL' ? 'DEP_FEDERAL' : c.code === 'DEPUTADO_ESTADUAL' ? 'DEP_ESTADUAL' : c.code;
        if (!canonicalCargosMap.has(canonicalCode)) {
          canonicalCargosMap.set(canonicalCode, { ...c, code: canonicalCode });
        }
      }
      const uniqueCargos = Array.from(canonicalCargosMap.values());

      const targetCargos = selectedCargo === 'ALL'
        ? uniqueCargos
        : uniqueCargos.filter((c) => c.code === selectedCargo);

      const newMap: Record<string, Candidate[]> = {};
      const newTotals: Record<string, number> = {};

      // Fetch batch slice per cargo concurrently so EVERY cargo section (especially PRESIDENTE) is populated!
      await Promise.all(
        targetCargos.map(async (cargo) => {
          try {
            const res = await fetchCandidatesPaginated({
              year: selectedYear,
              cargoCode: cargo.code,
              state: cargo.code === 'PRESIDENTE' ? undefined : selectedState,
              search: searchQuery,
              limit: 50,
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
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch on mount or filter change
    loadData(false);

    const handleRulesUpdated = () => {
      loadData(false);
    };

    window.addEventListener('criterium_rules_updated', handleRulesUpdated);
    return () => window.removeEventListener('criterium_rules_updated', handleRulesUpdated);
  }, [selectedYear, selectedCargo, selectedState, searchQuery, settings]);



  const handleLoadMore = async (cargoCode: string) => {
    const currentLimit = batchLimits[cargoCode] || BATCH_SIZE;
    const nextLimit = currentLimit + BATCH_SIZE;

    setBatchLimits((prev) => ({
      ...prev,
      [cargoCode]: nextLimit,
    }));

    // If local list length is less than nextLimit, fetch next page batch for this cargo
    const currentList = cargoCandidatesMap[cargoCode] || [];
    if (currentList.length < nextLimit) {
      try {
        const res = await fetchCandidatesPaginated({
          year: selectedYear,
          cargoCode,
          state: selectedState,
          search: searchQuery,
          limit: nextLimit,
          page: 1,
        });
        setCargoCandidatesMap((prev) => ({
          ...prev,
          [cargoCode]: res.data,
        }));
        setCargoTotalsMap((prev) => ({
          ...prev,
          [cargoCode]: res.total,
        }));
      } catch (e) {}
    }
  };

  const availableCargos = cargos && cargos.length > 0
    ? cargos
    : [
        { id: '1', code: 'PRESIDENTE', name: 'Presidente da República', scope: 'FEDERAL' },
        { id: '2', code: 'SENADOR', name: 'Senador', scope: 'FEDERAL' },
        { id: '3', code: 'DEP_FEDERAL', name: 'Deputado Federal', scope: 'FEDERAL' },
        { id: '4', code: 'GOVERNADOR', name: 'Governador', scope: 'ESTADUAL' },
        { id: '5', code: 'DEP_ESTADUAL', name: 'Deputado Estadual', scope: 'ESTADUAL' },
        { id: '6', code: 'PREFEITO', name: 'Prefeito', scope: 'MUNICIPAL' },
        { id: '7', code: 'VEREADOR', name: 'Vereador', scope: 'MUNICIPAL' },
      ];

  // Sort available cargos by strict priority order
  const sortedCargos = [...availableCargos].sort((a, b) => {
    const indexA = CARGO_PRIORITY_ORDER.indexOf(a.code);
    const indexB = CARGO_PRIORITY_ORDER.indexOf(b.code);
    const posA = indexA !== -1 ? indexA : 999;
    const posB = indexB !== -1 ? indexB : 999;
    return posA - posB;
  });

  const filteredCargos = selectedCargo === 'ALL'
    ? sortedCargos
    : sortedCargos.filter((c) => c.code === selectedCargo);

  // Filter grouped candidates that have records in cargoCandidatesMap
  const groupedCandidates = filteredCargos
    .map((cargo) => ({
      cargoName: cargo.name,
      cargoCode: cargo.code,
      candidatesList: cargoCandidatesMap[cargo.code] || [],
      totalCandidates: cargoTotalsMap[cargo.code] || (cargoCandidatesMap[cargo.code] || []).length,
    }))
    .filter((g) => g.candidatesList.length > 0);

  const totalLoadedCandidates = Object.values(cargoCandidatesMap).reduce((acc, list) => acc + list.length, 0);

  return (
    <div className="container" style={{ padding: '24px 16px 80px 16px' }}>
      {/* Main Collapsible Cargo Sections on Dashboard */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1.5s linear infinite' }} />
          <p style={{ marginTop: '12px', fontSize: '0.88rem' }}>Carregando dados factuais dos candidatos...</p>
        </div>
      ) : totalLoadedCandidates === 0 ? (
        <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <h3>Nenhum candidato encontrado com os filtros selecionados.</h3>
          <p style={{ fontSize: '0.85rem' }}>Tente alterar o filtro de localização ou termo de busca.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {groupedCandidates.map((section) => {
            const isCollapsed = searchQuery.trim() ? false : Boolean(collapsedCargos[section.cargoCode]);
            const tseTarget = Math.max(CARGO_TSE_REGISTERED_TARGETS[section.cargoCode] || 0, section.totalCandidates);

            const visibleLimit = batchLimits[section.cargoCode] || BATCH_SIZE;
            const visibleCandidates = section.candidatesList.slice(0, visibleLimit);
            const hasMoreInBatch = visibleLimit < section.totalCandidates;

            return (
              <section key={section.cargoCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Sticky Collapsible Section Header (Stays pinned on scroll right below header toolbar) */}
                <div
                  onClick={() => toggleCargoCollapse(section.cargoCode)}
                  style={{
                    position: 'sticky',
                    top: '66px',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'var(--transition)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
                      {section.cargoName}
                    </h2>
                    {/* TSE Total Registration Format: X de Y candidato(s) */}
                    <span className="badge badge-neutral" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      {section.totalCandidates} de {tseTarget} candidato(s)
                    </span>
                  </div>

                  {/* Collapse Arrow Icon */}
                  <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    {isCollapsed ? (
                      <ChevronRight size={20} className="collapse-arrow desktop-icon-allow" />
                    ) : (
                      <ChevronDown size={20} className="collapse-arrow desktop-icon-allow" />
                    )}
                  </div>
                </div>

                {/* Candidate Grid inside Cargo Section */}
                {!isCollapsed && (
                  <>
                    <div className="grid-list" style={{ marginTop: '4px' }}>
                      {visibleCandidates.map((cand, rankIndex) => (
                        <CandidateCard
                          key={cand.id}
                          candidate={cand}
                          rank={rankIndex + 1}
                          onSelect={onSelectCandidate}
                        />
                      ))}
                    </div>

                    {/* Scroll Loading Batch Trigger */}
                    {hasMoreInBatch && (
                      <div style={{ textAlign: 'center', marginTop: '12px' }}>
                        <button
                          onClick={() => handleLoadMore(section.cargoCode)}
                          style={{
                            padding: '10px 20px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-strong)',
                            color: 'var(--text-main)',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <Plus size={16} className="desktop-icon-allow" />
                          <span>Carregar mais candidatos (+{BATCH_SIZE})</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
