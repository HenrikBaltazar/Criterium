import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Check, Info } from 'lucide-react';

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
    subtitle: 'Navegação e Busca Factual de Candidatos',
    badge: 'Dashboard',
    description:
      'No Painel Principal você explora os candidatos organizados por cargo disputado (Presidente, Senador, Deputado, etc.). Utilize o seletor de localização para filtrar por estado, a barra de pesquisa para buscar nomes ou partidos e acompanhe a pontuação técnica consolidada.',
  },
  {
    title: '2. Dossiê Factual do Candidato',
    subtitle: 'Auditoria Detalhada de Histórico e Gastos',
    badge: 'Dossiê Completo',
    description:
      'Ao selecionar um candidato, você acessa o Dossiê Factual auditável. Explore os Bens Declarados no TSE, Mandatos Históricos, Cota Parlamentar (CEAP/CEAPS), Emendas do OGU e consulte o Plano de Governo via Inteligência Artificial executada diretamente no seu navegador.',
  },
  {
    title: '3. Régua Pessoal de Pontuação',
    subtitle: 'Critérios e Pesos Personalizados pelo Eleitor',
    badge: 'Pontuação Dinâmica',
    description:
      'Na aba Pontuação você configura os pesos numéricos de cada indicador (escolaridade, processos judiciais, execução de emendas, etc.). A plataforma não impõe valores morais: o ranking final é calculado dinamicamente de acordo com as suas próprias regras.',
  },
  {
    title: '4. Configurações & Estrita Monocromia',
    subtitle: 'Personalização Visual e Imparcialidade',
    badge: 'Tema Monocromático',
    description:
      'Em Configurações você alterna entre os modos Claro e Escuro (sempre estritamente monocromáticos em preto, branco e tons de cinza para eliminar viés partidário subliminar) e define seu estado ou região de preferência.',
  },
  {
    title: '5. Perfil, Sincronização & Conta',
    subtitle: 'Armazenamento Seguro na Nuvem',
    badge: 'Minha Conta',
    description:
      'Crie ou acesse sua conta gratuita para salvar suas notas da Régua Pessoal, gerenciar anotações personalizadas vinculadas a candidatos e manter suas preferências sincronizadas em qualquer computador ou smartphone.',
  },
];

export const GuidedTutorialTour: React.FC<GuidedTutorialTourProps> = ({
  isOpen,
  onClose,
  onNavigateStep,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

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

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2600,
        width: 'calc(100% - 32px)',
        maxWidth: '540px',
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <div
        className="glass-card"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 22px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)',
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
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
            }}
            title="Encerrar Tutorial"
            aria-label="Encerrar Tutorial"
          >
            <X size={16} className="desktop-icon-allow" />
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
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            fontWeight: 600,
            marginBottom: '10px',
          }}
        >
          {stepData.subtitle}
        </div>

        {/* Description Body */}
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-main)',
            lineHeight: 1.5,
            marginBottom: '18px',
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
            paddingTop: '12px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            style={{
              padding: '6px 12px',
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
              padding: '6px 16px',
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
  );
};
