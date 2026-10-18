import type { ReactNode } from 'react';

/** Ícones em SVG embutido (traço 2px), no lugar da fonte Material Symbols: funcionam offline e pesam quase nada. */
const PATHS: Record<string, ReactNode> = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  more: <><circle cx="12" cy="5.5" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="18.5" r="1.4" /></>,
  fire: <path d="M12 3c.4 2.8-1 4.4-2.4 6C8.2 10.6 7 12.2 7 14.5a5 5 0 0 0 10 0c0-2-.9-3.5-2-4.7-.3 1.2-.9 2.1-1.8 2.5.4-3.1-.4-6.6-1.2-9.3Z" />,
  bolt: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3Z" />,
  dumbbell: <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  trend: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  circle: <circle cx="12" cy="12" r="7.5" />,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {PATHS[name]}
    </svg>
  );
}
