export type Ideology = 'LEFT' | 'CENTER' | 'RIGHT' | 'UNKNOWN';

// Hardcoded 2021 BLS baseline (Scale 1 to 10: 1 = Extreme Left, 10 = Extreme Right)
export const PARTY_IDEOLOGY_SCORES: Record<string, number> = {
  'UP': 1.0,
  'PCO': 1.0,
  'PSTU': 1.0,
  'PSOL': 1.2,
  'PT': 1.5,
  'PCdoB': 1.6,
  'REDE': 3.5,
  'PDT': 3.5,
  'PSB': 3.8,
  'PV': 4.0,
  'CIDADANIA': 5.5,
  'SOLIDARIEDADE': 6.0,
  'PSDB': 6.5,
  'MOBILIZA': 6.5,
  'MDB': 6.8,
  'PSD': 6.9,
  'PODE': 7.0,
  'PODEMOS': 7.0,
  'AGIR': 7.0,
  'AVANTE': 7.2,
  'PROS': 7.5,
  'DC': 8.0,
  'PMB': 8.0,
  'PRD': 8.0,
  'PTB': 8.0,
  'PP': 8.0,
  'UNIÃO': 8.5,
  'REPUBLICANOS': 8.5,
  'NOVO': 8.8,
  'PL': 9.0,
  'PRTB': 9.5
};

export function getPartyIdeology(partyStr?: string | null): Ideology {
  if (!partyStr) return 'UNKNOWN';
  
  const party = partyStr.trim().toUpperCase();
  const score = PARTY_IDEOLOGY_SCORES[party];
  
  if (score === undefined) return 'UNKNOWN';
  
  if (score <= 4.5) return 'LEFT'; // Changed from 4.0 to 4.5 to safely include left parties. PV is 4.0.
  if (score < 7.0) return 'CENTER'; // 5.5 to 6.9 is center
  return 'RIGHT'; // >= 7.0 is right
}

export function getPartyIdeologyScore(partyStr?: string | null): number | null {
  if (!partyStr) return null;
  const party = partyStr.trim().toUpperCase();
  const score = PARTY_IDEOLOGY_SCORES[party];
  return score !== undefined ? score : null;
}
