import { PrismaClient } from '@prisma/client';
import https from 'https';

const prisma = new PrismaClient();

function httpGetJson<T>(url: string): Promise<T | null> {
  return new Promise((resolve) => {
    https.get(
      url,
      {
        headers: {
          'User-Agent': 'CriteriumBot/1.0 (https://criterium.app; contact@criterium.app)',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(null);
          }
        });
      }
    ).on('error', () => resolve(null));
  });
}

function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

const POLITICAL_KEYWORDS = [
  'politic', 'deputad', 'senador', 'governad', 'presidente', 'vereador',
  'prefeit', 'filiad', 'eleicao', 'candidat', 'partido', 'ministro',
  'secretari', 'estado', 'brasil', 'brasileir', 'parlamentar', 'congress',
  'camara', 'senado', 'assembleia', 'sindic', 'advogad', 'empresari'
];

function isLikelyPoliticalArticle(
  extract: string,
  description?: string,
  title?: string,
  candidateName?: string,
  popularName?: string
): boolean {
  if (!extract || extract.length < 20) return false;

  const cleanTitle = (title || '').replace(/\s*\([^)]*\)\s*/g, '').trim();
  const normTitle = normalizeString(cleanTitle);
  const normCandidateName = normalizeString(candidateName || '');
  const normPopularName = normalizeString(popularName || '');

  if (!normTitle) return false;

  let validNameMatch = false;

  // 1. Check Full Official Name Match
  if (normCandidateName) {
    const candidateParts = normCandidateName
      .split(/\s+/)
      .filter((p) => p.length > 2 && !['dos', 'das', 'com', 'sem', 'por', 'para', 'del'].includes(p));

    if (candidateParts.length > 0) {
      const firstName = candidateParts[0];
      const lastName = candidateParts[candidateParts.length - 1];

      const titleMatchesFirstName = normTitle.includes(firstName);
      const titleMatchesLastName = normTitle.includes(lastName);
      const exactMatch = normCandidateName.includes(normTitle) || normTitle.includes(normCandidateName);

      if (exactMatch || (titleMatchesFirstName && titleMatchesLastName)) {
        validNameMatch = true;
      }
    }
  }

  // 2. Check TSE Popular Name / Nickname Match (Fallback)
  if (!validNameMatch && normPopularName) {
    const popularParts = normPopularName
      .split(/\s+/)
      .filter((p) => p.length > 2 && !['dos', 'das', 'com', 'sem', 'por', 'para', 'del'].includes(p));

    if (popularParts.length > 0) {
      const popExactMatch = normPopularName.includes(normTitle) || normTitle.includes(normPopularName);
      const allPartsInTitle = popularParts.every((part) => normTitle.includes(part));

      if (popExactMatch || allPartsInTitle) {
        validNameMatch = true;
      }
    }
  }

  if (!validNameMatch) return false;

  // 3. Political Relevance Check
  const lowerExtract = normalizeString(extract);
  const lowerDesc = normalizeString(description || '');
  const textToTest = lowerExtract + ' ' + lowerDesc;

  return POLITICAL_KEYWORDS.some((kw) => textToTest.includes(kw));
}

export async function fetchWikipediaSummaryForCandidate(
  name: string,
  popularName?: string,
  party?: string,
  state?: string
): Promise<{ summary: string; url: string } | null> {
  const searchQueries: string[] = [];

  // Priority 1: Full Candidate Name
  if (name && name.trim().length > 3) {
    searchQueries.push(name.trim());
  }

  // Priority 2: TSE Popular Name / Nickname Fallback
  if (popularName && popularName !== name && popularName.trim().length >= 3) {
    searchQueries.push(popularName.trim());
  }

  // Priority 3: TSE Popular Name + "politico"
  if (popularName && popularName.trim().length >= 3) {
    searchQueries.push(`${popularName.trim()} politico`);
    if (party) {
      searchQueries.push(`${popularName.trim()} ${party}`);
    }
  }

  for (const queryStr of searchQueries) {
    const searchUrl = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(queryStr)}&utf8=&format=json`;
    const searchRes = await httpGetJson<any>(searchUrl);

    if (!searchRes || !searchRes.query || !searchRes.query.search || searchRes.query.search.length === 0) {
      continue;
    }

    // Inspect top 3 results for this query
    const topResults = searchRes.query.search.slice(0, 3);
    for (const topResult of topResults) {
      const summaryUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topResult.title)}`;
      const summaryRes = await httpGetJson<any>(summaryUrl);

      if (summaryRes && summaryRes.extract && summaryRes.type !== 'disambiguation') {
        const extract = summaryRes.extract;
        const pageUrl =
          summaryRes.content_urls?.desktop?.page ||
          `https://pt.wikipedia.org/wiki/${encodeURIComponent(topResult.title.replace(/ /g, '_'))}`;

        if (isLikelyPoliticalArticle(extract, summaryRes.description, summaryRes.title, name, popularName)) {
          return {
            summary: extract,
            url: pageUrl,
          };
        }
      }
    }
  }

  return null;
}

export async function syncWikipediaSummaries(batchSize = 100) {
  console.log('\n📖 [Fase 6: Wikipédia] Buscando resumos do Wikipédia em loop para todos os candidatos...');

  const totalUnchecked = await prisma.candidate.count({
    where: { wikipediaChecked: false },
  });

  if (totalUnchecked === 0) {
    console.log('  └─ Todos os candidatos no banco de dados já foram verificados na Wikipédia.');
    return;
  }

  console.log(`  ├─ Total de candidatos pendentes de verificação na Wikipédia: ${totalUnchecked}`);

  let totalProcessed = 0;
  let totalSaved = 0;

  while (true) {
    const candidates = await prisma.candidate.findMany({
      where: { wikipediaChecked: false },
      select: {
        id: true,
        name: true,
        popularName: true,
        party: true,
        state: true,
      },
      take: batchSize,
    });

    if (candidates.length === 0) break;

    console.log(`  ├─ [Lote Wikipédia] Processando ${candidates.length} candidatos (${totalProcessed + candidates.length}/${totalUnchecked})...`);

    for (const cand of candidates) {
      try {
        const wikiData = await fetchWikipediaSummaryForCandidate(cand.name, cand.popularName, cand.party, cand.state);

        if (wikiData) {
          await prisma.candidate.update({
            where: { id: cand.id },
            data: {
              wikipediaSummary: wikiData.summary,
              wikipediaUrl: wikiData.url,
              wikipediaChecked: true,
            },
          });
          console.log(`  │  ├─ ✅ [Wikipédia] ${cand.name} (${cand.popularName || ''}) -> Resumo extraído: "${wikiData.summary.substring(0, 55)}..."`);
          totalSaved++;
        } else {
          // Mark as checked even if no article exists so we don't repeat endlessly
          await prisma.candidate.update({
            where: { id: cand.id },
            data: {
              wikipediaChecked: true,
            },
          });
        }
        
        // Gentle delay for Wikipedia API
        await new Promise((r) => setTimeout(r, 60));
      } catch (err: any) {
        console.error(`  │  └─ ❌ Erro ao buscar Wikipédia para ${cand.name}:`, err.message || err);
        await prisma.candidate.update({
          where: { id: cand.id },
          data: { wikipediaChecked: true },
        }).catch(() => {});
      }
    }

    totalProcessed += candidates.length;
  }

  console.log(`\n✨ [Fase 6: Wikipédia Concluída] Total processado: ${totalProcessed} candidatos | Resumos encontrados e salvos: ${totalSaved}.`);
}
