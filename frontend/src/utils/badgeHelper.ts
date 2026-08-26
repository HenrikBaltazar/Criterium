export function formatTseStatus(status?: string): string {
  if (!status) return 'Deferido';
  const upper = status.toUpperCase();
  if (upper === 'DEFERIDO' || upper === 'CADASTRO_DEFERIDO') return 'Deferido';
  if (upper === 'INDEFERIDO') return 'Indeferido';
  if (upper === 'INAPTO') return 'Inapto';
  if (upper === 'AGUARDANDO_JULGAMENTO' || upper === 'AGUARDANDO') return 'Aguardando julgamento';
  return status;
}

export function shouldRenderTseStatusBadge(status?: string): boolean {
  if (!status) return false;
  const upper = status.toUpperCase();
  if (
    upper === 'DEFERIDO' ||
    upper === 'CADASTRO_DEFERIDO' ||
    upper === 'AGUARDANDO_JULGAMENTO' ||
    upper === 'AGUARDANDO'
  ) {
    return false;
  }
  const formatted = formatTseStatus(status);
  if (formatted === 'Deferido' || formatted === 'Aguardando julgamento' || formatted === 'Em processamento') {
    return false;
  }
  return true;
}

export function getJudicialBadgeStatus(
  records?: any[],
  _tseStatus?: string
): 'CONVICTED' | 'UNDER_INVESTIGATION' | 'CLEAN' | 'NONE' {
  if (records && records.length > 0) {
    const hasConviction = records.some((r) => r.status === 'CONVICTED');
    if (hasConviction) return 'CONVICTED';
    const hasInvestigation = records.some((r) => r.status === 'UNDER_INVESTIGATION');
    if (hasInvestigation) return 'UNDER_INVESTIGATION';
    return 'CLEAN';
  }
  return 'NONE';
}

export function getJudicialBadgeLabel(records?: any[], tseStatus?: string): string | null {
  const status = getJudicialBadgeStatus(records, tseStatus);
  switch (status) {
    case 'CONVICTED':
      return 'Condenado';
    case 'UNDER_INVESTIGATION':
      return 'Investigado';
    case 'CLEAN':
      return 'Íntegro';
    default:
      return null;
  }
}

export function isElected(status?: string): boolean {
  if (!status) return false;
  const sit = status.toLowerCase();
  if (sit.includes('não') || sit.includes('nao')) return false;
  return sit.includes('eleito');
}

export interface ExperienceTagInfo {
  tag: 'OUTSIDER' | 'EXPERIENTE' | 'INTERMEDIATE';
  label: string;
  tooltip: string;
}

export function getCandidateExperienceTag(priorElectionsJson?: string | null, careerItems: any[] = []): ExperienceTagInfo {
  let priorElections: any[] = [];
  if (priorElectionsJson) {
    try {
      priorElections = typeof priorElectionsJson === 'string' ? JSON.parse(priorElectionsJson) : priorElectionsJson;
    } catch (e) {
      priorElections = [];
    }
  }

  const pastElections = priorElections.filter((e: any) => e.nrAno && Number(e.nrAno) < 2026);

  const electedPastElections = pastElections.filter((e: any) => isElected(e.situacaoTotalizacao));

  const count = electedPastElections.length;
  if (count >= 1) {
    return {
      tag: 'EXPERIENTE',
      label: 'Experiente',
      tooltip: count === 1 ? 'Eleito em 1 eleição passada' : `Eleito em ${count} eleições passadas`,
    };
  }

  if (pastElections.length === 0) {
    return {
      tag: 'OUTSIDER',
      label: 'Outsider',
      tooltip: 'Concorrendo a primeira eleicao',
    };
  }

  return {
    tag: 'INTERMEDIATE',
    label: '',
    tooltip: '',
  };
}

export function buildTseCandidateUrl(eleicao: any, fallbackState?: string): string {
  if (!eleicao) return 'https://divulgacandcontas.tse.jus.br';

  const ano = eleicao.nrAno || 2026;
  const idEleicao = eleicao.idEleicao || (ano === 2026 ? '20322002026' : ano === 2024 ? '2045202024' : ano === 2022 ? '2040602022' : ano === 2020 ? '2030402020' : ano === 2018 ? '2022802018' : '680');
  const sqCandidato = eleicao.id || eleicao.sqCandidato;

  // Determine UF and UE
  const rawUe = String(eleicao.sgUe || eleicao.local || fallbackState || 'BR').trim();
  const uf = isNaN(Number(rawUe)) ? rawUe : (fallbackState && fallbackState !== 'FEDERAL' && fallbackState !== 'ALL' ? fallbackState : 'BR');
  const ue = rawUe;

  if (!sqCandidato) return 'https://divulgacandcontas.tse.jus.br';

  // Canonical 6-parameter route format required by DivulgaCandContas 2026
  return `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${uf}/${ue}/${idEleicao}/${sqCandidato}/${ano}/${uf}`;
}
