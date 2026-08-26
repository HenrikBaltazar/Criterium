export interface TSERawCandidate {
  id: number;
  nomeUrna: string;
  nomeCompleto: string;
  numero: number;
  siglaPartido: string;
  cargo: {
    codigo: number;
    sigla: string;
    nome: string;
  };
  estado: string;
  sqCand: number;
  fotoUrl?: string;
  gastoCampanhaMax?: number;
  stReg: string;
  infoSourceUrl: string;
}

const TSE_BASE_URL = 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1';

/**
 * Fetch candidates for a specific year, state, and cargo code from official TSE DivulgaCandContas API with retry logic
 */
export async function fetchTSECandidatesByStateAndCargo(
  year: number,
  state: string,
  cargoCode: string,
  retries = 2
): Promise<TSERawCandidate[]> {
  const cargoMap: Record<string, number> = {
    PRESIDENTE: 1,
    GOVERNADOR: 3,
    SENADOR: 5,
    DEP_FEDERAL: 6,
    DEP_ESTADUAL: 7,
  };

  const codeNum = cargoMap[cargoCode] || 1;
  const targetState = cargoCode === 'PRESIDENTE' ? 'BR' : state;

  const url = `${TSE_BASE_URL}/candidatura/listar/${year}/${targetState}/20322002026/${codeNum}/candidatos`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://divulgacandcontas.tse.jus.br/divulga/#/home',
        },
      });

      if (!response.ok) {
        throw new Error(`TSE API Status ${response.status}`);
      }

      const data: any = await response.json();
      if (data && Array.isArray(data.candidatos)) {
        return data.candidatos.map((c: any) => ({
          id: c.id || c.sqCand,
          sqCand: c.sqCand || c.id,
          nomeUrna: c.nomeUrna || c.nome,
          nomeCompleto: c.nomeCompleto || c.nomeUrna || c.nome,
          numero: c.numero,
          siglaPartido: c.partido?.sigla || c.siglaPartido || 'S/P',
          cargo: {
            codigo: codeNum,
            sigla: cargoCode,
            nome: c.cargo?.nome || cargoCode,
          },
          estado: targetState,
          fotoUrl: c.fotoUrl || null,
          gastoCampanhaMax: c.gastoCampanhaMax || 0,
          stReg: c.st_RECEBIDO || c.descricaoSituacao || 'DEFERIDO',
          infoSourceUrl: `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${targetState === 'BR' ? 'BR' : 'ESTADUAL'}/${targetState}/20322002026/${c.sqCand || c.id}/2026/${targetState}`,
        }));
      }
      return [];
    } catch (err) {
      if (attempt === retries) return [];
      await new Promise((res) => setTimeout(res, attempt * 300));
    }
  }

  return [];
}

/**
 * Parallel batch fetcher across multiple states concurrently
 */
export async function fetchAllTSECandidatesParallel(
  year: number,
  states: string[],
  cargos: string[],
  concurrencyLimit = 4
): Promise<TSERawCandidate[]> {
  const allResults: TSERawCandidate[] = [];

  const tasks: { state: string; cargo: string }[] = [];
  for (const cargo of cargos) {
    if (cargo === 'PRESIDENTE') {
      tasks.push({ state: 'BR', cargo: 'PRESIDENTE' });
    } else {
      for (const state of states) {
        tasks.push({ state, cargo });
      }
    }
  }

  for (let i = 0; i < tasks.length; i += concurrencyLimit) {
    const chunk = tasks.slice(i, i + concurrencyLimit);
    const chunkResults = await Promise.all(
      chunk.map((t) => fetchTSECandidatesByStateAndCargo(year, t.state, t.cargo))
    );

    for (const list of chunkResults) {
      allResults.push(...list);
    }
  }

  return allResults;
}
