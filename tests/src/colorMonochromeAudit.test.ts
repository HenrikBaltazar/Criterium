import fs from 'fs';
import path from 'path';

/**
 * Teste de Regressão Estrito: Verificação de Cores Monocromáticas (Preto, Branco e Tons de Cinza)
 * 
 * Regra: NENHUMA cor (red, green, blue, yellow, etc.) é permitida no projeto.
 * Todas as cores declaradas em CSS, estilos inline e componentes TSX/TS devem ser:
 * 1. Hexadecimal monocromático (#000, #fff, #121212, #a0a0a0 onde R == G == B)
 * 2. RGB/RGBA monocromático (rgba(R, G, B, A) onde R == G == B)
 * 3. HSL/HSLA monocromático com saturação 0% (hsl(H, 0%, L))
 * 4. Variáveis de tema CSS (var(--...)), transparent, inherit, currentColor
 */

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return { r, g, b };
    }
  }
  return null;
}

export function runColorMonochromeAudit(): { passed: boolean; violations: string[] } {
  const srcDir = path.resolve(__dirname, '../../frontend/src');
  const violations: string[] = [];

  const forbiddenColorKeywords = [
    /\b(red|green|blue|yellow|orange|purple|pink|cyan|magenta|crimson|teal|violet|gold|bronze)\b/i,
  ];

  function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && /\.(tsx|ts|css|html)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const lineNum = index + 1;
          const relativePath = path.relative(path.resolve(__dirname, '../../'), fullPath);

          // Ignore comments or URLs
          if (line.trim().startsWith('//') || line.includes('http://') || line.includes('https://')) {
            return;
          }

          // 1. Audit Hex colors (#xxxxxx or #xxx)
          const hexMatches = line.match(/#[0-9a-fA-F]{3,6}\b/g);
          if (hexMatches) {
            for (const hex of hexMatches) {
              const rgb = parseHexColor(hex);
              if (rgb) {
                // Check if R == G == B (monochrome)
                if (rgb.r !== rgb.g || rgb.g !== rgb.b) {
                  violations.push(`[${relativePath}:${lineNum}] Hex color não-monocromática '${hex}' (R:${rgb.r}, G:${rgb.g}, B:${rgb.b})`);
                }
              }
            }
          }

          // 2. Audit RGB/RGBA colors
          const rgbaMatches = line.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi);
          if (rgbaMatches) {
            for (const match of rgbaMatches) {
              const parts = match.match(/\d+/g);
              if (parts && parts.length >= 3) {
                const r = parseInt(parts[0], 10);
                const g = parseInt(parts[1], 10);
                const b = parseInt(parts[2], 10);
                if (r !== g || g !== b) {
                  violations.push(`[${relativePath}:${lineNum}] RGBA color não-monocromática '${match}' (R:${r}, G:${g}, B:${b})`);
                }
              }
            }
          }

          // 3. Audit HSL colors (must have 0% saturation)
          const hslMatches = line.match(/hsla?\(\s*\d+\s*,\s*(\d+)%/gi);
          if (hslMatches) {
            for (const match of hslMatches) {
              const satMatch = match.match(/,\s*(\d+)%/);
              if (satMatch && parseInt(satMatch[1], 10) > 0) {
                violations.push(`[${relativePath}:${lineNum}] HSL color com saturação maior que 0%: '${match}'`);
              }
            }
          }

          // 4. Audit explicit color keyword names in style definitions
          const stylePropertyMatch = line.match(/(?:color|background|border|fill|stroke)\s*:\s*['"]?([a-zA-Z]+)['"]?/i);
          if (stylePropertyMatch) {
            const val = stylePropertyMatch[1].toLowerCase();
            const allowedKeywords = ['transparent', 'inherit', 'currentcolor', 'none', 'initial', 'unset', 'white', 'black', 'gray', 'grey'];
            if (!allowedKeywords.includes(val)) {
              for (const regex of forbiddenColorKeywords) {
                if (regex.test(val)) {
                  violations.push(`[${relativePath}:${lineNum}] Nome de cor não-monocromático proibido '${val}'`);
                }
              }
            }
          }
        });
      }
    }
  }

  scanDirectory(srcDir);

  return {
    passed: violations.length === 0,
    violations,
  };
}
