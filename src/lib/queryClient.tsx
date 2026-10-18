import { QueryClient, type Mutation, type MutationFunction } from '@tanstack/react-query';
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

const QUEUED = new Set<string>();

/** Falha de rede (sem sinal, sinal fraco, timeout) — diferente de uma recusa do servidor. */
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || /fetch|network|load failed|timeout|abort/i.test(String((err as Error)?.message ?? err));
}

/**
 * Mutações da fila offline (check-in, séries). Três garantias:
 * - função registrada por chave: depois de recarregar, a fila persistida só guarda chave + variáveis,
 *   e é por aqui que o React Query reencontra a função;
 * - mesmo `scope`: ao reconectar elas rodam em ordem, então o check-in chega antes das séries do dia;
 * - erro de rede tenta de novo com espera crescente, em vez de descartar o registro.
 */
export function registerMutationDefaults<TVars, TContext = unknown>(
  key: string[],
  options: {
    mutationFn: MutationFunction<unknown, TVars>;
    onMutate?: (vars: TVars) => TContext | Promise<TContext>;
    onError?: (err: Error, vars: TVars, context: TContext | undefined) => void;
    onSettled?: () => void;
  },
): void {
  QUEUED.add(JSON.stringify(key));
  queryClient.setMutationDefaults(key, {
    ...options,
    scope: { id: 'fila-offline' },
    retry: (failures: number, err: Error) => failures < 6 && isNetworkError(err),
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30_000),
  } as Parameters<typeof queryClient.setMutationDefaults>[1]);
}

/** Só guarda no aparelho o que consegue ser retomado depois de recarregar (tem função registrada). */
export function shouldPersistMutation(m: Mutation<unknown, Error, unknown, unknown>): boolean {
  const key = m.options.mutationKey;
  return m.state.isPaused && !!key && QUEUED.has(JSON.stringify(key));
}

export function clearPersistedCache(): void {
  queryClient.clear();
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // armazenamento indisponível (aba privada): nada a limpar
  }
}

/** `buster`: trocar quando o formato dos dados em cache mudar, para o aparelho descartar o cache antigo. */
export const persistOptions = {
  persister,
  maxAge: WEEK_MS,
  buster: 'treino-v2',
  dehydrateOptions: { shouldDehydrateMutation: shouldPersistMutation },
};

/**
 * Recarrega as consultas só quando a fila offline esvaziar. Recarregar a cada item que sobe traria a lista
 * do servidor ainda incompleta e as séries "sumiriam e voltariam" na tela durante a sincronização.
 * Chamado no onSettled, quando a própria mutação ainda conta como pendente — por isso '<= 1'.
 */
export function invalidateWhenQueueIdle(...keys: string[][]): void {
  if (queryClient.isMutating({ predicate: (m) => m.options.scope?.id === 'fila-offline' }) > 1) return;
  for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
}

export function AppQueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={() => void queryClient.resumePausedMutations()}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
