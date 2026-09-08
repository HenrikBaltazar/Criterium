import React from 'react';
import { getPartyIdeologyScore } from '../utils/ideology';

interface IdeologyIconProps {
  party: string;
  className?: string;
}

export const IdeologyIcon: React.FC<IdeologyIconProps> = ({ party, className = '' }) => {
  const score = getPartyIdeologyScore(party);
  if (score === null) return null;

  let textSymbol = '-';
  let title = 'Centro';

  if (score < 2.0) {
    textSymbol = '<<<';
    title = 'Extrema Esquerda';
  } else if (score < 3.0) {
    textSymbol = '<<';
    title = 'Muito Esquerda';
  } else if (score <= 4.5) {
    textSymbol = '<';
    title = 'Esquerda';
  } else if (score < 6.5) {
    textSymbol = '-';
    title = 'Centro';
  } else if (score < 7.5) {
    textSymbol = '>';
    title = 'Direita';
  } else if (score < 8.5) {
    textSymbol = '>>';
    title = 'Muito Direita';
  } else {
    textSymbol = '>>>';
    title = 'Extrema Direita';
  }

  return (
    <a 
      href="https://dataverse.harvard.edu/dataverse/bls"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-sm bg-gray-100 text-gray-800 font-mono font-bold tracking-tighter hover:bg-gray-200 transition-colors cursor-pointer ${className}`} 
      title={`Posição Ideológica (BLS): ${title}\nClique para saber mais sobre o BLS`}
      style={{ textDecoration: 'none', fontSize: '0.8rem', minWidth: '24px' }}
    >
      {textSymbol}
    </a>
  );
};
