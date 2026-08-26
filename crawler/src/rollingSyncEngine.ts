import { PrismaClient } from '@prisma/client';
import { fetchTseJson } from './tseFetcher';

const prisma = new PrismaClient();

/**
 * 🔄 Continuous Slow Rolling Sync Engine (7-Day Cycle)
 *
 * Verifica e atualiza cada candidato 1 por 1 de forma extremamente lenta e ritmada.
 * Garante que em 7 dias rodando ininterruptamente 100% dos candidatos no banco
 * estejam totalmente re-verificados, sem sobrecarregar nenhuma API oficial.
 */
export async function startRollingSyncEngine(targetDays = 7) {
  console.log(`\n⏳ [Rolling Sync Engine] Iniciando motor de re-verificação contínua (Ciclo de ${targetDays} dias)...`);

  const TARGET_CYCLE_MS = targetDays * 24 * 60 * 60 * 1000; // 604.800.000 ms = 7 dias

  while (true) {
    try {
      const totalCandidates = await prisma.candidate.count();
      if (totalCandidates === 0) {
        console.log('  └─ Nenhum candidato no banco de dados. Aguardando 1 minuto...');
        await new Promise(r => setTimeout(r, 60000));
        continue;
      }

      // Calcula o atraso necessário por candidato para cobrir 100% em 7 dias
      const delayPerCandidateMs = Math.max(5000, Math.floor(TARGET_CYCLE_MS / totalCandidates));
      const minutesPerCand = (delayPerCandidateMs / 60000).toFixed(1);

      // Pega o candidato com a verificação mais antiga (oldest updatedAt)
      const cand = await prisma.candidate.findFirst({
        orderBy: { updatedAt: 'asc' },
      });

      if (!cand) {
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }

      const daysSinceUpdate = ((Date.now() - new Date(cand.updatedAt).getTime()) / (1000 * 60 * 60 * 24)).toFixed(2);
      console.log(`\n🔍 [Re-verificação Contínua 7d] Candidato (1 de ${totalCandidates}): ${cand.popularName} (${cand.party} - ${cand.state})`);
      console.log(`   └─ Última checagem: ${daysSinceUpdate} dias atrás. Próxima re-verificação em ${minutesPerCand} min.`);

      if (cand.sqCandidato) {
        try {
          const detailUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/2026/${cand.state}/20322002026/candidato/${cand.sqCandidato}`;
          const detail: any = await fetchTseJson(detailUrl);

          if (detail && detail.id) {
            const updatedNetWorth = typeof detail.totalDeBens === 'number' ? detail.totalDeBens : cand.netWorth;
            const updatedEducation = detail.grauInstrucao || cand.education;
            const updatedOccupation = detail.ocupacao || cand.occupation;
            const updatedStatus = detail.descricaoSituacao || cand.status;

            await prisma.candidate.update({
              where: { id: cand.id },
              data: {
                netWorth: updatedNetWorth,
                education: updatedEducation,
                occupation: updatedOccupation,
                status: updatedStatus,
                updatedAt: new Date()
              }
            });
            console.log(`   ✅ [TSE Re-verificado] Status: ${updatedStatus} | Bens: R$ ${updatedNetWorth.toLocaleString('pt-BR')}`);
          } else {
            await prisma.candidate.update({
              where: { id: cand.id },
              data: { updatedAt: new Date() }
            });
          }
        } catch (err: any) {
          console.warn(`   ⚠️ [TSE Re-verificação]:`, err.message);
          await prisma.candidate.update({
            where: { id: cand.id },
            data: { updatedAt: new Date() }
          });
        }
      } else {
        await prisma.candidate.update({
          where: { id: cand.id },
          data: { updatedAt: new Date() }
        });
      }

      await new Promise(r => setTimeout(r, delayPerCandidateMs));
    } catch (err: any) {
      console.error('❌ [Rolling Sync Engine Erro]:', err.message);
      await new Promise(r => setTimeout(r, 30000));
    }
  }
}

if (require.main === module) {
  startRollingSyncEngine().catch(console.error);
}
