import React, { useState } from 'react';
import { DollarSign, TrendingDown, PieChart, Calendar } from 'lucide-react';
import { RatingControl } from './RatingControl';
import { SourceTooltip } from './SourceTooltip';

export interface ExpenseCategory {
  categoryName: string;
  amount: number;
  percentage: number;
}

export interface YearlyExpenseItem {
  year: number;
  totalSpent: number;
  maxQuota: number;
  economyRate: number;
  categories: ExpenseCategory[];
}

export interface PublicExpensesData {
  source?: 'CAMARA_DOS_DEPUTADOS' | 'SENADO_FEDERAL' | 'CONGRESSO_NACIONAL';
  sourceUrl?: string;
  totalSpent?: number;
  maxQuota?: number;
  economyRate?: number;
  year?: number;
  categories?: ExpenseCategory[];
  yearlyExpenses?: YearlyExpenseItem[];
  totalSummary?: {
    totalSpent: number;
    maxQuota: number;
    economyRate: number;
    yearsRange: string;
    categories: ExpenseCategory[];
  };
  houses?: PublicExpensesData[];
}

interface PublicExpensesCardProps {
  expensesData: PublicExpensesData;
  candidateId: string;
  getRating: (itemType: string, itemId?: string) => number;
  onRatingChanged: () => void;
  onRequireAuth: (actionDescription?: string) => void;
}

const SingleHouseExpensesCard: React.FC<{
  houseData: PublicExpensesData;
  candidateId: string;
  getRating: (itemType: string, itemId?: string) => number;
  onRatingChanged: () => void;
  onRequireAuth: (actionDescription?: string) => void;
}> = ({ houseData, candidateId, getRating, onRatingChanged, onRequireAuth }) => {
  if (!houseData || !houseData.categories || houseData.categories.length === 0) {
    return null;
  }

  const [selectedYear, setSelectedYear] = useState<string>('TODOS');

  const houseSource = houseData.source || 'SENADO_FEDERAL';
  const currentRating = getRating('PERFORMANCE', `ceap_expenses_${houseSource.toLowerCase()}`);
  const sourceName = houseSource === 'SENADO_FEDERAL' 
    ? 'Senado Federal (Cota CEAPS)' 
    : 'Câmara dos Deputados (Cota CEAP)';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const yearlyList = houseData.yearlyExpenses || [];
  let activeSpent = houseData.totalSpent || 0;
  let activeQuota = houseData.maxQuota || 0;
  let activeEconomy = houseData.economyRate || 0;
  let activeCategories = houseData.categories || [];
  let activeLabel = 'Soma Consolidada de Todos os Anos';

  if (selectedYear === 'TODOS') {
    if (houseData.totalSummary) {
      activeSpent = houseData.totalSummary.totalSpent;
      activeQuota = houseData.totalSummary.maxQuota;
      activeEconomy = houseData.totalSummary.economyRate;
      activeCategories = houseData.totalSummary.categories;
      activeLabel = `Soma Consolidada (${houseData.totalSummary.yearsRange})`;
    } else if (yearlyList.length > 0) {
      activeSpent = yearlyList.reduce((acc, y) => acc + y.totalSpent, 0);
      activeQuota = yearlyList.reduce((acc, y) => acc + y.maxQuota, 0);
      activeEconomy = activeQuota > 0 ? Math.round(((activeQuota - activeSpent) / activeQuota) * 1000) / 10 : 0;
      activeLabel = `Soma Consolidada (${yearlyList[yearlyList.length - 1].year} – ${yearlyList[0].year})`;
    }
  } else {
    const yrNum = parseInt(selectedYear, 10);
    const matchedYear = yearlyList.find(y => y.year === yrNum);
    if (matchedYear) {
      activeSpent = matchedYear.totalSpent;
      activeQuota = matchedYear.maxQuota;
      activeEconomy = matchedYear.economyRate;
      activeCategories = matchedYear.categories;
      activeLabel = `Exercício de ${matchedYear.year}`;
    }
  }

  return (
    <div
      className="glass-card"
      style={{
        padding: '24px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
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
            <DollarSign size={20} className="desktop-icon-allow" />
            Uso de Recursos Públicos — Verba Indenizatória ({sourceName.split(' ')[0]})
            {houseData.sourceUrl && <SourceTooltip sourceUrl={houseData.sourceUrl} label={sourceName} />}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Gastos oficiais acumulados da Cota Parlamentar no {sourceName} com discriminativo por categoria.
          </div>
        </div>

        {/* Lado Direito: Dropdown de Seleção de Ano & RatingControl */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Seletor de Ano com Opção Padrão "TODOS" */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)' }}>
            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              aria-label="Selecionar Ano da Cota Parlamentar"
              style={{
                background: 'transparent',
                color: 'var(--text-main)',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="TODOS" style={{ background: 'var(--bg-primary)', color: 'var(--text-main)' }}>
                TODOS (Soma Geral)
              </option>
              {yearlyList.length > 0 ? (
                yearlyList.map((y) => (
                  <option key={y.year} value={String(y.year)} style={{ background: 'var(--bg-primary)', color: 'var(--text-main)' }}>
                    {y.year}
                  </option>
                ))
              ) : (
                <option value="2024" style={{ background: 'var(--bg-primary)', color: 'var(--text-main)' }}>
                  2024
                </option>
              )}
            </select>
          </div>

          <RatingControl
            candidateId={candidateId}
            itemType="PERFORMANCE"
            itemId={`ceap_expenses_${houseSource.toLowerCase()}`}
            currentRating={currentRating}
            onRatingChanged={onRatingChanged}
            onRequireAuth={onRequireAuth}
          />
        </div>
      </div>

      {/* Métricas Principais: Gastos Totais, Teto e Economia do Período Selecionado */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          style={{
            background: 'var(--bg-tertiary)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Gasto ({activeLabel})</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
            {formatCurrency(activeSpent)}
          </div>
        </div>

        {activeQuota > 0 && (
          <div
            style={{
              background: 'var(--bg-tertiary)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Teto Máximo Estimado</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-muted)', marginTop: '2px' }}>
              {formatCurrency(activeQuota)}
            </div>
          </div>
        )}

        {activeQuota > 0 && (
          <div
            style={{
              background: 'var(--bg-tertiary)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingDown size={14} className="desktop-icon-allow" /> Economia em Relação ao Teto
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
              {activeEconomy}% economizados
            </div>
          </div>
        )}
      </div>

      {/* Discriminativo de Gastos por Categoria */}
      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <PieChart size={16} className="desktop-icon-allow" /> Discriminativo de Despesas por Categoria ({activeLabel})
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activeCategories.map((cat, idx) => (
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
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{cat.categoryName}</span>
                <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                  {formatCurrency(cat.amount)} ({cat.percentage}%)
                </span>
              </div>

              {/* Barra Proporcional Monocromática */}
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
                    width: `${cat.percentage}%`,
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
    </div>
  );
};

const PublicExpensesCard: React.FC<PublicExpensesCardProps> = ({
  expensesData,
  candidateId,
  getRating,
  onRatingChanged,
  onRequireAuth,
}) => {
  if (!expensesData) return null;

  // If candidate has multi-house expenses (both Senate AND Chamber of Deputies)
  const housesList = expensesData.houses && expensesData.houses.length > 0
    ? expensesData.houses
    : [expensesData];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {housesList.map((house, idx) => (
        <SingleHouseExpensesCard
          key={idx}
          houseData={house}
          candidateId={candidateId}
          getRating={getRating}
          onRatingChanged={onRatingChanged}
          onRequireAuth={onRequireAuth}
        />
      ))}
    </div>
  );
};

export default PublicExpensesCard;
