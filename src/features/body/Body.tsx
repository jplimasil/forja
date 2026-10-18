import { useState, type FormEvent } from 'react';
import { MEASUREMENT_LABELS, MEASUREMENTS, useAddBodyEntry, useBodyEntries, type Measurement } from '../../data/body';
import { useWeekState } from '../../data/useWeekState';
import { Button } from '../../ui/Button';
import { PageTitle } from '../../ui/Card';
import { LineChartCard } from '../../ui/LineChartCard';
import { inputClass } from '../onboarding/fields';

const EMPTY = { peso: '', cintura: '', quadril: '', peito: '', braco: '', coxa: '' };
type Fields = typeof EMPTY;

/** "80,5" → 80.5; vazio ou inválido → null. */
function parse(s: string): number | null {
  const n = Number(s.trim().replace(',', '.'));
  return s.trim() && Number.isFinite(n) && n > 0 ? n : null;
}

export function Body() {
  const state = useWeekState();
  const entries = useBodyEntries().data ?? [];
  const add = useAddBodyEntry();
  const [f, setF] = useState<Fields>(EMPTY);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!state) return;
    const measurements: Partial<Record<Measurement, number>> = {};
    for (const m of MEASUREMENTS) {
      const v = parse(f[m]);
      if (v !== null) measurements[m] = v;
    }
    const weightKg = parse(f.peso);
    if (weightKg === null && Object.keys(measurements).length === 0) return;
    add.mutate({ date: state.now.date, weightKg, measurements }, { onSuccess: () => setF(EMPTY) });
  }

  const field = (key: keyof Fields, label: string) => (
    <label key={key} className="block space-y-1.5">
      <span className="text-sm text-muted">{label}</span>
      <input className={`${inputClass} tabular`} inputMode="decimal" value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
    </label>
  );

  const weightSeries = entries.filter((e) => e.weightKg !== null).map((e) => ({ x: e.date, y: e.weightKg! }));

  return (
    <div className="space-y-10">
      <PageTitle sub="Uma vez por semana, no mesmo horário, já basta para ver a tendência.">Corpo</PageTitle>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {field('peso', 'Peso (kg)')}
          {MEASUREMENTS.map((m) => field(m, `${MEASUREMENT_LABELS[m]} (cm)`))}
        </div>
        <Button type="submit">Salvar medidas</Button>
      </form>

      {entries.length === 0 ? (
        <p className="text-muted">Seus registros aparecem aqui como gráficos. Comece pelo peso de hoje.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {weightSeries.length > 0 && <LineChartCard title="Peso" unit="kg" data={weightSeries} />}
          {MEASUREMENTS.map((m) => {
            const data = entries.filter((e) => e.measurements[m] !== undefined).map((e) => ({ x: e.date, y: e.measurements[m]! }));
            return data.length ? <LineChartCard key={m} title={MEASUREMENT_LABELS[m]} unit="cm" data={data} /> : null;
          })}
        </div>
      )}
    </div>
  );
}
