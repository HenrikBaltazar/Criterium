import { fetchTseJson } from './tseFetcher';

async function inspectPriorElectionsDetail() {
  console.log('🔍 Inspecionando detalhamento de bens em eleicoesAnteriores...\n');

  // Let's fetch Lula (280002539825) or Zema (280002539826) or Girão
  const url = 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/2026/BR/20322002026/candidato/280002539825';
  const res: any = await fetchTseJson(url);

  const eleicoes = res?.eleicoesAnteriores || [];
  console.log(`Candidato: ${res?.nomeUrna} (${eleicoes.length} eleições passadas)`);

  eleicoes.forEach((e: any, idx: number) => {
    console.log(`\n--- [${idx + 1}] Eleição ${e.nrAno} (${e.cargo}) ---`);
    console.log(`  Partido: ${e.partido}`);
    console.log(`  totalDeBens: ${e.totalDeBens}`);
    console.log(`  bens: ${e.bens ? e.bens.length : 'null'}`);
    console.log(`  Outras chaves no objeto:`, Object.keys(e));
  });
}

inspectPriorElectionsDetail().catch(console.error);
