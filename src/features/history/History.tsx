import { useState } from 'react';
import type { ClosedWeek, ISODate, WeekStatus } from '@rules/types.ts';
import { addDays, weekStartOf } from '@rules/dates.ts';
import { penaltyText } from '@rules/messages.ts';
import { useWeekState } from '../../data/useWeekState';
import { useCheckins } from '../../data/checkins';
import { useMarkPaid, useWeeks } from '../../data/weeks';
import { PageTitle } from '../../ui/Card';

const STATUS: Record<WeekStatus, { label: string; bar: string; text: string }> = {
  met: { label: 'Meta batida', bar: 'bg-accent', text: 'text-accent' },
  failed: { label: 'Meta não batida', bar: 'bg-danger', text: 'text-danger' },
  frozen: { label: 'Congelada', bar: 'bg-ice', text: 'text-ice' },
};

const monthLabel = (y: number, m: number) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15)));
const monthName = (y: number, m: number) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15)));
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const ddmm = (d: ISODate) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

function Calendar({ year, month, today, trained, weeks }: {
  year: number; month: number; today: ISODate; trained: Set<ISODate>; weeks: Map<ISODate, ClosedWeek>;
}) {
  const first = iso(year, month, 1);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = iso(year, month, daysInMonth);
  const rows: ISODate[] = [];
  for (let w = weekStartOf(first); w <= last; w = addDays(w, 7)) rows.push(w);
  const name = monthName(year, month);

  return (
    <div>
      <div className="grid grid-cols-[6px_repeat(7,minmax(0,1fr))] gap-x-2 pb-2 text-center text-xs text-muted" aria-hidden="true">
        <span />
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l, i) => <span key={i}>{l}</span>)}
      </div>
      <div className="space-y-1.5">
        {rows.map((w) => {
          const status = weeks.get(w)?.status;
          return (
            <div key={w} className="grid grid-cols-[6px_repeat(7,minmax(0,1fr))] items-center gap-x-2">
              <span className={`h-8 rounded-full ${status ? STATUS[status].bar : 'bg-transparent'}`} title={status ? STATUS[status].label : undefined} />
              {Array.from({ length: 7 }, (_, i) => {
                const day = addDays(w, i);
                if (day < first || day > last) return <span key={day} />;
                const did = trained.has(day);
                const future = day > today;
                const label = `${Number(day.slice(8))} de ${name}: ${did ? 'treinou' : future ? 'ainda não chegou' : 'sem treino'}`;
                return (
                  <span
                    key={day}
                    aria-label={label}
                    data-trained={did}
                    className={`mx-auto grid aspect-square w-full max-w-11 place-items-center rounded-lg font-head text-base font-semibold tabular ${
                      did ? 'bg-accent text-bg' : day === today ? 'border-2 border-fg text-fg' : future ? 'text-muted/40' : 'bg-card text-muted'
                    }`}
                  >
                    {Number(day.slice(8))}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function History() {
  const state = useWeekState();
  const checkins = useCheckins().data ?? [];
  const weeks = useWeeks().data ?? [];
  const markPaid = useMarkPaid();
  const today = state?.now.date ?? new Date().toISOString().slice(0, 10);
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
  if (!state) return null;

  const shift = (delta: number) => setYm(({ y, m }) => {
    const t = (y * 12 + (m - 1)) + delta;
    return { y: Math.floor(t / 12), m: (t % 12) + 1 };
  });
  const isCurrentMonth = ym.y === Number(today.slice(0, 4)) && ym.m === Number(today.slice(5, 7));
  const weeksByStart = new Map(weeks.map((w) => [w.weekStart, w]));

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <section aria-label="Calendário">
        <PageTitle>Histórico</PageTitle>
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={() => shift(-1)} className="grid size-10 place-items-center rounded-full text-muted hover:bg-card hover:text-fg" aria-label="Mês anterior">‹</button>
          <p className="font-head text-xl font-semibold">{monthLabel(ym.y, ym.m)}</p>
          <button type="button" onClick={() => shift(1)} disabled={isCurrentMonth} className="grid size-10 place-items-center rounded-full text-muted hover:bg-card hover:text-fg disabled:opacity-30" aria-label="Próximo mês">›</button>
        </div>
        <Calendar year={ym.y} month={ym.m} today={today} trained={new Set(checkins)} weeks={weeksByStart} />
        <p className="mt-4 text-sm text-muted">A barra à esquerda de cada semana mostra o resultado: verde batida, vermelha não batida, azul congelada.</p>
      </section>

      <section aria-label="Semanas fechadas" className="lg:pt-16">
        <h2 className="mb-4 font-head text-2xl font-bold">Semanas</h2>
        {weeks.length === 0 ? (
          <p className="text-muted">A primeira semana fecha na segunda às 10h. O resultado aparece aqui.</p>
        ) : (
          <ul className="divide-y divide-line">
            {weeks.map((w) => (
              <li key={w.weekStart} aria-label={`Semana de ${ddmm(w.weekStart)}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
                <span className={`h-10 w-1.5 rounded-full ${STATUS[w.status].bar}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-head text-lg font-semibold">
                    {ddmm(w.weekStart)} a {ddmm(addDays(w.weekStart, 6))}
                  </p>
                  <p className={`text-sm ${STATUS[w.status].text}`}>
                    {STATUS[w.status].label}
                    <span className="text-muted tabular"> ({w.done}/{w.goal} treinos)</span>
                  </p>
                </div>
                {w.status === 'failed' && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular">{penaltyText(w.penaltyAmount, state.settings.penaltyDescription)}</span>
                    {w.penaltyPaidAt ? (
                      <span className="rounded-full bg-raised px-3 py-1 text-xs text-muted">Paga</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markPaid.mutate(w.weekStart)}
                        className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-fg"
                      >
                        Marcar como paga
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
