import React, { useState } from 'react';
import { ExternalLink, DollarSign } from 'lucide-react';
import { buildTseCandidateUrl } from '../utils/badgeHelper';

interface AssetEvolutionChartProps {
  priorElections: any[];
  currentNetWorth: number;
  candidateState: string;
}

export const AssetEvolutionChart: React.FC<AssetEvolutionChartProps> = ({
  priorElections = [],
  currentNetWorth = 0,
  candidateState = 'BR',
}) => {
  if (!priorElections || priorElections.length === 0) return null;

  // Filter and sort elections chronologically ascending
  const pastElectionsOnly = [...priorElections]
    .filter((e) => Number(e.nrAno) < 2026)
    .sort((a, b) => Number(a.nrAno || 0) - Number(b.nrAno || 0));

  const dataPoints: {
    year: number;
    cargo: string;
    partido: string;
    netWorth: number | null;
    txLink: string;
    isCurrent: boolean;
  }[] = [];

  pastElectionsOnly.forEach((el) => {
    const year = Number(el.nrAno);
    const url = buildTseCandidateUrl(el, candidateState);
    const nw = typeof el.totalDeBens === 'number' ? el.totalDeBens : null;

    dataPoints.push({
      year,
      cargo: el.cargo || 'Candidato',
      partido: el.partido || 'N/A',
      netWorth: nw,
      txLink: url,
      isCurrent: false,
    });
  });

  // Append current 2026 election
  dataPoints.push({
    year: 2026,
    cargo: 'Candidatura 2026',
    partido: 'Atual',
    netWorth: currentNetWorth,
    txLink: `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${candidateState}/${candidateState}/20322002026`,
    isCurrent: true,
  });

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const formatCompactCurrency = (val: number | null) => {
    if (val == null) return 'Declarado';
    if (val === 0) return 'R$ 0';
    if (val >= 1_000_000) {
      const formatted = (val / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
      return `R$ ${formatted} Mi`;
    }
    if (val >= 1_000) {
      const formatted = (val / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
      return `R$ ${formatted} mil`;
    }
    return `R$ ${val.toLocaleString('pt-BR')}`;
  };

  // SVG Line Chart Dimensions & Coordinate Math
  const svgWidth = 650;
  const svgHeight = 210;
  const paddingX = 60;
  const paddingTop = 50;
  const paddingBottom = 45;

  const validValues = dataPoints.map((dp) => dp.netWorth).filter((v): v is number => v != null);
  const minVal = validValues.length > 0 ? Math.min(...validValues, 0) : 0;
  const maxVal = validValues.length > 0 ? Math.max(...validValues, 1000) : 1000;
  const valRange = maxVal - minVal > 0 ? maxVal - minVal : 1;

  const coords = dataPoints.map((dp, idx) => {
    const x = paddingX + (idx / Math.max(1, dataPoints.length - 1)) * (svgWidth - 2 * paddingX);
    const val = dp.netWorth ?? 0;
    const norm = (val - minVal) / valRange;
    const y = svgHeight - paddingBottom - norm * (svgHeight - paddingTop - paddingBottom);

    // Calculate percentage variation vs previous election
    let diffPercent: number | null = null;
    if (idx > 0) {
      const prevVal = dataPoints[idx - 1].netWorth;
      if (dp.netWorth != null && prevVal != null && prevVal > 0) {
        diffPercent = Math.round(((dp.netWorth - prevVal) / prevVal) * 100);
      }
    }

    return { x, y, dp, idx, diffPercent };
  });

  // Generate SVG polyline path string
  const pathD = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');

  return (
    <div
      className="glass-card"
      style={{
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <DollarSign size={20} /> Histórico de Declaração de Bens & Evolução Patrimonial
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Valores declarados visíveis em cada ano. Passe o mouse para ver a porcentagem de variação e clique diretamente em qualquer nó para abrir a ficha oficial do TSE.
          </p>
        </div>
      </div>

      {/* SVG Interactive Line Chart Container */}
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
          {/* Horizontal Gridlines */}
          {[0, 0.5, 1].map((ratio, i) => {
            const gridY = paddingTop + ratio * (svgHeight - paddingTop - paddingBottom);
            return (
              <line
                key={`grid-${i}`}
                x1={paddingX}
                y1={gridY}
                x2={svgWidth - paddingX}
                y2={gridY}
                stroke="var(--border-subtle)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Line Path Connecting Years */}
          <path
            d={pathD}
            fill="none"
            stroke="var(--text-main)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Nodes for each election year */}
          {coords.map((pt) => {
            const isHovered = pt.idx === hoveredIndex;

            return (
              <a
                key={`node-link-${pt.dp.year}-${pt.idx}`}
                href={pt.dp.txLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ cursor: 'pointer', textDecoration: 'none' }}
                title={`Clique para abrir a ficha oficial do TSE da eleição de ${pt.dp.year}`}
                onMouseEnter={() => setHoveredIndex(pt.idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <g>
                  {/* Outer halo on hovered point */}
                  {isHovered && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="10"
                      fill="none"
                      stroke="var(--text-main)"
                      strokeWidth="2"
                      opacity="0.6"
                    />
                  )}

                  {/* Node Circle Point */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6.5 : 4.5}
                    fill={pt.dp.isCurrent ? 'var(--text-main)' : 'var(--bg-primary)'}
                    stroke="var(--text-main)"
                    strokeWidth="2.5"
                  />

                  {/* ALWAYS VISIBLE Value Label above node */}
                  <text
                    x={pt.x}
                    y={pt.y - 12}
                    textAnchor="middle"
                    fill="var(--text-main)"
                    fontSize="11"
                    fontWeight="800"
                  >
                    {formatCompactCurrency(pt.dp.netWorth)}
                  </text>

                  {/* Hover Tooltip (% Change vs Previous Election) */}
                  {isHovered && pt.diffPercent != null && (
                    <g transform={`translate(${pt.x}, ${pt.y - 32})`}>
                      <rect
                        x="-45"
                        y="-14"
                        width="90"
                        height="20"
                        rx="4"
                        fill="var(--bg-primary)"
                        stroke="var(--text-main)"
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        fill="var(--text-main)"
                        fontSize="10"
                        fontWeight="800"
                      >
                        {pt.diffPercent >= 0 ? `+${pt.diffPercent}% vs ant.` : `${pt.diffPercent}% vs ant.`}
                      </text>
                    </g>
                  )}

                  {/* X-Axis Year Labels with External Link Icon */}
                  <text
                    x={pt.x}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    fill={isHovered ? 'var(--text-main)' : 'var(--text-muted)'}
                    fontSize="12"
                    fontWeight={isHovered ? '800' : '600'}
                  >
                    {pt.dp.year} ↗
                  </text>
                </g>
              </a>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
