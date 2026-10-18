import type { CSSProperties } from 'react';

const PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const dist = 70 + (i % 3) * 28;
  return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist * 0.6, size: 6 + (i % 4) * 2 };
});

/** Explosão de partículas ao registrar o treino. Remonte (mude a `key`) para disparar de novo. */
export function CheckinBurst() {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-sm bg-accent animate-burst"
          style={{ width: p.size, height: p.size, '--dx': `${p.dx}px`, '--dy': `${p.dy}px` } as CSSProperties}
        />
      ))}
    </span>
  );
}
