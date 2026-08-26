import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Candidate } from '../types';
import { SourceTooltip } from './SourceTooltip';
import { TagTooltip } from './TagTooltip';
import { RatingControl } from './RatingControl';
import { FaUserAlt } from './FaUserAlt';
import { getJudicialBadgeStatus, formatTseStatus, shouldRenderTseStatusBadge, getCandidateExperienceTag } from '../utils/badgeHelper';

interface CandidateCardProps {
  candidate: Candidate;
  rank: number;
  onSelect: (candidateId: string) => void;
  onRatingChanged?: () => void;
  onRequireAuth?: () => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({ candidate, rank, onSelect, onRatingChanged, onRequireAuth }) => {
  const { score } = candidate;
  const [imgSrc, setImgSrc] = useState<string | null>(candidate.photoUrl || null);
  const [imgFailed, setImgFailed] = useState<boolean>(false);

  const handleImgError = () => {
    try {
      const links = candidate.socialLinks ? JSON.parse(candidate.socialLinks) : {};
      if (links.instagram && !imgSrc?.includes('unavatar.io')) {
        const match = links.instagram.match(/instagram\.com\/([a-zA-Z0-9_\.]+)/);
        if (match && match[1]) {
          setImgSrc(`https://unavatar.io/instagram/${match[1]}`);
          return;
        }
      }
    } catch (e) {}
    setImgFailed(true);
  };

  const judicialStatus = getJudicialBadgeStatus((candidate as any).judicialRecords, candidate.status);

  let judicialBadge = null;
  if (judicialStatus === 'CONVICTED') {
    judicialBadge = (
      <span className="badge badge-alert">
        Condenado
      </span>
    );
  } else if (judicialStatus === 'UNDER_INVESTIGATION') {
    judicialBadge = (
      <span className="badge badge-outline">
        Investigado
      </span>
    );
  } else if (judicialStatus === 'CLEAN') {
    judicialBadge = (
      <span className="badge badge-neutral">
        Íntegro
      </span>
    );
  }

  // Political Experience Badge (Outsider / Experiente based on TSE election history)
  let experienceBadge = null;
  const expInfo = getCandidateExperienceTag(candidate.priorElectionsJson, candidate.careerItems);
  const userEvaluations = candidate.userEvaluations || [];
  const expEv = userEvaluations.find((e) => e.itemType === 'EXPERIENCE' && e.itemId === expInfo.tag);
  const currentExpRating = expEv ? expEv.rating : 0;

  if (expInfo.tag === 'EXPERIENTE') {
    experienceBadge = (
      <TagTooltip
        content={expInfo.tooltip}
        interactiveContent={
          <RatingControl
            candidateId={candidate.id}
            itemType="EXPERIENCE"
            itemId={expInfo.tag}
            currentRating={currentExpRating}
            onRatingChanged={onRatingChanged}
            onRequireAuth={onRequireAuth}
          />
        }
      >
        <span className="badge badge-experiente">
          Experiente
        </span>
      </TagTooltip>
    );
  } else if (expInfo.tag === 'OUTSIDER') {
    experienceBadge = (
      <TagTooltip
        content={expInfo.tooltip}
        interactiveContent={
          <RatingControl
            candidateId={candidate.id}
            itemType="EXPERIENCE"
            itemId={expInfo.tag}
            currentRating={currentExpRating}
            onRatingChanged={onRatingChanged}
            onRequireAuth={onRequireAuth}
          />
        }
      >
        <span className="badge badge-outsider">
          Outsider
        </span>
      </TagTooltip>
    );
  }

  const isNegative = score.totalCompositeScore < 0;

  // State (UF) inclusion for State scope cargos (GOVERNADOR, DEP_ESTADUAL)
  const isStateScope = candidate.cargo?.scope === 'ESTADUAL' ||
    ['GOVERNADOR', 'DEP_ESTADUAL'].includes(candidate.cargo?.code || '');

  const partyAndNumber = isStateScope
    ? `${candidate.party} • ${candidate.candidateNumber} • ${candidate.state}`
    : `${candidate.party} • ${candidate.candidateNumber}`;

  return (
    <div
      className="glass-card"
      onClick={() => onSelect(candidate.id)}
      style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'visible',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        minWidth: 0,
      }}
    >
      <div>
        {/* Top Rank, Verification Tooltip & Score Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: rank === 1 ? 'var(--text-main)' : 'var(--text-muted)',
              minWidth: '24px',
            }}>
              #{rank}
            </div>

            {/* Candidacy Verification Tooltip on Dashboard Card */}
            <SourceTooltip sourceUrl={candidate.infoSourceUrl} label="TSE - DivulgaCandContas" />
          </div>

          {/* Open Score Badge */}
          <div style={{
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-tertiary)',
            border: '1px solid ' + (isNegative ? 'var(--border-strong)' : 'var(--border-subtle)'),
            fontWeight: 800,
            fontSize: '0.9rem',
            color: 'var(--text-main)',
            flexShrink: 0,
          }}>
            {score.totalCompositeScore > 0 ? `+${score.totalCompositeScore}` : score.totalCompositeScore} pts
          </div>
        </div>

        {/* Profile Header */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-tertiary)',
            flexShrink: 0,
          }}>
            {imgSrc && !imgFailed ? (
              <img
                src={imgSrc}
                alt={candidate.popularName}
                onError={handleImgError}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaUserAlt size={22} color="var(--text-muted)" className="desktop-icon-allow" />
              </div>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <h3 style={{
              fontSize: '0.98rem',
              margin: '0 0 2px 0',
              color: 'var(--text-main)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {candidate.popularName}
            </h3>
            {/* Party, Candidate Number, and State if State scope */}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {partyAndNumber}
            </div>
          </div>
        </div>

        {/* Tags Container: Rendered only when at least one badge is present (Default is EMPTY) */}
        {(shouldRenderTseStatusBadge(candidate.status) || judicialBadge || experienceBadge) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {shouldRenderTseStatusBadge(candidate.status) && (
              <span className="badge badge-neutral" title={`Status no TSE: ${formatTseStatus(candidate.status)}`}>
                {formatTseStatus(candidate.status)}
              </span>
            )}
            {judicialBadge}
            {experienceBadge}
          </div>
        )}

        {/* Summary / Mini-Bio */}
        <p style={{
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          marginBottom: '14px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.4,
        }}>
          {candidate.summary}
        </p>
      </div>

      {/* Footer Action */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '10px',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.78rem',
        color: 'var(--text-main)',
        fontWeight: 600,
        marginTop: 'auto',
      }}>
        <span>Analisar Dossiê Completo</span>
        <ArrowRight size={14} />
      </div>
    </div>
  );
};
