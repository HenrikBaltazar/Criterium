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
    if (typeof url === 'string' && url.trim().length > 5 && !extractedUrls.includes(url.trim())) {
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

  // Classificação dinâmica das URLs por plataforma e remoção de duplicatas por rede
  const classify = (url: string): SocialItem => {
    const cleanUrlStr = url.trim();
    const lower = cleanUrlStr.toLowerCase();

    if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
      return { key: 'instagram', label: 'Instagram', icon: Instagram, url: cleanUrlStr };
    }
    if (lower.includes('twitter.com') || lower.includes('x.com')) {
      return { key: 'twitter', label: 'X (Twitter)', icon: Twitter, url: cleanUrlStr };
    }
    if (lower.includes('facebook.com') || lower.includes('fb.com') || lower.includes('fb.watch')) {
      return { key: 'facebook', label: 'Facebook', icon: Facebook, url: cleanUrlStr };
    }
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      return { key: 'youtube', label: 'YouTube', icon: Youtube, url: cleanUrlStr };
    }
    if (lower.includes('tiktok.com')) {
      return { key: 'tiktok', label: 'TikTok', icon: Video, url: cleanUrlStr };
    }
    if (lower.includes('linkedin.com')) {
      return { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, url: cleanUrlStr };
    }
    if (lower.includes('flickr.com')) {
      return { key: 'flickr', label: 'Flickr', icon: Camera, url: cleanUrlStr };
    }
    if (lower.includes('bsky.app') || lower.includes('bsky.social')) {
      return { key: 'bluesky', label: 'Bluesky', icon: Share2, url: cleanUrlStr };
    }

    let hostname = 'Website Oficial';
    const fullUrlStr = lower.startsWith('http') ? cleanUrlStr : `https://${cleanUrlStr}`;
    try {
      const parsedUrl = new URL(fullUrlStr);
      hostname = parsedUrl.hostname.replace(/^www\./, '');
    } catch {
      hostname = 'Website Oficial';
    }

    return { key: `website-${hostname}`, label: hostname, icon: Globe, url: cleanUrlStr };
  };

  const platformMap = new Map<string, SocialItem>();

  extractedUrls.forEach((url) => {
    const item = classify(url);
    const mapKey = item.key;
    if (!platformMap.has(mapKey)) {
      platformMap.set(mapKey, item);
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
