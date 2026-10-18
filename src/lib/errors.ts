const EVENT = 'forja:error';

/** Erros conhecidos das RPCs do banco (supabase/migrations/*_rpc.sql) em português. */
const RPC_ERRORS: Record<string, string> = {
  checkin_fora_da_janela: 'Esse dia já fechou. O check-in não foi registrado.',
  desfazer_fora_da_janela: 'Só dá para desfazer o check-in de hoje.',
  sem_checkin: 'Faça o check-in do dia antes de registrar séries.',
  congelamento_limite_mensal: 'Você já congelou uma semana este mês.',
  congelamento_meta_batida: 'A meta desta semana já foi batida.',
  congelamento_ja_existe: 'Esta semana já está congelada.',
  nao_autenticado: 'Sua sessão expirou. Entre de novo.',
};

export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const code = Object.keys(RPC_ERRORS).find((k) => raw.includes(k));
  if (code) return RPC_ERRORS[code];
  if (/fetch|network/i.test(raw)) return 'Sem conexão. Tente de novo quando a internet voltar.';
  return 'Não foi possível salvar. Tente de novo.';
}

/**
 * Avisa a interface sobre um erro. Funciona fora de componentes React — inclusive em mutações
 * retomadas da fila offline depois de recarregar a página, quando nenhum hook está montado.
 */
export function notifyError(err: unknown): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: errorMessage(err) }));
}

export function onErrorNotice(listener: (msg: string) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
