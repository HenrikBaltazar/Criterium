import React, { useState, useEffect } from 'react';
import {
  Printer,
  UserX,
  Award,
  Vote,
  LogOut,
  ChevronRight,
  AlertTriangle,
  Check,
  Search,
  Sliders,
  CheckCircle,
  AlertOctagon,
  Trash2,
  X,
  ShieldCheck,
  Lock,
  FileText,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchCandidates, fetchRankings, fetchCandidatesPaginated, deleteAccount } from '../services/api';
import { Candidate, UserEvaluation } from '../types';
import { TagTooltip } from '../components/TagTooltip';

interface AccountPageProps {
  onSelectCandidate: (id: string) => void;
  onGoToDashboard: (cargoCode?: string) => void;
}

interface SeatDefinition {
  id: string;
  cargoCode: string;
  cargoTitle: string;
  seatName: string;
  digitCount: number;
}

interface VoterDetails {
  cpfOrTitulo: string;
  zona: string;
  secao: string;
  localVotacao: string;
}

const ELECTION_SEATS: SeatDefinition[] = [
  { id: 'PRESIDENTE', cargoCode: 'PRESIDENTE', cargoTitle: 'Presidente da República', seatName: 'Presidente', digitCount: 2 },
  { id: 'GOVERNADOR', cargoCode: 'GOVERNADOR', cargoTitle: 'Governador de Estado', seatName: 'Governador', digitCount: 2 },
  { id: 'SENADOR_1', cargoCode: 'SENADOR', cargoTitle: 'Senador da República', seatName: '1º Senador', digitCount: 3 },
  { id: 'SENADOR_2', cargoCode: 'SENADOR', cargoTitle: 'Senador da República', seatName: '2º Senador', digitCount: 3 },
  { id: 'DEP_FEDERAL', cargoCode: 'DEP_FEDERAL', cargoTitle: 'Deputado Federal', seatName: 'Deputado Federal', digitCount: 4 },
  { id: 'DEP_ESTADUAL', cargoCode: 'DEP_ESTADUAL', cargoTitle: 'Deputado Estadual / Distrital', seatName: 'Deputado Estadual', digitCount: 5 },
];

export const AccountPage: React.FC<AccountPageProps> = ({
  onSelectCandidate,
  onGoToDashboard,
}) => {
  const { user, logout, selectedState } = useApp();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalCandidatesInDb, setTotalCandidatesInDb] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSeatCandidates, setSelectedSeatCandidates] = useState<Record<string, string>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [typedEmailConfirm, setTypedEmailConfirm] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Voter identification details saved exclusively in localStorage
  const [voterDetails, setVoterDetails] = useState<VoterDetails>(() => {
    try {
      const saved = localStorage.getItem('criterium_voter_details');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { cpfOrTitulo: '', zona: '', secao: '', localVotacao: '' };
  });

  const handleVoterDetailChange = (field: keyof VoterDetails, value: string) => {
    const updated = { ...voterDetails, [field]: value };
    setVoterDetails(updated);
    localStorage.setItem('criterium_voter_details', JSON.stringify(updated));
  };

  const handleConfirmDeleteAccount = async () => {
    if (!user || typedEmailConfirm.trim().toLowerCase() !== user.email.toLowerCase()) {
      return;
    }
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteAccount();
      localStorage.removeItem('criterium_token');
      logout();
      onGoToDashboard();
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao excluir conta.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const cargoCodes = ['PRESIDENTE', 'GOVERNADOR', 'SENADOR', 'DEP_FEDERAL', 'DEP_ESTADUAL'];
        
        // Fetch rankings for each cargo (PRESIDENTE fetched without state restriction)
        const rankingPromises = cargoCodes.map((code) =>
          fetchRankings(2026, code, code === 'PRESIDENTE' ? undefined : selectedState).catch(() => ({ leaderboard: [], totalCandidates: 0 }))
        );
        const results = await Promise.all(rankingPromises);
        
        let allRanked: Candidate[] = [];
        results.forEach((res) => {
          if (res && Array.isArray(res.leaderboard)) {
            allRanked = allRanked.concat(res.leaderboard);
          }
        });

        try {
          const paginated = await fetchCandidatesPaginated({ year: 2026, limit: 1 });
          setTotalCandidatesInDb(paginated.total || allRanked.length);
        } catch (e) {
          setTotalCandidatesInDb(allRanked.length);
        }

        const guestEvsRaw = localStorage.getItem('criterium_guest_evaluations');
        const token = localStorage.getItem('criterium_token');
        if (!token && guestEvsRaw) {
          try {
            const guestEvs: UserEvaluation[] = JSON.parse(guestEvsRaw);
            allRanked = allRanked.map((c) => {
              const cEvs = guestEvs.filter((e) => e.candidateId === c.id);
              if (cEvs.length > 0) {
                const userPts = cEvs.reduce((acc, curr) => acc + (curr.rating || 0), 0);
                const currentTotal = c.score?.totalCompositeScore || 0;
                return {
                  ...c,
                  userEvaluations: cEvs,
                  score: {
                    ...c.score,
                    totalCompositeScore: currentTotal + userPts,
                    details: {
                      ...c.score?.details,
                      userEvaluationsPts: userPts,
                    },
                  },
                };
              }
              return c;
            });
          } catch (e) {
            console.error('Erro ao processar avaliações guest:', e);
          }
        }

        setCandidates(allRanked);
      } catch (err) {
        console.error('Erro ao carregar candidatos para colinha:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedState]);

  const getCandidateDisplayNumber = (c: any, digitCount: number): string => {
    if (c.candidateNumber) return String(c.candidateNumber);
    if (c.number) return String(c.number);
    if (c.partyNumber) return String(c.partyNumber);
    if (c.sqcand) {
      const sqStr = String(c.sqcand);
      return sqStr.slice(-digitCount);
    }
    if (c.popularName === 'Lula') return '13';
    if (c.popularName === 'Zema') return '30';
    if (c.popularName === 'Tarcísio') return '10';
    if (c.popularName === 'Eduardo Leite') return '45';
    return '0'.repeat(digitCount);
  };

  const getCandidatesForCargo = (cargoCode: string): Candidate[] => {
    return candidates.filter((c: any) => {
      const code = (c.cargo?.code || c.cargoCode || '').toUpperCase();
      if (cargoCode === 'DEP_FEDERAL') return code === 'DEP_FEDERAL' || code === 'DEPUTADO_FEDERAL';
      if (cargoCode === 'DEP_ESTADUAL') return code === 'DEP_ESTADUAL' || code === 'DEPUTADO_ESTADUAL';
      return code === cargoCode;
    });
  };

  const getSeatSelection = (seat: SeatDefinition) => {
    const cargoCandidates = getCandidatesForCargo(seat.cargoCode);

    const ratedCandidates = cargoCandidates
      .filter((c) => {
        const userPts = c.score?.details?.userEvaluationsPts || 0;
        const compScore = c.score?.totalCompositeScore || 0;
        return userPts !== 0 || compScore > 0;
      })
      .sort((a, b) => {
        const scoreA = a.score?.totalCompositeScore || 0;
        const scoreB = b.score?.totalCompositeScore || 0;
        const userA = a.score?.details?.userEvaluationsPts || 0;
        const userB = b.score?.details?.userEvaluationsPts || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return userB - userA;
      });

    if (ratedCandidates.length === 0) {
      return { status: 'EMPTY' as const, candidates: [] };
    }

    if (seat.id === 'SENADOR_2') {
      if (ratedCandidates.length < 2) {
        return { status: 'EMPTY' as const, candidates: [] };
      }
      const secondMaxScore = ratedCandidates[1].score.totalCompositeScore;
      const tiedForSecond = ratedCandidates.filter((c) => c.score.totalCompositeScore === secondMaxScore);

      if (tiedForSecond.length > 1) {
        return { status: 'TIE' as const, candidates: tiedForSecond, maxScore: secondMaxScore };
      }
      return { status: 'SINGLE' as const, candidate: ratedCandidates[1] };
    }

    const maxScore = ratedCandidates[0].score.totalCompositeScore;
    const topCandidates = ratedCandidates.filter((c) => c.score.totalCompositeScore === maxScore);

    if (topCandidates.length > 1) {
      return { status: 'TIE' as const, candidates: topCandidates, maxScore };
    }

    return { status: 'SINGLE' as const, candidate: topCandidates[0] };
  };

  const handleSelectTieCandidate = (seatId: string, candidateId: string) => {
    setSelectedSeatCandidates((prev) => ({ ...prev, [seatId]: candidateId }));
  };

  const handlePrint = () => {
    window.print();
  };

  if (!user) {
    return null;
  }

  const totalEvaluatedCandidates = candidates.filter(
    (c) => (c.score?.details?.userEvaluationsPts || 0) !== 0
  ).length;

  return (
    <div className="container" style={{ padding: '24px 16px 60px 16px' }}>
      {/* Top Navigation Button: Voltar ao Painel */}
      <div className="no-print" style={{ marginBottom: '20px' }}>
        <button
          onClick={() => onGoToDashboard()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-main)',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'var(--transition)',
          }}
        >
          <ArrowLeft size={16} />
          <span>Voltar ao painel</span>
        </button>
      </div>

      <div className="colinha-print-area">
        <div
          className="no-print"
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            padding: '24px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--border-strong), var(--text-muted))',
                color: 'var(--bg-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 800,
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800 }}>
                {user.name}
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {user.email}
              </div>
            </div>
          </div>
        </div>

        {/* SESSION 0: Dados de Votação do Eleitor (Stored 100% in localStorage) */}
        <section className="no-print" style={{ marginBottom: '28px' }}>
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={22} color="var(--text-main)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                    Dados de Votação do Eleitor
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Insira seus dados do título eleitoral para exibição no cabeçalho impresso da sua colinha da eleição.
                  </p>
                </div>
              </div>

              <TagTooltip content="Privacidade Garantida: Seus dados (CPF/Título, Zona, Seção e Local) são armazenados unicamente no seu navegador (localStorage) e NUNCA são salvos ou enviados para nossos servidores.">
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-strong)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    cursor: 'help',
                  }}
                >
                  <Lock size={14} />
                  <span>Dados Salvos Apenas no Seu Navegador (localStorage)</span>
                </div>
              </TagTooltip>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  CPF ou Título de Eleitor
                </label>
                <input
                  type="text"
                  placeholder="Ex: 123.456.789-00 ou 1234 5678 9012"
                  value={voterDetails.cpfOrTitulo}
                  onChange={(e) => handleVoterDetailChange('cpfOrTitulo', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Zona Eleitoral
                </label>
                <input
                  type="text"
                  placeholder="Ex: 012"
                  value={voterDetails.zona}
                  onChange={(e) => handleVoterDetailChange('zona', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Seção Eleitoral
                </label>
                <input
                  type="text"
                  placeholder="Ex: 0145"
                  value={voterDetails.secao}
                  onChange={(e) => handleVoterDetailChange('secao', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Local de Votação
                </label>
                <input
                  type="text"
                  placeholder="Ex: E.E. Maria José - São Paulo/SP"
                  value={voterDetails.localVotacao}
                  onChange={(e) => handleVoterDetailChange('localVotacao', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <div
            className="no-print"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Vote size={22} style={{ color: 'var(--text-main)' }} /> Minha Colinha da Eleição 2026
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '650px' }}>
                Sua cola eleitoral gerada automaticamente com base nas suas pontuações e preferências para cada cargo nas Eleições 2026. Imprima e leve no dia da votação!
              </p>
            </div>

            <button
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--text-main)',
                color: 'var(--bg-primary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <Printer size={18} />
              <span>Imprimir Colinha</span>
            </button>
          </div>

          <div
            className="colinha-header-banner"
            style={{
              background: 'var(--bg-tertiary)',
              border: '2px dashed var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
            }}
          >
            <div
              style={{
                textAlign: 'center',
                paddingBottom: '12px',
                marginBottom: '14px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Colinha Eleitoral 2026 - Criterium
              </h4>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                Data da Votação: 1º Turno: 04/10/2026 • 2º Turno: 25/10/2026 (Horário: 08h às 17h)
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '8px 16px',
                fontSize: '0.82rem',
                marginBottom: '12px',
              }}
            >
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Eleitor:</strong> {user.name}
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>CPF / Título:</strong> {voterDetails.cpfOrTitulo || 'Não informado'}
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Zona:</strong> {voterDetails.zona || '---'} • <strong style={{ color: 'var(--text-muted)' }}>Seção:</strong> {voterDetails.secao || '---'}
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Local:</strong> {voterDetails.localVotacao || '---'}
              </div>
            </div>

            {/* PRINT-ONLY VOTER CHECKLIST BANNER (Hidden on UI, Visible ONLY when Printed / PDF) */}
            <div
              className="print-only"
              style={{
                display: 'none',
                borderTop: '1px solid var(--border-subtle)',
                marginTop: '10px',
                paddingTop: '10px',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ fontWeight: 900, textTransform: 'uppercase', marginBottom: '6px', fontSize: '0.8rem', letterSpacing: '0.03em' }}>
                Lembretes Factuais da Justiça Eleitoral (TSE) — Checklist do Eleitor:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 16px', lineHeight: 1.4 }}>
                <div>
                  <strong>[ &nbsp; ] Documento Oficial com Foto:</strong> Leve CNH, RG, Passaporte ou e-Título com foto.
                </div>
                <div>
                  <strong>[ &nbsp; ] Cola em Papel Liberada:</strong> É permitida a entrada na cabina com papel impresso/anotado.
                </div>
                <div>
                  <strong>[ &nbsp; ] Proibido Celular na Cabina:</strong> Celulares e câmeras devem ser entregues aos mesários.
                </div>
                <div>
                  <strong>[ &nbsp; ] Caneta Azul ou Preta:</strong> Recomendado para preenchimento de lembretes no papel.
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Carregando candidatos e pontuações da colinha...
              </div>
            ) : (
              <div
                className="colinha-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '16px',
                }}
              >
                {ELECTION_SEATS.map((seat) => {
                  const selection = getSeatSelection(seat);

                  return (
                    <div
                      key={seat.id}
                      className="colinha-seat-card"
                      style={{
                        background: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            marginBottom: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>{seat.cargoTitle} ({seat.seatName})</span>
                          <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{seat.digitCount} dígitos</span>
                        </div>

                        {selection.status === 'EMPTY' && (
                          <div
                            style={{
                              textAlign: 'center',
                              padding: '24px 16px',
                              background: 'var(--bg-tertiary)',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px dashed var(--border-subtle)',
                            }}
                          >
                            <UserX size={32} style={{ color: 'var(--text-dim)', marginBottom: '8px' }} />
                            <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                              Analise os candidatos e pontue-os de acordo com o seu criterio para gerar a sua colinha da eleicao
                            </p>
                            <button
                              onClick={() => onGoToDashboard(seat.cargoCode)}
                              className="no-print"
                              style={{
                                fontSize: '0.75rem',
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-strong)',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                              }}
                            >
                              Explorar Candidatos
                            </button>
                          </div>
                        )}

                        {selection.status === 'SINGLE' && selection.candidate && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              padding: '12px',
                              background: 'var(--bg-tertiary)',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: '44px',
                                  height: '44px',
                                  borderRadius: '50%',
                                  background: 'var(--border-subtle)',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {selection.candidate.photoUrl ? (
                                  <img
                                    src={selection.candidate.photoUrl}
                                    alt={selection.candidate.popularName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                                    {selection.candidate.popularName.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                  {selection.candidate.popularName}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  {selection.candidate.party} • {selection.candidate.state}
                                </div>
                              </div>
                            </div>

                            <div
                              style={{
                                textAlign: 'right',
                                background: 'var(--bg-primary)',
                                border: '2px solid var(--text-main)',
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-sm)',
                                flexShrink: 0,
                              }}
                            >
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                                Número
                              </div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.05em', color: 'var(--text-main)' }}>
                                {getCandidateDisplayNumber(selection.candidate, seat.digitCount)}
                              </div>
                            </div>
                          </div>
                        )}

                        {selection.status === 'TIE' && selection.candidates && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-main)',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-subtle)',
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <AlertTriangle size={14} />
                              <span>Empate técnico entre {selection.candidates.length} candidatos ({selection.maxScore} pts). Escolha um:</span>
                            </div>

                            {selection.candidates.map((cand) => {
                              const isChosen =
                                selectedSeatCandidates[seat.id] === cand.id ||
                                (!selectedSeatCandidates[seat.id] && cand.id === selection.candidates![0].id);

                              return (
                                <div
                                  key={cand.id}
                                  onClick={() => handleSelectTieCandidate(seat.id, cand.id)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 12px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: isChosen ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                                    border: isChosen ? '2px solid var(--text-main)' : '1px solid var(--border-subtle)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div
                                      style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        border: isChosen ? '5px solid var(--text-main)' : '2px solid var(--border-strong)',
                                        background: 'var(--bg-primary)',
                                      }}
                                    />
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                                        {cand.popularName}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {cand.party} • {cand.state}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                    {getCandidateDisplayNumber(cand, seat.digitCount)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="no-print">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={22} style={{ color: 'var(--text-main)' }} /> Minhas Avaliações e Perfil
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                background: 'var(--bg-secondary)',
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Candidatos Avaliados
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                {totalEvaluatedCandidates}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-secondary)',
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Candidatos no Banco
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                {totalCandidatesInDb || candidates.length}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-secondary)',
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Eleição Ativa
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                2026
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '20px',
            }}
          >
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', fontWeight: 700 }}>
              Próximos Passos de Avaliação
            </h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Navegue pelo Dashboard por cargo, explore o dossiê de cada candidato e utilize o controle de <strong>+</strong> e <strong>-</strong> para pontuar os candidatos que melhor representam seus valores.
            </p>
            <button
              onClick={() => onGoToDashboard()}
              className="btn btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
            >
              <span>Ir para o Dashboard de Candidatos</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </section>

        {/* SESSION: Sair da Conta (Placed right above Danger Zone) */}
        <section className="no-print" style={{ marginTop: '32px' }}>
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 800 }}>
                Encerrar Sessão
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Desconecte com segurança da sua conta Criterium no dispositivo atual.
              </p>
            </div>

            <button
              onClick={logout}
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 700,
                fontSize: '0.88rem',
              }}
            >
              <LogOut size={16} />
              <span>Sair da Conta</span>
            </button>
          </div>
        </section>

        <section className="no-print" style={{ marginTop: '24px' }}>
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-strong)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <AlertOctagon size={22} color="var(--text-main)" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                Área de Risco — Exclusão da Conta
              </h3>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              A exclusão da sua conta é uma ação <strong>permanente e irreversível</strong>. Todos os seus dados de perfil, histórico de pontuações manuais e preferências salvas serão permanentemente apagados do nosso banco de dados.
            </p>
            <button
              onClick={() => {
                setTypedEmailConfirm('');
                setDeleteError(null);
                setIsDeleteModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-primary)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-strong)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={16} />
              <span>Deletar Minha Conta Permanentemente</span>
            </button>
          </div>
        </section>
      </div>

      {isDeleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '1.1rem' }}>
                <AlertOctagon size={22} />
                <span>Excluir Conta Permanentemente?</span>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
              Esta ação apaga <strong>todos os seus dados e avaliações</strong> definitivamente. Para confirmar, digite seu e-mail exacto (<strong style={{ color: 'var(--text-main)' }}>{user.email}</strong>) no campo abaixo:
            </p>

            <div style={{ marginBottom: '20px' }}>
              <input
                type="email"
                value={typedEmailConfirm}
                onChange={(e) => setTypedEmailConfirm(e.target.value)}
                placeholder={user.email}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            {deleteError && (
              <div style={{ color: 'var(--text-main)', fontSize: '0.82rem', marginBottom: '16px', fontWeight: 600 }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="btn btn-outline"
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteAccount}
                disabled={typedEmailConfirm.trim().toLowerCase() !== user.email.toLowerCase() || isDeleting}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-full)',
                  background: typedEmailConfirm.trim().toLowerCase() === user.email.toLowerCase() ? 'var(--text-main)' : 'var(--border-subtle)',
                  color: typedEmailConfirm.trim().toLowerCase() === user.email.toLowerCase() ? 'var(--bg-primary)' : 'var(--text-muted)',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: typedEmailConfirm.trim().toLowerCase() === user.email.toLowerCase() && !isDeleting ? 'pointer' : 'not-allowed',
                  opacity: typedEmailConfirm.trim().toLowerCase() === user.email.toLowerCase() ? 1 : 0.6,
                }}
              >
                {isDeleting ? 'Deletando conta...' : 'Excluir Conta'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 8mm;
          }
          html, body {
            height: 100% !important;
            overflow: hidden !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          body * {
            visibility: hidden !important;
          }
          .colinha-print-area, .colinha-print-area * {
            visibility: visible !important;
          }
          .colinha-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-height: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .colinha-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 6px !important;
          }
          .colinha-seat-card {
            padding: 6px 10px !important;
            margin: 0 !important;
            border: 1.5px solid #000000 !important;
            background: #ffffff !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .colinha-header-banner {
            padding: 8px 12px !important;
            margin-bottom: 8px !important;
            border: 2px solid #000000 !important;
            background: #f9f9f9 !important;
          }
        }
      `}</style>
    </div>
  );
};
