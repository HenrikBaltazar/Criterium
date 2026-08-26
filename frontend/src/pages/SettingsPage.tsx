import React, { useState, useEffect } from 'react';
import { Sliders, Sun, Moon, Monitor, MapPin, Activity, ArrowLeft, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { ALL_BRAZILIAN_STATES } from '../utils/constants';
import { fetchCrawlerStatus, CrawlerStatusResponse } from '../services/api';

interface SettingsPageProps {
  onRequireAuth?: () => void;
  onGoToDashboard?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onGoToDashboard }) => {
  const { user, selectedState, setSelectedState, isInstallable, installPWA } = useApp();
  const { themeMode, setThemeMode } = useTheme();
  const [crawlerState, setCrawlerState] = useState<CrawlerStatusResponse>({
    status: 'desativado',
    lastHeartbeat: null,
    candidatesFetched: 0,
  });

  useEffect(() => {
    let isMounted = true;
    const getStatus = async () => {
      try {
        const res = await fetchCrawlerStatus();
        if (isMounted) setCrawlerState(res);
      } catch (err) {
        // Fallback default
      }
    };
    getStatus();
    const interval = setInterval(getStatus, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="container" style={{ padding: '24px 16px 80px 16px', maxWidth: '780px' }}>
      {/* Top Navigation Button: Voltar ao Painel */}
      {onGoToDashboard && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={onGoToDashboard}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-main)',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            <ArrowLeft size={16} />
            <span>Voltar ao painel</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Sliders size={26} color="var(--text-main)" />
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Configurações do Sistema</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
          Defina as preferências visuais da interface, filtros geográficos e monitore o status do robô indexador do TSE.
        </p>
      </div>

      {/* Theme Preference Section */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '14px' }}>Tema Visual da Interface</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Escolha a aparência visual do Criterium. Todas as opções utilizam paleta neutra monocromática sem viés partidário.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {[
            { mode: 'dark', label: 'Escuro', icon: Moon, desc: 'Tema escuro sóbrio' },
            { mode: 'light', label: 'Claro', icon: Sun, desc: 'Tema claro sóbrio' },
            { mode: 'system', label: 'Sistema', icon: Monitor, desc: 'Sincronizar com SO' },
          ].map((t) => {
            const Icon = t.icon;
            const isSelected = themeMode === t.mode;
            return (
              <button
                key={t.mode}
                onClick={() => setThemeMode(t.mode as ThemeMode)}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'left',
                  background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                  border: '1px solid ' + (isSelected ? 'var(--border-strong)' : 'var(--border-subtle)'),
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                  <Icon size={16} />
                  <span>{t.label}</span>
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                  {t.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Escopo Geográfico / Estado de Atuação Section */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <MapPin size={22} color="var(--text-main)" />
          <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Escopo Geográfico / Estado de Atuação</h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Filtre a exibição de candidatos, rankings e colinha da eleição pelo seu estado de votação ou selecione <strong>Todos os Estados</strong> para visão nacional.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Estado de Votação:
          </label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              maxWidth: '380px',
            }}
          >
            <option value="ALL">Todos os Estados (Nacional)</option>
            {ALL_BRAZILIAN_STATES.map((st) => (
              <option key={st.code} value={st.code}>
                {st.name} ({st.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PWA App Installation Section */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Download size={22} color="var(--text-main)" />
          <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Aplicativo Criterium (PWA / WebAPK)</h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
          Instale o Criterium diretamente na tela inicial do seu smartphone ou computador para ter uma experiência de aplicativo nativo em tela cheia, sem barra de navegação e com acesso rápido offline.
        </p>

        {isInstallable ? (
          <button
            onClick={installPWA}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontWeight: 800,
              fontSize: '0.9rem',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
            }}
          >
            <Download size={16} />
            <span>Instalar Criterium no Dispositivo</span>
          </button>
        ) : (
          <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
            ✓ O aplicativo já está instalado ou o seu navegador atual já possui o WebAPK nativo ativo.
          </div>
        )}
      </div>

      {/* Crawler Status Section */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={22} color="var(--text-main)" />
            <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Status do Robô Indexador TSE (Crawler)</h3>
          </div>
          
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: crawlerState.status === 'buscando' ? 'var(--text-main)' : 'var(--bg-tertiary)',
              color: crawlerState.status === 'buscando' ? 'var(--bg-primary)' : 'var(--text-main)',
              border: '1px solid var(--border-strong)',
              fontSize: '0.8rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: crawlerState.status === 'buscando' ? 'var(--bg-primary)' : 'var(--text-muted)',
              }}
            />
            <span>Status: {crawlerState.status}</span>
          </div>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: 1.5 }}>
          O robô indexador do Criterium é responsável pela coleta e sincronização contínua de dados (candidaturas, declarações de bens, certidões judiciais e planos de governo) diretamente do repositório oficial do DivulgaCandContas TSE.
        </p>

        {/* Detailed Explanation for Each Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
          {[
            {
              statusKey: 'buscando',
              title: 'Buscando Dados (Varredura Ativa)',
              description: 'O robô está atualmente realizando requisições ao TSE e atualizando as fichas dos candidatos em tempo real.',
              active: crawlerState.status === 'buscando',
            },
            {
              statusKey: 'ativo',
              title: 'Ativo (Aguardando Janela de Leitura)',
              description: 'O robô está online na infraestrutura e em estado de prontidão, aguardando a próxima janela periódica de sincronização agendada.',
              active: crawlerState.status === 'ativo',
            },
            {
              statusKey: 'desativado',
              title: 'Desativado (Modo Repouso)',
              description: 'O robô está temporariamente desativado ou pausado, mantendo apenas a base de dados armazenada localmente sem consultas externas ao TSE.',
              active: crawlerState.status === 'desativado',
            },
          ].map((item) => (
            <div
              key={item.statusKey}
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-sm)',
                background: item.active ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                border: item.active ? '2px solid var(--text-main)' : '1px solid var(--border-subtle)',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: item.active ? 'var(--text-main)' : 'var(--border-strong)',
                  }}
                />
                <span>{item.title}</span>
                {item.active && (
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--text-main)', color: 'var(--bg-primary)', marginLeft: 'auto' }}>
                    Estado Atual
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, paddingLeft: '16px' }}>
                {item.description}
              </div>
            </div>
          ))}
        </div>

        {/* Sync Summary Indicators */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Candidatos Consultados</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{crawlerState.candidatesFetched || 0} indexados</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Último Sinal (Heartbeat)</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
              {crawlerState.lastHeartbeat ? new Date(crawlerState.lastHeartbeat).toLocaleString('pt-BR') : 'Sem registros recentes'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
