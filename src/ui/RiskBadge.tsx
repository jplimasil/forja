import type { RiskLevel } from '@rules/types.ts';

export const RISK_LABELS: Record<RiskLevel, string> = {
  met: 'Meta batida',
  green: 'Tranquilo',
  yellow: 'Apertado',
  fire: 'Decisivo',
  red: 'Meta perdida',
};

const STYLES: Record<RiskLevel, string> = {
  met: 'bg-accent text-bg',
  green: 'bg-raised text-fg',
  yellow: 'bg-warn/15 text-warn',
  fire: 'bg-warn text-bg animate-pulse-fire',
  red: 'bg-danger/15 text-danger',
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 font-head text-base font-semibold ${STYLES[level]}`}>
      {RISK_LABELS[level]}
    </span>
  );
}
