import React, { useState } from 'react';
import { Activity, ExternalLink, Award, CheckCircle, Clock } from 'lucide-react';
import { RatingControl } from './RatingControl';
import { TagTooltip } from './TagTooltip';
import { SourceTooltip } from './SourceTooltip';

export interface MandateItem {
  title: string;
  period: string;
  legislatura: string;
  source: string;
  sourceUrl: string;
  attendanceRate: number;
  totalSessions: number;
  attendedSessions: number;
  excusedAbsences: number;
  unexcusedAbsences: number;
  year: number;
}

interface AttendanceChartProps {
  mandates: MandateItem[];
  candidateId?: string;
  getRating?: (type: string, itemId?: string) => number;
  onRatingChanged?: () => void;
  onRequireAuth?: () => void;
}

export const AttendanceChart: React.FC<AttendanceChartProps> = ({
  mandates = [],
  candidateId,
  getRating,
  onRatingChanged,
  onRequireAuth,
}) => {
  if (!mandates || mandates.length === 0) return null;

  // Sort mandates chronologically ascending for the chart
  const sortedMandates = [...mandates].sort((a, b) => a.year - b.year);

  // Overall Average Calculations
  const totalSessionsSum = sortedMandates.reduce((acc, m) => acc + (m.totalSessions || 0), 0);
  const attendedSessionsSum = sortedMandates.reduce((acc, m) => acc + (m.attendedSessions || 0), 0);
  const excusedAbsencesSum = sortedMandates.reduce((acc, m) => acc + (m.excusedAbsences || 0), 0);
  const unexcusedAbsencesSum = sortedMandates.reduce((acc, m) => acc + (m.unexcusedAbsences || 0), 0);
  
  const overallAverageRate = totalSessionsSum > 0
    ? Math.round((attendedSessionsSum / totalSessionsSum) * 1000) / 10
    : Math.round((sortedMandates.reduce((acc, m) => acc + (m.attendanceRate || 0), 0) / sortedMandates.length) * 10) / 10;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // SVG Line Chart Dimensions & Coordinate Math (styled exactly like AssetEvolutionChart)
  const svgWidth = 650;
  const svgHeight = 210;
  const paddingX = 70;
  const paddingTop = 50;
  const paddingBottom = 45;

  const minVal = 50; // Standardize Y axis baseline at 50% for high-resolution contrast
  const maxVal = 100;
  const valRange = maxVal - minVal;

  const coords = sortedMandates.map((m, idx) => {
    const x = sortedMandates.length === 1
      ? svgWidth / 2
      : paddingX + (idx / Math.max(1, sortedMandates.length - 1)) * (svgWidth - 2 * paddingX);
    
    const val = Math.min(100, Math.max(50, m.attendanceRate || 0));
    const norm = (val - minVal) / valRange;
    const y = svgHeight - paddingBottom - norm * (svgHeight - paddingTop - paddingBottom);

    let diffPercent: number | null = null;
    if (idx > 0) {
      const prevVal = sortedMandates[idx - 1].attendanceRate;
      if (m.attendanceRate != null && prevVal != null) {
        diffPercent = Math.round((m.attendanceRate - prevVal) * 10) / 10;
      }
    }

    return { x, y, m, idx, diffPercent };
  });

  const pathD = sortedMandates.length > 1
    ? coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '')
    : '';

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
      {/* 1. Header: Média Geral de Assiduidade com SourceTooltip e RatingControl posicionado à direita do componente */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Activity size={20} /> Média Geral de Assiduidade & Evolução por Mandato
            {sortedMandates[0]?.sourceUrl && (
              <SourceTooltip
                sourceUrl={sortedMandates[0].sourceUrl}
                label={sortedMandates[0].source === 'SENADO_FEDERAL' ? 'Senado Federal - Frequência Parlamentar' : 'Câmara dos Deputados - Frequência Parlamentar'}
              />
            )}
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Consolidado oficial da frequência parlamentar no Congresso Nacional através dos mandatos exercidos.
          </p>
        </div>

        {/* Lado Direito: Container da Média Geral e RatingControl Posicionado à Direita */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-strong)',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Award size={22} style={{ color: 'var(--text-main)' }} />
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Média Geral de Assiduidade
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1 }}>
                {overallAverageRate}%
              </div>
            </div>
          </div>

          {candidateId && getRating && onRatingChanged && (
            <TagTooltip content="Pontuar média geral de assiduidade do candidato">
              <RatingControl
                candidateId={candidateId}
                itemType="PERFORMANCE"
                itemId="attendance-overall"
                currentRating={getRating('PERFORMANCE', 'attendance-overall') || getRating('PERFORMANCE', 'attendance')}
                onRatingChanged={onRatingChanged}
                onRequireAuth={onRequireAuth}
              />
            </TagTooltip>
          )}
        </div>
      </div>

      {/* 2. Grid de Métricas Consolidadas dos Mandatos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CheckCircle size={13} /> Sessões Totais
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            {attendedSessionsSum} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {totalSessionsSum}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Presenças registradas</div>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={13} /> Faltas Totais
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            {excusedAbsencesSum} <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>just.</span> • {unexcusedAbsencesSum} <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>não just.</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Acumulado nos mandatos</div>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Mandatos Computados
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            {sortedMandates.length} {sortedMandates.length === 1 ? 'mandato' : 'mandatos'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Histórico do Congresso</div>
        </div>
      </div>

      {/* 3. Gráfico Interativo SVG (No mesmo estilo do Gráfico de Declaração de Bens) */}
      <div
        style={{
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          border: '1px solid var(--border-subtle)',
          position: 'relative',
        }}
      >
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
          {/* Horizontal Gridlines (100%, 75%, 50%) */}
          {[0, 0.5, 1].map((ratio, i) => {
            const gridY = paddingTop + ratio * (svgHeight - paddingTop - paddingBottom);
            const valLabel = Math.round(100 - ratio * 50);
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={paddingX}
                  y1={gridY}
                  x2={svgWidth - paddingX}
                  y2={gridY}
                  stroke="var(--border-subtle)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 10}
                  y={gridY + 4}
                  fill="var(--text-muted)"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="end"
                >
                  {valLabel}%
                </text>
              </g>
            );
          })}

          {/* SVG Line connecting coordinate nodes */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--text-main)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points / Interactive Nodes */}
          {coords.map(({ x, y, m, idx, diffPercent }) => {
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Node Vertical Alignment Guide Line on Hover */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={svgHeight - paddingBottom}
                    stroke="var(--text-muted)"
                    strokeDasharray="2 2"
                    strokeWidth="1"
                  />
                )}

                {/* Outer Glow Ring on Hover */}
                {isHovered && (
                  <circle
                    cx={x}
                    cy={y}
                    r="10"
                    fill="none"
                    stroke="var(--text-main)"
                    strokeWidth="2"
                    opacity="0.4"
                  />
                )}

                {/* Main Node Circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? '7' : '5'}
                  fill="var(--bg-primary)"
                  stroke="var(--text-main)"
                  strokeWidth="3"
                  style={{ transition: 'all 0.2s ease' }}
                />

                {/* Attendance Rate Pill Label above Node */}
                <rect
                  x={x - 28}
                  y={y - 28}
                  width="56"
                  height="20"
                  rx="10"
                  fill="var(--bg-glass)"
                  stroke="var(--border-strong)"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={y - 14}
                  fill="var(--text-main)"
                  fontSize="11"
                  fontWeight="800"
                  textAnchor="middle"
                >
                  {m.attendanceRate}%
                </text>

                {/* Mandate Year & Legislature Label below Node */}
                <text
                  x={x}
                  y={svgHeight - paddingBottom + 20}
                  fill="var(--text-main)"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {m.year}
                </text>

                <text
                  x={x}
                  y={svgHeight - paddingBottom + 34}
                  fill="var(--text-muted)"
                  fontSize="9.5"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {m.legislatura}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Pop-over Tooltip */}
        {hoveredIndex !== null && coords[hoveredIndex] && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '16px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              boxShadow: 'var(--shadow-md)',
              pointerEvents: 'none',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {coords[hoveredIndex].m.title} ({coords[hoveredIndex].m.period})
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Assiduidade: <strong style={{ color: 'var(--text-main)' }}>{coords[hoveredIndex].m.attendanceRate}%</strong> ({coords[hoveredIndex].m.attendedSessions}/{coords[hoveredIndex].m.totalSessions} sessões)
            </div>
            {coords[hoveredIndex].diffPercent !== null && (
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Variação vs mandato anterior: {coords[hoveredIndex].diffPercent! >= 0 ? `+${coords[hoveredIndex].diffPercent}%` : `${coords[hoveredIndex].diffPercent}%`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
