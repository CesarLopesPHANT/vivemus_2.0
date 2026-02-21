import { supabase } from './supabase';

const PSO_TTL_MS = 30 * 60 * 1000;
const PSO_REFRESH_MS = 25 * 60 * 1000;

interface PSOCacheEntry {
  url: string;
  personId?: string;
  fetchedAt: number;
}

let cache: PSOCacheEntry | null = null;
let fetching = false;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

export async function fetchPSO(): Promise<PSOCacheEntry | null> {
  if (fetching) return cache;
  fetching = true;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { fetching = false; return cache; }

    // Tenta sync-on-login primeiro (retorna PSO como side-effect)
    const { data, error } = await supabase.functions.invoke('sync-on-login', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!error && data?.pso?.url) {
      cache = { url: data.pso.url, personId: data.pso.personId, fetchedAt: Date.now() };
      fetching = false;
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
  } finally {
    fetching = false;
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
