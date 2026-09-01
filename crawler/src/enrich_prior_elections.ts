import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchCandidateDetail(nrAno: number, sgUe: string, idEleicao: string, sqCandidato: string) {
  const url = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/${nrAno}/${sgUe}/${idEleicao}/candidato/${sqCandidato}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('🔍 Iniciando enriquecimento de Histórico de Eleições Anteriores no TSE...');

  const candidates = await prisma.candidate.findMany({
    where: {
      priorElectionsJson: { not: null },
    },
    select: {
      id: true,
      name: true,
      popularName: true,
      priorElectionsJson: true,
    },
  });

  console.log(`📋 Total de candidatos no banco com histórico: ${candidates.length}`);

  let updatedCount = 0;
  let itemsEnrichedCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    if (!cand.priorElectionsJson) continue;

    let priorList: any[] = [];
    try {
      priorList = typeof cand.priorElectionsJson === 'string'
        ? JSON.parse(cand.priorElectionsJson)
        : cand.priorElectionsJson;
    } catch (e) {
      continue;
    }

    if (!Array.isArray(priorList) || priorList.length === 0) continue;

    let hasChanges = false;

    for (let j = 0; j < priorList.length; j++) {
      const item = priorList[j];
      const nrAno = Number(item.nrAno);
      if (isNaN(nrAno) || nrAno >= 2026) continue;

      // Skip if already has descricaoSituacao and motivos
      if (item.descricaoSituacao && item.motivos !== undefined) continue;

      const sqCand = item.id || item.sqCandidato;
      const idEleicao = item.idEleicao;
      const sgUe = item.sgUe || 'BR';

      if (!sqCand || !idEleicao) continue;

      const detail: any = await fetchCandidateDetail(nrAno, sgUe, idEleicao, String(sqCand));
      if (detail) {
        if (detail.descricaoSituacao) {
          item.descricaoSituacao = detail.descricaoSituacao;
          hasChanges = true;
        }
        if (detail.motivos && Array.isArray(detail.motivos) && detail.motivos.length > 0) {
          item.motivos = detail.motivos;
          hasChanges = true;
        }
        if (detail.motivoSituacao) {
          item.motivoSituacao = detail.motivoSituacao;
          hasChanges = true;
        }
        if (detail.descricaoTotalizacao && detail.descricaoTotalizacao !== 'Concorrendo') {
          item.situacaoTotalizacao = detail.descricaoTotalizacao;
          hasChanges = true;
        }

        itemsEnrichedCount++;
        await delay(100); // Throttle TSE requests
      }
    }

    if (hasChanges) {
      await prisma.candidate.update({
        where: { id: cand.id },
        data: {
          priorElectionsJson: JSON.stringify(priorList),
        },
      });
      updatedCount++;
      if (updatedCount % 20 === 0 || cand.popularName.includes('LULA')) {
        console.log(`  └─ ✅ Atualizado candidato ${cand.popularName} (${updatedCount} candidatos atualizados, ${itemsEnrichedCount} eleições detalhadas)`);
      }
    }
  }

  console.log(`\n🎉 Enriquecimento concluído! ${updatedCount} candidatos atualizados com status factual do TSE.`);
}

main().then(() => prisma.$disconnect()).catch(err => {
  console.error('❌ Erro no enriquecimento:', err);
  prisma.$disconnect();
});
