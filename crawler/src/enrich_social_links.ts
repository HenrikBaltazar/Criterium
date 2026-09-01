import { PrismaClient } from '@prisma/client';
import { fetchTseJson } from './tseFetcher';

const prisma = new PrismaClient();

function buildSocialLinksJson(sites?: string[]): string | null {
  if (!Array.isArray(sites) || sites.length === 0) return null;
  const result: Record<string, any> = { links: sites };

  sites.forEach((u) => {
    if (!u || typeof u !== 'string') return;
    const lower = u.toLowerCase();
    if ((lower.includes('instagram.com') || lower.includes('instagr.am')) && !result.instagram) result.instagram = u;
    else if ((lower.includes('twitter.com') || lower.includes('x.com')) && !result.twitter) result.twitter = u;
    else if ((lower.includes('facebook.com') || lower.includes('fb.com') || lower.includes('fb.watch')) && !result.facebook) result.facebook = u;
    else if ((lower.includes('youtube.com') || lower.includes('youtu.be')) && !result.youtube) result.youtube = u;
    else if (lower.includes('tiktok.com') && !result.tiktok) result.tiktok = u;
    else if (lower.includes('linkedin.com') && !result.linkedin) result.linkedin = u;
    else if (lower.includes('flickr.com') && !result.flickr) result.flickr = u;
    else if (!result.website) result.website = u;
  });

  return JSON.stringify(result);
}

export async function enrichSocialLinks() {
  console.log('🔗 [Social Links Ingestion] Iniciando sincronização e estruturação dos canais oficiais dos candidatos...');

  const candidates = await prisma.candidate.findMany({
    select: {
      id: true,
      popularName: true,
      state: true,
      sqCandidato: true,
      socialLinks: true,
    },
  });

  console.log(`  ├─ 📊 Encontrados ${candidates.length} candidatos no banco de dados.`);

  let updatedCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    let allUrls: string[] = [];

    // 1. Extrai URLs já salvas no banco de dados
    if (candidate.socialLinks) {
      try {
        const parsed = JSON.parse(candidate.socialLinks);
        if (Array.isArray(parsed)) {
          allUrls = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          if (Array.isArray(parsed.links)) {
            allUrls = [...parsed.links];
          }
          Object.entries(parsed).forEach(([k, v]) => {
            if (k !== 'links' && typeof v === 'string' && !allUrls.includes(v)) {
              allUrls.push(v);
            }
          });
        }
      } catch (e) {}
    }

    // 2. Se candidato tem sqCandidato e poucas URLs (ou nenhuma), busca diretamente na API do TSE
    if (allUrls.length <= 1 && candidate.sqCandidato) {
      try {
        const uf = candidate.state || 'BR';
        const url = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/2026/${uf}/20322002026/candidato/${candidate.sqCandidato}`;
        const detail = await fetchTseJson(url, 1, 1000);
        if (detail?.sites && Array.isArray(detail.sites)) {
          detail.sites.forEach((siteUrl: string) => {
            if (typeof siteUrl === 'string' && !allUrls.includes(siteUrl)) {
              allUrls.push(siteUrl);
            }
          });
        }
      } catch (err) {
        // Ignora erro individual de fetch do TSE
      }
    }

    if (allUrls.length > 0) {
      const enrichedJson = buildSocialLinksJson(allUrls);
      if (enrichedJson && enrichedJson !== candidate.socialLinks) {
        await prisma.candidate.update({
          where: { id: candidate.id },
          data: { socialLinks: enrichedJson },
        });
        updatedCount++;
      }
    }

    if ((i + 1) % 1000 === 0 || i === candidates.length - 1) {
      console.log(`  ├─ ⏳ Processados ${i + 1}/${candidates.length} candidatos (Atualizados: ${updatedCount})...`);
    }
  }

  console.log(`  └─ ✅ Concluído! ${updatedCount} candidatos tiveram suas redes sociais atualizadas no banco de dados.`);
}

if (require.main === module) {
  enrichSocialLinks()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('❌ Erro na ingestão de redes sociais:', err);
      prisma.$disconnect();
    });
}
