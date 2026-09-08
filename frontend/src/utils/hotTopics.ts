import { getPartyIdeology } from './ideology';

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
    // O Centro no Brasil tende a ter um perfil mais conservador em costumes e liberal na economia
    switch(topic) {
      case 'Reforma Previdenciária': return 'FAVOR';
      case 'Privatização de Estatais': return 'FAVOR';
      case 'Aborto': return 'CONTRA';
      case 'Legalização da Maconha': return 'CONTRA';
      case 'Fim da Escala 6x1': return 'CONTRA'; // Geralmente o centro foca no setor produtivo
      
      case 'Anistia ao 8 de Janeiro': return 'NEUTRO';
      case 'Limitação de Poderes do STF': return 'NEUTRO';
      case 'Porte de Armas': return 'NEUTRO';
      case 'Regulação das Redes Sociais': return 'NEUTRO';
      case 'Reforma Agrária': return 'NEUTRO';
    }
  }

  return 'NEUTRO';
}
