import React, { useEffect, useState } from 'react';
import { fetchCrawlerStatus, CrawlerStatusResponse } from '../services/api';
import { Database, RefreshCw, PowerOff } from 'lucide-react';

export const CrawlerStatusBadge: React.FC = () => {
  const [crawlerState, setCrawlerState] = useState<CrawlerStatusResponse>({
    status: 'desativado',
    lastHeartbeat: null,
    candidatesFetched: 0,
  });

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      const data = await fetchCrawlerStatus();
      if (isMounted) {
        setCrawlerState(data);
      }
    };

    checkStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusConfig = () => {
    switch (crawlerState.status) {
      case 'buscando':
        return {
          label: 'buscando',
          color: 'var(--text-main)',
          bg: 'var(--bg-tertiary)',
          border: 'var(--border-subtle)',
          icon: RefreshCw,
          spin: true,
        };
      case 'ativo':
        return {
          label: 'ativo',
          color: 'var(--text-main)',
          bg: 'var(--bg-tertiary)',
          border: 'var(--border-subtle)',
          icon: Database,
          spin: false,
        };
      case 'desativado':
      default:
        return {
          label: 'desativado',
          color: 'var(--text-muted)',
          bg: 'var(--bg-primary)',
          border: 'var(--border-subtle)',
          icon: PowerOff,
          spin: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      title={`Crawler TSE: ${config.label}${crawlerState.candidatesFetched ? ` (${crawlerState.candidatesFetched} consultados)` : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: config.color,
          display: 'inline-block',
          boxShadow: config.label === 'buscando' ? `0 0 8px ${config.color}` : 'none',
          animation: config.label === 'buscando' ? 'pulse 1.5s infinite' : 'none',
        }}
      />
      <Icon size={12} className={config.spin ? 'spin-icon' : ''} style={{ color: config.color }} />
      <span style={{ textTransform: 'lowercase' }}>{config.label}</span>
    </div>
  );
};
