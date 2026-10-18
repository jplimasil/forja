import { useState } from 'react';
import { Link } from 'react-router';
import type { ISODate } from '@rules/types.ts';
import { addDays } from '@rules/dates.ts';
import { canCheckin } from '@rules/checkin.ts';
import { dias, treinos } from '@rules/messages.ts';
import { formatMoney } from '@rules/money.ts';
import type { WeekProgress } from '@rules/week.ts';
import { useWeekState } from '../../data/useWeekState';
import { useCheckin, useCheckins, useUndoCheckin } from '../../data/checkins';
import { useFreeze, useUnfreeze } from '../../data/freezes';
import { ProgressRing } from '../../ui/ProgressRing';
import { RiskBadge } from '../../ui/RiskBadge';
import { StreakFlame } from '../../ui/StreakFlame';
import { CheckinBurst } from '../../ui/CheckinBurst';
import { Button } from '../../ui/Button';
import { usePushStatus } from '../../lib/push';
import { PUSH_HELP } from '../settings/PushSection';

const FREEZE_REASONS = {
  met: 'A meta desta semana já foi batida.',
  'monthly-limit': 'Você já congelou uma semana este mês.',
  already: '',
} as const;

function statusLine(p: WeekProgress, frozen: boolean): string {
  if (frozen) return 'Semana congelada. Sem cobrança até domingo.';
  if (p.level === 'met') return 'Meta da semana cumprida. Treino extra é bônus.';
  const restam = p.available === 1 ? 'resta 1 dia' : `restam ${dias(p.available)}`;
  if (p.level === 'red') return `Faltam ${treinos(p.need)} e ${restam}. A meta desta semana não fecha mais, mas o hábito continua.`;
  return `Faltam ${treinos(p.need)} e ${restam}.`;
}

function longDate(d: ISODate): string {
  const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const WEEK_LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

function WeekStrip({ weekStart, today, trained }: { weekStart: ISODate; today: ISODate; trained: ISODate[] }) {
  return (
    <ol className="grid grid-cols-7 gap-1.5" aria-label="Dias da semana">
      {WEEK_LETTERS.map((letter, i) => {
        const day = addDays(weekStart, i);
        const did = trained.includes(day);
        const isToday = day === today;
        const past = day < today;
        return (
          <li key={day} className="flex flex-col items-center gap-1.5" aria-label={`${letter} ${day.slice(8)}: ${did ? 'treinou' : past ? 'sem treino' : 'a fazer'}`}>
            <span className={`text-xs ${isToday ? 'font-semibold text-fg' : 'text-muted'}`}>{letter}</span>
            <span
              className={`grid size-9 place-items-center rounded-full font-head text-[15px] font-semibold tabular ${
                did ? 'bg-accent text-bg' : isToday ? 'border-2 border-fg text-fg' : past ? 'text-muted/50' : 'border border-line text-muted'
              }`}
            >
              {Number(day.slice(8))}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Sem notificações o app não consegue cobrar: avisa até estarem ativas. */
function PushBanner() {
  const { status } = usePushStatus();
  if (!status || status === 'subscribed') return null;
  return (
    <div className="rounded-2xl border border-warn/40 bg-warn/10 p-5">
      <p className="font-head text-lg font-semibold text-warn">Lembretes desligados</p>
      <p className="mt-1 text-sm text-fg/90">
        {status === 'can-subscribe' ? 'Sem notificações, o FORJA não consegue te lembrar do treino.' : PUSH_HELP[status]}
      </p>
      {status === 'can-subscribe' && (
        <Link to="/ajustes" className="mt-3 inline-block text-sm font-semibold text-fg underline underline-offset-4">Ativar em Ajustes</Link>
      )}
    </div>
  );
}

export function Home() {
  const s = useWeekState();
  const checkins = useCheckins().data ?? [];
  const checkin = useCheckin();
  const undo = useUndoCheckin();
  const freeze = useFreeze();
  const unfreeze = useUnfreeze();
  const [burst, setBurst] = useState(0);

  if (!s) return null;
  const { now, progress, frozen, warmup } = s;
  const yesterday = addDays(now.date, -1);
  const canFixYesterday = !checkins.includes(yesterday) && canCheckin(yesterday, now);

  function doCheckin() {
    checkin.mutate(now.date);
    setBurst((b) => b + 1);
    navigator.vibrate?.(40);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-14">
      <section className="space-y-7" aria-label="Semana atual">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-head text-xl text-muted">{longDate(now.date)}</p>
          {!frozen && <RiskBadge level={progress.level} />}
        </header>

        <ProgressRing done={progress.done} goal={progress.goal} level={frozen ? 'green' : progress.level} />
        <p className="text-center text-lg text-fg/90">{statusLine(progress, frozen)}</p>
        <WeekStrip weekStart={s.weekStart} today={now.date} trained={checkins} />

        <div className="space-y-3">
          {s.checkedInToday ? (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-accent/40 bg-accent/10 px-5 py-4">
              <p className="font-head text-xl font-semibold text-accent">Treino de hoje registrado</p>
              <button type="button" onClick={() => undo.mutate(now.date)} className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
                Desfazer
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={doCheckin}
              className="relative h-20 w-full rounded-2xl bg-accent font-display text-3xl uppercase tracking-wide text-bg transition active:scale-[0.98] hover:brightness-110"
            >
              Treinei hoje
              {burst > 0 && <CheckinBurst key={burst} />}
            </button>
          )}
          {!s.checkedInToday && progress.level !== 'met' && (
            <Link
              to="/sos"
              className="flex h-12 w-full items-center justify-center rounded-2xl border border-line font-head text-lg font-semibold text-fg hover:bg-card"
            >
              Tô sem vontade
            </Link>
          )}
          {canFixYesterday && (
            <button type="button" onClick={() => checkin.mutate(yesterday)} className="w-full py-1 text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
              Treinou ontem e esqueceu de marcar? Registrar ontem
            </button>
          )}
        </div>
      </section>

      <aside className="space-y-8 lg:pt-14">
        <PushBanner />
        {warmup ? (
          <p className="rounded-2xl border border-line p-5 text-fg/90">
            Semana de aquecimento: a cobrança começa na segunda.
            <span className="mt-2 block text-sm text-muted">Use esses dias para pegar o ritmo. Streak e multas passam a contar na próxima semana.</span>
          </p>
        ) : (
          <>
            <StreakFlame weeks={s.streak} />
            {s.debt > 0 && (
              <div className="border-t border-line pt-6">
                <p className="font-display text-3xl leading-none text-danger tabular">{formatMoney(s.debt)}</p>
                <p className="mt-1 text-sm text-muted">em multas a pagar {s.settings.penaltyDescription}</p>
                <Link to="/historico" className="mt-2 inline-block text-sm text-fg underline underline-offset-4">Ver e marcar como paga</Link>
              </div>
            )}
          </>
        )}

        <div className="border-t border-line pt-6">
          {frozen ? (
            <>
              <p className="text-sm text-ice">Esta semana está congelada.</p>
              <Button variant="ghost" className="mt-3" onClick={() => unfreeze.mutate(s.weekStart)}>Descongelar semana</Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">Doente ou viajando? Congele a semana: ela não quebra o streak nem gera multa. Uma vez por mês.</p>
              <Button variant="ghost" className="mt-3" disabled={!s.freezeCheck.ok} onClick={() => freeze.mutate(s.weekStart)}>
                Congelar semana
              </Button>
              {!s.freezeCheck.ok && <p className="mt-2 text-sm text-muted">{FREEZE_REASONS[s.freezeCheck.reason]}</p>}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
