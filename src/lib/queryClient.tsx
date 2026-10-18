import { QueryClient, type MutationFunction } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import type { ReactNode } from 'react';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_KEY = 'forja-cache';

export const queryClient = new QueryClient({
  defaultOptions: {
    // offlineFirst: mostra o cache e tenta a rede; sem conexão o app continua utilizável.
    queries: { staleTime: 30_000, gcTime: WEEK_MS, networkMode: 'offlineFirst', retry: 1 },
    mutations: { gcTime: WEEK_MS },
  },
});

const persister = createSyncStoragePersister({
  storage: typeof window === 'undefined' ? undefined : window.localStorage,
  key: CACHE_KEY,
});

/**
 * Mutações retomáveis precisam de uma função registrada por chave: depois de recarregar a página,
 * a fila persistida só guarda chave + variáveis, e é por aqui que o React Query reencontra a função.
 */
export function registerMutationDefaults<TVars>(key: string[], fn: MutationFunction<unknown, TVars>): void {
  queryClient.setMutationDefaults(key, { mutationFn: fn as MutationFunction<unknown, unknown> });
}

export function clearPersistedCache(): void {
  queryClient.clear();
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // armazenamento indisponível (aba privada): nada a limpar
  }
}

export function AppQueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: WEEK_MS }}
      onSuccess={() => void queryClient.resumePausedMutations()}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
