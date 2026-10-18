# Aba Treino "Kinetic Stealth" — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aba Treino com grupos musculares do dia, fichas, tabela de séries (carga, reps, RPE, ✓), tonelagem, PR e evolução, no visual Kinetic Stealth.

**Architecture:** O check-in do dia é a sessão (ganha ficha e músculos). Séries ganham `rpe`/`done` e podem ser planejadas sem carga. Fichas em tabelas novas com RLS. Cálculos em `src/features/workout/stats.ts` (puros). Registro do dia e edição de séries passam pela fila offline existente (`registerMutationDefaults`, mesmo `scope`). Visual novo via tokens `k-*` usados só em Treino/Fichas.

**Tech Stack:** a do app (React 19, Vite 6, Tailwind 4, TanStack Query 5, Supabase, Vitest) + Fontsource Bebas Neue, Montserrat, JetBrains Mono.

**Spec:** `docs/superpowers/specs/2026-10-18-treino-kinetic-design.md`

## Global Constraints

- Branch `feat/treino-kinetic`. Nada vai para `main` (deploy de produção) sem o usuário pedir.
- Regras de semana/streak/multa/notificação não mudam: continuam contando check-ins.
- Chaves de grupo: `peito, costas, ombros, biceps, triceps, quadriceps, posterior, gluteos, panturrilha, abdomen` (rótulos: Peito, Costas, Ombros, Bíceps, Tríceps, Quadríceps, Posterior, Glúteos, Panturrilha, Abdômen). Tipo: `composto | isolador`.
- RPE: 1–10 em passos de 0,5. Série `done` exige carga e reps.
- Tokens visuais (só em Treino e Fichas): base `#0B0D0F`, `k-1 #121519`, `k-2 #181C22`, `k-3 #20252E`, `k-line #242A35`, `k-lime #CCFF00`, `k-text #FFFFFF`, `k-muted #9BA3AF`, `k-dim #525C6A`, `k-danger #FF3344`; fontes Bebas Neue / Montserrat / JetBrains Mono (latin, Fontsource); raio 4px; pílula só para chips de status; ícones SVG embutidos; linhas de série ≥ 48px de altura.
- Nenhum dado decorativo (bpm, "telemetria", "encriptado").
- Copy em pt-BR; concordância no singular ("1 série").

## Review Focus

1. **Registro offline do treino com ficha:** check-in + N séries planejadas enfileirados sem sinal precisam subir em ordem e aparecer na hora (otimista). Teste na Task 3.
2. **Marcar ✓ sem carga/reps:** não pode gravar `done` inválido; abre edição. Teste na Task 5; check no banco na Task 2.
3. **Exercício sem grupo (dados antigos):** volume e cartões não podem quebrar; aparece "Sem grupo". Teste na Task 1 e Task 6.
4. **Ficha apagada depois de usada:** check-ins antigos com `routine_id` apagado viram treino livre (on delete set null), sem quebrar a comparação de tonelagem. Teste na Task 1 (`previousSessionDate` com ficha inexistente).
5. **Editar séries de outro usuário / ficha de outro usuário no check-in:** bloqueado no banco. Teste SQL na Task 2.

---

### Task 1: Cálculos do treino (`stats.ts`) e grupos musculares

**Files:**
- Create: `src/features/workout/muscles.ts`, `src/features/workout/stats.ts`
- Test: `src/features/workout/stats.test.ts`
- Delete: `src/features/workout/progress.ts`, `src/features/workout/progress.test.ts` (substituídos)

**Interfaces:**
- Produces (`muscles.ts`): `type MuscleGroup = 'peito' | … | 'abdomen'`, `type ExerciseKind = 'composto' | 'isolador'`, `MUSCLE_GROUPS: { key: MuscleGroup; label: string }[]` (ordem da Global Constraints), `muscleLabel(g: MuscleGroup | null): string` (null → "Sem grupo").
- Produces (`stats.ts`), usando `WorkoutSet` da Task 3 (definir o tipo já aqui em `src/data/workout.ts` se ainda não existir com os campos novos):
  ```ts
  interface WorkoutSet { id: string; date: ISODate; exercise: string; muscleGroup: MuscleGroup | null; kind: ExerciseKind | null;
    setNumber: number; reps: number | null; weightKg: number | null; rpe: number | null; done: boolean }
  interface DayDetail { routineId: string | null; muscles: MuscleGroup[] }
  interface RoutineExercise { id: string; exerciseId: string; name: string; muscleGroup: MuscleGroup | null; kind: ExerciseKind | null; position: number; targetSets: number }
  interface Routine { id: string; name: string; position: number; exercises: RoutineExercise[] }
  epley(weightKg: number, reps: number): number
  tonnage(sets: WorkoutSet[], date: ISODate): number
  previousSessionDate(p: { sets: WorkoutSet[]; details: Record<ISODate, DayDetail>; date: ISODate; routineId: string | null }): ISODate | null
  tonnageDelta(today: number, previous: number | null): number | null   // fração; null se sem anterior ou anterior 0
  dayProgress(sets: WorkoutSet[], date: ISODate): { setsDone: number; setsTotal: number; exercisesDone: number; exercisesTotal: number }
  dayPRs(sets: WorkoutSet[], date: ISODate): Set<string>                 // ids de série com selo PR
  weeklyBest1Rm(sets: WorkoutSet[], exercise: string, today: ISODate, weeks?: number): { weekStart: ISODate; value: number }[]
  weekVolumeByGroup(sets: WorkoutSet[], weekStart: ISODate): { group: MuscleGroup | null; sets: number }[]   // desc por sets
  planRoutineSets(p: { routine: Routine; sets: WorkoutSet[]; date: ISODate }): Omit<WorkoutSet, 'id'>[]
  ```

- [ ] **Step 1: Write the failing tests** (`stats.test.ts`; helper `s(id, date, exercise, setNumber, weightKg, reps, done = true, group = 'peito')`)

```ts
it('epley: 1 rep = carga; 100kg x 10 ≈ 133,3', () => {
  expect(epley(100, 1)).toBe(100);
  expect(epley(100, 10)).toBeCloseTo(133.33, 1);
});
it('tonelagem soma só séries concluídas do dia', () => {
  const sets = [s('a', D, 'Supino', 1, 80, 10), s('b', D, 'Supino', 2, 90, 8, false), s('c', '2026-10-10', 'Supino', 1, 50, 10)];
  expect(tonnage(sets, D)).toBe(800);
});
it('sessão anterior: mesma ficha; treino livre pega qualquer; ficha apagada vira livre', () => {
  const details = { '2026-10-08': { routineId: 'A', muscles: [] }, '2026-10-10': { routineId: 'B', muscles: [] } };
  const sets = [s('x', '2026-10-08', 'Supino', 1, 80, 10), s('y', '2026-10-10', 'Remada', 1, 60, 10)];
  expect(previousSessionDate({ sets, details, date: D, routineId: 'A' })).toBe('2026-10-08');
  expect(previousSessionDate({ sets, details, date: D, routineId: null })).toBe('2026-10-10');
  expect(previousSessionDate({ sets, details, date: D, routineId: 'apagada' })).toBe('2026-10-10');
});
it('tonnageDelta', () => {
  expect(tonnageDelta(1120, 1000)).toBeCloseTo(0.12);
  expect(tonnageDelta(500, null)).toBeNull();
  expect(tonnageDelta(500, 0)).toBeNull();
});
it('dayProgress conta séries e exercícios concluídos', () => {
  const sets = [s('a', D, 'Supino', 1, 80, 10), s('b', D, 'Supino', 2, 80, 10), s('c', D, 'Rosca', 1, 30, 12), s('d', D, 'Rosca', 2, null, null, false)];
  expect(dayProgress(sets, D)).toEqual({ setsDone: 3, setsTotal: 4, exercisesDone: 1, exercisesTotal: 2 });
});
it('PR: só a melhor série do dia, só se superar o histórico; primeira sessão não conta', () => {
  const hist = [s('h', '2026-10-08', 'Supino', 1, 100, 6)];                       // e1RM 120
  const day = [s('p1', D, 'Supino', 1, 100, 8), s('p2', D, 'Supino', 2, 100, 7), s('r1', D, 'Rosca', 1, 40, 10)];
  expect([...dayPRs([...hist, ...day], D)]).toEqual(['p1']);
});
it('1RM semanal: melhor da semana, 6 semanas, omite vazias', () => {
  const sets = [s('a', '2026-08-31', 'Supino', 1, 100, 1), s('b', '2026-10-06', 'Supino', 1, 100, 5), s('c', '2026-10-07', 'Supino', 1, 105, 3), s('d', D, 'Supino', 1, 90, 10, false)];
  expect(weeklyBest1Rm(sets, 'supino', D)).toEqual([{ weekStart: '2026-10-05', value: expect.closeTo(116.67, 1) }]);
});
it('volume por grupo na semana; exercício sem grupo vira null', () => {
  const sets = [s('a', D, 'Supino', 1, 80, 10), s('b', D, 'Supino', 2, 80, 10), s('c', D, 'Prancha', 1, 0, 30, true, null), s('d', D, 'Supino', 3, 80, 10, false)];
  expect(weekVolumeByGroup(sets, '2026-10-12')).toEqual([{ group: 'peito', sets: 2 }, { group: null, sets: 1 }]);
});
it('ficha pré-preenche pela última sessão; sem histórico fica vazio; menos séries repete a última', () => {
  const routine = { id: 'A', name: 'Treino A', position: 0, exercises: [
    { id: 're1', exerciseId: 'e1', name: 'Supino', muscleGroup: 'peito', kind: 'composto', position: 0, targetSets: 3 },
    { id: 're2', exerciseId: 'e2', name: 'Crucifixo', muscleGroup: 'peito', kind: 'isolador', position: 1, targetSets: 1 },
  ] } as Routine;
  const sets = [s('a', '2026-10-08', 'Supino', 1, 80, 10), s('b', '2026-10-08', 'Supino', 2, 85, 8)];
  expect(planRoutineSets({ routine, sets, date: D }).map((x) => [x.exercise, x.setNumber, x.weightKg, x.reps, x.done])).toEqual([
    ['Supino', 1, 80, 10, false], ['Supino', 2, 85, 8, false], ['Supino', 3, 85, 8, false], ['Crucifixo', 1, null, null, false],
  ]);
});
```
(`D = '2026-10-15'`, quinta.)

- [ ] **Step 2: Run** `npx vitest run src/features/workout/stats.test.ts` — Expected: FAIL (módulo inexistente).
- [ ] **Step 3: Implement** `muscles.ts` e `stats.ts`. Nome de exercício comparado sem diferenciar maiúsculas. Semana via `weekStartOf` de `@rules/dates.ts`.
- [ ] **Step 4: Run** — Expected: PASS. Apagar `progress.ts`/`progress.test.ts`; `npx vitest run && npx tsc -b` verdes (ajustar imports em `Workout.tsx` temporariamente se necessário — Workout é reescrito na Task 5).
- [ ] **Step 5: Commit** — `feat(treino): cálculos de tonelagem, PR, 1RM, volume e pré-preenchimento de ficha`

---

### Task 2: Banco — fichas, músculos, RPE e séries planejadas

**Files:**
- Create: `supabase/migrations/20261018000005_treino.sql`, `supabase/tests/treino.sql`

**Interfaces:**
- Produces: colunas/tabelas da spec §3; `do_checkin(p_date date, p_routine_id uuid default null, p_muscles text[] default null)`; `add_set(p_id uuid, p_date date, p_exercise_name text, p_set_number int, p_reps int, p_weight_kg numeric, p_rpe numeric default null, p_done boolean default true, p_muscle_group text default null, p_kind text default null)`; política `own_update` em `workout_sets` + `grant update (reps, weight_kg, rpe, done)`; `exercises` segue `own_all`.

- [ ] **Step 1: Write the failing SQL test** (`supabase/tests/treino.sql`, mesmo padrão de `anti_trapaca.sql`: usuário de teste, `set local role authenticated`, blocos `do $$` que levantam `FALHOU: …`, `select 'OK'`, `rollback`). Casos: (a) `do_checkin(hoje, ficha_propria, '{peito,biceps}')` grava ficha e músculos; chamar de novo com `p_muscles='{costas}'` e ficha nula atualiza só músculos; (b) ficha de outro usuário → erro `ficha_invalida`; (c) músculo inválido `'{braco}'` → erro (check); (d) `add_set(..., p_reps => null, p_weight_kg => null, p_done => false)` aceito; (e) `update workout_sets set done = true` numa série sem carga → erro (check); (f) update de série de outro usuário afeta 0 linhas.
- [ ] **Step 2: Run** `npx supabase db query --linked -f supabase/tests/treino.sql` — Expected: erro (colunas/funções inexistentes).
- [ ] **Step 3: Write migration.** `drop function do_checkin(date)` e `add_set(uuid,date,text,int,int,numeric)` antes de recriar (evita sobrecarga ambígua); mesma janela/erros da versão atual; `security definer`, `set search_path = public, pg_temp`; revoke de `public, anon`, grant a `authenticated`. Séries existentes: `update workout_sets set done = true`. Constraint: `check (not done or (reps is not null and weight_kg is not null))`; `check (rpe is null or (rpe between 1 and 10 and rpe * 2 = floor(rpe * 2)))`; grupos: `check (muscle_groups <@ array[...10 chaves...])` e em `exercises.muscle_group in (...)`.
- [ ] **Step 4: Apply** `npx supabase db push --yes`; **Run** o teste SQL e `supabase/tests/anti_trapaca.sql` — Expected: ambos `OK`; `select count(*) from auth.users where email like 'teste-%'` = 0.
- [ ] **Step 5: Commit** — `feat(db): fichas, músculos do dia, RPE e séries planejadas`

---

### Task 3: Camada de dados do treino

**Files:**
- Modify: `src/data/workout.ts`, `src/data/checkins.ts`
- Create: `src/data/routines.ts`
- Test: `src/data/treino.test.tsx`

**Interfaces:**
- Consumes: Task 1 tipos; Task 2 RPCs; `registerMutationDefaults`, `fetchAll`, `notifyError`.
- Produces:
  ```ts
  // workout.ts
  useSets(): UseQueryResult<WorkoutSet[]>                // select inclui rpe, done, exercises(name, muscle_group, kind)
  useExercises(): UseQueryResult<{ id: string; name: string; muscleGroup: MuscleGroup | null; kind: ExerciseKind | null }[]>
  useAddSet(): UseMutationResult<void, Error, WorkoutSet>          // key ['addSet']; passa rpe, done, muscleGroup, kind
  useUpdateSet(): UseMutationResult<void, Error, { id: string } & Partial<Pick<WorkoutSet, 'reps' | 'weightKg' | 'rpe' | 'done'>>>  // key ['updateSet'], otimista
  useUpdateExercise(): UseMutationResult<void, Error, { name: string; muscleGroup: MuscleGroup | null; kind: ExerciseKind | null }>
  useRemoveExerciseDay(): UseMutationResult<void, Error, string[]>  // ids das séries
  // checkins.ts
  useCheckinDetails(): UseQueryResult<Record<ISODate, DayDetail>>   // key ['checkinDetails']
  useRegisterDay(): UseMutationResult<void, Error, { date: ISODate; routineId: string | null; muscles: MuscleGroup[] }>  // key ['registerDay'], rpc do_checkin com params; otimista em ['checkins'] e ['checkinDetails']
  // routines.ts (online, sem fila)
  useRoutines(): UseQueryResult<Routine[]>
  useSaveRoutine(), useDeleteRoutine(), useAddRoutineExercise(), useUpdateRoutineExercise(), useRemoveRoutineExercise()
  ```
  `useAddRoutineExercise` recebe `{ routineId, name, muscleGroup, kind, targetSets }`: cria o exercício se não existir (insert com `on conflict` por nome via select-then-insert), depois insere em `routine_exercises` na última posição.

- [ ] **Step 1: Write the failing tests** (`treino.test.tsx`, mesmo setup de `queue.test.tsx`): (a) offline: `useRegisterDay().mutate({date, routineId:'A', muscles:['peito']})` + dois `useAddSet().mutate(...done:false)` → caches mostram o dia e as 2 séries na hora; ao reconectar, `do_checkin` é chamado com `{ p_date, p_routine_id: 'A', p_muscles: ['peito'] }` e só depois os `add_set`; (b) `useUpdateSet().mutate({ id:'s1', done:true })` atualiza o cache na hora e chama `update` em `workout_sets`; erro do servidor reverte e mostra toast.
- [ ] **Step 2: Run** `npx vitest run src/data/treino.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement.** Registrar `registerDay` e `updateSet` com `registerMutationDefaults` (entram na fila ordenada e na persistência).
- [ ] **Step 4: Run** `npx vitest run && npx tsc -b` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(data): registro do dia com ficha e músculos, edição de séries e fichas`

---

### Task 4: Tema Kinetic e componentes base

**Files:**
- Modify: `src/index.css` (tokens `k-*` em `@theme`, fontes)
- Create: `src/features/workout/kinetic/Icon.tsx`, `src/features/workout/kinetic/ui.tsx` (`KCard`, `KButton` primary/ghost/danger, `KChip`, `KLabel`, `StatTile`)
- Test: `src/features/workout/kinetic/ui.test.tsx`

**Interfaces:**
- Produces: utilitários Tailwind `bg-k-base`, `bg-k-1..3`, `border-k-line`, `text-k-lime`, `text-k-muted`, `text-k-dim`, `font-k-display`, `font-k-body`, `font-k-mono`, `rounded-k`; `<Icon name="check|plus|more|fire|bolt|chart|dumbbell|trash|up|down|edit" />`; `<StatTile label value unit delta? />` (delta fração → "+12% vs. anterior"/"−5% vs. anterior").
- [ ] **Step 1: Invocar `frontend-design:frontend-design`** e aplicar `DESIGN.md` (seção 6 da spec).
- [ ] **Step 2: Failing test:** `StatTile` com `delta=0.12` mostra "+12% vs. anterior"; `delta=null` não mostra variação; `KButton variant="primary"` renderiza `button` com texto.
- [ ] **Step 3: Run** — FAIL. **Step 4: Implement** (instalar `@fontsource/bebas-neue`, `@fontsource/montserrat`, `@fontsource/jetbrains-mono`; importar só `latin-*`). **Step 5: Run** — PASS.
- [ ] **Step 6: Commit** — `feat(ui): tokens e componentes Kinetic Stealth para a aba Treino`

---

### Task 5: Aba Treino — registro do dia e tabela de séries

**Files:**
- Rewrite: `src/features/workout/Workout.tsx`
- Create: `src/features/workout/MuscleTags.tsx`, `src/features/workout/RoutinePicker.tsx`, `src/features/workout/ExerciseCard.tsx`, `src/features/workout/SetRow.tsx`, `src/features/workout/AddExercise.tsx`
- Test: `src/features/workout/Workout.test.tsx`, `src/features/workout/SetRow.test.tsx`

**Interfaces:**
- Consumes: Tasks 1, 3, 4; `useWeekState` (data de hoje, streak, checkedInToday).
- [ ] **Step 1: Invocar `frontend-design:frontend-design`.**
- [ ] **Step 2: Failing tests** (hooks mockados):
  - sem registro hoje: mostra "Qual foi o treino de hoje?", fichas e "Treino livre"; escolher "Treino A" marca as tags Peito e Bíceps; **REGISTRAR TREINO** chama `registerDay.mutate({ date: hoje, routineId: 'A', muscles: ['peito','biceps'] })` e `addSet.mutate` para cada série de `planRoutineSets` (com `id` gerado e `done:false`);
  - registrado: mostra `TREINO REGISTRADO // TREINO A`, "Tonelagem hoje" com `800` e "+12% vs. anterior", "Séries concluídas" `3/4`, "Exercícios programados 1/2";
  - check-in feito pelo Início sem ficha: cartão de registro aparece com texto "Check-in feito. Complete o treino de hoje.";
  - `SetRow`: tocar ✓ numa série com carga e reps chama `updateSet({ id, done: true })`; numa série sem carga abre os campos de edição e **não** chama `updateSet`; série com PR mostra o selo "PR"; editar carga para `82,5` chama `updateSet({ id, weightKg: 82.5 })`.
- [ ] **Step 3: Run** — FAIL. **Step 4: Implement.** Cabeçalho com rótulo de status em mono e chip do streak (`N SEM`). Tags editáveis depois do registro chamam `registerDay` com `routineId: null` (mantém a ficha) e os novos músculos. "+ Adicionar série" copia carga/reps da última série do exercício no dia. Menu ⋮: "Editar grupo e tipo" (useUpdateExercise) e "Remover do treino de hoje" (useRemoveExerciseDay). **Step 5: Run** `npx vitest run && npx tsc -b` — PASS.
- [ ] **Step 6: Commit** — `feat(treino): registro do dia com ficha e músculos, tabela de séries com RPE e PR`

---

### Task 6: Evolução — 1RM e volume por grupo

**Files:**
- Create: `src/features/workout/OneRmChart.tsx`, `src/features/workout/MuscleVolumeBars.tsx`
- Modify: `src/features/workout/Workout.tsx` (seção Evolução)
- Test: `src/features/workout/MuscleVolumeBars.test.tsx`

- [ ] **Step 1: Invocar `dataviz`** (linha única no verde `#CCFF00` sobre `#121519`; barras horizontais com rótulo direto; tabela opcional).
- [ ] **Step 2: Failing test:** `MuscleVolumeBars` com `[{group:'peito',sets:6},{group:null,sets:1}]` mostra "Peito" "6 séries" e "Sem grupo" "1 série"; lista vazia mostra "Nenhuma série concluída nesta semana.".
- [ ] **Step 3: Run** — FAIL. **Step 4: Implement** (`OneRmChart` usa Recharts como `LineChartCard`, com seletor de exercício, título "1RM estimado", unidade kg, tooltip e tabela). **Step 5: Run** — PASS.
- [ ] **Step 6: Commit** — `feat(treino): gráficos de 1RM estimado e volume por grupo`

---

### Task 7: Minhas fichas

**Files:**
- Create: `src/features/workout/Routines.tsx`
- Modify: `src/App.tsx` (rota `treino/fichas`), `src/features/workout/Workout.tsx` (botão "Minhas fichas")
- Test: `src/features/workout/Routines.test.tsx`

- [ ] **Step 1: Failing test** (hooks mockados): criar ficha "Treino A" chama `saveRoutine({ name: 'Treino A' })`; adicionar "Supino reto" (grupo Peito, composto, 4 séries) chama `addRoutineExercise({ routineId, name: 'Supino reto', muscleGroup: 'peito', kind: 'composto', targetSets: 4 })`; botão ↓ no primeiro exercício chama `updateRoutineExercise` trocando as posições; nome vazio não salva.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (visual Kinetic). **Step 4: Run** `npx vitest run && npx tsc -b` — PASS.
- [ ] **Step 5: Commit** — `feat(treino): tela de fichas`

---

### Task 8: Verificação visual e revisão

- [ ] **Step 1:** Prévia temporária (fora do git, como na entrega anterior) com dados de exemplo; capturas 390px (antes e depois do registro, fichas) e 1280px. Corrigir o que destoar do `DESIGN.md`; cada correção de comportamento com teste antes.
- [ ] **Step 2:** `npm run build` (sem erros) e `npx vitest run` verdes; rodar os dois testes SQL.
- [ ] **Step 3:** Commit final; não fazer merge nem push para `main` sem o usuário pedir.
