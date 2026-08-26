import { fetchTseJson } from './tseFetcher';

async function testPastElectionDetail() {
  console.log('📡 Testando busca de detalhes de eleição passada no TSE...\n');

  // Let's test Eduardo Girão 2024 Prefeito (ano: 2024, sgUe: 13897, idEleicao: 2045202024, sqCandidato: 60002029283)
  const url2024 = 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/2024/13897/2045202024/candidato/60002029283';
  console.log(`GET ${url2024}`);
  const res2024: any = await fetchTseJson(url2024);

  console.log(`✅ 2024 Candidato: ${res2024?.nomeUrna}`);
  console.log(`   totalDeBens 2024: R$ ${res2024?.totalDeBens}`);
  console.log(`   partido 2024: ${res2024?.partido?.sigla}`);

  // Let's test Eduardo Girão 2018 Senador (ano: 2018, sgUe: CE, idEleicao: 2022802018, sqCandidato: 60000611597)
  const url2018 = 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/2018/CE/2022802018/candidato/60000611597';
  console.log(`\nGET ${url2018}`);
  const res2018: any = await fetchTseJson(url2018);

  console.log(`✅ 2018 Candidato: ${res2018?.nomeUrna}`);
  console.log(`   totalDeBens 2018: R$ ${res2018?.totalDeBens}`);
  console.log(`   partido 2018: ${res2018?.partido?.sigla}`);
}

testPastElectionDetail().catch(console.error);
