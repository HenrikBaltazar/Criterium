import { fetchTseJson } from './tseFetcher';

async function testTseUrls() {
  console.log('🔍 Testando URLs do portal DivulgaCandContas do TSE...\n');

  // Let's test a candidate detail endpoint from TSE API first to see all fields in eleicoesAnteriores
  // Candidate: Lula or Zema or Ivo Mil Grau
  const url = 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/2026/BR/20322002026/candidato/280002539825';
  console.log(`📡 GET ${url}`);
  const res: any = await fetchTseJson(url);

  console.log(`Candidato: ${res.nomeUrna}`);
  const eleicoes = res.eleicoesAnteriores || [];
  console.log(`Encontradas ${eleicoes.length} eleições anteriores:`);

  eleicoes.forEach((e: any, idx: number) => {
    console.log(`\n--- Eleição #${idx + 1} (${e.nrAno}) ---`);
    console.log(`  Cargo: ${e.cargo}`);
    console.log(`  idEleicao: ${e.idEleicao}`);
    console.log(`  sqEleicao (id): ${e.id}`);
    console.log(`  sgUe / local: ${e.sgUe || e.local}`);
    console.log(`  txLink original do TSE: ${e.txLink}`);

    // Let's construct alternative canonical URLs
    const uf = e.sgUe || e.local || 'BR';
    const canonicalUrl1 = `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${uf}/${uf}/${e.idEleicao}/${e.id}/${e.nrAno}/${uf}`;
    const canonicalUrl2 = `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${e.nrAno}/${e.idEleicao}/${uf}/${e.id}`;
    const canonicalUrl3 = `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${uf}/${e.idEleicao}/${e.id}`;

    console.log(`  Link Canônico Teste 1 (UF/UF/idEleicao/id/nrAno/UF): ${canonicalUrl1}`);
    console.log(`  Link Canônico Teste 2 (nrAno/idEleicao/UF/id): ${canonicalUrl2}`);
  });
}

testTseUrls().catch(console.error);
