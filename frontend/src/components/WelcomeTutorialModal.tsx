import React from 'react';
import { HelpCircle, ArrowRight, X } from 'lucide-react';

interface WelcomeTutorialModalProps {
  isOpen: boolean;
  onStartTutorial: () => void;
  onSkip: () => void;
}

export const WelcomeTutorialModal: React.FC<WelcomeTutorialModalProps> = ({
  isOpen,
  onStartTutorial,
  onSkip,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.95) 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.25s ease-out',
        pointerEvents: 'auto',
      }}
    >
      <div
        className="glass-card welcome-modal-card"
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Close / Skip button in corner */}
        <button
          onClick={onSkip}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'var(--transition)',
          }}
          title="Pular apresentação"
          aria-label="Pular apresentação"
        >
          <X size={16} className="desktop-icon-allow" />
        </button>

        {/* Platform Title */}
        <div style={{ marginBottom: '16px' }}>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: '0 0 4px 0',
              color: 'var(--text-main)',
            }}
          >
            criterium
          </h1>
          <span
            className="badge badge-neutral"
            style={{
              fontSize: '0.76rem',
              fontWeight: 700,
              padding: '4px 10px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Plataforma de Pontuação Pessoal de Candidatos
          </span>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: '24px',
          }}
        >
          Seja bem-vindo ao <strong>Criterium</strong>! Esta não é uma ferramenta de pesquisa tradicional, mas sim uma plataforma de pontuação pessoal onde você avalia candidatos com base em dados oficiais do TSE, Câmara e Senado e define sua própria régua de avaliação para formar o seu ranking de voto.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            width: '100%',
          }}
        >
          <button
            onClick={onStartTutorial}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--text-main)',
              color: 'var(--bg-primary)',
              fontWeight: 700,
              fontSize: '0.92rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'var(--transition)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            }}
          >
            <HelpCircle size={18} className="desktop-icon-allow" />
            <span>Ver Tutorial</span>
            <ArrowRight size={16} className="desktop-icon-allow" />
          </button>

          <button
            onClick={onSkip}
            style={{
              width: '100%',
              padding: '10px 20px',
              borderRadius: 'var(--radius-full)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.86rem',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            Pular
          </button>
        </div>
      </div>
    </div>
  );
};
