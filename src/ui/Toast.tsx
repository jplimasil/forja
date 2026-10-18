import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onErrorNotice } from '../lib/errors';

type Tone = 'ok' | 'error';
interface ToastItem { id: number; msg: string; tone: Tone }
interface ToastApi { show(msg: string, tone?: Tone): void }

const ToastContext = createContext<ToastApi>({ show: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((msg: string, tone: Tone = 'ok') => {
    const id = nextId++;
    setItems((list) => [...list, { id, msg, tone }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4500);
  }, []);
  useEffect(() => onErrorNotice((msg) => show(msg, 'error')), [show]);
  const api = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-8">
        {items.map((t) => (
          <p
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`max-w-md rounded-xl border px-4 py-3 text-sm shadow-lg shadow-black/40 ${
              t.tone === 'error' ? 'border-danger/40 bg-[#2a1214] text-[#ffd6d6]' : 'border-line bg-raised text-fg'
            }`}
          >
            {t.msg}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
