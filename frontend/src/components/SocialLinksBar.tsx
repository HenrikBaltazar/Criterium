import React from 'react';
import { Globe, Instagram, Twitter, Youtube, Facebook, Linkedin, Camera, Video, Share2, ExternalLink } from 'lucide-react';

interface SocialLinksBarProps {
  socialLinksJson?: string | null;
}

interface SocialItem {
  key: string;
  label: string;
  icon: React.ElementType;
  url: string;
}

export function parseAndNormalizeSocialUrl(raw: string): SocialItem | null {
  if (!raw || typeof raw !== 'string') return null;
  let str = raw.trim();

  // Strip duplicate protocols
  str = str.replace(/^(https?:\/\/)+/gi, '');

  const lower = str.toLowerCase();

  // Helper to extract clean handle/path
  const extractHandle = (input: string) => {
    let clean = input.replace(/^(tik\s*tok|instagram|facebook|twitter|youtube|x|linkedin|flickr|kwai|bsky)\s*[:\-]?\s*/i, '');
    clean = clean.replace(/^@/, '').trim();
    clean = clean.replace(/^\/+/, '');
    return clean;
  };

  // 1. Instagram
  if (lower.includes('instagram.com') || lower.includes('instagr.am') || lower.includes('threads.net') || lower.includes('threads.com') || lower.startsWith('instagram') || (str.startsWith('@') && !str.includes('.'))) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = (lower.includes('http') || lower.includes('.com')) && lower.includes('instagram') ? `https://${str}` : `https://www.instagram.com/${handle}`;
    return { key: 'instagram', label: 'Instagram', icon: Instagram, url: fullUrl };
  }

  // 2. TikTok
  if (lower.includes('tiktok.com') || lower.startsWith('tik tok') || lower.startsWith('tiktok')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = (lower.includes('http') || lower.includes('.com')) && lower.includes('tiktok') ? `https://${str}` : `https://www.tiktok.com/@${handle}`;
    return { key: 'tiktok', label: 'TikTok', icon: Video, url: fullUrl };
  }

  // 3. Twitter / X
  if (lower.includes('twitter.com') || lower.includes('x.com') || lower.startsWith('x -') || lower.startsWith('x:') || lower.startsWith('twitter')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = ((lower.includes('http') || lower.includes('.com')) && (lower.includes('twitter') || lower.includes('x.com'))) ? `https://${str}` : `https://x.com/${handle}`;
    return { key: 'twitter', label: 'X (Twitter)', icon: Twitter, url: fullUrl };
  }

  // 4. YouTube
  if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.startsWith('youtube')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = ((lower.includes('http') || lower.includes('.com')) && (lower.includes('youtube') || lower.includes('youtu.be'))) ? `https://${str}` : `https://www.youtube.com/@${handle}`;
    return { key: 'youtube', label: 'YouTube', icon: Youtube, url: fullUrl };
  }

  // 5. Facebook
  if (lower.includes('facebook.com') || lower.includes('fb.com') || lower.includes('fb.watch') || lower.startsWith('facebook')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = ((lower.includes('http') || lower.includes('.com')) && (lower.includes('facebook') || lower.includes('fb.com'))) ? `https://${str}` : `https://www.facebook.com/${handle}`;
    return { key: 'facebook', label: 'Facebook', icon: Facebook, url: fullUrl };
  }

  // 6. LinkedIn
  if (lower.includes('linkedin.com') || lower.startsWith('linkedin')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = lower.includes('http') && lower.includes('linkedin.com') ? `https://${str}` : `https://www.linkedin.com/in/${handle}`;
    return { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, url: fullUrl };
  }

  // 7. Flickr
  if (lower.includes('flickr.com') || lower.startsWith('flickr')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = lower.includes('http') && lower.includes('flickr.com') ? `https://${str}` : `https://www.flickr.com/photos/${handle}`;
    return { key: 'flickr', label: 'Flickr', icon: Camera, url: fullUrl };
  }

  // 8. Kwai
  if (lower.includes('kwai.com') || lower.includes('kwai-video.com') || lower.startsWith('kwai')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = lower.includes('http') && lower.includes('kwai') ? `https://${str}` : `https://www.kwai.com/@${handle}`;
    return { key: 'kwai', label: 'Kwai', icon: Video, url: fullUrl };
  }

  // 9. Bluesky
  if (lower.includes('bsky.app') || lower.includes('bsky.social') || lower.startsWith('bsky')) {
    const handle = extractHandle(str);
    if (!handle) return null;
    const fullUrl = lower.includes('http') && lower.includes('bsky') ? `https://${str}` : `https://bsky.app/profile/${handle}`;
    return { key: 'bluesky', label: 'Bluesky', icon: Share2, url: fullUrl };
  }

  // 10. Generic Website validation
  if (str.includes('.') && !str.includes('@') && !str.includes(' ') && !str.includes(':')) {
    const fullUrl = `https://${str}`;
    try {
      const parsed = new URL(fullUrl);
      const hostname = parsed.hostname.replace(/^www\./, '');
      if (hostname.length > 3 && hostname.includes('.')) {
        return { key: `website-${hostname}`, label: hostname, icon: Globe, url: fullUrl };
      }
    } catch {}
  }

  return null;
}

export const SocialLinksBar: React.FC<SocialLinksBarProps> = ({ socialLinksJson }) => {
  if (!socialLinksJson) return null;

  let rawData: any = null;
  try {
    rawData = JSON.parse(socialLinksJson);
  } catch {
    return null;
  }

  // Extrai todas as URLs do objeto socialLinksJson
  const extractedUrls: string[] = [];
  const addUrl = (url: any) => {
    if (typeof url === 'string' && url.trim().length > 2 && !extractedUrls.includes(url.trim())) {
      extractedUrls.push(url.trim());
    }
  };

  if (Array.isArray(rawData)) {
    rawData.forEach(addUrl);
  } else if (typeof rawData === 'object' && rawData !== null) {
    if (Array.isArray(rawData.links)) {
      rawData.links.forEach(addUrl);
    }
    Object.entries(rawData).forEach(([k, v]) => {
      if (k !== 'links') addUrl(v);
    });
  }

  if (extractedUrls.length === 0) return null;

  const platformMap = new Map<string, SocialItem>();

  extractedUrls.forEach((url) => {
    const item = parseAndNormalizeSocialUrl(url);
    if (item && !platformMap.has(item.key)) {
      platformMap.set(item.key, item);
    }
  });

  const categorized = Array.from(platformMap.values());

  if (categorized.length === 0) return null;

  return (
    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
        Canais e Redes Sociais Oficiais ({categorized.length}):
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {categorized.map((item, idx) => {
          const Icon = item.icon;
          const formattedUrl = item.url.toLowerCase().startsWith('http') ? item.url : `https://${item.url}`;
          return (
            <a
              key={`${item.key}-${idx}`}
              href={formattedUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.78rem',
                fontWeight: 600,
                transition: 'var(--transition)',
              }}
              title={`Acessar ${item.label}`}
            >
              <Icon size={14} />
              <span>{item.label}</span>
              <ExternalLink size={10} color="var(--text-muted)" />
            </a>
          );
        })}
      </div>
    </div>
  );
};
