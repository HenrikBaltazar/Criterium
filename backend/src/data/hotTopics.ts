export type Ideology = 'LEFT' | 'CENTER' | 'RIGHT' | 'UNKNOWN';

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
  
  if (score <= 4.5) return 'LEFT'; 
  if (score < 7.0) return 'CENTER';
  return 'RIGHT';
}

export function getPartyIdeologyScore(partyStr?: string | null): number | null {
  if (!partyStr) return null;
  const party = partyStr.trim().toUpperCase();
  const score = PARTY_IDEOLOGY_SCORES[party];
  return score !== undefined ? score : null;
}

export type HotTopic = 
  | 'Aborto'
  | 'Reforma Agrária'
  | 'Reforma Previdenciária'
  | 'Porte de Armas'
  | 'Legalização da Maconha'
  | 'Anistia ao 8 de Janeiro'
  | 'Fim da Escala 6x1'
  | 'Limitação de Poderes do STF'
  | 'Regulação das Redes Sociais'
  | 'Privatização de Estatais';

export type TopicStance = 'FAVOR' | 'CONTRA' | 'NEUTRO';

export interface PartyTopicStance {
  topic: HotTopic;
  stance: TopicStance;
}

export const HOT_TOPICS: HotTopic[] = [
  'Aborto',
  'Reforma Agrária',
  'Reforma Previdenciária',
  'Porte de Armas',
  'Legalização da Maconha',
  'Anistia ao 8 de Janeiro',
  'Fim da Escala 6x1',
  'Limitação de Poderes do STF',
  'Regulação das Redes Sociais',
  'Privatização de Estatais'
];

export function getPartyStance(partyStr: string, topic: HotTopic): TopicStance {
  if (!partyStr) return 'NEUTRO';
  const ideology = getPartyIdeology(partyStr);
  
  if (ideology === 'UNKNOWN') return 'NEUTRO';

  if (ideology === 'LEFT') {
    switch(topic) {
      case 'Aborto': return 'FAVOR';
      case 'Reforma Agrária': return 'FAVOR';
      case 'Legalização da Maconha': return 'FAVOR';
      case 'Fim da Escala 6x1': return 'FAVOR';
      case 'Regulação das Redes Sociais': return 'FAVOR';
      
      case 'Reforma Previdenciária': return 'CONTRA';
      case 'Porte de Armas': return 'CONTRA';
      case 'Anistia ao 8 de Janeiro': return 'CONTRA';
      case 'Limitação de Poderes do STF': return 'CONTRA';
      case 'Privatização de Estatais': return 'CONTRA';
    }
  } else if (ideology === 'RIGHT') {
    switch(topic) {
      case 'Reforma Previdenciária': return 'FAVOR';
      case 'Porte de Armas': return 'FAVOR';
      case 'Anistia ao 8 de Janeiro': return 'FAVOR';
      case 'Limitação de Poderes do STF': return 'FAVOR';
      case 'Privatização de Estatais': return 'FAVOR';
      
      case 'Aborto': return 'CONTRA';
      case 'Reforma Agrária': return 'CONTRA';
      case 'Legalização da Maconha': return 'CONTRA';
      case 'Fim da Escala 6x1': return 'CONTRA';
      case 'Regulação das Redes Sociais': return 'CONTRA';
    }
  } else if (ideology === 'CENTER') {
    switch(topic) {
      case 'Reforma Previdenciária': return 'FAVOR';
      case 'Privatização de Estatais': return 'FAVOR';
      case 'Aborto': return 'CONTRA';
      case 'Legalização da Maconha': return 'CONTRA';
      case 'Fim da Escala 6x1': return 'CONTRA';
      
      case 'Anistia ao 8 de Janeiro': return 'NEUTRO';
      case 'Limitação de Poderes do STF': return 'NEUTRO';
      case 'Porte de Armas': return 'NEUTRO';
      case 'Regulação das Redes Sociais': return 'NEUTRO';
      case 'Reforma Agrária': return 'NEUTRO';
    }
  }

  return 'NEUTRO';
}
