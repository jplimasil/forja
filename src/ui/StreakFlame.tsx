import { semanas } from '@rules/messages.ts';

/** A chama cresce com a sequência, até um limite. */
export function StreakFlame({ weeks }: { weeks: number }) {
  const scale = 1 + Math.min(weeks, 12) * 0.06;
  const lit = weeks > 0;
  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 24 24"
        width="30"
        height="30"
        aria-hidden="true"
        style={{ transform: `scale(${scale})` }}
        className={`origin-bottom transition-transform ${lit ? 'text-warn' : 'text-line'}`}
      >
        <path
          fill="currentColor"
          d="M12 2c.5 3.2-1.2 5-2.8 6.8C7.6 10.6 6 12.4 6 15a6 6 0 0 0 12 0c0-2.3-1-4-2.3-5.4-.3 1.4-1 2.4-2 2.9.4-3.6-.6-7.6-1.7-10.5Z"
        />
      </svg>
      <div>
        <p className="font-display text-3xl leading-none tabular">{semanas(weeks)}</p>
        <p className="mt-1 text-sm text-muted">{lit ? 'seguidas batendo a meta' : 'comece sua sequência'}</p>
      </div>
    </div>
  );
}
