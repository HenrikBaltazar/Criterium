import React from 'react';
import { Candidate } from '../types';
import { HOT_TOPICS, getPartyStance, HotTopic } from '../utils/hotTopics';
import { RatingControl } from './RatingControl';
import { ShieldAlert, Info } from 'lucide-react';

interface CandidateHotTopicsProps {
  candidate: Candidate;
  onRequireAuth: () => void;
  onRatingChanged: () => void;
}

export const CandidateHotTopics: React.FC<CandidateHotTopicsProps> = ({
  candidate,
  onRequireAuth,
  onRatingChanged
}) => {
  const party = candidate.party;

  const getEvaluationRating = (topic: HotTopic) => {
    if (!candidate.userEvaluations) return 0;
    const ev = candidate.userEvaluations.find((e) => e.itemType === 'HOT_TOPIC' && e.itemId === topic);
    return ev ? ev.rating : 0;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Notice Card */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: 'var(--bg-tertiary)' }}>
        <Info size={20} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
          <p style={{ fontWeight: 700, margin: '0 0 4px 0' }}>Aviso sobre Dados Individuais</p>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            O <a href="https://dataverse.harvard.edu/dataverse/bls" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'inherit' }}>BLS (Brazilian Legislative Surveys)</a> e as APIs públicas oficiais mantêm o posicionamento individual dos parlamentares em anonimato para garantir a segurança da pesquisa. 
            Portanto, as posições exibidas abaixo refletem o <strong>posicionamento majoritário/oficial do partido ({party})</strong> como proxy ideológico.
          </p>
        </div>
      </div>

      {/* Topics List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {HOT_TOPICS.map((topic) => {
          const stance = getPartyStance(party, topic);
          
          let stanceText = 'Neutro / Não Definido';
          let stanceColor = 'var(--text-muted)';
          let stanceBg = 'var(--border-subtle)';
          
          if (stance === 'FAVOR') {
            stanceText = 'A Favor';
            stanceColor = 'var(--success-color, #10b981)';
            stanceBg = 'rgba(16, 185, 129, 0.1)';
          } else if (stance === 'CONTRA') {
            stanceText = 'Contra';
            stanceColor = 'var(--alert-color, #ef4444)';
            stanceBg = 'rgba(239, 68, 68, 0.1)';
          }

          return (
            <div key={topic} className="glass-card" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center' }}>
              
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '50%' }}>
                    <ShieldAlert size={20} color="var(--text-main)" />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{topic}</h4>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  Posição do <strong>{party}</strong>:
                  <span style={{ 
                    fontWeight: 700, 
                    backgroundColor: stanceBg, 
                    color: stanceColor,
                    padding: '4px 10px', 
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem'
                  }}>
                    {stanceText}
                  </span>
                </div>
              </div>

              <div style={{ 
                background: 'var(--bg-tertiary)', 
                padding: '12px 16px', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border-subtle)',
                minWidth: '200px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Sua Avaliação
                </p>
                <RatingControl
                  candidateId={candidate.id}
                  itemType="HOT_TOPIC"
                  itemId={topic}
                  currentRating={getEvaluationRating(topic)}
                  onRequireAuth={onRequireAuth}
                  onRatingChanged={onRatingChanged}
                />
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
