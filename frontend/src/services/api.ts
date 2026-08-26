import { Candidate, ElectionYear, Cargo, UserSettings, UserEvaluation, CandidateAnnotation, User } from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('criterium_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const settingsStr = localStorage.getItem('criterium_user_settings');
  if (settingsStr) {
    headers['x-guest-settings'] = settingsStr;
  }
  return headers;
}

export interface CrawlerStatusResponse {
  status: 'desativado' | 'ativo' | 'buscando';
  lastHeartbeat: string | null;
  candidatesFetched: number;
}

export async function fetchCrawlerStatus(): Promise<CrawlerStatusResponse> {
  try {
    const res = await fetch(`${API_BASE}/crawler/status`);
    if (!res.ok) return { status: 'desativado', lastHeartbeat: null, candidatesFetched: 0 };
    return res.json();
  } catch (err) {
    return { status: 'desativado', lastHeartbeat: null, candidatesFetched: 0 };
  }
}

export async function fetchElections(): Promise<ElectionYear[]> {
  const res = await fetch(`${API_BASE}/elections`);
  if (!res.ok) throw new Error('Erro ao buscar anos de eleição');
  return res.json();
}

export async function fetchCargos(): Promise<Cargo[]> {
  const res = await fetch(`${API_BASE}/cargos`);
  if (!res.ok) throw new Error('Erro ao buscar cargos');
  return res.json();
}

export async function fetchCandidates(params: {
  year?: number;
  cargoCode?: string;
  search?: string;
  state?: string;
  page?: number;
  limit?: number;
}): Promise<Candidate[]> {
  const query = new URLSearchParams();
  if (params.year) query.set('year', params.year.toString());
  if (params.cargoCode) query.set('cargoCode', params.cargoCode);
  if (params.search) query.set('search', params.search);
  if (params.state) query.set('state', params.state);
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/candidates?${query.toString()}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Erro ao buscar candidatos');
  const json = await res.json();
  if (json && Array.isArray(json.data)) {
    return json.data;
  }
  return Array.isArray(json) ? json : [];
}

export async function fetchCandidatesPaginated(params: {
  year?: number;
  cargoCode?: string;
  search?: string;
  state?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Candidate[]; total: number; page: number; limit: number; hasMore: boolean }> {
  const query = new URLSearchParams();
  if (params.year) query.set('year', params.year.toString());
  if (params.cargoCode) query.set('cargoCode', params.cargoCode);
  if (params.search) query.set('search', params.search);
  if (params.state) query.set('state', params.state);
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/candidates?${query.toString()}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Erro ao buscar candidatos');
  const json = await res.json();
  if (json && Array.isArray(json.data)) {
    return json;
  }
  return {
    data: Array.isArray(json) ? json : [],
    total: Array.isArray(json) ? json.length : 0,
    page: params.page || 1,
    limit: params.limit || 24,
    hasMore: false,
  };
}

export async function fetchCandidateDetail(id: string): Promise<Candidate> {
  const res = await fetch(`${API_BASE}/candidates/${id}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Erro ao buscar detalhes do candidato');
  return res.json();
}

export async function fetchRankings(year: number, cargoCode: string, state?: string): Promise<{
  leaderboard: Candidate[];
  totalCandidates: number;
}> {
  const query = new URLSearchParams({
    year: year.toString(),
    cargoCode,
  });
  if (state) query.set('state', state);

  const res = await fetch(`${API_BASE}/rankings?${query.toString()}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Erro ao buscar ranking');
  return res.json();
}

export async function fetchUserSettings(): Promise<UserSettings> {
  const token = localStorage.getItem('criterium_token');
  if (!token) {
    // Return saved guest settings or default
    const saved = localStorage.getItem('criterium_guest_settings');
    if (saved) return JSON.parse(saved);
    return {
      presetName: 'CUSTOM',
      autoRulesJson: '[]',
      isGuest: true,
    };
  }

  const res = await fetch(`${API_BASE}/settings`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Erro ao buscar configurações');
  return res.json();
}

export async function saveUserSettings(settings: UserSettings): Promise<UserSettings> {
  localStorage.setItem('criterium_user_settings', JSON.stringify(settings));
  localStorage.setItem('criterium_guest_settings', JSON.stringify({ ...settings, isGuest: true }));
  const token = localStorage.getItem('criterium_token');
  if (!token) {
    return { ...settings, isGuest: true };
  }

  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Erro ao salvar configurações');
  const saved = await res.json();
  localStorage.setItem('criterium_user_settings', JSON.stringify(saved));
  return saved;
}

export async function submitEvaluation(evaluation: {
  candidateId: string;
  itemType: 'PROPOSAL' | 'CAREER' | 'CONTROVERSY' | 'GENERAL' | 'AUTO_OVERRIDE' | 'PARTY' | 'OCCUPATION' | 'EDUCATION' | 'ASSETS' | 'VICE' | 'EXPERIENCE' | 'PERFORMANCE' | 'ANNOTATION';
  itemId?: string;
  rating: number;
  comment?: string;
}): Promise<UserEvaluation> {
  const token = localStorage.getItem('criterium_token');
  if (!token) {
    // Store in guest local evaluations map
    const savedGuestEvs = JSON.parse(localStorage.getItem('criterium_guest_evaluations') || '[]');
    const filtered = savedGuestEvs.filter(
      (e: any) =>
        !(e.candidateId === evaluation.candidateId && e.itemType === evaluation.itemType && e.itemId === (evaluation.itemId || ''))
    );
    const newEv = { ...evaluation, id: `guest-${Date.now()}` };
    filtered.push(newEv);
    localStorage.setItem('criterium_guest_evaluations', JSON.stringify(filtered));
    return newEv as UserEvaluation;
  }

  const res = await fetch(`${API_BASE}/evaluations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(evaluation),
  });
  if (!res.ok) throw new Error('Erro ao registrar avaliação');
  return res.json();
}

export async function resetCandidateEvaluations(candidateId: string): Promise<void> {
  const token = localStorage.getItem('criterium_token');
  if (!token) {
    const stored = localStorage.getItem('criterium_guest_evaluations');
    if (stored) {
      try {
        const guestEvs: UserEvaluation[] = JSON.parse(stored);
        const filtered = guestEvs.filter((e) => e.candidateId !== candidateId);
        localStorage.setItem('criterium_guest_evaluations', JSON.stringify(filtered));
      } catch (e) {
        localStorage.removeItem('criterium_guest_evaluations');
      }
    }
    return;
  }

  const res = await fetch(`${API_BASE}/evaluations/candidate/${candidateId}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeader(),
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erro ao zerar pontuações do candidato');
  }
}

export async function deleteAllUserEvaluations(): Promise<void> {
  const token = localStorage.getItem('criterium_token');
  if (!token) {
    localStorage.removeItem('criterium_guest_evaluations');
    return;
  }

  const res = await fetch(`${API_BASE}/evaluations/user/all`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeader(),
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erro ao zerar todas as pontuações');
  }
}

export async function registerUser(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
  localStorage.removeItem('criterium_guest_evaluations');
  localStorage.removeItem('criterium_guest_settings');
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erro ao registrar conta');
  }
  return res.json();
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  localStorage.removeItem('criterium_guest_evaluations');
  localStorage.removeItem('criterium_guest_settings');
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erro ao fazer login');
  }
  return res.json();
}

export async function fetchMe(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Sessão expirada');
  const data = await res.json();
  return data.user;
}

export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erro ao excluir conta');
  }
}

// Annotation Client API Functions (Requires Authenticated Account)
export async function fetchCandidateAnnotations(candidateId: string): Promise<CandidateAnnotation[]> {
  const token = localStorage.getItem('criterium_token');
  if (!token) return [];
  try {
    const res = await fetch(`${API_BASE}/annotations/candidate/${candidateId}`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    return [];
  }
}

export async function saveCandidateAnnotation(annotation: {
  candidateId: string;
  title: string;
  description: string;
  sourceUrl?: string;
  rating: number;
}): Promise<CandidateAnnotation> {
  const token = localStorage.getItem('criterium_token');
  if (!token) throw new Error('Login obrigatório para criar anotações.');

  const res = await fetch(`${API_BASE}/annotations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(annotation),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erro ao salvar anotação');
  }
  return res.json();
}

export async function updateCandidateAnnotation(
  id: string,
  annotation: {
    candidateId: string;
    title?: string;
    description?: string;
    sourceUrl?: string;
    rating?: number;
  }
): Promise<CandidateAnnotation> {
  const token = localStorage.getItem('criterium_token');
  if (!token) throw new Error('Login obrigatório para atualizar anotações.');

  const res = await fetch(`${API_BASE}/annotations/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(annotation),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erro ao atualizar anotação');
  }
  return res.json();
}

export async function deleteCandidateAnnotation(id: string, _candidateId: string): Promise<void> {
  const token = localStorage.getItem('criterium_token');
  if (!token) throw new Error('Login obrigatório para excluir anotações.');

  const res = await fetch(`${API_BASE}/annotations/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erro ao excluir anotação');
  }
}
