import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { obterLinkPSO } from '../services/draovivoService';

const TTL_MS = 30 * 60 * 1000;       // 30 minutos
const REFRESH_MS = 25 * 60 * 1000;   // refresh a cada 25 minutos

interface PSOCacheData {
  url: string;
  personId: string;
}

interface PSOCacheContextValue {
  psoCache: PSOCacheData | null;
  isValid: boolean;
  invalidate: () => void;
  refresh: () => Promise<void>;
}

const PSOCacheContext = createContext<PSOCacheContextValue>({
  psoCache: null,
  isValid: false,
  invalidate: () => {},
  refresh: async () => {},
});

export const usePSOCache = () => useContext(PSOCacheContext);

export const PSOCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [psoCache, setPsoCache] = useState<PSOCacheData | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number>(0);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const isValid = psoCache !== null && Date.now() - fetchedAt < TTL_MS;

  const refresh = useCallback(async () => {
    try {
      const result = await obterLinkPSO();
      if (result.success && result.url) {
        setPsoCache({ url: result.url, personId: result.personId || '' });
        setFetchedAt(Date.now());
      }
    } catch (err) {
      console.error('[PSOCache] Erro ao obter link PSO:', err);
    }
  }, []);

  const invalidate = useCallback(() => {
    setPsoCache(null);
    setFetchedAt(0);
  }, []);

  // Fetch inicial + refresh periodico
  useEffect(() => {
    refresh();

    refreshTimer.current = setInterval(() => {
      refresh();
    }, REFRESH_MS);

    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [refresh]);

  return (
    <PSOCacheContext.Provider value={{ psoCache, isValid, invalidate, refresh }}>
      {children}
    </PSOCacheContext.Provider>
  );
};
