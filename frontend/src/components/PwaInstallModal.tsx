import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const PwaInstallModal: React.FC = () => {
  const { isInstallable, installPWA } = useApp();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    // Check if user has already dismissed the modal
    const isDismissed = localStorage.getItem('criterium_pwa_modal_dismissed') === 'true';
    if (isDismissed) {
      setIsOpen(false);
      return;
    }

    // Check if the current device is a mobile device
    const isMobileDevice =
      window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && window.innerWidth <= 1024);

    if (isMobileDevice) {
      setIsOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('criterium_pwa_modal_dismissed', 'true');
    setIsOpen(false);
  };

  const handleInstallClick = async () => {
    localStorage.setItem('criterium_pwa_modal_dismissed', 'true');
    if (isInstallable) {
      await installPWA();
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
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
          maxWidth: '440px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          position: 'relative',
        }}
      >
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
          }}
          title="Fechar"
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-main)',
            }}
          >
            <Smartphone size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Instalar Criterium no Celular
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Aplicativo Híbrido Nativo (PWA)
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '18px' }}>
          Tenha a experiência de um aplicativo nativo completo em tela cheia no seu smartphone, sem barra de navegação do navegador e com acesso rápido na sua tela de início.
        </p>

        <div
          style={{
            background: 'var(--bg-tertiary)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginBottom: '20px',
            lineHeight: 1.4,
          }}
        >
          💡 No menu do navegador do celular (<strong>⋮</strong>), toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleDismiss}
            className="btn btn-outline"
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)', fontSize: '0.82rem' }}
          >
            Entendi
          </button>
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--text-main)',
                color: 'var(--bg-primary)',
                fontWeight: 800,
                fontSize: '0.82rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Download size={14} />
              <span>Instalar App</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
