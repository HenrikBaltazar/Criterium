import React from 'react';
import { Globe, Instagram, Twitter, Youtube, Facebook, Linkedin, ExternalLink } from 'lucide-react';

interface SocialLinksBarProps {
  socialLinksJson?: string | null;
}

export const SocialLinksBar: React.FC<SocialLinksBarProps> = ({ socialLinksJson }) => {
  if (!socialLinksJson) return null;

  let links: Record<string, string> = {};
  try {
    links = JSON.parse(socialLinksJson);
  } catch {
    return null;
  }

  const items = [
    { key: 'website', label: 'Website Oficial', icon: Globe, url: links.website },
    { key: 'instagram', label: 'Instagram', icon: Instagram, url: links.instagram },
    { key: 'twitter', label: 'X (Twitter)', icon: Twitter, url: links.twitter || links.x },
    { key: 'youtube', label: 'YouTube', icon: Youtube, url: links.youtube },
    { key: 'facebook', label: 'Facebook', icon: Facebook, url: links.facebook },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, url: links.linkedin },
  ].filter((item) => Boolean(item.url));

  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
        Canais e Redes Sociais Oficiais:
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.key}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 11px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.75rem',
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
