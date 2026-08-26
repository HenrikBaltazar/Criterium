import { PrismaClient } from '@prisma/client';
import { fetchTseJson } from './tseFetcher';

const prisma = new PrismaClient();

function normalizeText(text?: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function matchCandidateForSenate(senName: string, senState: string, candidates: any[]): any | null {
  const senNorm = normalizeText(senName);
  if (!senNorm) return null;

  const senTokens = senNorm.split(/\s+/).filter(t => t.length > 2 && t !== 'deputado' && t !== 'senador' && t !== 'pastor' && t !== 'coronel' && t !== 'doutor' && t !== 'dra' && t !== 'dr');

  // 1. Try in-state match first (or national BR)
  for (const c of candidates) {
    const isStateMatch = c.state === senState || c.state === 'BR' || !senState;
    const nameNorm = normalizeText(c.name);
    const popNorm = normalizeText(c.popularName);

    if (senNorm === nameNorm || senNorm === popNorm) {
      if (isStateMatch) return c;
    }

    if (senTokens.length >= 2) {
      const fullTokens = new Set([...nameNorm.split(/\s+/), ...popNorm.split(/\s+/)]);
      const matchCount = senTokens.filter(t => fullTokens.has(t)).length;
      if (matchCount >= 2 && matchCount >= senTokens.length - 1) {
        if (isStateMatch) return c;
      }
    }
  }

  // 2. Fallback: search across all UFs if candidate ran in another state or national election
  for (const c of candidates) {
    const nameNorm = normalizeText(c.name);
    const popNorm = normalizeText(c.popularName);

    if (senNorm === nameNorm || senNorm === popNorm) return c;

    if (senTokens.length >= 2) {
      const fullTokens = new Set([...nameNorm.split(/\s+/), ...popNorm.split(/\s+/)]);
      const matchCount = senTokens.filter(t => fullTokens.has(t)).length;
      if (matchCount >= 2 && matchCount >= senTokens.length - 1) return c;
    }
  }

  return null;
}

export async function syncSenateEducation() {
  console.log('\n🎓 [Fase 5 - Educação & Histórico Acadêmico] Sincronizando histórico acadêmico em 7 endpoints do Senado Federal (Legislaturas 53 a 57)...');

  try {
    const senadoEndpoints = [
      'https://legis.senado.leg.br/dadosabertos/senador/lista/atual',
      'https://legis.senado.leg.br/dadosabertos/senador/lista/legislatura/57',
      'https://legis.senado.leg.br/dadosabertos/senador/lista/legislatura/56',
      'https://legis.senado.leg.br/dadosabertos/senador/lista/legislatura/55',
      'https://legis.senado.leg.br/dadosabertos/senador/lista/legislatura/54',
      'https://legis.senado.leg.br/dadosabertos/senador/lista/legislatura/53',
      'https://legis.senado.leg.br/dadosabertos/senador/lista/afastados'
    ];

    const senatorsMap = new Map<string, any>();

    for (const url of senadoEndpoints) {
      try {
        const res: any = await fetchTseJson(url);
        const list = res?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar 
                  || res?.ListaParlamentarLegislatura?.Parlamentares?.Parlamentar 
                  || res?.ListaParlamentarAfastado?.Parlamentares?.Parlamentar || [];
        
        const arr = Array.isArray(list) ? list : [list];
        arr.forEach((s: any) => {
          const info = s.IdentificacaoParlamentar;
          if (info && info.CodigoParlamentar) {
            senatorsMap.set(String(info.CodigoParlamentar), info);
          }
        });
      } catch (e) {}
    }

    console.log(`  └─ Total de ${senatorsMap.size} senadores mapeados nas Legislaturas 53 a 57. Cruzando com banco de dados...`);

    const allDbCandidates = await prisma.candidate.findMany({
      select: { id: true, name: true, popularName: true, state: true, party: true, academicHistoryJson: true, priorElectionsJson: true, cargo: true, publicPerformance: true }
    });

    const isSenatorCandidate = (c: any) => {
      const isCargoSenador = c.cargo && c.cargo.code === 'SENADOR';
      const isPublicPerformanceSenado = c.publicPerformance && c.publicPerformance.source === 'SENADO_FEDERAL';
      const prior = JSON.parse(c.priorElectionsJson || '[]');
      const hasPriorSenado = prior.some((el: any) => {
        const cargoStr = String(el.cargo || el.descricaoCargo || el.dsCargo || '').toUpperCase();
        return cargoStr.includes('SENADOR');
      });
      return isCargoSenador || isPublicPerformanceSenado || hasPriorSenado;
    };

    const targetSenators = allDbCandidates.filter(isSenatorCandidate);
    let syncedCount = 0;

    for (const [code, info] of senatorsMap.entries()) {
      const nomeSen = info.NomeParlamentar || info.NomeCompletoParlamentar;
      const stateSen = info.UfParlamentar;

      const dbCand = matchCandidateForSenate(nomeSen, stateSen, targetSenators);
      if (!dbCand) continue;

      // DB-First Check: Se o histórico já estiver salvo com itens válidos no banco, reaproveita o cache!
      if (dbCand.academicHistoryJson && dbCand.academicHistoryJson !== '[]') {
        syncedCount++;
        continue;
      }

      try {
        const acadUrl = `https://legis.senado.leg.br/dadosabertos/senador/${code}/historicoAcademico`;
        const acadRes: any = await fetchTseJson(acadUrl);
        const parlamentar = acadRes?.HistoricoAcademicoParlamentar?.Parlamentar;

        let cursosRaw: any[] = [];
        if (parlamentar) {
          if (parlamentar.HistoricoAcademico) {
            const raw = parlamentar.HistoricoAcademico.Curso || parlamentar.HistoricoAcademico;
            cursosRaw = Array.isArray(raw) ? raw : [raw];
          } else if (parlamentar.Cursos) {
            const raw = parlamentar.Cursos.Curso || parlamentar.Cursos;
            cursosRaw = Array.isArray(raw) ? raw : [raw];
          }
        }

        if (cursosRaw.length > 0) {
          const formattedItems = cursosRaw
            .filter(c => c && typeof c === 'object')
            .map((c: any) => ({
              degree: c.GrauInstrucao || c.Nivel || 'Ensino Superior / Pós-Graduação',
              course: c.NomeCurso || c.Curso || c.Descricao || 'Curso Superior',
              institution: c.Estabelecimento || c.Instituicao || 'Senado Federal',
              location: c.Local || c.Cidade || '',
              sourceUrl: `https://legis.senado.leg.br/dadosabertos/senador/${code}/historicoAcademico`
            }));

          if (formattedItems.length > 0) {
            await prisma.candidate.update({
              where: { id: dbCand.id },
              data: { academicHistoryJson: JSON.stringify(formattedItems) }
            });

            syncedCount++;
            console.log(`  ✅ [Senado Educação Enriquecido] ${dbCand.popularName} (${dbCand.state}): ${formattedItems.length} formações salvas do Senado!`);
          }
        }
      } catch (err: any) {
        console.warn(`  ⚠️ [Erro Senado Educação ${code}]:`, err.message);
      }
    }

    console.log(`\n🎉 [Fase 5 Concluída] Sincronização de Histórico Acadêmico concluída para ${syncedCount} parlamentares do Senado!`);
  } catch (err: any) {
    console.warn('  ⚠️ [Erro Ingestão Senado Educação]:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  syncSenateEducation().catch(console.error);
}
