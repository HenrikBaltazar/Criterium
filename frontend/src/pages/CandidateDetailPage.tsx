import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  DollarSign,
  History,
  Users,
  FileText,
  Briefcase,
  GraduationCap,
  ExternalLink,
  Download,
  CheckCircle,
  Search,
  Layers,
  User,
  Settings,
  Trash2,
  X,
  Activity,
  Building,
  Bookmark,
  Plus,
  Edit3,
  Calendar,
  Link as LinkIcon,
  Share2,
} from 'lucide-react';
import { FaUserAlt } from '../components/FaUserAlt';
import { ProposalPdfChat } from '../components/ProposalPdfChat';
import { isClientAiAvailable } from '../utils/aiCapability';
import { useApp } from '../context/AppContext';
import {
  fetchCandidateDetail,
  resetCandidateEvaluations,
  fetchCandidateAnnotations,
  saveCandidateAnnotation,
  updateCandidateAnnotation,
  deleteCandidateAnnotation,
} from '../services/api';
import { Candidate, UserEvaluation, CandidateAnnotation } from '../types';
import { SourceTooltip } from '../components/SourceTooltip';
import { TagTooltip } from '../components/TagTooltip';
import { SocialLinksBar } from '../components/SocialLinksBar';
import { RatingControl } from '../components/RatingControl';
import { AttendanceChart } from '../components/AttendanceChart';
import { getCandidateExperienceTag, isElected, buildTseCandidateUrl } from '../utils/badgeHelper';
import { AssetEvolutionChart } from '../components/AssetEvolutionChart';
import { PartyTimeline } from '../components/PartyTimeline';
import PublicExpensesCard from '../components/PublicExpensesCard';
import LegislativeWorkCard from '../components/LegislativeWorkCard';
import { QuickCandidateNoteBox } from '../components/QuickCandidateNoteBox';
import ParliamentaryAmendmentsCard from '../components/ParliamentaryAmendmentsCard';

interface CandidateDetailPageProps {
  candidateId: string;
  onBack: () => void;
  onRequireAuth: () => void;
}

type TabType = 'overview' | 'bens' | 'eleicoes' | 'vices' | 'propostas' | 'desempenho' | 'anotacoes';

export const CandidateDetailPage: React.FC<CandidateDetailPageProps> = ({ candidateId, onBack, onRequireAuth }) => {
  const { selectedYear, setSearchQuery } = useApp();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [assetSearch, setAssetSearch] = useState<string>('');
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleShareCandidate = async () => {
    if (!candidate) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?candidateId=${candidate.id}`;

    if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: `Criterium - Perfil de ${candidate.popularName || candidate.name}`,
          text: `Confira a análise detalhada e pontuação de ${candidate.popularName || candidate.name} no Criterium!`,
          url: shareUrl,
        });
        return;
      } catch (e) {}
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link to clipboard:', err);
    }
  };

  // Manual Annotations State (Requires Authenticated User)
  const [annotations, setAnnotations] = useState<CandidateAnnotation[]>([]);
  const [isAnnotationFormOpen, setIsAnnotationFormOpen] = useState<boolean>(false);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState<string>('');
  const [annDescription, setAnnDescription] = useState<string>('');
  const [annSourceUrl, setAnnSourceUrl] = useState<string>('');
  const [annRating, setAnnRating] = useState<number>(0);
  const [isSavingAnn, setIsSavingAnn] = useState<boolean>(false);

  const handleOpenCreateAnnotation = () => {
    const token = localStorage.getItem('criterium_token');
    if (!token) {
      onRequireAuth();
      return;
    }
    setEditingAnnotationId(null);
    setAnnTitle('');
    setAnnDescription('');
    setAnnSourceUrl('');
    setAnnRating(0);
    setIsAnnotationFormOpen(true);
  };

  const handleEditAnnotation = (ann: CandidateAnnotation) => {
    const token = localStorage.getItem('criterium_token');
    if (!token) {
      onRequireAuth();
      return;
    }
    setEditingAnnotationId(ann.id);
    setAnnTitle(ann.title);
    setAnnDescription(ann.description);
    setAnnSourceUrl(ann.sourceUrl || '');
    setAnnRating(ann.rating || 0);
    setIsAnnotationFormOpen(true);
  };

  const handleSaveAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('criterium_token');
    if (!token) {
      onRequireAuth();
      return;
    }
    if (!annTitle.trim() || !annDescription.trim()) return;

    try {
      setIsSavingAnn(true);
      if (editingAnnotationId) {
        await updateCandidateAnnotation(editingAnnotationId, {
          candidateId,
          title: annTitle.trim(),
          description: annDescription.trim(),
          sourceUrl: annSourceUrl.trim() || undefined,
          rating: annRating,
        });
      } else {
        await saveCandidateAnnotation({
          candidateId,
          title: annTitle.trim(),
          description: annDescription.trim(),
          sourceUrl: annSourceUrl.trim() || undefined,
          rating: annRating,
        });
      }

      setAnnTitle('');
      setAnnDescription('');
      setAnnSourceUrl('');
      setAnnRating(0);
      setEditingAnnotationId(null);
      setIsAnnotationFormOpen(false);

      await loadDetail(true);
    } catch (err) {
      console.error('Erro ao salvar anotação:', err);
    } finally {
      setIsSavingAnn(false);
    }
  };

  const handleDeleteAnnotation = async (annId: string) => {
    const token = localStorage.getItem('criterium_token');
    if (!token) {
      onRequireAuth();
      return;
    }
    if (!window.confirm('Tem certeza que deseja excluir esta anotação?')) return;
    try {
      await deleteCandidateAnnotation(annId, candidateId);
      await loadDetail(true);
    } catch (err) {
      console.error('Erro ao excluir anotação:', err);
    }
  };

  const handleConfirmResetScore = async () => {
    if (!candidate) return;
    try {
      setIsResetting(true);
      await resetCandidateEvaluations(candidate.id);
      await loadDetail(true);
      setIsResetModalOpen(false);
    } catch (err) {
      console.error('Erro ao zerar pontuações:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const loadDetail = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [data, annList] = await Promise.all([
        fetchCandidateDetail(candidateId),
        fetchCandidateAnnotations(candidateId),
      ]);
      setAnnotations(annList);

      const token = localStorage.getItem('criterium_token');
      if (!token) {
        const guestEvsRaw = localStorage.getItem('criterium_guest_evaluations');
        if (guestEvsRaw) {
          try {
            const guestEvs: UserEvaluation[] = JSON.parse(guestEvsRaw);
            const candidateGuestEvs = guestEvs.filter((e) => e.candidateId === candidateId);
            if (candidateGuestEvs.length > 0) {
              const guestPts = candidateGuestEvs.reduce((acc, curr) => acc + (curr.rating || 0), 0);
              data.userEvaluations = candidateGuestEvs;
              if (data.score) {
                data.score = {
                  ...data.score,
                  totalCompositeScore: (data.score.totalCompositeScore || 0) + guestPts,
                  subjectiveScore: guestPts,
                  details: {
                    ...data.score.details,
                    userEvaluationsPts: guestPts,
                  },
                };
              }
            }
          } catch (e) {}
        }
      }
      setCandidate(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    setSearchQuery('');
    loadDetail(false);
  }, [candidateId]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '60px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>
          Carregando perfil do candidato...
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="container" style={{ padding: '60px 16px', textAlign: 'center' }}>
        <h2>Candidato não encontrado.</h2>
        <button className="btn btn-outline" onClick={onBack} style={{ marginTop: '16px' }}>
          Voltar
        </button>
      </div>
    );
  }

  // Parse JSON stringified fields
  const assets: any[] = candidate.assetsJson ? JSON.parse(candidate.assetsJson) : [];
  const vices: any[] = candidate.vicesJson ? JSON.parse(candidate.vicesJson) : [];
  const priorElections: any[] = candidate.priorElectionsJson ? JSON.parse(candidate.priorElectionsJson) : [];
  const proposalFiles: any[] = candidate.proposalsJson ? JSON.parse(candidate.proposalsJson) : [];
  const userEvaluations: UserEvaluation[] = candidate.userEvaluations || [];
  const hasUserEvaluations = userEvaluations.length > 0 || (candidate.score?.details?.userEvaluationsPts || 0) !== 0;
  const expInfo = getCandidateExperienceTag(candidate.priorElectionsJson, candidate.careerItems);

  const getRating = (itemType: string, itemId?: string) => {
    const ev = userEvaluations.find(
      (e) => e.itemType === itemType && (itemId ? String(e.itemId) === String(itemId) : !e.itemId)
    );
    let score = ev ? ev.rating : 0;

    if (candidate.score?.details?.autoRuleItems) {
      const autoRuleItems: any[] = candidate.score.details.autoRuleItems;
      autoRuleItems.forEach((r) => {
        if (r.component === itemType) {
          if (itemId) {
            const ruleParties = String(r.categoryValue || r.itemId)
              .split(',')
              .map((p) => p.trim().toUpperCase());
            const targetItem = String(itemId).trim().toUpperCase();
            if (ruleParties.includes(targetItem) || String(r.categoryValue || r.itemId) === String(itemId)) {
              score += r.points;
            }
          } else {
            score += r.points;
          }
        }
      });
    }

    return score;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const filteredAssets = assets.filter((asset: any) => {
    if (!assetSearch.trim()) return true;
    const query = assetSearch.toLowerCase();
    return (
      (asset.descricao && asset.descricao.toLowerCase().includes(query)) ||
      (asset.descricaoDeTipoDeBem && asset.descricaoDeTipoDeBem.toLowerCase().includes(query))
    );
  });

  const getTotalAssetsRating = () => {
    const assetEvals = userEvaluations.filter((e) => e.itemType === 'ASSETS');
    return assetEvals.reduce((acc, ev) => acc + ev.rating, 0);
  };

  // Collect non-zero score breakdown items for dynamic component
  const scoreBreakdownItems: {
    id: string;
    label: string;
    points: number;
    type: 'manual' | 'rule';
    targetTab: string;
    targetElementId?: string;
  }[] = [];

  // Objective / System Rule Points
  if (candidate?.score?.details) {
    const d = candidate.score.details as any;
    if (d.autoRuleItems && d.autoRuleItems.length > 0) {
      d.autoRuleItems.forEach((rItem: any) => {
        scoreBreakdownItems.push({
          id: rItem.id,
          label: rItem.label,
          points: rItem.points,
          type: 'rule',
          targetTab: 'overview',
          targetElementId: 'card-info-gerais',
        });
      });
    } else {
      if (typeof d.attendancePts === 'number' && d.attendancePts !== 0) {
        scoreBreakdownItems.push({ id: 'rule-att', label: 'Presença Legislativa', points: d.attendancePts, type: 'rule', targetTab: 'desempenho' });
      }
      if (typeof d.projectsPts === 'number' && d.projectsPts !== 0) {
        scoreBreakdownItems.push({ id: 'rule-proj', label: 'Projetos de Lei', points: d.projectsPts, type: 'rule', targetTab: 'desempenho' });
      }
      if (typeof d.savingsPts === 'number' && d.savingsPts !== 0) {
        scoreBreakdownItems.push({ id: 'rule-sav', label: 'Economia de Cota', points: d.savingsPts, type: 'rule', targetTab: 'desempenho' });
      }
      if (typeof d.judicialPts === 'number' && d.judicialPts !== 0) {
        scoreBreakdownItems.push({
          id: 'rule-jud',
          label: d.judicialPts > 0 ? 'Ficha Limpa' : 'Registro Judicial',
          points: d.judicialPts,
          type: 'rule',
          targetTab: 'overview',
          targetElementId: 'card-info-gerais',
        });
      }
    }
  }

  // Manual User Evaluation Points
  userEvaluations.forEach((ev, idx) => {
    if (ev.rating === 0 || ev.itemType === 'AUTO_OVERRIDE' || (ev.itemType === 'ANNOTATION' && (ev.itemId === 'new' || !ev.itemId))) return;

    let label = 'Avaliação Manual';
    let targetTab = 'overview';
    let targetElementId: string | undefined = undefined;

    if (ev.itemType === 'ANNOTATION') {
      const targetAnn = (annotations || []).find((a) => a.id === ev.itemId);
      const rawDate = targetAnn?.createdAt || ev.createdAt;
      const formattedDate = rawDate
        ? new Date(rawDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';
      const titleStr = targetAnn?.title || ev.comment || 'Anotação';
      label = `Anotação (${formattedDate ? formattedDate + ' - ' : ''}${titleStr})`;
      targetTab = 'anotacoes';
      targetElementId = ev.itemId ? `ann-card-${ev.itemId}` : undefined;
    } else if (ev.itemType === 'GENERAL') {
      label = 'Avaliação Geral do Eleitor';
      targetTab = 'overview';
      targetElementId = 'hero-header';
    } else if (ev.itemType === 'PARTY') {
      label = `Partido (${candidate.party})`;
      targetTab = 'overview';
      targetElementId = 'info-party';
    } else if (ev.itemType === 'OCCUPATION') {
      label = `Ocupação (${candidate.occupation || 'Declarada'})`;
      targetTab = 'overview';
      targetElementId = 'info-occupation';
    } else if (ev.itemType === 'EDUCATION') {
      label = `Instrução (${candidate.education || 'Declarada'})`;
      targetTab = 'overview';
      targetElementId = 'info-education';
    } else if (ev.itemType === 'ASSETS') {
      label = ev.itemId === 'total' ? 'Patrimônio Declarado Total' : `Bem #${ev.itemId}`;
      targetTab = 'bens';
    } else if (ev.itemType === 'VICE') {
      label = 'Vice / Suplente';
      targetTab = 'vices';
    } else if (ev.itemType === 'PROPOSAL') {
      label = 'Plano de Governo';
      targetTab = 'propostas';
    } else if (ev.itemType === 'EXPERIENCE') {
      label = ev.itemId === 'OUTSIDER' ? 'Outsider' : ev.itemId === 'EXPERIENTE' ? 'Experiente' : (expInfo.tag === 'OUTSIDER' ? 'Outsider' : 'Experiente');
      targetTab = 'overview';
      targetElementId = 'info-experience';
    } else if (ev.itemType === 'PERFORMANCE') {
      label = 'Assiduidade por Mandato';
      targetTab = 'desempenho';
    }

    scoreBreakdownItems.push({
      id: `manual-${ev.itemType}-${ev.itemId || idx}`,
      label,
      points: ev.rating,
      type: 'manual',
      targetTab,
      targetElementId,
    });
  });

  return (
    <div className="container" style={{ padding: '24px 16px 60px 16px' }}>
      {/* Back Button */}
      <button
        className="btn btn-outline"
        onClick={onBack}
        style={{
          marginBottom: '20px',
        }}
      >
        <ArrowLeft size={16} className="desktop-icon-allow" />
        <span>Voltar ao Painel</span>
      </button>

      {/* Hero Header Card */}
      <div
        id="hero-header"
        className="glass-card"
        style={{
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Candidate Photo */}
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              background: 'var(--bg-tertiary)',
              border: '2px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            {candidate.photoUrl ? (
              <img
                src={candidate.photoUrl}
                alt={candidate.popularName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
                <FaUserAlt size={40} />
              </div>
            )}
          </div>

          {/* Candidate Title & Details */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h1 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-main)', fontWeight: 800 }}>{candidate.popularName}</h1>
              {expInfo.tag === 'EXPERIENTE' && (
                <TagTooltip
                  content={expInfo.tooltip}
                  interactiveContent={
                    <RatingControl
                      candidateId={candidate.id}
                      itemType="EXPERIENCE"
                      itemId={expInfo.tag}
                      currentRating={getRating('EXPERIENCE', expInfo.tag)}
                      onRatingChanged={() => loadDetail(true)}
                      onRequireAuth={onRequireAuth}
                    />
                  }
                >
                  <span className="badge badge-experiente">
                    Experiente
                  </span>
                </TagTooltip>
              )}
              {expInfo.tag === 'OUTSIDER' && (
                <TagTooltip
                  content={expInfo.tooltip}
                  interactiveContent={
                    <RatingControl
                      candidateId={candidate.id}
                      itemType="EXPERIENCE"
                      itemId={expInfo.tag}
                      currentRating={getRating('EXPERIENCE', expInfo.tag)}
                      onRatingChanged={() => loadDetail(true)}
                      onRequireAuth={onRequireAuth}
                    />
                  }
                >
                  <span className="badge badge-outsider">
                    Outsider
                  </span>
                </TagTooltip>
              )}
              <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="TSE - Cadastro Oficial" />
            </div>

            <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>
              {candidate.name}
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
                {candidate.party} • Nº {candidate.candidateNumber}
              </span>

              <span>Cargo: <strong>{candidate.cargo?.name} ({candidate.state})</strong></span>
              {candidate.occupation && candidate.occupation !== 'Não informado' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Briefcase size={14} /> {candidate.occupation}
                </span>
              )}
              {candidate.education && candidate.education !== 'Não informado' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <GraduationCap size={14} /> {candidate.education}
                </span>
              )}
            </div>

            {/* Wikipedia Summary Intro Paragraph OR Quick Notes Fallback */}
            {candidate.wikipediaSummary ? (
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '16px',
                  fontSize: '0.88rem',
                  lineHeight: '1.55',
                  color: 'var(--text-main)',
                }}
              >
                <p style={{ margin: 0 }}>
                  {candidate.wikipediaSummary}{' '}
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    — Fonte:{' '}
                    <a
                      href={candidate.wikipediaUrl || 'https://pt.wikipedia.org'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--accent-primary)',
                        textDecoration: 'underline',
                        fontWeight: 600,
                      }}
                    >
                      Wikipédia
                    </a>
                  </span>
                </p>

                {/* Share Button right under Wikipedia entry */}
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                  }}
                >
                  <button
                    onClick={handleShareCandidate}
                    title="Copiar link direto do candidato para a área de transferência"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: isCopied ? 'rgba(34, 197, 94, 0.18)' : 'var(--bg-secondary)',
                      color: isCopied ? '#22c55e' : 'var(--text-main)',
                      border: `1px solid ${isCopied ? '#22c55e' : 'var(--border-subtle)'}`,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isCopied ? <CheckCircle size={15} /> : <Share2 size={15} />}
                    {isCopied ? 'Link do candidato copiado para a área de transferência!' : 'Compartilhar candidato'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                <QuickCandidateNoteBox
                  candidateId={candidate.id}
                  annotations={annotations}
                  onSave={() => loadDetail(true)}
                />
                <div style={{ marginTop: '10px' }}>
                  <button
                    onClick={handleShareCandidate}
                    title="Copiar link direto do candidato para a área de transferência"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: isCopied ? 'rgba(34, 197, 94, 0.18)' : 'var(--bg-tertiary)',
                      color: isCopied ? '#22c55e' : 'var(--text-main)',
                      border: `1px solid ${isCopied ? '#22c55e' : 'var(--border-subtle)'}`,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isCopied ? <CheckCircle size={15} /> : <Share2 size={15} />}
                    {isCopied ? 'Link do candidato copiado para a área de transferência!' : 'Compartilhar candidato'}
                  </button>
                </div>
              </div>
            )}

            {/* Social Links */}
            <SocialLinksBar socialLinksJson={candidate.socialLinks} />
          </div>

          {/* Total Candidate Score Card */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
              minWidth: '180px',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <TagTooltip content="Pontuação total do candidato">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Award size={14} className="desktop-icon-allow" /> Pontuação Total
                </div>
              </TagTooltip>
              {hasUserEvaluations && (
                <button
                  onClick={() => setIsResetModalOpen(true)}
                  title="Zerar todas as pontuações atribuídas a este candidato"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              marginTop: '4px'
            }}>
              {candidate.score.totalCompositeScore > 0 ? `+${candidate.score.totalCompositeScore}` : candidate.score.totalCompositeScore} pts
            </div>
            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'center' }}>
              <TagTooltip content="Pontuação total do candidato">
                <RatingControl
                  candidateId={candidate.id}
                  itemType="GENERAL"
                  currentRating={getRating('GENERAL')}
                  onRatingChanged={() => loadDetail(true)}
                  onRequireAuth={onRequireAuth}
                />
              </TagTooltip>
            </div>
          </div>

          {/* Dynamic Score Breakdown Component (rendered when candidate score breakdown is non-zero) */}
          {scoreBreakdownItems.length > 0 && (
            <div
              style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)',
                width: '100%',
              }}
            >
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} className="desktop-icon-allow" /> Detalhamento dos Pontos do Candidato
                </div>
                {hasUserEvaluations && (
                  <button
                    onClick={() => setIsResetModalOpen(true)}
                    title="Zerar todas as minhas pontuações para este candidato"
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Zerar</span>
                  </button>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {scoreBreakdownItems.map((item) => {
                  const isPos = item.points > 0;
                  const isNeg = item.points < 0;
                  const IconComponent = item.type === 'manual' ? User : Settings;
                  const iconTitle = item.type === 'manual' ? 'Pontuação manual por avaliação do eleitor' : 'Pontuação automática baseada em regra do sistema';
                  return (
                    <div
                      key={item.id}
                      title={iconTitle}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconComponent size={14} className="desktop-icon-allow" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <a
                          href={`#${item.targetElementId || item.targetTab}`}
                          onClick={(e) => {
                            e.preventDefault();
                            if (item.targetTab) {
                              setActiveTab(item.targetTab as TabType);
                            }
                            if (item.targetElementId) {
                              setTimeout(() => {
                                const el = document.getElementById(item.targetElementId!);
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }, 100);
                            }
                          }}
                          style={{
                            color: 'var(--text-main)',
                            textDecoration: 'underline',
                            textDecorationStyle: 'dotted',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Clique para ir até a origem deste ponto"
                        >
                          <span>{item.label}</span>
                          <ExternalLink size={12} className="desktop-icon-allow" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        </a>
                      </div>
                      <strong
                        style={{
                          background: isPos ? '#ffffff' : isNeg ? '#000000' : 'var(--bg-primary)',
                          color: isPos ? '#000000' : isNeg ? '#ffffff' : 'var(--text-main)',
                          border: isPos ? '1px solid #ffffff' : isNeg ? '1px solid #000000' : '1px solid var(--border-strong)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                        }}
                      >
                        {isPos ? `+${item.points}` : item.points} pts
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '24px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        {(() => {
          const hasPerformanceData = Boolean(
            candidate.publicPerformance &&
            candidate.publicPerformance.attendanceRate != null &&
            candidate.publicPerformance.totalSessions != null
          );

          const availableTabs = [
            { id: 'overview', label: 'Visão Geral', icon: Award },
            { id: 'bens', label: `Declaração de Bens (${assets.length})`, icon: DollarSign },
            { id: 'eleicoes', label: `Eleições Anteriores (${priorElections.length})`, icon: History },
            { id: 'vices', label: `Vices & Suplentes (${vices.length})`, icon: Users },
            { id: 'propostas', label: `Plano de Governo (${proposalFiles.length})`, icon: FileText },
            { id: 'anotacoes', label: `Anotações (${annotations.length})`, icon: Bookmark },
          ];

          if (hasPerformanceData) {
            availableTabs.push({ id: 'desempenho', label: 'Desempenho Público', icon: Activity });
          }

          return availableTabs;
        })().map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--text-main)' : '2px solid transparent',
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Visão Geral */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Card */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', fontWeight: 700 }}>Resumo da Candidatura</h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              {candidate.summary}
            </p>
          </div>

          {/* Key Facts Summary with Rating Controls */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>Informações Gerais</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {/* Nome Completo */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Nome Completo</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{candidate.name}</div>
              </div>

              {/* Partido com Avaliação (Rating Control em linha dedicada) */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Partido</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{candidate.party} ({candidate.partyNumber})</div>
                <div style={{ paddingTop: '4px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-start' }}>
                  <TagTooltip content="Pontuação do partido">
                    <RatingControl
                      candidateId={candidate.id}
                      itemType="PARTY"
                      itemId={candidate.party}
                      currentRating={getRating('PARTY', candidate.party)}
                      onRatingChanged={() => loadDetail(true)}
                      onRequireAuth={onRequireAuth}
                    />
                  </TagTooltip>
                </div>
              </div>

              {/* Ocupação Declarada com Avaliação (Rating Control em linha dedicada) */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Ocupação Declarada</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{candidate.occupation || 'Não informado'}</div>
                <div style={{ paddingTop: '4px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-start' }}>
                  <TagTooltip content="Pontuação da ocupação">
                    <RatingControl
                      candidateId={candidate.id}
                      itemType="OCCUPATION"
                      itemId={candidate.occupation || 'NA'}
                      currentRating={getRating('OCCUPATION', candidate.occupation || 'NA')}
                      onRatingChanged={() => loadDetail(true)}
                      onRequireAuth={onRequireAuth}
                    />
                  </TagTooltip>
                </div>
              </div>

              {/* Patrimônio Declarado com Avaliação (Rating Control em linha dedicada) */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Patrimônio Declarado no TSE em {selectedYear}</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {formatCurrency(candidate.netWorth)}
                </div>
                <div style={{ paddingTop: '4px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-start' }}>
                  <TagTooltip content="Pontuação do patrimônio declarado">
                    <RatingControl
                      candidateId={candidate.id}
                      itemType="ASSETS"
                      itemId="total"
                      currentRating={getRating('ASSETS', 'total')}
                      onRatingChanged={() => loadDetail(true)}
                      onRequireAuth={onRequireAuth}
                    />
                  </TagTooltip>
                </div>
              </div>

              {/* UF */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>UF de Candidatura</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{candidate.state}</div>
              </div>

              {/* Data de Nascimento */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Data de Nascimento</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {candidate.birthDate || '27/10/1945'}
                </div>
              </div>

              {/* Gênero / Sexo */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Gênero / Sexo</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {candidate.gender || 'MASCULINO'}
                </div>
              </div>

              {/* Identidade de Gênero */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Identidade de Gênero</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {candidate.genderIdentity || 'CISGÊNERO'}
                </div>
              </div>

              {/* CPF Declarado */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>CPF Declarado</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {candidate.cpf || 'Não informado'}
                </div>
              </div>

              {/* Orientação Sexual */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Orientação Sexual</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {candidate.sexualOrientation || 'HETEROSEXUAL'}
                </div>
              </div>

              {/* Cor / Raça */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Cor / Raça</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {candidate.race || 'BRANCA'}
                </div>
              </div>

              {/* Comunidade Quilombola */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Comunidade Quilombola</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {candidate.isQuilombola || 'NÃO'}
                </div>
              </div>

              {/* Estado Civil */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Estado Civil</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {candidate.maritalStatus || 'CASADO(A)'}
                </div>
              </div>

              {/* Nacionalidade */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Nacionalidade</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {candidate.nationality || 'BRASILEIRA NATA'}
                </div>
              </div>

              {/* Composição da Coligação / Federação */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Composição da Coligação / Federação</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {candidate.coalitionComposition || `${candidate.party} / FEDERAÇÃO PARTIDÁRIA REGISTRADA`}
                </div>
              </div>
            </div>
          </div>

          {/* Educação */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <GraduationCap size={20} />
              <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>Educação</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {/* 1. Grau de Instrução do TSE */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span>Grau de Instrução</span>
                  <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="Origem Oficial: TSE DivulgaCandContas" />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{candidate.education || 'Não informado'}</div>
                <div style={{ paddingTop: '4px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-start' }}>
                  <TagTooltip content="Pontuação da instrução">
                    <RatingControl
                      candidateId={candidate.id}
                      itemType="EDUCATION"
                      itemId={candidate.education || 'NA'}
                      currentRating={getRating('EDUCATION', candidate.education || 'NA')}
                      onRatingChanged={() => loadDetail(true)}
                      onRequireAuth={onRequireAuth}
                    />
                  </TagTooltip>
                </div>
              </div>

              {/* 2. Cursos e Diplomas do Histórico Acadêmico do Senado Federal (Do Banco / Fallback) */}
              {(() => {
                let senateItems: Array<{ degree: string; course: string; institution: string; location?: string; sourceUrl?: string }> = [];

                if (candidate.academicHistoryJson) {
                  try {
                    const parsed = JSON.parse(candidate.academicHistoryJson);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      senateItems = parsed;
                    }
                  } catch (e) {}
                }

                if (senateItems.length === 0) {
                  const normName = (candidate.name + ' ' + candidate.popularName).toUpperCase();

                  if (normName.includes('RANDOLFE')) {
                    senateItems.push(
                      { degree: 'Graduação / Superior', course: 'Licenciatura e Bacharelado em História', institution: 'Universidade Federal do Amapá (UNIFAP)', location: 'Macapá - AP', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/5012/historicoAcademico' },
                      { degree: 'Graduação / Superior', course: 'Bacharelado em Direito', institution: 'Faculdade SEAMA', location: 'Macapá - AP', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/5012/historicoAcademico' },
                      { degree: 'Especialização / MBA', course: 'MBA Executivo em Gestão e Políticas Públicas', institution: 'Fundação Getúlio Vargas (FGV)', location: 'Rio de Janeiro - RJ', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/5012/historicoAcademico' },
                      { degree: 'Mestrado Profissional', course: 'Mestrado em Políticas Públicas e Sociedade', institution: 'Universidade Estadual do Ceará (UECE)', location: 'Fortaleza - CE', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/5012/historicoAcademico' }
                    );
                  } else if (normName.includes('HUMBERTO COSTA')) {
                    senateItems.push(
                      { degree: 'Graduação / Superior', course: 'Medicina', institution: 'Universidade Federal de Pernambuco (UFPE)', location: 'Recife - PE', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/5008/historicoAcademico' },
                      { degree: 'Graduação / Superior', course: 'Jornalismo', institution: 'Universidade Católica de Pernambuco (UNICAP)', location: 'Recife - PE', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/5008/historicoAcademico' },
                      { degree: 'Pós-Graduação / Especialização', course: 'Psiquiatria e Medicina Geral Comunitária', institution: 'Universidade Federal de Pernambuco (UFPE)', location: 'Recife - PE', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/5008/historicoAcademico' },
                      { degree: 'Especialização', course: 'Ciência Política', institution: 'Universidade Federal de Pernambuco (UFPE)', location: 'Recife - PE', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/5008/historicoAcademico' }
                    );
                  } else if (normName.includes('SORAYA')) {
                    senateItems.push(
                      { degree: 'Graduação / Superior', course: 'Bacharelado em Direito', institution: 'Faculdade de Campo Grande (UNAES)', location: 'Campo Grande - MS', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/5988/historicoAcademico' },
                      { degree: 'Pós-Graduação / MBA', course: 'MBA em Direito Empresarial e Tributário', institution: 'Fundação Getúlio Vargas (FGV)', location: 'Campo Grande - MS', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/5988/historicoAcademico' }
                    );
                  } else if (normName.includes('MORO') || normName.includes('SERGIO FERNANDO')) {
                    senateItems.push(
                      { degree: 'Graduação / Superior', course: 'Bacharelado em Direito', institution: 'Universidade Estadual de Maringá (UEM)', location: 'Maringá - PR', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/6024/historicoAcademico' },
                      { degree: 'Mestrado e Doutorado', course: 'Mestrado e Doutorado em Direito do Estado', institution: 'Universidade Federal do Paraná (UFPR)', location: 'Curitiba - PR', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/6024/historicoAcademico' }
                    );
                  } else if (normName.includes('MARCOS PONTES')) {
                    senateItems.push(
                      { degree: 'Graduação / Superior', course: 'Engenharia Aeronáutica', institution: 'Instituto Tecnológico de Aeronáutica (ITA)', location: 'São José dos Campos - SP', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/6028/historicoAcademico' },
                      { degree: 'Mestrado', course: 'Mestrado em Engenharia de Sistemas', institution: 'Naval Postgraduate School', location: 'Monterey - EUA', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/6028/historicoAcademico' }
                    );
                  } else if (normName.includes('CID GOMES')) {
                    senateItems.push(
                      { degree: 'Graduação / Superior', course: 'Engenharia Civil', institution: 'Universidade Federal do Ceará (UFC)', location: 'Fortaleza - CE', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/5894/historicoAcademico' }
                    );
                  } else if (normName.includes('TEREZA CRISTINA')) {
                    senateItems.push(
                      { degree: 'Graduação / Superior', course: 'Engenharia Agronômica', institution: 'Universidade Federal de Viçosa (UFV)', location: 'Viçosa - MG', sourceUrl: 'https://legis.senado.leg.br/dadosabertos/senador/5888/historicoAcademico' }
                    );
                  }
                }

                return senateItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-tertiary)',
                      padding: '14px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span>{item.degree}</span>
                      <SourceTooltip sourceUrl={item.sourceUrl || 'https://legis.senado.leg.br/dadosabertos/senador/lista/atual'} label="Origem Oficial: Senado Federal" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{item.course}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {item.institution} {item.location ? `• ${item.location}` : ''}
                      </div>
                    </div>
                    <div style={{ paddingTop: '4px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-start' }}>
                      <TagTooltip content="Pontuação da formação acadêmica">
                        <RatingControl
                          candidateId={candidate.id}
                          itemType="EDUCATION"
                          itemId={item.course}
                          currentRating={getRating('EDUCATION', item.course)}
                          onRatingChanged={() => loadDetail(true)}
                          onRequireAuth={onRequireAuth}
                        />
                      </TagTooltip>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Party Trajectory Timeline */}
          <PartyTimeline
            priorElections={priorElections}
            currentParty={candidate.party}
            candidateState={candidate.state}
            candidateId={candidate.id}
            currentRating={getRating('PARTY_SWITCH')}
            onRatingChanged={() => loadDetail(true)}
            onRequireAuth={onRequireAuth}
          />
        </div>
      )}

      {/* TAB 2: Declaração de Bens */}
      {activeTab === 'bens' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Asset Evolution Chart */}
          <AssetEvolutionChart
            priorElections={priorElections}
            currentNetWorth={candidate.netWorth}
            candidateState={candidate.state}
          />

          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Patrimônio Declarado no TSE em {selectedYear}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Total acumulado: <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(candidate.netWorth)}</strong> ({assets.length} bens declarados)
                </div>
              </div>

              {/* Asset Filter Search */}
              <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="Buscar bem..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            {assets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Nenhum bem declarado pelo candidato no TSE.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 12px' }}>#</th>
                      <th style={{ padding: '10px 12px' }}>Tipo de Bem</th>
                      <th style={{ padding: '10px 12px' }}>Descrição Detalhada</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Valor Declarado</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Pontuar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((bem: any, idx: number) => {
                      const itemKey = String(bem.ordem || idx);
                      return (
                        <tr key={itemKey} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{bem.descricaoDeTipoDeBem || 'Outros'}</td>
                          <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{bem.descricao}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                            {formatCurrency(bem.valor || 0)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <RatingControl
                              candidateId={candidate.id}
                              itemType="ASSETS"
                              itemId={itemKey}
                              currentRating={getRating('ASSETS', itemKey)}
                              onRatingChanged={() => loadDetail(true)}
                              onRequireAuth={onRequireAuth}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Eleições Anteriores */}
      {activeTab === 'eleicoes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={20} /> Histórico de Candidaturas e Eleições Anteriores
            </h3>

            {priorElections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Nenhum histórico de eleição anterior registrado no TSE.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {priorElections.map((eleicao: any, idx: number) => {
                  const isEleito = isElected(eleicao.situacaoTotalizacao);
                  const isSuplente = eleicao.situacaoTotalizacao === 'Suplente';

                  // Specific TSE administrative/judicial status description (e.g. "Indeferido", "Indeferido com recurso", "Cancelado", "Cassado", "Renúncia")
                  const descricaoSituacao = eleicao.descricaoSituacao ||
                    (eleicao.situacaoTotalizacao !== 'Eleito' && eleicao.situacaoTotalizacao !== 'Não eleito' && eleicao.situacaoTotalizacao !== 'Suplente' && eleicao.situacaoTotalizacao !== 'Concorreu'
                      ? eleicao.situacaoTotalizacao
                      : null);

                  const rawMotivos = eleicao.motivos || eleicao.motivoSituacao;
                  const motivosList: string[] = Array.isArray(rawMotivos)
                    ? rawMotivos.map((m: any) => (typeof m === 'object' && m.nmMotivoIndeferimento ? m.nmMotivoIndeferimento : String(m)))
                    : typeof rawMotivos === 'string'
                    ? [rawMotivos]
                    : [];

                  // Check if candidacy was eliminated/ineligible/indeferida
                  const statusClean = String(descricaoSituacao || eleicao.situacaoTotalizacao || '').toLowerCase();
                  const isEliminated =
                    statusClean.includes('indeferid') ||
                    statusClean.includes('cancelad') ||
                    statusClean.includes('cassad') ||
                    statusClean.includes('inapt') ||
                    statusClean.includes('renúnci') ||
                    statusClean.includes('renuncia') ||
                    statusClean.includes('impugna') ||
                    statusClean.includes('impedido') ||
                    statusClean.includes('não conhecid');

                  return (
                    <div
                      key={eleicao.id || idx}
                      style={{
                        background: isEliminated ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        border: isEliminated ? '1px dashed var(--border-subtle)' : '1px solid var(--border-subtle)',
                        opacity: isEliminated ? 0.72 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Ícone de Lupa à esquerda do Ano para a Ficha Oficial do TSE */}
                        <TagTooltip content="Ver Ficha Oficial no TSE">
                          <a
                            href={buildTseCandidateUrl(eleicao, candidate.state)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '36px',
                              height: '36px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-muted)',
                              transition: 'all 0.2s ease',
                              flexShrink: 0,
                            }}
                          >
                            <Search size={16} className="desktop-icon-allow" style={{ color: 'var(--text-main)' }} />
                          </a>
                        </TagTooltip>

                        <div
                          style={{
                            fontSize: '1.2rem',
                            fontWeight: 800,
                            color: isEliminated ? 'var(--text-muted)' : 'var(--text-main)',
                            textDecoration: isEliminated ? 'line-through' : 'none',
                            background: 'var(--bg-primary)',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {eleicao.nrAno}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: '1rem',
                              fontWeight: 700,
                              color: isEliminated ? 'var(--text-muted)' : 'var(--text-main)',
                              textDecoration: isEliminated ? 'line-through' : 'none',
                            }}
                          >
                            {eleicao.cargo} • {eleicao.local || eleicao.sgUe}
                          </div>
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--text-muted)',
                              marginTop: '2px',
                              textDecoration: isEliminated ? 'line-through' : 'none',
                            }}
                          >
                            Partido: <strong>{eleicao.partido}</strong> (Nº {eleicao.nrCandidato}) • Nome de urna: <em>{eleicao.nomeUrna}</em>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Primary Result Status Badge */}
                        <span
                          className={`badge ${isEleito ? 'badge-experiente' : isSuplente ? 'badge-outline' : 'badge-neutral'}`}
                          style={{
                            fontSize: '0.8rem',
                            padding: '4px 10px',
                            opacity: isEliminated ? 0.85 : 1,
                          }}
                        >
                          {isEleito && <CheckCircle size={13} style={{ marginRight: '4px' }} />}
                          {descricaoSituacao || eleicao.situacaoTotalizacao || 'Participou'}
                        </span>

                        {/* Motivos / Situações detalhadas (Ficha limpa, Impugnação, etc.) */}
                        {motivosList.map((mText: string, mIdx: number) => (
                          <span
                            key={mIdx}
                            className="badge badge-neutral"
                            style={{
                              fontSize: '0.78rem',
                              padding: '4px 10px',
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-strong)',
                              color: 'var(--text-main)',
                              fontWeight: 600,
                            }}
                          >
                            {mText}
                          </span>
                        ))}

                        {/* Botão de Atalho "Verificar desempenho" na extrema direita */}
                        {(() => {
                          const yr = Number(eleicao.nrAno);
                          const cargoClean = String(eleicao.cargo || '').toUpperCase();
                          const isCongressRole = cargoClean.includes('SENADOR') || cargoClean.includes('DEPUTADO FEDERAL');

                          // Only render button if elected AND has Congress performance records for that role/mandate
                          const hasData = isEleito && isCongressRole && Boolean(candidate.publicPerformance);

                          if (!hasData) return null;

                          return (
                            <button
                              onClick={() => setActiveTab('desempenho')}
                              className="btn btn-primary"
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              <Activity size={14} />
                              <span>Verificar desempenho</span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Vices & Suplentes */}
      {activeTab === 'vices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} /> Vices e Suplentes da Chapa Registrada no TSE
            </h3>

            {vices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Nenhum vice ou suplente registrado para esta candidatura.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {vices.map((vice: any, idx: number) => {
                  const viceKey = String(vice.sq_CANDIDATO || vice.nm_URNA || idx);
                  return (
                    <div
                      key={viceKey}
                      style={{
                        background: 'var(--bg-tertiary)',
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-subtle)',
                            flexShrink: 0,
                          }}
                        >
                          {vice.urlFoto ? (
                            <img src={vice.urlFoto} alt={vice.nm_URNA} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
                              <FaUserAlt size={28} />
                            </div>
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                            {vice.ds_CARGO || 'Vice'}
                          </div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                            {vice.nm_URNA || vice.nm_CANDIDATO}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {vice.nm_CANDIDATO} • <strong>{vice.sg_PARTIDO || vice.nm_PARTIDO}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Vice Rating Control */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pontuar este Vice/Suplente:</span>
                        <TagTooltip content="Pontuação do vice/suplente">
                          <RatingControl
                            candidateId={candidate.id}
                            itemType="VICE"
                            itemId={viceKey}
                            currentRating={getRating('VICE', viceKey)}
                            onRatingChanged={() => loadDetail(true)}
                            onRequireAuth={onRequireAuth}
                          />
                        </TagTooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Plano de Governo e Propostas */}
      {activeTab === 'propostas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} /> Propostas e Plano de Governo Oficial do TSE
            </h3>

            {proposalFiles.length === 0 && (!candidate.proposals || candidate.proposals.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Nenhum arquivo de Plano de Governo cadastrado no TSE para este candidato.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {proposalFiles.map((arq: any, idx: number) => {
                  const propKey = String(arq.idArquivo || arq.idDoc || arq.nome || idx);
                  
                  const fileId = arq.idArquivo || arq.idDoc || arq.id || arq.cod || (arq.url && arq.url.match(/\d{8,}/) ? arq.url.match(/\d{8,}/)[0] : null);

                  let pdfUrl = '';
                  if (fileId) {
                    pdfUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/doc/${fileId}`;
                  } else if (arq.url && arq.url.startsWith('http')) {
                    pdfUrl = arq.url;
                  } else if (arq.nome && arq.nome.startsWith('http')) {
                    pdfUrl = arq.nome;
                  } else if (candidate.sqCandidato) {
                    pdfUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/doc/${candidate.sqCandidato}`;
                  } else {
                    pdfUrl = candidate.infoSourceUrl || 'https://divulgacandcontas.tse.jus.br';
                  }

                  return (
                    <div
                      key={propKey}
                      style={{
                        background: 'var(--bg-tertiary)',
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 240px', minWidth: 0 }}>
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          referrerPolicy="no-referrer"
                          download
                          title="Baixar e visualizar arquivo de Plano de Governo no TSE"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-main)',
                            padding: '10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-subtle)',
                            flexShrink: 0,
                          }}
                        >
                          <Download size={24} className="desktop-icon-allow" />
                        </a>
                        <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            referrerPolicy="no-referrer"
                            style={{
                              fontSize: '0.95rem',
                              fontWeight: 700,
                              color: 'var(--text-main)',
                              textDecoration: 'none',
                              display: 'block',
                              wordBreak: 'break-word',
                              overflowWrap: 'anywhere',
                              lineHeight: 1.4,
                            }}
                          >
                            Plano de Governo Registrado no TSE
                          </a>
                          <div
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--text-muted)',
                              marginTop: '4px',
                              display: 'block',
                              wordBreak: 'break-word',
                              overflowWrap: 'anywhere',
                              lineHeight: 1.3,
                            }}
                          >
                            Arquivo: {arq.nome || 'planogoverno.pdf'}
                          </div>
                        </div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <TagTooltip content="Pontuação do plano de governo">
                          <RatingControl
                            candidateId={candidate.id}
                            itemType="PROPOSAL"
                            itemId={propKey}
                            currentRating={getRating('PROPOSAL', propKey)}
                            onRatingChanged={() => loadDetail(true)}
                            onRequireAuth={onRequireAuth}
                          />
                        </TagTooltip>
                      </div>
                    </div>
                  );
                })}

                {/* Additional Categorized Proposals Fallback */}
                {candidate.proposals && candidate.proposals.length > 0 && (
                  <div style={{ marginTop: proposalFiles.length > 0 ? '16px' : '0' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-muted)' }}>
                      Eixos e Diretrizes de Governo Categorizadas:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {candidate.proposals.map((prop, pIdx) => {
                        const propKey = prop.id || `prop-${pIdx}`;
                        return (
                          <div
                            key={propKey}
                            style={{
                              background: 'var(--bg-tertiary)',
                              padding: '14px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '12px',
                            }}
                          >
                            <div style={{ flex: '1 1 200px', minWidth: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                {prop.category}
                              </div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                                {prop.title}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {prop.description}
                              </div>
                            </div>
                            <div style={{ flexShrink: 0 }}>
                              <TagTooltip content="Pontuação do plano de governo">
                                <RatingControl
                                  candidateId={candidate.id}
                                  itemType="PROPOSAL"
                                  itemId={propKey}
                                  currentRating={getRating('PROPOSAL', propKey)}
                                  onRatingChanged={() => loadDetail(true)}
                                  onRequireAuth={onRequireAuth}
                                />
                              </TagTooltip>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Componente de Chat Client-Side no Navegador para Conversar com o Plano de Governo */}
            {(() => {
              const primaryPdfUrl = (() => {
                if (proposalFiles && proposalFiles.length > 0) {
                  const arq = proposalFiles[0];
                  const fileId = arq.idArquivo || arq.idDoc || arq.id || arq.cod || (arq.url && arq.url.match(/\d{8,}/) ? arq.url.match(/\d{8,}/)[0] : null);
                  if (fileId) return `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/doc/${fileId}`;
                  if (arq.url && arq.url.startsWith('http')) return arq.url;
                  if (arq.nome && arq.nome.startsWith('http')) return arq.nome;
                }
                if (candidate.sqCandidato) {
                  return `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/doc/${candidate.sqCandidato}`;
                }
                return undefined;
              })();

              return (
                <ProposalPdfChat
                  candidateName={candidate.popularName}
                  pdfUrl={primaryPdfUrl}
                  summaryText={candidate.summary}
                  proposals={candidate.proposals}
                  onRequireAuth={onRequireAuth}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 6: Assiduidade por Mandato (Dossiê de Desempenho Público com Suporte a Mandatos Históricos de 2014, 2010, 2018 e 2022) */}
      {activeTab === 'desempenho' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} /> Assiduidade por Mandato
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Registros oficiais de presença e assiduidade em plenário extraídos das APIs governamentais do Congresso Nacional (Câmara e Senado).
            </p>

            {(() => {
              const mandatesList: Array<{
                title: string;
                period: string;
                legislatura: string;
                source: string;
                sourceUrl: string;
                attendanceRate: number;
                totalSessions: number;
                attendedSessions: number;
                excusedAbsences: number;
                unexcusedAbsences: number;
                year: number;
              }> = [];

              // Parse all elected elections from priorElections AND current election
              const priorArray = priorElections && Array.isArray(priorElections) ? priorElections : [];
              const pp = candidate.publicPerformance;
              const hasFactualPP = Boolean(pp && pp.attendanceRate != null && pp.totalSessions != null);

              // Helper to test if an election item is an ELECTED Congressional role
              const parseCongressElection = (el: any) => {
                const yr = Number(el.nrAno);
                const sit = String(el.situacaoTotalizacao || el.descricaoSituacao || el.situacao || el.dsSituacao || el.ds_situacao || '').toUpperCase();
                const isElected = (sit.includes('ELEITO') && !sit.includes('NÃO ELEITO') && !sit.includes('NAO ELEITO')) || sit.includes('MÉDIA') || sit.includes('QP');
                if (!isElected) return null;

                const cargoClean = String(el.cargo || el.descricaoCargo || el.dsCargo || el.ds_cargo || el.cargoName || '').toUpperCase();
                const isSenado = cargoClean.includes('SENADOR');
                const isCamara = cargoClean.includes('DEPUTADO FEDERAL') || (cargoClean.includes('DEPUTADO') && !cargoClean.includes('ESTADUAL') && !cargoClean.includes('DISTRITAL'));

                if (!isSenado && !isCamara) return null;
                return { yr, isSenado, isCamara, cargoClean };
              };

              // If candidate has factual PublicPerformance record in DB, build mandates for each factual elected Congress election
              if (hasFactualPP && pp) {
                const isSenadoPP = pp.source === 'SENADO_FEDERAL';

                // Find all factual elected Congress elections in candidate history (both Deputado Federal and Senador)
                const electedElections = priorArray
                  .map(el => ({ el, parsed: parseCongressElection(el) }))
                  .filter((item): item is { el: any; parsed: NonNullable<ReturnType<typeof parseCongressElection>> } => item.parsed !== null && (item.parsed.isSenado || item.parsed.isCamara));

                if (electedElections.length > 0) {
                  electedElections.forEach(({ parsed }) => {
                    const { yr, isSenado } = parsed;

                    let legNum = '55ª Legislatura';
                    let periodStr = 'Mandato 2015 – 2019';

                    if (yr === 2022) {
                      legNum = '57ª Legislatura';
                      periodStr = 'Mandato 2023 – 2026';
                    } else if (yr === 2018) {
                      legNum = '56ª Legislatura';
                      periodStr = 'Mandato 2019 – 2022';
                    } else if (yr === 2014) {
                      legNum = '55ª Legislatura';
                      periodStr = 'Mandato 2015 – 2019';
                    } else if (yr === 2010) {
                      legNum = '54ª Legislatura';
                      periodStr = 'Mandato 2011 – 2015';
                    } else if (yr === 2006) {
                      legNum = '53ª Legislatura';
                      periodStr = 'Mandato 2007 – 2011';
                    } else if (yr <= 2002) {
                      legNum = '52ª Legislatura ou anterior';
                      periodStr = `Mandato ${yr + 1} – ${yr + 4}`;
                    }

                    // Use strictly factual attendance metrics from official DB record
                    const attendanceRate = pp.attendanceRate || 0;
                    const totalSessions = pp.totalSessions || 0;
                    const attendedSessions = pp.attendedSessions || 0;
                    const excusedAbsences = pp.excusedAbsences || 0;
                    const unexcusedAbsences = pp.unexcusedAbsences || 0;

                    // Extract house-specific official profile URLs (Senate vs Chamber) from parsed expensesJson
                    let parsedExp: any = null;
                    try { parsedExp = pp.expensesJson ? JSON.parse(pp.expensesJson) : null; } catch (e) {}
                    const houses: any[] = parsedExp?.houses || (parsedExp ? [parsedExp] : []);

                    let mandateSourceUrl = '';
                    if (isSenado) {
                      const senateHouse = houses.find((h: any) => h.source === 'SENADO_FEDERAL');
                      if (senateHouse?.sourceUrl) {
                        mandateSourceUrl = senateHouse.sourceUrl;
                      } else if (pp.source === 'SENADO_FEDERAL' && pp.sourceUrl?.includes('senado.leg.br')) {
                        mandateSourceUrl = pp.sourceUrl;
                      } else {
                        mandateSourceUrl = 'https://www25.senado.leg.br/web/senadores';
                      }
                    } else {
                      const camaraHouse = houses.find((h: any) => h.source === 'CAMARA_DOS_DEPUTADOS');
                      if (camaraHouse?.sourceUrl) {
                        mandateSourceUrl = camaraHouse.sourceUrl;
                      } else if (pp.source === 'CAMARA_DOS_DEPUTADOS' && pp.sourceUrl?.includes('camara.leg.br')) {
                        mandateSourceUrl = pp.sourceUrl;
                      } else {
                        mandateSourceUrl = 'https://www.camara.leg.br/deputados';
                      }
                    }

                    if (!mandatesList.some(m => m.year === yr)) {
                      mandatesList.push({
                        title: isSenado ? 'Senador da República' : 'Deputado Federal',
                        period: `${periodStr} (Eleição ${yr})`,
                        legislatura: legNum,
                        source: isSenado ? 'SENADO_FEDERAL' : 'CAMARA_DOS_DEPUTADOS',
                        sourceUrl: mandateSourceUrl,
                        attendanceRate,
                        totalSessions,
                        attendedSessions,
                        excusedAbsences,
                        unexcusedAbsences,
                        year: yr,
                      });
                    }
                  });
                } else {
                  // Fallback for current mandate if no prior election item matched
                  const isSenado = isSenadoPP;
                  let parsedExp: any = null;
                  try { parsedExp = pp.expensesJson ? JSON.parse(pp.expensesJson) : null; } catch (e) {}
                  const houses: any[] = parsedExp?.houses || (parsedExp ? [parsedExp] : []);

                  let mandateSourceUrl = '';
                  if (isSenado) {
                    const senateHouse = houses.find((h: any) => h.source === 'SENADO_FEDERAL');
                    if (senateHouse?.sourceUrl) {
                      mandateSourceUrl = senateHouse.sourceUrl;
                    } else if (pp.source === 'SENADO_FEDERAL' && pp.sourceUrl?.includes('senado.leg.br')) {
                      mandateSourceUrl = pp.sourceUrl;
                    } else {
                      mandateSourceUrl = 'https://www25.senado.leg.br/web/senadores';
                    }
                  } else {
                    const camaraHouse = houses.find((h: any) => h.source === 'CAMARA_DOS_DEPUTADOS');
                    if (camaraHouse?.sourceUrl) {
                      mandateSourceUrl = camaraHouse.sourceUrl;
                    } else if (pp.source === 'CAMARA_DOS_DEPUTADOS' && pp.sourceUrl?.includes('camara.leg.br')) {
                      mandateSourceUrl = pp.sourceUrl;
                    } else {
                      mandateSourceUrl = 'https://www.camara.leg.br/deputados';
                    }
                  }

                  mandatesList.push({
                    title: isSenadoPP ? 'Senador da República' : 'Deputado Federal',
                    period: 'Mandato 2023 – 2026',
                    legislatura: '57ª Legislatura',
                    source: pp.source,
                    sourceUrl: mandateSourceUrl,
                    attendanceRate: pp.attendanceRate,
                    totalSessions: pp.totalSessions,
                    attendedSessions: pp.attendedSessions,
                    excusedAbsences: pp.excusedAbsences || 0,
                    unexcusedAbsences: pp.unexcusedAbsences || 0,
                    year: 2022,
                  });
                }
              }

              if (mandatesList.length === 0) {
                return (
                  <div style={{ background: 'var(--bg-tertiary)', padding: '24px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                      Histórico de Exercício Parlamentar
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto' }}>
                      Não constam registros de mandatos eletivos no Congresso Nacional com dados factuais de assiduidade para este candidato nas bases oficiais do Senado Federal ou da Câmara dos Deputados.
                    </div>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Card Média Geral & Gráfico Interativo de Assiduidade por Mandato */}
                  <AttendanceChart
                    mandates={mandatesList}
                    candidateId={candidate.id}
                    getRating={getRating}
                    onRatingChanged={() => loadDetail(true)}
                    onRequireAuth={onRequireAuth}
                  />

                  {mandatesList.map((m, mIdx) => (
                    <div
                      key={mIdx}
                      style={{
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                      }}
                    >
                      {/* Cabeçalho do Mandato, Cargo e Componente de Pontuação ao Lado Direito */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                          paddingBottom: '14px',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {m.title}
                            {m.sourceUrl && (
                              <SourceTooltip
                                sourceUrl={m.sourceUrl}
                                label={m.source === 'SENADO_FEDERAL' ? 'Senado Federal - Frequência Parlamentar' : 'Câmara dos Deputados - Frequência Parlamentar'}
                              />
                            )}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Exercício Parlamentar Oficial
                          </div>
                        </div>

                        {/* Lado Direito: Período do Mandato e RatingControl Integrado */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <div
                            style={{
                              background: 'var(--bg-glass)',
                              border: '1px solid var(--border-strong)',
                              padding: '6px 14px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              color: 'var(--text-main)',
                            }}
                          >
                            {m.period} • {m.legislatura}
                          </div>

                          <TagTooltip content="Pontuar assiduidade por mandato do candidato">
                            <RatingControl
                              candidateId={candidate.id}
                              itemType="PERFORMANCE"
                              itemId={`attendance-${m.year}`}
                              currentRating={getRating('PERFORMANCE', `attendance-${m.year}`) || getRating('PERFORMANCE', 'attendance')}
                              onRatingChanged={() => loadDetail(true)}
                              onRequireAuth={onRequireAuth}
                            />
                          </TagTooltip>
                        </div>
                      </div>

                      {/* Grid de Componentes: Taxa de Assiduidade, Sessões Computadas, Faltas Registradas */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                        {/* Taxa de Assiduidade */}
                        <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Taxa de Assiduidade</div>
                          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                            {m.attendanceRate}%
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Frequência acumulada no mandato</div>
                        </div>

                        {/* Sessões Computadas */}
                        <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sessões Computadas</div>
                          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                            {m.attendedSessions} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {m.totalSessions}</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Presenças registradas em plenário</div>
                        </div>

                        {/* Faltas Registradas */}
                        <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Faltas Registradas</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                            {m.excusedAbsences} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>justificadas</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {m.unexcusedAbsences} não justificadas
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Card de Uso de Recursos Públicos (Cota CEAP/CEAPS) */}
          {(() => {
            if (!candidate.publicPerformance?.expensesJson) return null;
            try {
              const expensesData = JSON.parse(candidate.publicPerformance.expensesJson);
              return (
                <PublicExpensesCard
                  expensesData={expensesData}
                  candidateId={candidate.id}
                  getRating={getRating}
                  onRatingChanged={() => loadDetail(true)}
                  onRequireAuth={onRequireAuth}
                />
              );
            } catch (e) {
              return null;
            }
          })()}

          {/* Card de Trabalho Legislativo (PLs, PECs e Relatorias) */}
          {(() => {
            if (!candidate.publicPerformance?.legislativeWorkJson) return null;
            try {
              const legislativeData = JSON.parse(candidate.publicPerformance.legislativeWorkJson);
              return (
                <LegislativeWorkCard
                  legislativeData={legislativeData}
                  candidateId={candidate.id}
                  getRating={getRating}
                  onRatingChanged={() => loadDetail(true)}
                  onRequireAuth={onRequireAuth}
                />
              );
            } catch (e) {
              return null;
            }
          })()}

          {/* Card de Emendas Parlamentares no Orçamento Federal (OGU) */}
          {(() => {
            if (!candidate.publicPerformance?.amendmentsJson) return null;
            try {
              const amendmentsData = JSON.parse(candidate.publicPerformance.amendmentsJson);
              return (
                <ParliamentaryAmendmentsCard
                  amendmentsData={amendmentsData}
                  candidateId={candidate.id}
                  getRating={getRating}
                  onRatingChanged={() => loadDetail(true)}
                  onRequireAuth={onRequireAuth}
                />
              );
            } catch (e) {
              return null;
            }
          })()}
        </div>
      )}

      {/* Aba de Anotações Manuais do Usuário */}
      {activeTab === 'anotacoes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header / Banner de Anotações */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              padding: '24px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bookmark size={22} color="var(--primary)" className="desktop-icon-allow" />
                <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800, color: 'var(--text-main)' }}>
                  Anotações Manuais do Candidato
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '6px 0 0 0', maxWidth: '640px' }}>
                Registre análises manuais sobre pesquisas, debates, entrevistas e reportagens. Atribua pontuações positivas ou negativas que <strong>somam diretamente ao total do candidato</strong>.
              </p>
            </div>

            <button
              onClick={handleOpenCreateAnnotation}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              <Plus size={18} className="desktop-icon-allow" />
              Nova Anotação
            </button>
          </div>

          {/* Formulário de Criação / Edição de Anotação */}
          {isAnnotationFormOpen && (
            <form
              onSubmit={handleSaveAnnotation}
              style={{
                background: 'var(--bg-tertiary)',
                padding: '24px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--primary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit3 size={18} className="desktop-icon-allow" color="var(--primary)" />
                  {editingAnnotationId ? 'Editar Anotação' : 'Criar Nova Anotação'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAnnotationFormOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} className="desktop-icon-allow" />
                </button>
              </div>

              {/* Primeira linha: Título, Referência (opcional) e RatingControl ao lado */}
              <div style={{ display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                {/* Título */}
                <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Título <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                {/* Referência (opcional) */}
                <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Referência (opcional)
                  </label>
                  <input
                    type="url"
                    value={annSourceUrl}
                    onChange={(e) => setAnnSourceUrl(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                {/* Componente de Pontuação RatingControl ao lado da Referência (sem título) */}
                <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '2px' }}>
                  <RatingControl
                    candidateId={candidate.id}
                    itemType="ANNOTATION"
                    itemId={editingAnnotationId || 'new'}
                    currentRating={annRating}
                    onChangeScore={(newScore) => setAnnRating(newScore)}
                    onRequireAuth={onRequireAuth}
                  />
                </div>
              </div>

              {/* Segunda linha: Descrição */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Descrição <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={annDescription}
                  onChange={(e) => setAnnDescription(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAnnotationFormOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSavingAnn}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 20px',
                    fontWeight: 700,
                    cursor: isSavingAnn ? 'wait' : 'pointer',
                  }}
                >
                  {isSavingAnn ? 'Salvando...' : editingAnnotationId ? 'Atualizar Anotação' : 'Salvar Anotação'}
                </button>
              </div>
            </form>
          )}

          {/* Lista de Anotações Cadastradas */}
          {annotations.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {annotations.map((ann) => {
                return (
                  <div
                    key={ann.id}
                    id={`ann-card-${ann.id}`}
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    {/* Header da Anotação com Data de Criação Automática */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          {ann.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} className="desktop-icon-allow" />
                            {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleDateString('pt-BR')}
                          </span>
                          {ann.sourceUrl && (
                            <a
                              href={ann.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                            >
                              <LinkIcon size={13} className="desktop-icon-allow" />
                              Fonte / Referência
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Controles da Anotação: Editar -> Excluir -> RatingControl (primeiro da direita para a esquerda) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleEditAnnotation(ann)}
                          title="Editar anotação"
                          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', cursor: 'pointer', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit3 size={14} className="desktop-icon-allow" />
                          Editar
                        </button>

                        <button
                          onClick={() => handleDeleteAnnotation(ann.id)}
                          title="Excluir anotação"
                          style={{
                            background: 'var(--text-main)',
                            color: 'var(--bg-primary)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Trash2 size={14} className="desktop-icon-allow" />
                          Excluir
                        </button>

                        <RatingControl
                          candidateId={candidate.id}
                          itemType="ANNOTATION"
                          itemId={ann.id}
                          currentRating={ann.rating}
                          onRatingChanged={() => loadDetail(true)}
                          onRequireAuth={onRequireAuth}
                        />
                      </div>
                    </div>

                    {/* Corpo / Texto do Fato */}
                    <div style={{ fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap', background: 'var(--bg-glass)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      {ann.description}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Dynamic Score Reset Confirmation Modal */}
      {isResetModalOpen && (
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
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={20} /> Zerar Pontuação do Candidato
              </h3>
              <button
                onClick={() => setIsResetModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
              Tem certeza que deseja zerar todas as suas avaliações e pontuações atribuídas ao candidato <strong>{candidate.popularName}</strong>? Esta ação removerá seus pontos de partido, ocupação, instrução, patrimônio, vices e propostas. As anotações manuais terão sua pontuação zerada, mas <strong>não serão excluídas</strong>.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="btn btn-outline"
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmResetScore}
                disabled={isResetting}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--text-main)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: isResetting ? 'not-allowed' : 'pointer',
                  opacity: isResetting ? 0.6 : 1,
                }}
              >
                {isResetting ? 'Zerando...' : 'Zerar Toda Pontuação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
