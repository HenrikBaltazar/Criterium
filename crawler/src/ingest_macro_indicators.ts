import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function ingestMacroIndicators() {
  console.log('🔄 Iniciando ingestão de MacroIndicadores (Câmara, Senado, Bancadas)...');
  try {
    // 1. Câmara dos Deputados
    console.log(`Buscando Composição da Câmara...`);
    const camaraUrl = 'https://dadosabertos.camara.leg.br/api/v2/deputados?ordem=ASC&ordenarPor=nome';
    const camaraRes = await fetch(camaraUrl);
    if (!camaraRes.ok) throw new Error('Falha API Câmara');
    const camaraData = await camaraRes.json();
    const deputados = camaraData.dados;
    
    const camaraPartyCounts: Record<string, number> = {};
    for (const dep of deputados) {
      if (dep.siglaPartido) {
        camaraPartyCounts[dep.siglaPartido] = (camaraPartyCounts[dep.siglaPartido] || 0) + 1;
      }
    }
    const camaraSortedParties = Object.entries(camaraPartyCounts)
      .map(([sigla, count]) => ({ sigla, count }))
      .sort((a, b) => b.count - a.count);

    await prisma.macroIndicator.upsert({
      where: { key: 'chamber_composition' },
      update: { value: JSON.stringify({ timestamp: new Date().toISOString(), totalActiveDeputies: deputados.length, parties: camaraSortedParties }) },
      create: { key: 'chamber_composition', value: JSON.stringify({ timestamp: new Date().toISOString(), totalActiveDeputies: deputados.length, parties: camaraSortedParties }) }
    });
    console.log(`✅ chamber_composition salvo (${deputados.length} dep, ${camaraSortedParties.length} partidos).`);

    // 2. Senado Federal
    console.log(`Buscando Composição do Senado...`);
    const senadoUrl = 'https://legis.senado.leg.br/dadosabertos/senador/lista/atual';
    const senadoRes = await fetch(senadoUrl, { headers: { 'Accept': 'application/json' } });
    if (!senadoRes.ok) throw new Error('Falha API Senado');
    const senadoData = await senadoRes.json();
    const senadores = senadoData.ListaParlamentarEmExercicio.Parlamentares.Parlamentar;
    
    const senadoPartyCounts: Record<string, number> = {};
    for (const sen of senadores) {
      const sigla = sen.IdentificacaoParlamentar.SiglaPartidoParlamentar;
      if (sigla) {
        senadoPartyCounts[sigla] = (senadoPartyCounts[sigla] || 0) + 1;
      }
    }
    const senadoSortedParties = Object.entries(senadoPartyCounts)
      .map(([sigla, count]) => ({ sigla, count }))
      .sort((a, b) => b.count - a.count);

    await prisma.macroIndicator.upsert({
      where: { key: 'senate_composition' },
      update: { value: JSON.stringify({ timestamp: new Date().toISOString(), totalActiveSenators: senadores.length, parties: senadoSortedParties }) },
      create: { key: 'senate_composition', value: JSON.stringify({ timestamp: new Date().toISOString(), totalActiveSenators: senadores.length, parties: senadoSortedParties }) }
    });
    console.log(`✅ senate_composition salvo (${senadores.length} senadores, ${senadoSortedParties.length} partidos).`);

    // 3. Frentes Parlamentares (Bancadas Temáticas)
    console.log(`Buscando Bancadas Temáticas (Frentes)...`);
    const frentesUrl = 'https://dadosabertos.camara.leg.br/api/v2/frentes';
    
    // As APIs de frentes são paginadas. Para simplificar e acelerar a busca, vamos iterar sobre as primeiras 15 páginas.
    let allFrentes: any[] = [];
    for (let page = 1; page <= 15; page++) {
      const fPageRes = await fetch(`${frentesUrl}?pagina=${page}&itens=100`);
      if (fPageRes.ok) {
        const pageData = await fPageRes.json();
        if (pageData.dados && pageData.dados.length > 0) {
          allFrentes = allFrentes.concat(pageData.dados);
        } else {
          break; // Fim das páginas
        }
      }
    }
    
    const targetFrentes = [
      { key: 'Evangélica', regex: /Evangélica/i },
      { key: 'Agropecuária', regex: /Agropecuária/i },
      { key: 'Segurança Pública', regex: /Segurança Pública/i },
      { key: 'Educação', regex: /Educação/i }
    ];

    const blocResults: Array<{ name: string; count: number }> = [];

    for (const target of targetFrentes) {
      const matchedFrente = allFrentes.find(f => target.regex.test(f.titulo));
      if (matchedFrente) {
        // Fetch membros
        const membrosUrl = `https://dadosabertos.camara.leg.br/api/v2/frentes/${matchedFrente.id}/membros`;
        const mRes = await fetch(membrosUrl);
        if (mRes.ok) {
          const mData = await mRes.json();
          blocResults.push({ name: `Bancada ${target.key}`, count: mData.dados?.length || 0 });
        }
      }
    }

    await prisma.macroIndicator.upsert({
      where: { key: 'thematic_blocs' },
      update: { value: JSON.stringify({ timestamp: new Date().toISOString(), blocs: blocResults }) },
      create: { key: 'thematic_blocs', value: JSON.stringify({ timestamp: new Date().toISOString(), blocs: blocResults }) }
    });
    console.log(`✅ thematic_blocs salvo com sucesso (${blocResults.length} bancadas monitoradas).`);

  } catch (error) {
    console.error('❌ Erro ao ingerir MacroIndicadores:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  ingestMacroIndicators();
}
