import { PrismaClient, CargoScope } from '@prisma/client';
import { fetchTseJson } from './tseFetcher';
import { ingestHistoricalAssets } from './ingestHistoricalAssets';
import { syncPublicPerformance } from './ingest_public_performance';
import { syncSenateEducation } from './ingest_senate_education';
import { startRollingSyncEngine } from './rollingSyncEngine';

const prisma = new PrismaClient();

const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];

interface CargoConfig {
  code: string;
  tseCode: number;
  name: string;
  scope: CargoScope;
  ufs: string[];
}

const CARGO_CONFIGS: CargoConfig[] = [
  { code: 'PRESIDENTE', tseCode: 1, name: 'Presidente da República', scope: CargoScope.FEDERAL, ufs: ['BR'] },
  { code: 'GOVERNADOR', tseCode: 3, name: 'Governador', scope: CargoScope.ESTADUAL, ufs: UFS },
  { code: 'SENADOR', tseCode: 5, name: 'Senador', scope: CargoScope.FEDERAL, ufs: UFS },
  { code: 'DEP_FEDERAL', tseCode: 6, name: 'Deputado Federal', scope: CargoScope.FEDERAL, ufs: UFS },
  { code: 'DEP_ESTADUAL', tseCode: 7, name: 'Deputado Estadual', scope: CargoScope.ESTADUAL, ufs: UFS },
];

interface TseCandidateListItem {
  id: number;
  nomeUrna: string;
  numero: number;
  nomeCompleto: string;
  descricaoSituacao: string;
  ufCandidatura: string;
  cargo: { codigo: number; nome: string };
  partido: { numero: number; sigla: string; nome: string | null };
}

interface TseCandidateListResponse {
  candidatos?: TseCandidateListItem[];
}

interface TseCandidateDetail {
  id: number;
  nomeUrna: string;
  numero: number;
  nomeCompleto: string;
  cpf?: string;
  descricaoSexo?: string;
  dataDeNascimento?: string;
  grauInstrucao?: string;
  ocupacao?: string;
  descricaoSituacao: string;
  fotoUrl?: string;
  totalDeBens?: number;
  bens?: any[];
  vices?: any[];
  sites?: string[];
  eleicoesAnteriores?: any[];
  arquivos?: any[];
  ufCandidatura: string;
  partido?: { numero: number; sigla: string; nome: string };
}

let currentStatus: 'ativo' | 'buscando' | 'desativado' = 'ativo';
let totalFetchedCounter = 0;

async function updateHeartbeat(status: 'ativo' | 'buscando' | 'desativado', fetched = totalFetchedCounter) {
  currentStatus = status;
  totalFetchedCounter = fetched;
  try {
    await prisma.crawlerStatus.upsert({
      where: { id: 'default' },
      update: {
        status,
        lastHeartbeat: new Date(),
        candidatesFetched: fetched,
      },
      create: {
        id: 'default',
        status,
        lastHeartbeat: new Date(),
        candidatesFetched: fetched,
      },
    });
  } catch (err) {
    // Ignore heartbeat errors
  }
}

async function processCandidateItem(
  item: TseCandidateListItem,
  uf: string,
  cfg: CargoConfig,
  cargoDbId: string,
  electionYearId: string
) {
  const sqCandidato = String(item.id);

  // Smart DB-First Check: If candidate is already fully populated in DB, skip unnecessary network call to TSE!
  let existing = await prisma.candidate.findUnique({
    where: { sqCandidato },
  });

  const popularNameFast = item.nomeUrna || 'Candidato';
  const partyFast = item.partido?.sigla || 'INDEP';

  if (existing && existing.assetsJson && existing.priorElectionsJson && existing.education !== 'Não informado') {
    console.log(`  └─ [PostgreSQL Cache] ${popularNameFast} (${partyFast} - ${uf}) [SQ: ${sqCandidato}] -> Perfil completo em cache DB. Chamada HTTP ignorada.`);
    return 'skipped';
  }

  const candidateNumber = item.numero || 0;
  const detailUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/2026/${uf}/20322002026/candidato/${sqCandidato}`;
  
  console.log(`  ├─ [TSE API 2026] Extraindo perfil completo de ${popularNameFast} (${partyFast} - ${uf}) [SQ: ${sqCandidato}]...`);
  const detail = await fetchTseJson<TseCandidateDetail>(detailUrl);

  const rawCpf = detail?.cpf || (item as any)?.cpf || null;
  const cpf = rawCpf ? String(rawCpf).trim() : null;
  const popularName = detail?.nomeUrna || item.nomeUrna || 'Candidato';
  const fullName = detail?.nomeCompleto || item.nomeCompleto || popularName;
  const party = detail?.partido?.sigla || item.partido?.sigla || 'INDEP';
  const partyNumber = detail?.partido?.numero || item.partido?.numero || 0;
  const photoUrl = detail?.fotoUrl || `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/20322002026/${sqCandidato}/${uf}`;
  const netWorth = detail?.totalDeBens || 0;
  const education = detail?.grauInstrucao || 'Não informado';
  const occupation = detail?.ocupacao || 'Não informado';
  const status = detail?.descricaoSituacao || item.descricaoSituacao || 'DEFERIDO';
  const socialLinksJson = detail?.sites && detail.sites.length > 0 ? JSON.stringify({ website: detail.sites[0], links: detail.sites }) : null;
  const assetsJson = detail?.bens && detail.bens.length > 0 ? JSON.stringify(detail.bens) : null;
  const vicesJson = detail?.vices && detail.vices.length > 0 ? JSON.stringify(detail.vices) : null;
  
  // Sanitização estrita do histórico de eleições passadas (< 2026) "Concorrendo" -> "Concorreu"
  const rawEleicoes = detail?.eleicoesAnteriores || [];
  const sanitizedEleicoes = rawEleicoes.map((e: any) => {
    const elItem = { ...e };
    if (elItem.nrAno && Number(elItem.nrAno) < 2026) {
      if (elItem.situacaoTotalizacao && String(elItem.situacaoTotalizacao).toLowerCase() === 'concorrendo') {
        elItem.situacaoTotalizacao = 'Concorreu';
      }
    }
    return elItem;
  });
  const priorElectionsJson = sanitizedEleicoes.length > 0 ? JSON.stringify(sanitizedEleicoes) : null;
  
  const proposalFiles = detail?.arquivos ? detail.arquivos.filter((a: any) => String(a.codTipo) === '5' || (a.nome && (a.nome.toLowerCase().includes('plano') || a.nome.toLowerCase().includes('proposta')))) : [];
  const proposalsJson = proposalFiles && proposalFiles.length > 0 ? JSON.stringify(proposalFiles) : null;

  const infoSourceUrl = `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${uf}/${uf}/20322002026/${sqCandidato}/2026/${uf}`;
  const summary = `Candidato a ${cfg.name} nas Eleições 2026 (${uf}) pelo partido ${party}.`;

  // Search first by sqCandidato, then fallback by CPF + cargoId + state
  if (!existing) {
    existing = await prisma.candidate.findUnique({
      where: { sqCandidato },
    });
  }

  if (!existing && cpf) {
    existing = await prisma.candidate.findFirst({
      where: { cpf, cargoId: cargoDbId, state: uf },
    });
  }

  if (existing) {
    const updateData: any = {};
    if (!existing.sqCandidato && sqCandidato) updateData.sqCandidato = sqCandidato;
    if (cpf && existing.cpf !== cpf) updateData.cpf = cpf;
    if (!existing.name && fullName) updateData.name = fullName;
    if (!existing.popularName && popularName) updateData.popularName = popularName;
    if (!existing.photoUrl && photoUrl) updateData.photoUrl = photoUrl;
    if ((!existing.netWorth || existing.netWorth === 0) && netWorth > 0) updateData.netWorth = netWorth;
    if ((!existing.education || existing.education === 'Não informado') && education && education !== 'Não informado') updateData.education = education;
    if ((!existing.occupation || existing.occupation === 'Não informado') && occupation && occupation !== 'Não informado') updateData.occupation = occupation;
    if (!existing.socialLinks && socialLinksJson) updateData.socialLinks = socialLinksJson;
    if (!existing.assetsJson && assetsJson) updateData.assetsJson = assetsJson;
    if (!existing.vicesJson && vicesJson) updateData.vicesJson = vicesJson;
    if (!existing.priorElectionsJson && priorElectionsJson) updateData.priorElectionsJson = priorElectionsJson;
    if (!existing.proposalsJson && proposalsJson) updateData.proposalsJson = proposalsJson;
    if (!existing.infoSourceUrl && infoSourceUrl) updateData.infoSourceUrl = infoSourceUrl;

    if (Object.keys(updateData).length > 0) {
      await prisma.candidate.update({
        where: { id: existing.id },
        data: updateData,
      });
      console.log(`  └─ [PostgreSQL] ATUALIZADO: ${popularName} (${party} - ${uf}) | Enriquecidos novos campos do TSE.`);
      return 'updated';
    }
    return 'skipped';
  } else {
    try {
      await prisma.candidate.create({
        data: {
          sqCandidato,
          cpf,
          electionYearId,
          cargoId: cargoDbId,
          name: fullName,
          popularName,
          party,
          partyNumber,
          candidateNumber,
          state: uf,
          photoUrl,
          netWorth,
          education,
          occupation,
          status,
          summary,
          socialLinks: socialLinksJson,
          assetsJson,
          vicesJson,
          priorElectionsJson,
          proposalsJson,
          infoSourceUrl,
        },
      });
      console.log(`  ✨ [PostgreSQL] CRIADO: ${popularName} (${fullName}) | Partido: ${party} (${partyNumber}) | Bens: R$ ${netWorth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Vices: ${detail?.vices?.length || 0} | Eleições Anteriores: ${sanitizedEleicoes.length}`);
      return 'saved';
    } catch (err: any) {
      console.warn(`  ⚠️ [Crawler Error] Falha ao salvar candidato ${sqCandidato} (${fullName}):`, err.message);
      return 'skipped';
    }
  }
}

async function main() {
  console.log('🚀 [Criterium Crawler v2.7] Ingestão com sanitização automática de "Concorrendo" -> "Concorreu" em eleições passadas...');
  await updateHeartbeat('ativo', 0);

  const heartbeatTimer = setInterval(() => {
    updateHeartbeat(currentStatus, totalFetchedCounter);
  }, 4000);

  // 1. Garantir Ano Eleitoral
  const electionYear = await prisma.electionYear.upsert({
    where: { year: 2026 },
    update: {},
    create: {
      year: 2026,
      label: 'Eleições Gerais 2026',
      description: 'Eleições para Presidente, Governador, Senador, Deputado Federal e Deputado Estadual.',
      status: 'ACTIVE',
    },
  });

  // 2. Garantir Cargos
  const cargoMap = new Map<string, string>();
  for (const cfg of CARGO_CONFIGS) {
    const cargoRecord = await prisma.cargo.upsert({
      where: { code: cfg.code },
      update: { name: cfg.name, scope: cfg.scope },
      create: { code: cfg.code, name: cfg.name, scope: cfg.scope },
    });
    cargoMap.set(cfg.code, cargoRecord.id);
  }

  let totalCandidatesSaved = 0;
  let totalCandidatesUpdated = 0;

  // 3. Fase 1 & 2: Ingestão por Cargo e Estado
  for (const cfg of CARGO_CONFIGS) {
    const cargoDbId = cargoMap.get(cfg.code)!;
    console.log(`\n📋 [Fase 1] Listando candidatos para o cargo: ${cfg.name} (${cfg.code})...`);

    for (const uf of cfg.ufs) {
      await updateHeartbeat('buscando', totalFetchedCounter);

      const tseCodeToUse = (cfg.code === 'DEP_ESTADUAL' && uf === 'DF') ? 8 : cfg.tseCode;
      const listUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/listar/2026/${uf}/20322002026/${tseCodeToUse}/candidatos`;
      const listData = await fetchTseJson<TseCandidateListResponse>(listUrl);

      const items = listData?.candidatos || [];
      if (items.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }

      console.log(`  ├─ Estado ${uf}: ${items.length} candidatos listados. Processando detalhes (Fase 2)...`);
      totalFetchedCounter += items.length;
      await updateHeartbeat('buscando', totalFetchedCounter);

      const BATCH_SIZE = 25;
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const chunk = items.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          chunk.map((item) => processCandidateItem(item, uf, cfg, cargoDbId, electionYear.id))
        );

        for (const res of results) {
          if (res === 'saved') totalCandidatesSaved++;
          if (res === 'updated') totalCandidatesUpdated++;
        }

        await new Promise((resolve) => setTimeout(resolve, 30));
      }

    }
  }

  // 4. Fase 3: Enriquecimento de bens e partidos de eleições anteriores
  console.log('\n🏛️ [Fase 3] Enriquecendo bens e partidos de eleições anteriores no TSE...');
  await ingestHistoricalAssets(50000);

  // 5. Fase 4: Sincronização de Assiduidade e Desempenho Público (Congresso Nacional)
  console.log('\n🏛️ [Fase 4] Sincronizando assiduidade e desempenho público oficial (Câmara & Senado)...');
  await syncPublicPerformance();

  // 6. Fase 5: Sincronização de Histórico Acadêmico e Formação Superior do Senado Federal
  console.log('\n🎓 [Fase 5] Sincronizando histórico acadêmico e educação superior oficial (Senado Federal)...');
  await syncSenateEducation();

  clearInterval(heartbeatTimer);
  await updateHeartbeat('ativo', totalFetchedCounter);

  console.log('\n========================================================');
  console.log(`✅ [Criterium Crawler] Ingestão inicial concluída com sucesso!`);
  console.log(`📊 Total de candidatos consultados no TSE: ${totalFetchedCounter}`);
  console.log(`✨ Novos candidatos únicos cadastrados: ${totalCandidatesSaved}`);
  console.log(`🔄 Candidatos existentes enriquecidos sem sobrescrever: ${totalCandidatesUpdated}`);
  console.log('========================================================\n');

  // 7. Fase 6: Iniciar Motor de Re-verificação Contínua Lenta (Ciclo de 7 dias ininterruptos)
  console.log('🔄 [Fase 6 - Re-verificação Contínua] Ativando motor de sincronização ritmada (Ciclo de 7 dias)...');
  await startRollingSyncEngine(7);
}

main()
  .catch(async (e) => {
    console.error('❌ Erro durante a execução do crawler:', e);
    await updateHeartbeat('desativado', totalFetchedCounter);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
