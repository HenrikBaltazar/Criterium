import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findBrokenTxLinks() {
  console.log('🔍 Auditando 100% dos `priorElectionsJson` no banco de dados...\n');

  const candidates = await prisma.candidate.findMany({
    where: { priorElectionsJson: { not: null } }
  });

  let totalElections = 0;
  let missingTxLink = 0;
  let malformedTxLink = 0;
  let httpTxLink = 0;
  let validTxLink = 0;

  const malformedSamples: any[] = [];

  candidates.forEach(c => {
    try {
      const eleicoes = JSON.parse(c.priorElectionsJson || '[]');
      eleicoes.forEach((e: any) => {
        totalElections++;
        const link = e.txLink;
        if (!link) {
          missingTxLink++;
          if (malformedSamples.length < 5) {
            malformedSamples.push({ cand: c.popularName, state: c.state, year: e.nrAno, cargo: e.cargo, issue: 'missing txLink', obj: e });
          }
        } else if (typeof link !== 'string' || !link.startsWith('http')) {
          malformedTxLink++;
          if (malformedSamples.length < 5) {
            malformedSamples.push({ cand: c.popularName, state: c.state, year: e.nrAno, cargo: e.cargo, issue: `invalid string: ${link}`, obj: e });
          }
        } else if (link.startsWith('http://')) {
          httpTxLink++;
          if (malformedSamples.length < 5) {
            malformedSamples.push({ cand: c.popularName, state: c.state, year: e.nrAno, cargo: e.cargo, issue: `insecure HTTP: ${link}`, obj: e });
          }
        } else {
          validTxLink++;
        }
      });
    } catch (err) {}
  });

  console.log(`📊 Estatísticas do Banco de Dados (${candidates.length} candidatos analisados, ${totalElections} eleições passadas):`);
  console.log(`  ✅ Links HTTPS válidos: ${validTxLink}`);
  console.log(`  ⚠️ Links HTTP inseguros: ${httpTxLink}`);
  console.log(`  ❌ Links Ausentes (missing): ${missingTxLink}`);
  console.log(`  ❌ Links Malformatados: ${malformedTxLink}`);

  if (malformedSamples.length > 0) {
    console.log('\n❌ Amostras de problemas encontrados:');
    malformedSamples.forEach((s, idx) => {
      console.log(`  [${idx + 1}] ${s.cand} (${s.state}) - Ano: ${s.year} | Issue: ${s.issue}`);
      console.log('      Objeto:', JSON.stringify(s.obj));
    });
  }

  await prisma.$disconnect();
}

findBrokenTxLinks().catch(console.error);
