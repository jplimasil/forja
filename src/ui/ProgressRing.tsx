import type { RiskLevel } from '@rules/types.ts';

const SIZE = 260;
const C = SIZE / 2;
const R = 108;
const STROKE = 20;
const GAP_DEG = 7;

function polar(deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [C + R * Math.cos(rad), C + R * Math.sin(rad)];
}

function arc(start: number, end: number): string {
  const [x1, y1] = polar(start);
  const [x2, y2] = polar(end);
  return `M ${x1} ${y1} A ${R} ${R} 0 ${end - start > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

const EMPTY_STROKE: Record<RiskLevel, string> = {
  met: 'var(--color-line)',
  green: 'var(--color-line)',
  yellow: 'color-mix(in srgb, var(--color-warn) 30%, var(--color-line))',
  fire: 'color-mix(in srgb, var(--color-warn) 55%, var(--color-line))',
  red: 'color-mix(in srgb, var(--color-danger) 40%, var(--color-line))',
};

/** Placar da semana: uma placa por treino da meta; cada check-in acende uma. */
export function ProgressRing({ done, goal, level }: { done: number; goal: number; level: RiskLevel }) {
  const step = 360 / goal;
  const gap = goal > 1 ? GAP_DEG : 0;
  return (
    <div role="img" aria-label={`${done} de ${goal} treinos`} className="relative mx-auto aspect-square w-full max-w-[17rem]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full" aria-hidden="true">
        {goal === 1 ? (
          <circle cx={C} cy={C} r={R} fill="none" strokeWidth={STROKE}
            stroke={done >= 1 ? 'var(--color-accent)' : EMPTY_STROKE[level]} />
        ) : (
          Array.from({ length: goal }, (_, i) => (
            <path
              key={i}
              d={arc(i * step + gap / 2, (i + 1) * step - gap / 2)}
              fill="none"
              strokeWidth={STROKE}
              stroke={i < done ? 'var(--color-accent)' : EMPTY_STROKE[level]}
              className="transition-[stroke] duration-500"
            />
          ))
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <p className="font-display leading-none tabular">
          <span className="text-[6.5rem] text-fg">{done}</span>
          <span className="text-5xl text-muted">/{goal}</span>
        </p>
        <p className="mt-1 font-head text-lg text-muted">treinos na semana</p>
      </div>
    </div>
  );
}
