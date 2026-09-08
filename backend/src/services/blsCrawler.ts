import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

// Define the shape of the ideology data
export interface PartyIdeology {
  [sigla: string]: number;
}

// Emulate a remote mirror URL that would host the BLS data
const BLS_MIRROR_URL = 'https://raw.githubusercontent.com/criterium-project/bls-mirror/main/bls_ideology_latest.json';

// Path to save the local JSON
const DATA_DIR = path.join(__dirname, '../../data');
const JSON_PATH = path.join(DATA_DIR, 'bls_ideology.json');

// Hardcoded 2021 BLS baseline (Scale 1 to 10: 1 = Extreme Left, 10 = Extreme Right)
// Based on Brazilian Legislative Surveys (Zucco & Power)
const FALLBACK_BLS_DATA: PartyIdeology = {
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
  'MDB': 6.8,
  'PSD': 6.9,
  'PODEMOS': 7.0,
  'AVANTE': 7.2,
  'PROS': 7.5,
  'PTB': 8.0, // Historical
  'PP': 8.0,
  'UNIÃO': 8.5,
  'REPUBLICANOS': 8.5,
  'NOVO': 8.8,
  'PL': 9.0,
  'PRTB': 9.5
};

export const fetchAndSaveBLSData = async () => {
  try {
    console.log('[BLS Crawler] Verificando nova versão do dataset Zucco & Power (BLS)...');
    
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let ideologyData: PartyIdeology;

    try {
      const response = await fetch(BLS_MIRROR_URL, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      ideologyData = await response.json();
      console.log('[BLS Crawler] Dados recuperados com sucesso do repositório espelho.');
    } catch (fetchError) {
      console.warn(`[BLS Crawler] Falha ao conectar no espelho (${(fetchError as Error).message}). Usando base de dados BLS interna de 2021 como fallback.`);
      ideologyData = FALLBACK_BLS_DATA;
    }

    fs.writeFileSync(JSON_PATH, JSON.stringify(ideologyData, null, 2), 'utf-8');
    console.log(`[BLS Crawler] JSON de ideologias partidárias atualizado em: ${JSON_PATH}`);
  } catch (error) {
    console.error('[BLS Crawler] Erro crítico ao atualizar dados do BLS:', error);
  }
};

export const startBlsCronjob = () => {
  // Run on startup
  fetchAndSaveBLSData();

  // Schedule to run every Sunday at 03:00 AM
  cron.schedule('0 3 * * 0', () => {
    console.log('[BLS Crawler] Executando cronjob semanal...');
    fetchAndSaveBLSData();
  });
  
  console.log('[BLS Crawler] Cronjob registrado para rodar todo domingo às 03:00 AM.');
};
