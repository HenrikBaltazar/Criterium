import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Award, RefreshCw } from 'lucide-react';
import { CandidateCard } from '../components/CandidateCard';
import { fetchCandidates } from '../services/api';
import { Candidate, Cargo } from '../types';
import { useApp } from '../context/AppContext';

interface RankingPageProps {
  onSelectCandidate: (candidateId: string) => void;
}

export const RankingPage: React.FC<RankingPageProps> = ({ onSelectCandidate }) => {
  const { selectedYear, selectedCargo, selectedState, searchQuery, cargos, settings, collapsedCargos, toggleCargoCollapse } = useApp();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchCandidates({
        year: selectedYear,
        cargoCode: selectedCargo,
        state: selectedCargo === 'PRESIDENTE' ? undefined : selectedState,
        search: searchQuery,
      });
      setCandidates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedCargo, selectedState, searchQuery, settings]);

  // Deduplicate cargos and group candidates strictly by canonical Cargo
  const canonicalCargosMap = new Map<string, Cargo>();
  for (const c of cargos) {
    const canonicalCode = c.code === 'DEPUTADO_FEDERAL' ? 'DEP_FEDERAL' : c.code === 'DEPUTADO_ESTADUAL' ? 'DEP_ESTADUAL' : c.code;
    if (!canonicalCargosMap.has(canonicalCode)) {
      canonicalCargosMap.set(canonicalCode, { ...c, code: canonicalCode });
    }
  }
  const uniqueCargos = Array.from(canonicalCargosMap.values());

  const groupedCandidates: { cargoName: string; cargoCode: string; candidatesList: Candidate[] }[] = [];

  const filteredCargos = selectedCargo === 'ALL'
    ? uniqueCargos
    : uniqueCargos.filter((c) => c.code === selectedCargo);

  for (const cargo of filteredCargos) {
    const list = candidates.filter((c) => {
      const code = c.cargo?.code === 'DEPUTADO_FEDERAL' ? 'DEP_FEDERAL' : c.cargo?.code === 'DEPUTADO_ESTADUAL' ? 'DEP_ESTADUAL' : c.cargo?.code;
      return code === cargo.code || c.cargoId === cargo.id;
    });
    if (list.length > 0) {
      groupedCandidates.push({
        cargoName: cargo.name,
        cargoCode: cargo.code,
        candidatesList: list,
      });
    }
  }

  // Fallback for candidates with unmatched cargo codes
  const matchedCandidateIds = new Set(groupedCandidates.flatMap((g) => g.candidatesList.map((c) => c.id)));
  const remainingCandidates = candidates.filter((c) => !matchedCandidateIds.has(c.id));
  if (remainingCandidates.length > 0) {
    groupedCandidates.push({
      cargoName: 'Outros Cargos',
      cargoCode: 'OUTROS',
      candidatesList: remainingCandidates,
    });
  }

  return (
    <div className="container" style={{ padding: '24px 16px 80px 16px' }}>
      {/* Main Collapsible Cargo Sections */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1.5s linear infinite' }} />
          <p style={{ marginTop: '12px', fontSize: '0.88rem' }}>Carregando dados factuais dos candidatos...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <h3>Nenhum candidato encontrado com os filtros selecionados.</h3>
          <p style={{ fontSize: '0.85rem' }}>Tente alterar o filtro de localização ou termo de busca.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {groupedCandidates.map((section) => {
            const isCollapsed = Boolean(collapsedCargos[section.cargoCode]);

            return (
              <section key={section.cargoCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Collapsible Section Header (No "Expandir"/"Recolher" text, icon only) */}
                <div
                  onClick={() => toggleCargoCollapse(section.cargoCode)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'var(--transition)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Award size={20} color="var(--text-main)" />
                    <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
                      {section.cargoName}
                    </h2>
                    <span className="badge badge-neutral" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      {section.candidatesList.length} candidato(s)
                    </span>
                  </div>

                  <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Candidate Grid inside Cargo Section */}
                {!isCollapsed && (
                  <div className="grid-list" style={{ marginTop: '4px' }}>
                    {section.candidatesList.map((cand, rankIndex) => (
                      <CandidateCard
                        key={cand.id}
                        candidate={cand}
                        rank={rankIndex + 1}
                        onSelect={onSelectCandidate}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
