import { PrismaClient } from '@prisma/client';
import { fetchTseJson } from './tseFetcher';

const prisma = new PrismaClient();

export function parseAndNormalizeUrlString(raw: string): { key: string; url: string } | null {
  if (!raw || typeof raw !== 'string') return null;
  let str = raw.trim().replace(/^(https?:\/\/)+/gi, '');
  const lower = str.toLowerCase();

  const extractHandle = (input: string) => {
    let clean = input.replace(/^(tik\s*tok|instagram|facebook|twitter|youtube|x|linkedin|flickr|kwai|bsky)\s*[:\-]?\s*/i, '');
    clean = clean.replace(/^@/, '').trim().replace(/^\/+/, '');
    return clean;
  };

  if (lower.includes('instagram.com') || lower.includes('instagr.am') || lower.includes('threads.net') || lower.includes('threads.com') || lower.startsWith('instagram') || (str.startsWith('@') && !str.includes('.'))) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = (lower.includes('http') || lower.includes('.com')) && lower.includes('instagram') ? `https://${str}` : `https://www.instagram.com/${handle}`;
    return { key: 'instagram', url: fullUrl };
  }
  if (lower.includes('tiktok.com') || lower.startsWith('tik tok') || lower.startsWith('tiktok')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = (lower.includes('http') || lower.includes('.com')) && lower.includes('tiktok') ? `https://${str}` : `https://www.tiktok.com/@${handle}`;
    return { key: 'tiktok', url: fullUrl };
  }
  if (lower.includes('twitter.com') || lower.includes('x.com') || lower.startsWith('x -') || lower.startsWith('x:') || lower.startsWith('twitter')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = ((lower.includes('http') || lower.includes('.com')) && (lower.includes('twitter') || lower.includes('x.com'))) ? `https://${str}` : `https://x.com/${handle}`;
    return { key: 'twitter', url: fullUrl };
  }
  if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.startsWith('youtube')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = ((lower.includes('http') || lower.includes('.com')) && (lower.includes('youtube') || lower.includes('youtu.be'))) ? `https://${str}` : `https://www.youtube.com/@${handle}`;
    return { key: 'youtube', url: fullUrl };
  }
  if (lower.includes('facebook.com') || lower.includes('fb.com') || lower.includes('fb.watch') || lower.startsWith('facebook')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = ((lower.includes('http') || lower.includes('.com')) && (lower.includes('facebook') || lower.includes('fb.com'))) ? `https://${str}` : `https://www.facebook.com/${handle}`;
    return { key: 'facebook', url: fullUrl };
  }
  if (lower.includes('linkedin.com') || lower.startsWith('linkedin')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = lower.includes('http') && lower.includes('linkedin.com') ? `https://${str}` : `https://www.linkedin.com/in/${handle}`;
    return { key: 'linkedin', url: fullUrl };
  }
  if (lower.includes('flickr.com') || lower.startsWith('flickr')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = lower.includes('http') && lower.includes('flickr.com') ? `https://${str}` : `https://www.flickr.com/photos/${handle}`;
    return { key: 'flickr', url: fullUrl };
  }
  if (lower.includes('kwai.com') || lower.includes('kwai-video.com') || lower.startsWith('kwai')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = lower.includes('http') && lower.includes('kwai') ? `https://${str}` : `https://www.kwai.com/@${handle}`;
    return { key: 'kwai', url: fullUrl };
  }
  if (lower.includes('bsky.app') || lower.includes('bsky.social') || lower.startsWith('bsky')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = lower.includes('http') && lower.includes('bsky') ? `https://${str}` : `https://bsky.app/profile/${handle}`;
    return { key: 'bluesky', url: fullUrl };
  }
  if (str.includes('.') && !str.includes('@') && !str.includes(' ') && !str.includes(':')) {
    const fullUrl = `https://${str}`;
    try {
      const parsed = new URL(fullUrl);
      const hostname = parsed.hostname.replace(/^www\./, '');
      if (hostname.length > 3 && hostname.includes('.')) {
        return { key: 'website', url: fullUrl };
      }
    } catch {}
  }
  return null;
}

function buildSocialLinksJson(sites?: string[]): string | null {
  if (!Array.isArray(sites) || sites.length === 0) return null;
  const result: Record<string, any> = { links: [] };

  sites.forEach((u) => {
    if (!u || typeof u !== 'string') return;
    const parsed = parseAndNormalizeUrlString(u);
    if (parsed) {
      if (!result.links.includes(parsed.url)) {
        result.links.push(parsed.url);
      }
      if (!result[parsed.key]) {
        result[parsed.key] = parsed.url;
      }
    }
  });

  return result.links.length > 0 ? JSON.stringify(result) : null;
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

    // 1. Extrai URLs já salvas no banco de dados e as re-higieniza
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

    if (allUrls.length > 0) {
      const enrichedJson = buildSocialLinksJson(allUrls);
      if (enrichedJson !== candidate.socialLinks) {
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
