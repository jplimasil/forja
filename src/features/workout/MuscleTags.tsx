import { MUSCLE_GROUPS, type MuscleGroup } from './muscles';
import { Icon } from './kinetic/Icon';
import { KChip } from './kinetic/ui';

export function MuscleTags({ value, onChange }: { value: MuscleGroup[]; onChange: (v: MuscleGroup[]) => void }) {
  function toggle(g: MuscleGroup) {
    const next = value.includes(g) ? value.filter((x) => x !== g) : [...value, g];
    // mantém a ordem canônica da lista, para o banco e a tela verem a mesma sequência
    onChange(MUSCLE_GROUPS.map((m) => m.key).filter((k) => next.includes(k)));
  }
  return (
    <div role="group" aria-label="Grupos musculares do dia" className="flex flex-wrap gap-1.5">
      {MUSCLE_GROUPS.map((m) => (
        <KChip key={m.key} selected={value.includes(m.key)} onClick={() => toggle(m.key)}>
          {value.includes(m.key) && <Icon name="check" size={13} />}
          {m.label}
        </KChip>
      ))}
    </div>
  );
}
