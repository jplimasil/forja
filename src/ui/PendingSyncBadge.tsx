import { useMutationState } from '@tanstack/react-query';

/** Aparece quando há registros feitos sem internet esperando para subir. */
export function PendingSyncBadge() {
  const paused = useMutationState({ filters: { status: 'pending', predicate: (m) => m.state.isPaused } });
  if (!paused.length) return null;
  return (
    <p role="status" className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-40 flex items-center gap-2 rounded-full border border-line bg-raised px-3 py-1.5 text-xs text-muted">
      <span className="size-2 animate-pulse rounded-full bg-warn" aria-hidden="true" />
      Sem internet: {paused.length} {paused.length === 1 ? 'registro' : 'registros'} aguardando
    </p>
  );
}
