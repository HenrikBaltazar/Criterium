export const TSE_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'priority': 'u=1, i',
  'referer': 'https://divulgacandcontas.tse.jus.br/',
  'sec-ch-ua': '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Linux"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
};

export async function fetchTseJson<T>(url: string, retries = 5, delayMs = 1500): Promise<T | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: TSE_HEADERS } as any);
      if (res.ok) {
        const text = await res.text();
        if (!text || !text.trim()) {
          return null; // TSE returns HTTP 200 with empty 0-byte body when candidate ID has no data
        }
        return JSON.parse(text) as T;
      }
      if (res.status === 404) {
        return null;
      }
      if (res.status === 429) {
        const backoffSec = attempt * 3;
        console.warn(`[TSE Fetcher] ⚠️ HTTP 429 (Rate Limit) em ${url}. Aguardando ${backoffSec}s antes de tentar novamente (${attempt}/${retries})...`);
        await new Promise((resolve) => setTimeout(resolve, backoffSec * 1000));
        continue;
      }
      console.warn(`[TSE Fetcher] HTTP ${res.status} em ${url} (tentativa ${attempt}/${retries})`);
    } catch (err: any) {
      console.warn(`[TSE Fetcher] Erro na tentativa ${attempt}/${retries} para ${url}: ${err.message}`);
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  return null;
}
