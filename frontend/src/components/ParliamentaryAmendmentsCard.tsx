import React from 'react';
import { Landmark, PieChart, DollarSign, ExternalLink } from 'lucide-react';
import { RatingControl } from './RatingControl';
import { SourceTooltip } from './SourceTooltip';

export interface ParliamentaryAmendmentItem {
  codigoEmenda: string;
  ano: number;
  tipoEmenda: string;
  autor: string;
  numeroEmenda: string;
  localidadeDoGasto: string;
  funcao: string;
  subfuncao: string;
  programa?: string;
  acao: string;
  valorEmpenhado: number;
  valorPago: number;
  linkDetalhamento?: string;
}

export interface ParliamentaryAmendmentsData {
  source: string;
  sourceUrl: string;
  totalAmendments: number;
  totalEmpenhado: number;
  totalPago: number;
  executionRate: number;
  byFunction: Array<{ funcao: string; totalAmount: number; percentage: number }>;
  items: ParliamentaryAmendmentItem[];
}

interface ParliamentaryAmendmentsCardProps {
  amendmentsData: ParliamentaryAmendmentsData;
  candidateId: string;
  getRating: (itemType: string, itemId?: string) => number;
  onRatingChanged: () => void;
  onRequireAuth: (actionDescription?: string) => void;
}

export const ParliamentaryAmendmentsCard: React.FC<ParliamentaryAmendmentsCardProps> = ({
  amendmentsData,
  candidateId,
  getRating,
  onRatingChanged,
  onRequireAuth,
}) => {
  // Strict check: render ONLY when factual amendments exist
  if (!amendmentsData || !amendmentsData.items || amendmentsData.items.length === 0) {
    return null;
  }

  const currentRating = getRating('PERFORMANCE', 'parliamentary_amendments');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  return (
    <div
      className="glass-card"
      style={{
        padding: '24px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Cabeçalho do Card */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Landmark size={20} className="desktop-icon-allow" />
            Emendas Parlamentares Executadas no Orçamento Federal (OGU)
            <SourceTooltip sourceUrl={amendmentsData.sourceUrl} label="Portal da Transparência do Governo Federal" />
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Registros oficiais de emendas individuais e de bancada destinadas ao orçamento da União.
          </div>
        </div>

        {/* RatingControl para a Régua Pessoal do Eleitor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RatingControl
            candidateId={candidateId}
            itemType="PERFORMANCE"
            itemId="parliamentary_amendments"
            currentRating={currentRating}
            onRatingChanged={onRatingChanged}
            onRequireAuth={onRequireAuth}
          />
        </div>
      </div>

      {/* Grid de Métricas Orçamentárias Principais */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        <div style={{ background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Emendas Cadastradas</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
            {amendmentsData.totalAmendments}
          </div>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Empenhado</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
            {formatCurrency(amendmentsData.totalEmpenhado)}
          </div>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Pago</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
            {formatCurrency(amendmentsData.totalPago)}
          </div>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Taxa de Execução</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
            {amendmentsData.executionRate}%
          </div>
        </div>
      </div>

      {/* Discriminativo de Destinação por Área Temática */}
      {amendmentsData.byFunction && amendmentsData.byFunction.length > 0 && (
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PieChart size={16} className="desktop-icon-allow" /> Destinação de Recursos por Função Orçamentária
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {amendmentsData.byFunction.map((fn, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{fn.funcao}</span>
                  <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                    {formatCurrency(fn.totalAmount)} ({fn.percentage}%)
                  </span>
                </div>

                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    background: 'var(--border-subtle)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${fn.percentage}%`,
                      height: '100%',
                      background: 'var(--text-main)',
                      borderRadius: 'var(--radius-full)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista Factual de Emendas Auditáveis */}
      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <DollarSign size={16} className="desktop-icon-allow" /> Rastreamento Individual de Emendas no OGU
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {amendmentsData.items.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-tertiary)',
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ flex: '1 1 260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', background: 'var(--bg-glass)', border: '1px solid var(--border-strong)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                    {item.ano} • {item.codigoEmenda}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {item.tipoEmenda}
                  </span>
                </div>

                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '6px' }}>
                  {item.acao}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {item.localidadeDoGasto} — {item.funcao} {item.subfuncao ? `(${item.subfuncao})` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {formatCurrency(item.valorPago > 0 ? item.valorPago : item.valorEmpenhado)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Empenhado: {formatCurrency(item.valorEmpenhado)}
                </div>
                {item.linkDetalhamento && (
                  <SourceTooltip sourceUrl={item.linkDetalhamento} label="Portal da Transparência - Detalhe da Emenda" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParliamentaryAmendmentsCard;
