import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

const accountPreviewDesktop = new URL('../assets/account_preview_desktop.png', import.meta.url).href;
const accountPreviewMobile = new URL('../assets/account_preview_mobile.png', import.meta.url).href;

interface GuidedTutorialTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateStep: (stepIndex: number) => void;
}

interface TourStep {
  title: string;
  subtitle: string;
  description: string;
  badge: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '1. Painel Principal & Filtro de Cargos',
    subtitle: 'Navegação e Busca de Candidatos',
    badge: 'Dashboard',
    description:
      'No Painel Principal você explora os candidatos organizados por cargo disputado (Presidente, Senador, Deputado, etc.). Utilize o seletor de localização para filtrar por estado, a barra de pesquisa para buscar nomes ou partidos e acompanhe o somatório das suas pontuações.',
  },
  {
    title: '2. Dossiê Completo do Candidato',
    subtitle: 'Histórico, Bens e Recursos Públicos',
    badge: 'Dossiê Completo',
    description:
      'Ao selecionar um candidato, você acessa seu Dossiê detalhado. Explore a Declaração de Bens no TSE, Mandatos Históricos Passados, Gastos da Cota Parlamentar (CEAP/CEAPS), Emendas do OGU, Anotações e o Plano de Governo oficial.',
  },
  {
    title: '3. Regras de Pontuação Automática',
    subtitle: 'Personalização do Somatório do Eleitor',
    badge: 'Pontuação Automática',
    description:
      'Na aba Pontuação você configura as regras de pontuação automática para os critérios da plataforma (escolaridade, processos judiciais, execução de emendas, cota parlamentar e anotações). O resultado final é calculado automaticamente segundo as suas regras.',
  },
  {
    title: '4. Configurações & Preferências',
    subtitle: 'Ajustes da Interface e Localização',
    badge: 'Configurações',
    description:
      'Em Configurações você alterna entre os modos de tema Claro e Escuro, define o seu estado ou região de preferência e acompanha o status dos robôs de dados do sistema.',
  },
  {
    title: '5. Sua Conta, Colinha e Estatísticas',
    subtitle: 'Recursos Pessoais do Eleitor',
    badge: 'Minha Conta',
    description:
      'Na sua conta você acessa a sua Colinha Eleitoral para o dia da votação, visualiza suas Estatísticas Pessoais de avaliação e tem a liberdade de remover sua conta a qualquer momento com total privacidade.',
  },
];

// Doubled heights for mask cutout highlights
const getSpotlightPosition = (step: number, isMobile: boolean) => {
  if (isMobile) {
    switch (step) {
      case 0: // Header & Toolbar
        return { top: '6px', left: '8px', width: 'calc(100% - 16px)', height: '230px' };
      case 1: // Candidate Dossier
        return { top: '65px', left: '10px', width: 'calc(100% - 20px)', height: '400px' };
      case 2: // Scoring
        return { top: '65px', left: '10px', width: 'calc(100% - 20px)', height: '380px' };
      case 3: // Settings
        return { top: '65px', left: '10px', width: 'calc(100% - 20px)', height: '380px' };
      case 4: // Account
        return { top: '65px', left: '10px', width: 'calc(100% - 20px)', height: '420px' };
      default:
        return { top: '65px', left: '10px', width: 'calc(100% - 20px)', height: '360px' };
    }
  } else {
    switch (step) {
      case 0: // Header & Toolbar
        return { top: '10px', left: '20px', width: 'calc(100% - 40px)', height: '240px' };
      case 1: // Candidate Dossier
        return { top: '75px', left: '20px', width: 'calc(100% - 40px)', height: '380px' };
      case 2: // Scoring
        return { top: '75px', left: '20px', width: 'calc(100% - 40px)', height: '360px' };
      case 3: // Settings
        return { top: '75px', left: '20px', width: 'calc(100% - 40px)', height: '360px' };
      case 4: // Account
        return { top: '75px', left: '20px', width: 'calc(100% - 40px)', height: '400px' };
      default:
        return { top: '75px', left: '20px', width: 'calc(100% - 40px)', height: '360px' };
    }
  }
};

export const GuidedTutorialTour: React.FC<GuidedTutorialTourProps> = ({
  isOpen,
  onClose,
  onNavigateStep,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      onNavigateStep(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      onNavigateStep(next);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      onNavigateStep(prev);
    }
  };

  if (!isOpen) return null;

  const stepData = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const spotlightPos = getSpotlightPosition(currentStep, isMobile);

  // Mobile position: bottom. Desktop position: center of screen.
  const tourCardStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 3200,
        width: 'calc(100% - 24px)',
        maxWidth: '520px',
        pointerEvents: 'auto',
        animation: 'slideUp 0.25s ease-out',
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 3200,
        width: 'calc(100% - 32px)',
        maxWidth: '540px',
        pointerEvents: 'auto',
        animation: 'fadeIn 0.25s ease-out',
      };

  return (
    <>
      {/* Full Page Dark Overlay Base (No blur, sharp visibility) */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2999,
          background: 'rgba(0, 0, 0, 0.4)',
          pointerEvents: 'auto',
        }}
      />

      {/* Dynamic Spotlight Cutout Mask focusing on Toolbar, Header, and active page content */}
      <div
        style={{
          position: 'fixed',
          top: spotlightPos.top,
          left: spotlightPos.left,
          width: spotlightPos.width,
          height: spotlightPos.height,
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.82)',
          border: '2px dashed var(--text-main)',
          zIndex: 3000,
          pointerEvents: 'none',
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {/* Floating Tutorial Step Card */}
      <div style={tourCardStyle}>
        <div
          className="glass-card"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '22px 24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)',
            position: 'relative',
          }}
        >
          {/* Header bar of step card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className="badge badge-neutral"
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                Passo {currentStep + 1} de {TOUR_STEPS.length}
              </span>
              <span
                style={{
                  fontSize: '0.76rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                • {stepData.badge}
              </span>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
              title="Encerrar Tutorial"
              aria-label="Encerrar Tutorial"
            >
              <X size={14} className="desktop-icon-allow" />
            </button>
          </div>

          {/* Step Title & Subtitle */}
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              margin: '0 0 4px 0',
            }}
          >
            {stepData.title}
          </h3>
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              fontWeight: 600,
              marginBottom: '12px',
            }}
          >
            {stepData.subtitle}
          </div>

          {/* Special Device-Specific Account Screenshot Preview on Step 4 */}
          {currentStep === 4 && (
            <div
              style={{
                marginBottom: '16px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-strong)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                maxHeight: '180px',
                background: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={isMobile ? accountPreviewMobile : accountPreviewDesktop}
                alt="Demonstração da Tela de Conta e Colinha Eleitoral"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'top',
                }}
              />
            </div>
          )}

          {/* Description Body */}
          <p
            style={{
              fontSize: '0.86rem',
              color: 'var(--text-main)',
              lineHeight: 1.55,
              marginBottom: '20px',
            }}
          >
            {stepData.description}
          </p>

          {/* Footer Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: currentStep === 0 ? 'var(--text-muted)' : 'var(--text-main)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                opacity: currentStep === 0 ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ChevronLeft size={14} className="desktop-icon-allow" />
              <span>Anterior</span>
            </button>

            {/* Dots Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: idx === currentStep ? '16px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background:
                      idx === currentStep
                        ? 'var(--text-main)'
                        : 'var(--border-strong)',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              style={{
                padding: '6px 18px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--text-main)',
                color: 'var(--bg-primary)',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{isLastStep ? 'Concluir' : 'Próximo'}</span>
              {isLastStep ? (
                <Check size={14} className="desktop-icon-allow" />
              ) : (
                <ChevronRight size={14} className="desktop-icon-allow" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
