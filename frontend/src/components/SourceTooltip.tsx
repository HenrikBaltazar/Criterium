import React, { useRef, useState } from 'react';
import { ExternalLink, Info } from 'lucide-react';

interface SourceTooltipProps {
  sourceUrl?: string | null;
  label?: string;
}

export const SourceTooltip: React.FC<SourceTooltipProps> = ({ sourceUrl, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!sourceUrl) return null;

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  // Determine display title from URL if label is not explicitly provided
  let pageName = label;
  if (!pageName) {
    if (sourceUrl.includes('divulgacandcontas.tse.jus.br')) {
      pageName = 'TSE - DivulgaCandContas';
    } else if (sourceUrl.includes('camara.leg.br')) {
      pageName = 'Câmara dos Deputados - Transparência';
    } else if (sourceUrl.includes('senado.leg.br')) {
      pageName = 'Senado Federal - Transparência';
    } else if (sourceUrl.includes('stf.jus.br')) {
      pageName = 'STF - Processos Judiciais';
    } else {
      pageName = 'Portal Oficial da Fonte';
    }
  }

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Icon-Only Trigger Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
          borderRadius: '50%',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          lineHeight: 1,
        }}
        title={`Ver fonte oficial: ${pageName}`}
      >
        <Info size={14} className="desktop-icon-allow" />
      </button>

      {/* Popover Tooltip with Hover Stability & Invisible Bridge */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 500,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            boxShadow: 'var(--shadow-card)',
            whiteSpace: 'nowrap',
            fontSize: '0.8rem',
          }}
        >
          {/* Invisible padding bridge ensuring no gap between trigger and popover */}
          <div
            style={{
              position: 'absolute',
              bottom: '-12px',
              left: 0,
              right: 0,
              height: '12px',
              background: 'transparent',
            }}
          />

          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--text-main)',
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
          >
            <span>{pageName}</span>
            <ExternalLink size={12} color="var(--text-muted)" className="desktop-icon-allow" />
          </a>
        </div>
      )}
    </div>
  );
};
