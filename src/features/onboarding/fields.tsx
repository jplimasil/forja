import { FIRST_HOUR, LAST_HOUR } from '@rules/notifications.ts';

/** Campos compartilhados entre o primeiro acesso e Ajustes. */

export const inputClass =
  'w-full rounded-xl border border-line bg-card px-4 py-3.5 text-base text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none';

export function GoalPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={n === 1 ? '1 treino' : `${n} treinos`}
          aria-pressed={value === n}
          onClick={() => onChange(n)}
          className={`aspect-[3/4] rounded-xl font-display text-3xl transition sm:text-4xl ${
            value === n ? 'bg-accent text-bg' : 'bg-card text-muted hover:text-fg'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);

export function HourSelect({ value, onChange }: { value: number; onChange: (h: number) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-muted">Horário</span>
      <select className={inputClass} value={String(value)} onChange={(e) => onChange(Number(e.target.value))}>
        {HOURS.map((h) => (
          <option key={h} value={String(h)}>
            {String(h).padStart(2, '0')}:00
          </option>
        ))}
      </select>
    </label>
  );
}

export function PenaltyFields(p: {
  amount: number; description: string; onAmount: (n: number) => void; onDescription: (s: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">Valor (R$)</span>
        <input
          className={`${inputClass} font-display text-2xl tabular`}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          value={p.amount}
          onChange={(e) => p.onAmount(Math.max(0, Number(e.target.value) || 0))}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-muted">Onde vai o dinheiro</span>
        <input className={inputClass} value={p.description} maxLength={60} placeholder="no cofrinho" onChange={(e) => p.onDescription(e.target.value)} />
      </label>
    </div>
  );
}

export const MAX_MOTIVATIONS = 5;

export function MotivationsEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-3">
      {value.map((m, i) => (
        <input
          key={i}
          aria-label={`Motivo ${i + 1}`}
          className={inputClass}
          value={m}
          maxLength={120}
          placeholder={i === 0 ? 'Ex.: quero subir escada sem cansar' : 'Outro motivo'}
          onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
        />
      ))}
      {value.length < MAX_MOTIVATIONS && (
        <button type="button" onClick={() => onChange([...value, ''])} className="py-2 text-sm font-medium text-accent">
          Adicionar motivo
        </button>
      )}
    </div>
  );
}
