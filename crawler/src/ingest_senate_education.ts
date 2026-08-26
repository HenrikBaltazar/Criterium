import { PrismaClient } from '@prisma/client';
import { fetchTseJson } from './tseFetcher';

const prisma = new PrismaClient();

function normalizeText(text?: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchNameTokens(senName: string, dbCandName: string, dbCandPopular: string): boolean {
  const senNorm = normalizeText(senName);
  const nameNorm = normalizeText(dbCandName);
  const popNorm = normalizeText(dbCandPopular);

  if (!senNorm) return false;
  if (senNorm === nameNorm || senNorm === popNorm) return true;
  if (nameNorm.includes(senNorm) || popNorm.includes(senNorm)) return true;
  if (senNorm.includes(nameNorm) || senNorm.includes(popNorm)) return true;

  const senTokens = senNorm.split(/\s+/).filter(t => t.length > 2);
  const fullTokens = new Set([...nameNorm.split(/\s+/), ...popNorm.split(/\s+/)]);

  const allTokensMatch = senTokens.every(t => fullTokens.has(t));
  return allTokensMatch && senTokens.length >= 2;
}

export async function syncSenateEducation() {
  console.log('\n🎓 [Fase 5 - Educação & Histórico Acadêmico] Sincronizando histórico acadêmico em 3 endpoints do Senado Federal (Atual, 57ª e 56ª Legislaturas)...');

  try {
    const endpoints = [
      'https://legis.senado.leg.br/dadosabertos/senador/lista/atual',
      'https://legis.senado.leg.br/dadosabertos/senador/lista/legislatura/57',
      'https://legis.senado.leg.br/dadosabertos/senador/lista/legislatura/56',
      'https://legis.senado.leg.br/dadosabertos/senador/lista/afastados'
    ];

    const senatorsMap = new Map<string, any>();

    for (const url of endpoints) {
      try {
        const res: any = await fetchTseJson(url);
        const list = res?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar 
                  || res?.ListaParlamentarLegislatura?.Parlamentares?.Parlamentar 
                  || res?.ListaParlamentarAfastado?.Parlamentares?.Parlamentar || [];
        
        list.forEach((s: any) => {
          const info = s.IdentificacaoParlamentar;
          if (info && info.CodigoParlamentar) {
            senatorsMap.set(info.CodigoParlamentar, info);
          }
        });
      } catch (e) {}
    }

    console.log(`  └─ Total de ${senatorsMap.size} senadores mapeados do Senado Federal. Cruzando com banco de dados...`);

    const allDbCandidates = await prisma.candidate.findMany({
      select: { id: true, name: true, popularName: true, state: true, academicHistoryJson: true }
    });

    let syncedCount = 0;

    for (const [code, info] of senatorsMap.entries()) {
      const nomeSen = info.NomeParlamentar || info.NomeCompletoParlamentar;
      const stateSen = info.UfParlamentar;

      const dbCand = allDbCandidates.find(c => c.state === stateSen && matchNameTokens(nomeSen, c.name, c.popularName));

      if (!dbCand) continue;

      // DB-First Check: Se o histórico já estiver salvo no banco de dados, ignora a chamada HTTP!
      if (dbCand.academicHistoryJson && dbCand.academicHistoryJson !== '[]') {
        console.log(`  └─ [PostgreSQL Cache] Histórico do Senado para ${dbCand.popularName} (${dbCand.state}) em cache DB. Chamada HTTP ignorada.`);
        syncedCount++;
        continue;
      }

      try {
        const acadUrl = `https://legis.senado.leg.br/dadosabertos/senador/${code}/historicoAcademico`;
        const acadRes: any = await fetchTseJson(acadUrl);
        const parlamentar = acadRes?.HistoricoAcademicoParlamentar?.Parlamentar;

        if (parlamentar && parlamentar.HistoricoAcademico) {
          let cursosRaw = parlamentar.HistoricoAcademico.Curso || [];
          if (!Array.isArray(cursosRaw)) cursosRaw = [cursosRaw];

          const formattedItems = cursosRaw.map((c: any) => ({
            degree: c.GrauInstrucao || 'Histórico Acadêmico',
            course: c.NomeCurso,
            institution: c.Estabelecimento || 'Senado Federal',
            location: c.Local || '',
            sourceUrl: `https://legis.senado.leg.br/dadosabertos/senador/${code}/historicoAcademico`
          }));

          await prisma.candidate.update({
            where: { id: dbCand.id },
            data: { academicHistoryJson: JSON.stringify(formattedItems) }
          });

          syncedCount++;
          console.log(`  ✅ [Senado Educação Enriquecido] ${dbCand.popularName} (${dbCand.state}): ${formattedItems.length} formações acadêmicas salvas!`);
        }
      } catch (err: any) {
        console.warn(`  ⚠️ [Erro Senado Educação ${code}]:`, err.message);
      }
    }

    console.log(`\n🎉 [Fase 5 Concluída] Sincronização de Histórico Acadêmico concluída para ${syncedCount} parlamentares!`);
  } catch (err: any) {
    console.warn('  ⚠️ [Erro Ingestão Senado Educação]:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  syncSenateEducation().catch(console.error);
}
