import { supabase } from './supabase';

const PSO_TTL_MS = 30 * 60 * 1000;
const PSO_REFRESH_MS = 25 * 60 * 1000;

interface PSOCacheEntry {
  url: string;
  personId?: string;
  fetchedAt: number;
}

let cache: PSOCacheEntry | null = null;
let _inflight: Promise<PSOCacheEntry | null> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

export async function fetchPSO(): Promise<PSOCacheEntry | null> {
  // Deduplicacao: se ja existe fetch em andamento, reutilizar mesma promise
  if (_inflight) return _inflight;

  _inflight = _fetchPSOImpl();
  try {
    return await _inflight;
  } finally {
    _inflight = null;
  }
}

async function _fetchPSOImpl(): Promise<PSOCacheEntry | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return cache;

    // Tenta sync-on-login primeiro (retorna PSO como side-effect)
    const { data, error } = await supabase.functions.invoke('sync-on-login', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!error && data?.pso?.url) {
      cache = { url: data.pso.url, personId: data.pso.personId, fetchedAt: Date.now() };
      return cache;
    }

    // Fallback: pso-proxy direto
    const { data: psoData, error: psoError } = await supabase.functions.invoke('pso-proxy', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!psoError && psoData?.success && psoData?.url) {
      cache = { url: psoData.url, personId: psoData.personId, fetchedAt: Date.now() };
    }
  } catch {
    // Falha silenciosa
  }
  return cache;
}

export function getCachedPSO(): PSOCacheEntry | null {
  if (!cache) return null;
  if (Date.now() - cache.fetchedAt > PSO_TTL_MS) return null;
  return cache;
}

export function invalidateCache(): void {
  cache = null;
}

export function startAutoRefresh(): void {
  if (refreshTimer) return;
  fetchPSO();
  refreshTimer = setInterval(fetchPSO, PSO_REFRESH_MS);
}

export function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
