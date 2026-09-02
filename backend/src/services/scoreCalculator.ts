import { UserSettings, UserEvaluation, CareerItem } from '@prisma/client';

export type ExperienceTag = 'OUTSIDER' | 'EXPERIENTE' | 'INTERMEDIATE';

export interface AutoScoreRuleItem {
  id: string;
  component?: string;
  categoryValue?: string;
  cargo?: string;
  label: string;
  points: number;
  type: 'rule';
}

export interface ScoreBreakdown {
  objectiveScore: number;
  subjectiveScore: number;
  totalCompositeScore: number;
  experienceTag: ExperienceTag;
  yearsInPolitics: number;
  details: {
    userEvaluationsPts: number;
    autoRuleItems?: AutoScoreRuleItem[];
  };
}

export function calculateCandidateExperience(
  careerItems: CareerItem[] = [],
  priorElectionsJson?: string | null
): { tag: ExperienceTag; totalYears: number } {
  let priorElections: any[] = [];
  if (priorElectionsJson) {
    try {
      priorElections = typeof priorElectionsJson === 'string' ? JSON.parse(priorElectionsJson) : priorElectionsJson;
    } catch (e) {
      priorElections = [];
    }
  }

  const pastElections = priorElections.filter((e: any) => e.nrAno && Number(e.nrAno) < 2026);
  const isElected = (status?: string) => {
    if (!status) return false;
    const upper = status.toUpperCase();
    return upper.includes('ELEITO') && !upper.includes('NÃO ELEITO') && !upper.includes('NAO ELEITO');
  };

  const electedPastElections = pastElections.filter((e: any) => isElected(e.situacaoTotalizacao));

  if (electedPastElections.length >= 1) {
    return { tag: 'EXPERIENTE', totalYears: electedPastElections.length * 4 };
  }

  if (pastElections.length === 0 && (!careerItems || careerItems.length === 0)) {
    return { tag: 'OUTSIDER', totalYears: 0 };
  }

  return { tag: 'INTERMEDIATE', totalYears: pastElections.length * 2 };
}

export function calculateCandidateScore(
  userSettings?: UserSettings | null,
  userEvaluations: UserEvaluation[] = [],
  careerItems: CareerItem[] = [],
  candidateData?: {
    party?: string | null;
    education?: string | null;
    netWorth?: number | null;
    occupation?: string | null;
    priorElectionsJson?: string | null;
    cargo?: { name?: string } | null;
    cargoName?: string | null;
    publicPerformance?: { attendanceRate?: number; totalSessions?: number } | null;
  } | null
): ScoreBreakdown {
  const experience = calculateCandidateExperience(careerItems, candidateData?.priorElectionsJson);

  // Custom Rule Evaluation Engine (Automatic Scoring Model)
  const autoRuleItems: AutoScoreRuleItem[] = [];
  let autoRulesTotalScore = 0;

  if (userSettings?.autoRulesJson) {
    try {
      const parsedRules = JSON.parse(userSettings.autoRulesJson);
      if (Array.isArray(parsedRules) && parsedRules.length > 0) {
        for (const r of parsedRules) {
          if (!r || typeof r.points !== 'number' || r.points === 0) continue;

          // Cargo filter check
          const candCargo = candidateData?.cargo?.name || candidateData?.cargoName || '';
          if (r.cargo && r.cargo !== 'TODOS') {
            if (!candCargo || candCargo.trim().toLowerCase() !== r.cargo.trim().toLowerCase()) {
              continue;
            }
          }

          let matches = false;
          let label = `Regra Automática`;

          if (r.component === 'PARTY' && candidateData?.party) {
            const candParty = candidateData.party.trim().toUpperCase();
            const partyList = (r.categoryValue || '')
              .split(',')
              .map((p: string) => p.trim().toUpperCase())
              .filter(Boolean);

            if (partyList.includes(candParty)) {
              matches = true;
              label = `Regra Partido (${r.categoryValue})`;
            }
          } else if (r.component === 'EDUCATION' && candidateData?.education) {
            if (candidateData.education.trim().toLowerCase() === (r.categoryValue || '').trim().toLowerCase()) {
              matches = true;
              label = `Regra Instrução (${r.categoryValue})`;
            }
          } else if (r.component === 'ASSETS' && candidateData?.netWorth != null) {
            const nw = candidateData.netWorth;
            const minOk = r.minValue == null || nw >= r.minValue;
            const maxOk = r.maxValue == null || r.maxValue === 0 || nw <= r.maxValue;
            if (minOk && maxOk) {
              matches = true;
              label = `Regra Patrimônio Declarado`;
            }
          } else if (r.component === 'OCCUPATION' && candidateData?.occupation) {
            if (candidateData.occupation.trim().toLowerCase() === (r.categoryValue || '').trim().toLowerCase()) {
              matches = true;
              label = `Regra Ocupação (${r.categoryValue})`;
            }
          } else if (r.component === 'EXPERIENCE') {
            if (experience.tag === r.categoryValue) {
              matches = true;
              label = `Regra Experiência (${r.categoryValue === 'OUTSIDER' ? 'Outsider' : 'Experiente'})`;
            }
          } else if (r.component === 'PERFORMANCE' && candidateData?.publicPerformance) {
            const rate = candidateData.publicPerformance.attendanceRate || 0;
            const minOk = r.minValue == null || rate >= r.minValue;
            const maxOk = r.maxValue == null || r.maxValue === 0 || rate <= r.maxValue;
            if (minOk && maxOk) {
              matches = true;
              label = `Regra Assiduidade (${rate}% presenças)`;
            }
          }

          if (matches) {
            autoRulesTotalScore += r.points;
            autoRuleItems.push({
              id: `rule-${r.id || Math.random()}`,
              component: r.component,
              categoryValue: r.categoryValue,
              cargo: r.cargo || 'TODOS',
              label: r.cargo && r.cargo !== 'TODOS' ? `${label} [${r.cargo}]` : label,
              points: r.points,
              type: 'rule',
            });
          }
        }
      }
    } catch (e) {
      console.error('Error parsing autoRulesJson:', e);
    }
  }

  // Objective score strictly comes from custom rules (0 if no rules)
  const objectiveScore = Math.round(autoRulesTotalScore);

  // Subjective Manual Ratings (Step of 1 point per click)
  let userEvaluationsPts = 0;
  if (userEvaluations && userEvaluations.length > 0) {
    for (const ev of userEvaluations) {
      if (ev.itemType !== 'AUTO_OVERRIDE') {
        userEvaluationsPts += ev.rating * 1;
      }
    }
  }

  const subjectiveScore = Math.round(userEvaluationsPts);
  const rawComposite = objectiveScore + subjectiveScore;
  const totalCompositeScore = Math.min(9999999, Math.max(-9999999, rawComposite));

  return {
    objectiveScore,
    subjectiveScore,
    totalCompositeScore,
    experienceTag: experience.tag,
    yearsInPolitics: experience.totalYears,
    details: {
      userEvaluationsPts: Math.round(userEvaluationsPts),
      autoRuleItems,
    },
  };
}
