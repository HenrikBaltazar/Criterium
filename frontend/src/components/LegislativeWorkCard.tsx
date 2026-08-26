import React from 'react';
import { FileText, Award, CheckCircle2, BookOpen } from 'lucide-react';
import { RatingControl } from './RatingControl';
import { SourceTooltip } from './SourceTooltip';

export interface LegislativeProposalItem {
  id: string;
  type: string;
  number: number;
  year: number;
  title: string;
  summary: string;
  status: string;
  isApproved: boolean;
  sourceUrl: string;
}

export interface RapporteurshipItem {
  id: string;
  proposalTitle: string;
  committee: string;
  status: string;
  sourceUrl: string;
}

export interface PublicLegislativeWorkData {
  source: 'CAMARA_DOS_DEPUTADOS' | 'SENADO_FEDERAL';
  sourceUrl: string;
  totalProposals: number;
  totalRapporteurs: number;
  approvedCount: number;
  effectivenessRate: number;
  proposals: LegislativeProposalItem[];
  rapporteurships: RapporteurshipItem[];
}

interface LegislativeWorkCardProps {
  legislativeData: PublicLegislativeWorkData;
  candidateId: string;
  getRating: (itemType: string, itemId?: string) => number;
  onRatingChanged: () => void;
  onRequireAuth: (actionDescription?: string) => void;
}

const LegislativeWorkCard: React.FC<LegislativeWorkCardProps> = ({
  legislativeData,
  candidateId,
  getRating,
  onRatingChanged,
  onRequireAuth,
}) => {
  if (
    !legislativeData ||
    ((!legislativeData.proposals || legislativeData.proposals.length === 0) &&
      (!legislativeData.rapporteurships || legislativeData.rapporteurships.length === 0))
  ) {
    return null;
  }

  const currentRating = getRating('PERFORMANCE', 'legislative_work');
  const sourceName = legislativeData.source === 'SENADO_FEDERAL' ? 'Senado Federal' : 'Câmara dos Deputados';

  return (
    <div
      className="glass-card"
      style={{
        padding: '24px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Cabeçalho do Card */}
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
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} className="desktop-icon-allow" />
            Produção Legislativa, PLs, PECs & Relatorias
            <SourceTooltip sourceUrl={legislativeData.sourceUrl} label={sourceName} />
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Propostas de Emenda à Constituição (PECs), Projetos de Lei (PLs) de autoria e relatorias em comissões temáticas.
          </div>
        </div>

        {/* RatingControl para a régua de produção legislativa geral */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RatingControl
            candidateId={candidateId}
            itemType="PERFORMANCE"
            itemId="legislative_work"
            currentRating={currentRating}
            onRatingChanged={onRatingChanged}
            onRequireAuth={onRequireAuth}
          />
        </div>
      </div>

      {/* Métricas Sintéticas de Produção e Efetividade */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          style={{
            background: 'var(--bg-tertiary)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Proposições Apresentadas</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
            {legislativeData.totalProposals} matérias
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-tertiary)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Relatorias Assumidas</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
            {legislativeData.totalRapporteurs} relatorias
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-tertiary)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={14} className="desktop-icon-allow" /> Efetividade Legislativa
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
            {legislativeData.approvedCount} aprovadas ({legislativeData.effectivenessRate}%)
          </div>
        </div>
      </div>

      {/* Lista de Projetos de Lei & PECs de Autoria */}
      {legislativeData.proposals && legislativeData.proposals.length > 0 && (
        <div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={16} className="desktop-icon-allow" /> Principais Projetos de Lei e PECs de Autoria
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {legislativeData.proposals.map((prop) => {
              const propRating = getRating('PROPOSAL', prop.id);

              return (
                <div
                  key={prop.id}
                  id={`proposal-item-${prop.id}`}
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{prop.title}</span>
                        <SourceTooltip sourceUrl={prop.sourceUrl} label="Tramitação Oficial no Congresso" />
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        Status oficial: <strong style={{ color: 'var(--text-main)' }}>{prop.status}</strong>
                      </div>
                    </div>

                    {/* RatingControl específico da matéria */}
                    <RatingControl
                      candidateId={candidateId}
                      itemType="PROPOSAL"
                      itemId={prop.id}
                      currentRating={propRating}
                      onRatingChanged={onRatingChanged}
                      onRequireAuth={onRequireAuth}
                    />
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    {prop.summary}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de Relatorias de Destaque */}
      {legislativeData.rapporteurships && legislativeData.rapporteurships.length > 0 && (
        <div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={16} className="desktop-icon-allow" /> Relatorias de Matérias em Comissões
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {legislativeData.rapporteurships.map((rel) => {
              const relRating = getRating('PERFORMANCE', rel.id);

              return (
                <div
                  key={rel.id}
                  id={`rapporteurship-item-${rel.id}`}
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Relatoria: {rel.proposalTitle}</span>
                      <SourceTooltip sourceUrl={rel.sourceUrl} label="Ficha da Relatoria" />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {rel.committee} — <strong>{rel.status}</strong>
                    </div>
                  </div>

                  <RatingControl
                    candidateId={candidateId}
                    itemType="PERFORMANCE"
                    itemId={rel.id}
                    currentRating={relRating}
                    onRatingChanged={onRatingChanged}
                    onRequireAuth={onRequireAuth}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LegislativeWorkCard;
