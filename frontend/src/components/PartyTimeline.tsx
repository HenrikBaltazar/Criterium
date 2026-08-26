import React from 'react';
import { ExternalLink, GitCommit, ArrowRight, ShieldAlert } from 'lucide-react';
import { buildTseCandidateUrl } from '../utils/badgeHelper';

interface PartyTimelineProps {
  priorElections: any[];
  currentParty: string;
  candidateState: string;
}

export const PartyTimeline: React.FC<PartyTimelineProps> = ({
  priorElections = [],
  currentParty = '',
  candidateState = 'BR',
}) => {
  if (!priorElections || priorElections.length === 0) return null;

  // Sort elections chronologically ascending
  const sortedElections = [...priorElections]
    .filter((e) => Number(e.nrAno) < 2026)
    .sort((a, b) => Number(a.nrAno || 0) - Number(b.nrAno || 0));

  const timelineNodes: {
    year: number;
    cargo: string;
    party: string;
    txLink: string;
    isCurrent: boolean;
    hasSwitched: boolean;
    prevParty?: string;
  }[] = [];

  let lastParty = '';

  sortedElections.forEach((el) => {
    const year = Number(el.nrAno);
    const party = String(el.partido || el.sgPartido || 'N/A').trim().toUpperCase();
    const url = buildTseCandidateUrl(el, candidateState);
    const hasSwitched = lastParty !== '' && party !== '' && party !== lastParty;

    timelineNodes.push({
      year,
      cargo: el.cargo || 'Candidato',
      party,
      txLink: url,
      isCurrent: false,
      hasSwitched,
      prevParty: hasSwitched ? lastParty : undefined,
    });

    if (party) lastParty = party;
  });

  // Current 2026 Election Node
  const curPartyClean = String(currentParty || 'N/A').trim().toUpperCase();
  const currentSwitched = lastParty !== '' && curPartyClean !== '' && curPartyClean !== lastParty;

  timelineNodes.push({
    year: 2026,
    cargo: 'Candidatura 2026',
    party: curPartyClean,
    txLink: `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${candidateState}/${candidateState}/20322002026`,
    isCurrent: true,
    hasSwitched: currentSwitched,
    prevParty: currentSwitched ? lastParty : undefined,
  });

  const totalSwitches = timelineNodes.filter((n) => n.hasSwitched).length;

  return (
    <div
      className="glass-card"
      style={{
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <GitCommit size={20} /> Trajetória Partidária & Mudanças de Partido
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Linha do tempo dos partidos políticos representados pelo candidato a cada eleição disputada.
          </p>
        </div>

        {totalSwitches > 0 ? (
          <span
            className="badge badge-neutral"
            style={{
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldAlert size={14} /> {totalSwitches} {totalSwitches === 1 ? 'troca de partido' : 'trocas de partido'} registrada(s)
          </span>
        ) : (
          <span
            className="badge badge-outline"
            style={{
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            Sem troca de partido
          </span>
        )}
      </div>

      {/* Timeline Node List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '8px',
          }}
        >
          {timelineNodes.map((node, idx) => {
            return (
              <React.Fragment key={`node-${node.year}-${idx}`}>
                {idx > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: node.hasSwitched ? 'var(--text-main)' : 'var(--border-subtle)', padding: '0 4px' }}>
                    <ArrowRight size={18} />
                  </div>
                )}

                <a
                  href={node.txLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-card-hover"
                  style={{
                    background: node.hasSwitched ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    border: node.hasSwitched ? '2px solid var(--text-main)' : '1px solid var(--border-subtle)',
                    textDecoration: 'none',
                    color: 'inherit',
                    minWidth: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'var(--transition)',
                  }}
                  title={`Clique para abrir a ficha oficial do TSE da eleição de ${node.year}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                      ELEIÇÃO {node.year}
                    </span>
                    <ExternalLink size={13} style={{ color: 'var(--text-muted)' }} />
                  </div>

                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                      {node.party}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {node.cargo}
                    </div>
                  </div>

                  {node.hasSwitched && (
                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: 'var(--bg-tertiary)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-main)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>Mudou de {node.prevParty} → {node.party}</span>
                    </div>
                  )}
                </a>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
