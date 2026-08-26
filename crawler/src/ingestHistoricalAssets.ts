import { PrismaClient } from '@prisma/client';
import { fetchTseJson } from './tseFetcher';

const prisma = new PrismaClient();

export function extractUfFromTxLink(txLink?: string): string | null {
  if (!txLink) return null;
  const match6 = txLink.match(/\/candidato\/([A-Z]{2})\/([A-Z0-9]+)\//i);
  if (match6) return match6[1].toUpperCase();

  const match4 = txLink.match(/\/candidato\/\d+\/\d+\/([A-Z]{2})\//i);
  if (match4) return match4[1].toUpperCase();

  return null;
}

export function getTseUeForElection(el: any, candidateState?: string): string {
  const cargoLower = String(el.cargo || '').toLowerCase();
  const linkUf = extractUfFromTxLink(el.txLink);
  const stateClean = (candidateState && candidateState !== 'FEDERAL' && candidateState !== 'ALL' ? candidateState : linkUf) || 'BR';

  if (cargoLower.includes('presidente')) {
    return 'BR';
  }

  if (cargoLower.includes('senador') || cargoLower.includes('governador') || cargoLower.includes('deputado')) {
    return stateClean;
  }

  // Municipal elections (Prefeito, Vereador)
  const rawUe = String(el.sgUe || el.local || '').trim();
  if (rawUe && !isNaN(Number(rawUe))) {
    return rawUe;
  }

  return stateClean;
}

export async function ingestHistoricalAssets(limitCandidates = 50000) {
  console.log('\n📡 [Fase 3 - Histórico] Buscando e enriquecendo bens e partidos de eleições anteriores no TSE...');

  const candidates = await prisma.candidate.findMany({
    where: { priorElectionsJson: { not: null } },
    take: limitCandidates,
  });

  console.log(`  -> Auditando histórico de ${candidates.length} candidatos no banco de dados...`);
  let enrichedCount = 0;
  const BATCH_SIZE = 25;

  const processCandidateHistory = async (cand: any) => {
    if (!cand.priorElectionsJson) return false;

    let eleicoes: any[] = [];
    try {
      eleicoes = JSON.parse(cand.priorElectionsJson);
    } catch (e) {
      return false;
    }

    if (!Array.isArray(eleicoes) || eleicoes.length === 0) return false;

    let modified = false;
    const extractedInfo: string[] = [];

    for (const el of eleicoes) {
      const year = Number(el.nrAno);
      if (year >= 2026) continue;

      const sqCandidato = el.id || el.sqCandidato;
      const idEleicao = el.idEleicao;
      if (!sqCandidato || !idEleicao) continue;

      // Check if totalDeBens is missing or null
      if (el.totalDeBens === undefined || el.totalDeBens === null) {
        const targetUe = getTseUeForElection(el, cand.state);
        let detailRes: any = null;

        // Try primary URL with correctly computed targetUe
        const detailUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/${year}/${targetUe}/${idEleicao}/candidato/${sqCandidato}`;
        try {
          detailRes = await fetchTseJson(detailUrl);
        } catch (err) {}

        const linkUf = extractUfFromTxLink(el.txLink);
        // Fallback 1: Try candidate state code or link UF if targetUe was different
        if ((!detailRes || typeof detailRes.totalDeBens !== 'number') && linkUf && linkUf !== targetUe) {
          const fallbackUrl1 = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/${year}/${linkUf}/${idEleicao}/candidato/${sqCandidato}`;
          try {
            detailRes = await fetchTseJson(fallbackUrl1);
          } catch (err) {}
        }

        if (detailRes) {
          let assetVal = 0;
          if (typeof detailRes.totalDeBens === 'number') {
            assetVal = detailRes.totalDeBens;
            el.totalDeBens = assetVal;
            modified = true;
          } else if (Array.isArray(detailRes.bens)) {
            assetVal = detailRes.bens.reduce((acc: number, b: any) => acc + (Number(b.valor) || 0), 0);
            el.totalDeBens = assetVal;
            modified = true;
          }

          if (detailRes.partido?.sigla) {
            el.partido = detailRes.partido.sigla;
            modified = true;
          }

          extractedInfo.push(`${year}: R$ ${assetVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${el.partido || 'N/I'})`);
        }
      }
    }

    if (modified) {
      await prisma.candidate.update({
        where: { id: cand.id },
        data: { priorElectionsJson: JSON.stringify(eleicoes) },
      });
      console.log(`  ✅ [Histórico TSE] ${cand.popularName} (${cand.party} - ${cand.state}): Extraído -> ${extractedInfo.join(' | ')}`);
      return true;
    }
    return false;
  };

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const chunk = candidates.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(chunk.map((cand) => processCandidateHistory(cand)));
    for (const res of results) {
      if (res) enrichedCount++;
    }
  }

  console.log(`\n🎉 [Fase 3 Concluída] Enriquecimento de histórico finalizado! Total de ${enrichedCount} candidatos enriquecidos.`);
  await prisma.$disconnect();
}

if (require.main === module) {
  ingestHistoricalAssets(50000).catch(console.error);
}
