# FORJA — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA pessoal de constância na academia (meta semanal, streak, multa, notificações push que endurecem com o risco, registro de cargas e medidas), sincronizado entre celular e PC.

**Architecture:** Front React/Vite (PWA) fala direto com o Supabase (Auth + Postgres com RLS + RPCs). Toda regra de negócio vive em funções puras TypeScript sem dependências em `supabase/functions/_shared/rules/`, importadas pelo front (alias `@rules`) e pela Edge Function `tick`, que roda a cada hora via `pg_cron` para fechar semanas e enviar push. A Edge Function só faz IO; o que fazer é decidido por `planUserTick` (puro e testado).

**Tech Stack:** Node ≥ 20, Vite 6, React 19, TypeScript 5, Tailwind CSS 4 (`@tailwindcss/vite`), React Router 7, TanStack Query 5 (+ `@tanstack/query-sync-storage-persister`, `@tanstack/react-query-persist-client`), Recharts 2, `vite-plugin-pwa` (estratégia `injectManifest`), Fontsource (Anton, Barlow Condensed, Inter), `@supabase/supabase-js` 2, Vitest 3 + Testing Library + jsdom, Supabase CLI (`npx supabase`), `npm:web-push@3.6.7` na Edge Function.

**Spec:** `docs/superpowers/specs/2026-10-18-app-constancia-academia-design.md`

## Global Constraints

- Regras puras em `supabase/functions/_shared/rules/` (desvio consciente do `shared/` do spec: a Edge Function só empacota arquivos dentro de `supabase/functions/`). Zero dependências npm nesses arquivos; imports relativos **com extensão `.ts`** (exigência do Deno). Fuso calculado com `Intl.DateTimeFormat`.
- Datas de calendário trafegam como `ISODate` = string `'YYYY-MM-DD'`. Semana = segunda a domingo; identificada pela segunda.
- Fuso padrão `America/Sao_Paulo`. Janela permitida para push: horas locais 7 a 21 inclusive (silêncio 22h–7h).
- Fechamento da semana: segunda às 10:00 locais.
- Check-in: hoje, ou ontem se ontem não pertence a semana já fechada (ou seja, ontem é domingo só até segunda 09:59). Desfazer: só a data de hoje.
- Meta 1–7; mudança vale a partir da próxima segunda. Congelamento: 1 por mês civil do `week_start`, só se a semana atual não estiver `met`.
- Semana de criação da conta = aquecimento (sem status, streak ou multa).
- Dinheiro exibido como `R$10` (inteiro) ou `R$12,50` (decimal), sem espaço.
- Cores: fundo `#0A0A0B`, cartão `#16161A`, texto `#F5F5F5`, secundário `#8A8A93`, destaque `#C6FF3D`, laranja `#FF6B2C`, vermelho `#FF3B3B`. Tema só escuro. Fontes: Anton (números), Barlow Condensed (títulos/rótulos caixa alta), Inter (texto).
- Toda a interface em português do Brasil.
- Segredos nunca entram no git: `.env.local` no `.gitignore`; chaves privadas só em `supabase secrets` e Vault.
- Tarefas de UI (6, 8–14) devem invocar o skill `frontend-design:frontend-design` antes de escrever componentes visuais.

## Review Focus

1. **Virada de dia no fuso:** check-in às 23:30 de domingo em São Paulo (02:30 UTC de segunda) deve contar para domingo — tanto no app quanto na RPC. Teste em Task 1 (`localNow`) e verificação SQL em Task 5.
2. **Check-in offline sincronizado tarde demais:** fila reenviada depois de segunda 10h deve ser recusada com mensagem visível, não sumir em silêncio. Teste de regra em Task 3; tratamento de erro + teste em Task 7.
3. **Mudança de meta no meio da semana** não pode alterar a semana atual (nem para escapar da multa). Teste em Task 2 (`goalForWeek`).
4. **Execução dupla / toque duplo:** cron rodando duas vezes ou dois toques no botão não podem duplicar semana, multa, check-in ou notificação. Teste em Task 4 (`planUserTick` com semana já fechada) e constraints/`on conflict` em Task 5.
5. **Tela aberta atravessando a meia-noite:** "hoje" no Início deve virar sem recarregar. `useWeekState` recalcula `now` a cada 60 s; teste em Task 7.

---

## Estrutura de arquivos

```
package.json  vite.config.ts  tsconfig.json  index.html  vercel.json  .env.example  .gitignore
supabase/
  config.toml
  migrations/20261018000001_schema.sql      tabelas, RLS, grants
  migrations/20261018000002_rpc.sql         do_checkin, undo_checkin, add_set
  migrations/20261018000003_cron.sql        pg_cron + pg_net chamando tick
  functions/_shared/rules/                  regras puras (+ *.test.ts)
    types.ts dates.ts week.ts checkin.ts freeze.ts notifications.ts messages.ts money.ts tick.ts
  functions/tick/index.ts  functions/tick/push.ts
src/
  main.tsx  App.tsx  sw.ts  index.css
  lib/        supabase.ts auth.ts queryClient.ts push.ts
  data/       settings.ts goals.ts checkins.ts weeks.ts freezes.ts workout.ts body.ts useWeekState.ts
  ui/         AppShell.tsx Card.tsx Button.tsx ProgressRing.tsx RiskBadge.tsx StreakFlame.tsx
              CheckinBurst.tsx LineChartCard.tsx Toast.tsx PendingSyncBadge.tsx
  features/   auth/AuthScreen.tsx onboarding/Onboarding.tsx home/Home.tsx sos/Sos.tsx
              workout/Workout.tsx body/Body.tsx history/History.tsx settings/Settings.tsx
public/       icon.svg (+ ícones gerados)
```

---

### Task 1: Projeto, ferramentas de teste e datas no fuso

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `.env.example`, `src/main.tsx` (placeholder "FORJA"), `src/test-setup.ts`
- Create: `supabase/functions/_shared/rules/types.ts`, `supabase/functions/_shared/rules/dates.ts`
- Test: `supabase/functions/_shared/rules/dates.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type ISODate = string;
  export type Intensity = 'leve' | 'normal' | 'insistente';
  export type RiskLevel = 'met' | 'green' | 'yellow' | 'fire' | 'red';
  export type WeekStatus = 'met' | 'failed' | 'frozen';
  export interface LocalNow { date: ISODate; hour: number; weekday: number } // weekday 1=seg … 7=dom
  export interface GoalEntry { effectiveWeekStart: ISODate; weeklyGoal: number }
  export interface ClosedWeek { weekStart: ISODate; goal: number; done: number; status: WeekStatus; penaltyAmount: number; penaltyPaidAt: string | null }
  ```
- Produces (`dates.ts`): `localNow(instant: Date, timeZone: string): LocalNow`, `addDays(d: ISODate, n: number): ISODate`, `weekdayOf(d: ISODate): number`, `weekStartOf(d: ISODate): ISODate`, `monthOf(d: ISODate): string` (`'YYYY-MM'`).
- Produces: alias Vite/TS `@rules` → `supabase/functions/_shared/rules`; scripts `npm run dev`, `npm test` (vitest run), `npm run build`.

- [ ] **Step 1: Scaffold** — `npm create vite@latest . -- --template react-ts`, depois instalar as dependências do Tech Stack. `tsconfig`: `allowImportingTsExtensions: true`, `noEmit: true`, path `@rules/*`. Vitest: `environment: 'jsdom'`, `setupFiles: ['src/test-setup.ts']` (importa `@testing-library/jest-dom/vitest`), `include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/_shared/**/*.test.ts']`. `.gitignore` inclui `node_modules`, `dist`, `.env.local`, `supabase/.temp`. `.env.example` com `VITE_SUPABASE_URL=`, `VITE_SUPABASE_ANON_KEY=`, `VITE_VAPID_PUBLIC_KEY=`.

- [ ] **Step 2: Write the failing test** (`dates.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { localNow, addDays, weekdayOf, weekStartOf, monthOf } from './dates.ts';

describe('localNow', () => {
  it('domingo 23:30 em SP mesmo sendo segunda em UTC', () => {
    expect(localNow(new Date('2026-10-19T02:30:00Z'), 'America/Sao_Paulo'))
      .toEqual({ date: '2026-10-18', hour: 23, weekday: 7 });
  });
  it('segunda 10h em SP', () => {
    expect(localNow(new Date('2026-10-19T13:00:00Z'), 'America/Sao_Paulo'))
      .toEqual({ date: '2026-10-19', hour: 10, weekday: 1 });
  });
  it('meia-noite vira hora 0, não 24', () => {
    expect(localNow(new Date('2026-10-19T03:00:00Z'), 'America/Sao_Paulo').hour).toBe(0);
  });
});

describe('aritmética de datas', () => {
  it('addDays cruza mês', () => expect(addDays('2026-10-31', 1)).toBe('2026-11-01'));
  it('addDays negativo', () => expect(addDays('2026-10-19', -1)).toBe('2026-10-18'));
  it('weekdayOf domingo = 7', () => expect(weekdayOf('2026-10-18')).toBe(7));
  it('weekStartOf domingo → segunda anterior', () => expect(weekStartOf('2026-10-18')).toBe('2026-10-12'));
  it('weekStartOf segunda → ela mesma', () => expect(weekStartOf('2026-10-19')).toBe('2026-10-19'));
  it('monthOf', () => expect(monthOf('2026-10-05')).toBe('2026-10'));
});
```

- [ ] **Step 3: Run** `npx vitest run supabase/functions/_shared/rules/dates.test.ts` — Expected: FAIL (módulo não existe).
- [ ] **Step 4: Implement `dates.ts`** — `localNow` com `Intl.DateTimeFormat('en-CA', { timeZone, year, month, day, hour: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts`; aritmética de `ISODate` via `Date.UTC` para não depender do fuso da máquina.
- [ ] **Step 5: Run** o mesmo comando — Expected: PASS (9 testes). `npm run build` também passa.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "chore: scaffold do projeto e regras de data no fuso"`

---

### Task 2: Regras da semana — meta, risco, fechamento, streak, dívida

**Files:**
- Create: `supabase/functions/_shared/rules/week.ts`, `supabase/functions/_shared/rules/money.ts`
- Test: `supabase/functions/_shared/rules/week.test.ts`, `supabase/functions/_shared/rules/money.test.ts`

**Interfaces:**
- Consumes: Task 1 (`types.ts`, `dates.ts`).
- Produces:
  ```ts
  goalForWeek(history: GoalEntry[], weekStart: ISODate): number | null
  firstEvaluatedWeek(accountCreatedDate: ISODate): ISODate
  interface WeekProgress { done: number; goal: number; need: number; available: number; level: RiskLevel }
  weekProgress(p: { goal: number; done: number; today: ISODate; checkedInToday: boolean }): WeekProgress
  closeWeek(p: { weekStart: ISODate; goal: number; done: number; frozen: boolean; penaltyAmount: number }): Omit<ClosedWeek, 'penaltyPaidAt'>
  weeksToClose(p: { now: LocalNow; lastClosedWeekStart: ISODate | null; firstEvaluatedWeek: ISODate }): ISODate[]
  streak(closed: ClosedWeek[], currentWeekMet: boolean): number
  debt(closed: ClosedWeek[]): number
  formatMoney(n: number): string   // money.ts
  ```

- [ ] **Step 1: Write the failing tests** (`week.test.ts`, `money.test.ts`)

```ts
const H = [{ effectiveWeekStart: '2026-10-12', weeklyGoal: 4 }, { effectiveWeekStart: '2026-10-26', weeklyGoal: 5 }];
it('meta mudada vale só da semana efetiva em diante', () => {
  expect(goalForWeek(H, '2026-10-19')).toBe(4);
  expect(goalForWeek(H, '2026-10-26')).toBe(5);
  expect(goalForWeek(H, '2026-10-05')).toBeNull();
});
it('firstEvaluatedWeek pula a semana de criação', () => {
  expect(firstEvaluatedWeek('2026-10-15')).toBe('2026-10-19');
  expect(firstEvaluatedWeek('2026-10-19')).toBe('2026-10-26');
});
// quinta 2026-10-15, meta 4
it.each([
  [2, false, '2026-10-15', 'green', 2, 4],
  [1, false, '2026-10-15', 'yellow', 3, 4],
  [0, false, '2026-10-15', 'fire', 4, 4],
  [2, false, '2026-10-18', 'red', 2, 1],
  [4, false, '2026-10-15', 'met', 0, 4],
  [2, true,  '2026-10-15', 'yellow', 2, 3],
])('weekProgress done=%i hoje=%s %s → %s', (done, checkedInToday, today, level, need, available) => {
  expect(weekProgress({ goal: 4, done, today, checkedInToday })).toMatchObject({ level, need, available });
});
it('closeWeek', () => {
  expect(closeWeek({ weekStart: '2026-10-12', goal: 4, done: 1, frozen: true, penaltyAmount: 10 })).toMatchObject({ status: 'frozen', penaltyAmount: 0 });
  expect(closeWeek({ weekStart: '2026-10-12', goal: 4, done: 4, frozen: false, penaltyAmount: 10 })).toMatchObject({ status: 'met', penaltyAmount: 0 });
  expect(closeWeek({ weekStart: '2026-10-12', goal: 4, done: 3, frozen: false, penaltyAmount: 10 })).toMatchObject({ status: 'failed', penaltyAmount: 10 });
});
it('weeksToClose respeita segunda 10h e recupera atrasos', () => {
  const mon = (hour: number) => ({ date: '2026-10-26', hour, weekday: 1 });
  expect(weeksToClose({ now: mon(9), lastClosedWeekStart: '2026-10-12', firstEvaluatedWeek: '2026-10-12' })).toEqual([]);
  expect(weeksToClose({ now: mon(10), lastClosedWeekStart: '2026-10-12', firstEvaluatedWeek: '2026-10-12' })).toEqual(['2026-10-19']);
  expect(weeksToClose({ now: { date: '2026-10-28', hour: 15, weekday: 3 }, lastClosedWeekStart: '2026-10-05', firstEvaluatedWeek: '2026-10-05' })).toEqual(['2026-10-12', '2026-10-19']);
  expect(weeksToClose({ now: mon(10), lastClosedWeekStart: null, firstEvaluatedWeek: '2026-10-19' })).toEqual(['2026-10-19']);
  expect(weeksToClose({ now: mon(10), lastClosedWeekStart: null, firstEvaluatedWeek: '2026-10-26' })).toEqual([]);
});
const w = (weekStart: string, status: WeekStatus, penaltyAmount = 0, penaltyPaidAt: string | null = null) =>
  ({ weekStart, goal: 4, done: 0, status, penaltyAmount, penaltyPaidAt });
it('streak: frozen não soma nem quebra; failed quebra', () => {
  const ws = [w('2026-10-19', 'met'), w('2026-09-21', 'met'), w('2026-10-12', 'frozen'), w('2026-09-28', 'failed'), w('2026-10-05', 'met')];
  expect(streak(ws, false)).toBe(2);
  expect(streak(ws, true)).toBe(3);
  expect(streak([], false)).toBe(0);
  expect(streak([], true)).toBe(1);
});
it('debt soma só multas não pagas', () => {
  expect(debt([w('a', 'failed', 10), w('b', 'failed', 15, '2026-10-01'), w('c', 'failed', 10)])).toBe(20);
});
// money.test.ts
it('formatMoney', () => { expect(formatMoney(10)).toBe('R$10'); expect(formatMoney(12.5)).toBe('R$12,50'); });
```

- [ ] **Step 2: Run** `npx vitest run supabase/functions/_shared/rules` — Expected: FAIL nos novos arquivos.
- [ ] **Step 3: Implement `week.ts` e `money.ts`.** `available` = dias de `today` até domingo inclusive, menos 1 se `checkedInToday`. Níveis exatamente pela tabela do spec §3.4 (`need ≤ available−2` green, `= available−1` yellow, `= available` fire, `> available` red, `need = 0` met). `weeksToClose`: candidatas são segundas `w ≥ firstEvaluatedWeek` e `w > lastClosedWeekStart`, fecháveis quando `now.date > w+7` ou (`now.date == w+7` e `now.hour ≥ 10`); `streak` ordena por `weekStart` desc antes de contar.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(rules): meta, risco, fechamento, streak e dívida"`

---

### Task 3: Regras de check-in e congelamento

**Files:**
- Create: `supabase/functions/_shared/rules/checkin.ts`, `supabase/functions/_shared/rules/freeze.ts`
- Test: `supabase/functions/_shared/rules/checkin.test.ts`, `supabase/functions/_shared/rules/freeze.test.ts`

**Interfaces:**
- Consumes: Task 1, Task 2 (`RiskLevel`).
- Produces:
  ```ts
  canCheckin(target: ISODate, now: LocalNow): boolean
  canUndoCheckin(target: ISODate, now: LocalNow): boolean
  type FreezeCheck = { ok: true } | { ok: false; reason: 'met' | 'monthly-limit' | 'already' }
  canFreeze(p: { currentWeekStart: ISODate; level: RiskLevel; frozenWeekStarts: ISODate[] }): FreezeCheck
  ```

- [ ] **Step 1: Write the failing tests**

```ts
const wed = { date: '2026-10-14', hour: 15, weekday: 3 };
it('hoje e ontem sim; anteontem e amanhã não', () => {
  expect(canCheckin('2026-10-14', wed)).toBe(true);
  expect(canCheckin('2026-10-13', wed)).toBe(true);
  expect(canCheckin('2026-10-12', wed)).toBe(false);
  expect(canCheckin('2026-10-15', wed)).toBe(false);
});
it('domingo pode ser marcado na segunda só até 9h59', () => {
  expect(canCheckin('2026-10-18', { date: '2026-10-19', hour: 9, weekday: 1 })).toBe(true);
  expect(canCheckin('2026-10-18', { date: '2026-10-19', hour: 10, weekday: 1 })).toBe(false);
});
it('desfazer só hoje', () => {
  expect(canUndoCheckin('2026-10-14', wed)).toBe(true);
  expect(canUndoCheckin('2026-10-13', wed)).toBe(false);
});
// freeze.test.ts
it.each([
  ['yellow', [], { ok: true }],
  ['met', [], { ok: false, reason: 'met' }],
  ['yellow', ['2026-10-05'], { ok: false, reason: 'monthly-limit' }],
  ['yellow', ['2026-09-28'], { ok: true }],
  ['yellow', ['2026-10-19'], { ok: false, reason: 'already' }],
])('canFreeze %s %j', (level, frozenWeekStarts, expected) => {
  expect(canFreeze({ currentWeekStart: '2026-10-19', level: level as RiskLevel, frozenWeekStarts })).toEqual(expected);
});
```

- [ ] **Step 2: Run** `npx vitest run supabase/functions/_shared/rules` — Expected: FAIL.
- [ ] **Step 3: Implement** — `canFreeze` verifica nesta ordem: `already`, `met`, `monthly-limit` (outro `week_start` com mesmo `monthOf`).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(rules): janela de check-in e congelamento"`

---

### Task 4: Notificações, mensagens e plano do tick

**Files:**
- Create: `supabase/functions/_shared/rules/notifications.ts`, `supabase/functions/_shared/rules/messages.ts`, `supabase/functions/_shared/rules/tick.ts`
- Test: `notifications.test.ts`, `messages.test.ts`, `tick.test.ts` (mesma pasta)

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  ```ts
  reminderHours(level: RiskLevel, intensity: Intensity, preferredHour: number): number[]   // ordenado, único, só 7..21
  dueReminder(p: { now: LocalNow; level: RiskLevel; intensity: Intensity; preferredHour: number; checkedInToday: boolean }): number | null
  interface Msg { title: string; body: string }
  reminderMessage(p: { level: RiskLevel; streak: number; penaltyAmount: number; penaltyDescription: string; need: number; available: number; motivations: string[]; seed: number }): Msg
  weeklySummaryMessage(p: { status: WeekStatus; streak: number; penaltyAmount: number; penaltyDescription: string }): Msg
  interface TickInput {
    now: LocalNow; accountCreatedDate: ISODate;
    settings: { preferredHour: number; intensity: Intensity; penaltyAmount: number; penaltyDescription: string; motivations: string[] };
    goals: GoalEntry[]; checkinDates: ISODate[]; freezes: ISODate[]; closed: ClosedWeek[];
  }
  interface PlannedNotification extends Msg { kind: 'summary' | 'reminder'; slotHour: number }
  interface TickPlan { weeksToInsert: Omit<ClosedWeek, 'penaltyPaidAt'>[]; notifications: PlannedNotification[] }
  planUserTick(input: TickInput): TickPlan
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// notifications.test.ts — offsets do spec §7: yellow normal [-2,0,2], yellow insistente [-2,0,2,4],
// fire normal [-2,0,2,4], fire insistente [-4,-2,0,2,4]; leve, green e red = [0]; met = []
it.each([
  ['green', 'normal', 19, [19]],
  ['yellow', 'normal', 19, [17, 19, 21]],
  ['yellow', 'leve', 19, [19]],
  ['fire', 'insistente', 19, [15, 17, 19, 21]],
  ['fire', 'normal', 8, [8, 10, 12]],
  ['red', 'insistente', 19, [19]],
  ['met', 'insistente', 19, []],
])('reminderHours %s %s P=%i', (level, intensity, p, hours) => {
  expect(reminderHours(level as RiskLevel, intensity as Intensity, p)).toEqual(hours);
});
it('dueReminder', () => {
  const base = { level: 'yellow' as const, intensity: 'normal' as const, preferredHour: 19 };
  expect(dueReminder({ ...base, now: { date: '2026-10-15', hour: 17, weekday: 4 }, checkedInToday: false })).toBe(17);
  expect(dueReminder({ ...base, now: { date: '2026-10-15', hour: 17, weekday: 4 }, checkedInToday: true })).toBeNull();
  expect(dueReminder({ ...base, now: { date: '2026-10-15', hour: 18, weekday: 4 }, checkedInToday: false })).toBeNull();
});
// messages.test.ts
const m = { penaltyDescription: 'no cofrinho', need: 2, available: 2, motivations: ['ficar forte'], seed: 0 };
it('fire cita streak e multa', () => {
  for (let seed = 0; seed < 8; seed++) {
    const { body } = reminderMessage({ ...m, level: 'fire', streak: 6, penaltyAmount: 10, seed });
    expect(body).toContain('6 semanas'); expect(body).toContain('R$10');
  }
});
it('streak 0 nunca vira "0 semanas"', () => {
  for (let seed = 0; seed < 8; seed++)
    expect(reminderMessage({ ...m, level: 'fire', streak: 0, penaltyAmount: 10, seed }).body).not.toContain('0 semanas');
});
it('sem motivos não quebra', () => {
  expect(reminderMessage({ ...m, motivations: [], level: 'green', streak: 1, penaltyAmount: 10, seed: 3 }).title).toBeTruthy();
});
it('resumo semanal failed cita multa', () => {
  expect(weeklySummaryMessage({ status: 'failed', streak: 0, penaltyAmount: 10, penaltyDescription: 'no cofrinho' }).body).toContain('R$10');
});
// tick.test.ts
const settings = { preferredHour: 19, intensity: 'normal' as const, penaltyAmount: 10, penaltyDescription: 'no cofrinho', motivations: [] };
const goals = [{ effectiveWeekStart: '2026-10-05', weeklyGoal: 4 }];
it('recupera duas semanas e manda um único resumo da mais recente', () => {
  const plan = planUserTick({ now: { date: '2026-10-28', hour: 10, weekday: 3 }, accountCreatedDate: '2026-10-01', settings, goals,
    checkinDates: ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-13'], freezes: [], closed: [] });
  expect(plan.weeksToInsert.map(w => [w.weekStart, w.status])).toEqual([['2026-10-05', 'met'], ['2026-10-12', 'failed'], ['2026-10-19', 'failed']]);
  expect(plan.notifications.filter(n => n.kind === 'summary')).toHaveLength(1);
});
it('semana já fechada não é refechada (cron duplo)', () => {
  const closed = [{ weekStart: '2026-10-19', goal: 4, done: 4, status: 'met' as const, penaltyAmount: 0, penaltyPaidAt: null }];
  const plan = planUserTick({ now: { date: '2026-10-26', hour: 10, weekday: 1 }, accountCreatedDate: '2026-10-14', settings, goals, checkinDates: [], freezes: [], closed });
  expect(plan.weeksToInsert).toEqual([]);
  expect(plan.notifications.filter(n => n.kind === 'summary')).toEqual([]);
});
it('semana de aquecimento não fecha', () => {
  const plan = planUserTick({ now: { date: '2026-10-26', hour: 10, weekday: 1 }, accountCreatedDate: '2026-10-21', settings, goals, checkinDates: [], freezes: [], closed: [] });
  expect(plan.weeksToInsert).toEqual([]);
});
it('lembrete no horário certo e silêncio se já treinou hoje', () => {
  // semanas anteriores já fechadas, para que só o lembrete apareça (quinta, 0 treinos, meta 4 → fire)
  const closed = [{ weekStart: '2026-10-12', goal: 4, done: 4, status: 'met' as const, penaltyAmount: 0, penaltyPaidAt: null }];
  const input = { now: { date: '2026-10-22', hour: 19, weekday: 4 }, accountCreatedDate: '2026-10-01', settings, goals, freezes: [], closed };
  expect(planUserTick({ ...input, checkinDates: [] }).notifications).toMatchObject([{ kind: 'reminder', slotHour: 19 }]);
  expect(planUserTick({ ...input, checkinDates: ['2026-10-22'] }).notifications).toEqual([]);
});
it('semana congelada fecha como frozen', () => {
  const plan = planUserTick({ now: { date: '2026-10-26', hour: 10, weekday: 1 }, accountCreatedDate: '2026-10-01', settings, goals,
    checkinDates: [], freezes: ['2026-10-19'], closed: [{ weekStart: '2026-10-12', goal: 4, done: 4, status: 'met', penaltyAmount: 0, penaltyPaidAt: null }] });
  expect(plan.weeksToInsert).toMatchObject([{ weekStart: '2026-10-19', status: 'frozen', penaltyAmount: 0 }]);
});
```

- [ ] **Step 2: Run** `npx vitest run supabase/functions/_shared/rules` — Expected: FAIL.
- [ ] **Step 3: Implement.** Mensagens: ≥4 modelos por nível (green neutro, yellow firme, fire direto, red recomeço), escolha `templates[seed % n]`; frases sobre streak só quando `streak > 0`; usar `formatMoney`. `planUserTick`: `lastClosed` = maior `weekStart` em `closed`; fecha cada semana de `weeksToClose` (pula se `goalForWeek` for `null`); resumo (`slotHour: now.hour`) só se `weeksToInsert` não vazio, para a última semana, com streak calculado sobre `closed + weeksToInsert`. Lembrete: progresso da semana de `now.date`, `dueReminder`; seed = `Number(now.date.replaceAll('-', '')) + slotHour`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(rules): horários de lembrete, mensagens e planUserTick"`

---

### Task 5: Banco de dados — esquema, RLS e RPCs no Supabase

**Files:**
- Create: `supabase/config.toml` (via `npx supabase init`), `supabase/migrations/20261018000001_schema.sql`, `supabase/migrations/20261018000002_rpc.sql`

**Interfaces:**
- Produces (tabelas e colunas exatamente como spec §4, todas com `user_id uuid not null default auth.uid() references auth.users on delete cascade`):
  - RPC `do_checkin(p_date date) returns void` — erro `'checkin_fora_da_janela'` se fora da janela; `on conflict (user_id, date) do nothing`.
  - RPC `undo_checkin(p_date date) returns void` — só se `p_date` = hoje local; apaga `workout_sets` em cascata (`checkin_id ... on delete cascade`).
  - RPC `add_set(p_id uuid, p_date date, p_exercise_name text, p_set_number int, p_reps int, p_weight_kg numeric) returns void` — exige check-in em `p_date` (erro `'sem_checkin'`), cria exercício por nome (`on conflict (user_id, name) do nothing`), insere a série com o `id` vindo do cliente (`on conflict (id) do nothing`, idempotente para replay offline).
  - Coluna `settings.created_at timestamptz default now()`.

- [ ] **Step 1: Escrever `schema.sql`.** Tabelas do spec §4 com checks: `weekly_goal between 1 and 7`, `preferred_hour between 0 and 23`, `notification_intensity in ('leve','normal','insistente')`, `status in ('met','failed','frozen')`, `cardinality(motivations) <= 5`. RLS ativo em todas; política `for all using (user_id = auth.uid()) with check (user_id = auth.uid())` em: `settings`, `goal_history`, `week_freezes`, `exercises`, `body_entries`, `push_subscriptions`, `workout_sets` (para delete). `checkins` e `workout_sets`: só `select`/`delete` direto (insert via RPC). `weeks`: `select` + `revoke update on weeks from authenticated; grant update (penalty_paid_at) on weeks to authenticated` + política update do dono. `notification_log`: sem políticas para o cliente (só service role).
- [ ] **Step 2: Escrever `rpc.sql`.** Funções `security definer`, `set search_path = public`, usando `auth.uid()` e o fuso de `settings`. Regra da janela (espelha `canCheckin`):
  ```sql
  -- v_now = now() at time zone v_tz; v_today = v_now::date
  if not (p_date = v_today
          or (p_date = v_today - 1 and (extract(isodow from v_today) <> 1 or extract(hour from v_now) < 10)))
  then raise exception 'checkin_fora_da_janela'; end if;
  ```
  Também recusar se já existe `weeks` com `week_start = date_trunc('week', p_date)::date`.
- [ ] **Step 3: Conectar ao projeto do usuário (ação do usuário).** O usuário roda no terminal `npx supabase login` e informa o *project ref* (Dashboard → Project Settings). Depois: `npx supabase link --project-ref <ref>`.
- [ ] **Step 4: Aplicar** — `npx supabase db push`. Expected: as duas migrações aplicadas sem erro.
- [ ] **Step 5: Verificar no SQL Editor (Review Focus 1 e 4).** Confirmar que as políticas existem (`select tablename, policyname from pg_policies where schemaname='public'`) e que `extract(isodow from date '2026-10-18')` = 7. O teste fim a fim da RPC acontece na Task 7 com usuário real.
- [ ] **Step 6: Commit** — `git commit -m "feat(db): esquema, RLS e RPCs"`

---

### Task 6: Fundação do front — tema, layout, roteamento, cliente Supabase e login

**Files:**
- Create: `src/index.css`, `src/App.tsx`, `src/lib/supabase.ts`, `src/lib/auth.ts`, `src/lib/queryClient.ts`, `src/ui/AppShell.tsx`, `src/ui/Card.tsx`, `src/ui/Button.tsx`, `src/ui/Toast.tsx`, `src/features/auth/AuthScreen.tsx`
- Modify: `src/main.tsx`
- Test: `src/ui/AppShell.test.tsx`

**Interfaces:**
- Produces:
  - `supabase` (cliente com `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, `persistSession: true`).
  - `useSession(): { session: Session | null; loading: boolean }`; `signIn(email, password)`, `signUp(email, password)`, `signOut()`.
  - `queryClient` + `<AppQueryProvider>` com `PersistQueryClientProvider` (localStorage, `maxAge` 7 dias) que chama `queryClient.resumePausedMutations()` em `onSuccess`. Expõe `registerMutationDefaults(key: string[], fn)` para mutações retomáveis após recarregar.
  - `useToast(): { show(msg: string, tone?: 'ok' | 'error'): void }`.
  - `<Button variant="primary" | "ghost" | "danger">`, `<Card>`.
  - Rotas: `/` Home, `/sos`, `/treino`, `/corpo`, `/historico`, `/ajustes`, `/boas-vindas`. Sem sessão → `AuthScreen`; com sessão e sem `settings` → redireciona para `/boas-vindas` (guarda implementada na Task 8; aqui as rotas apontam para placeholders).
  - Tokens de cor e fonte como variáveis Tailwind v4 (`@theme`): `--color-bg`, `--color-card`, `--color-fg`, `--color-muted`, `--color-accent`, `--color-warn`, `--color-danger`; `--font-display` (Anton), `--font-head` (Barlow Condensed), `--font-body` (Inter).

- [ ] **Step 1: Invocar `frontend-design:frontend-design`** e aplicar a direção visual do spec §6.
- [ ] **Step 2: Write the failing test** — `AppShell` renderiza os 5 itens de navegação (`Início`, `Treino`, `Corpo`, `Histórico`, `Ajustes`) e marca o ativo com `aria-current="page"` na rota `/treino`.
- [ ] **Step 3: Run** `npx vitest run src/ui` — Expected: FAIL.
- [ ] **Step 4: Implement.** `AppShell`: barra inferior fixa abaixo de 1024px (respeitando `env(safe-area-inset-bottom)`), menu lateral a partir de 1024px. `AuthScreen`: e-mail + senha, alternância entrar/criar conta, erros do Supabase traduzidos ("E-mail ou senha incorretos").
- [ ] **Step 5: Run** `npx vitest run` — Expected: PASS. Criar `.env.local` com URL e anon key do projeto, rodar `npm run dev`, criar a conta do usuário e entrar.
- [ ] **Step 6: Commit** — `git commit -m "feat(app): tema, layout, rotas e login"`

---

### Task 7: Camada de dados e estado da semana

**Files:**
- Create: `src/data/settings.ts`, `src/data/goals.ts`, `src/data/checkins.ts`, `src/data/weeks.ts`, `src/data/freezes.ts`, `src/data/workout.ts`, `src/data/body.ts`, `src/data/useWeekState.ts`, `src/ui/PendingSyncBadge.tsx`
- Test: `src/data/useWeekState.test.tsx`, `src/data/checkins.test.tsx`

**Interfaces:**
- Consumes: Task 6 (`supabase`, `queryClient`, `registerMutationDefaults`, `useToast`), regras via `@rules/*`.
- Produces (todos mapeiam snake_case → camelCase):
  ```ts
  interface Settings { preferredHour: number; timezone: string; penaltyAmount: number; penaltyDescription: string; intensity: Intensity; motivations: string[]; createdAt: string }
  useSettings(): UseQueryResult<Settings | null>;  useSaveSettings(): UseMutationResult<void, Error, Partial<Settings>>
  useGoals(): UseQueryResult<GoalEntry[]>;  useSetGoal(): UseMutationResult<void, Error, { weeklyGoal: number; effectiveWeekStart: ISODate }>  // upsert
  useCheckins(): UseQueryResult<ISODate[]>;  useCheckin(): UseMutationResult<void, Error, ISODate>  // key ['checkin'], rpc do_checkin
  useUndoCheckin(): UseMutationResult<void, Error, ISODate>
  useWeeks(): UseQueryResult<ClosedWeek[]>;  useMarkPaid(): UseMutationResult<void, Error, ISODate>
  useFreezes(): UseQueryResult<ISODate[]>;  useFreeze(), useUnfreeze(): UseMutationResult<void, Error, ISODate>
  interface WorkoutSet { id: string; date: ISODate; exercise: string; setNumber: number; reps: number; weightKg: number }
  useExercises(): UseQueryResult<string[]>;  useSets(): UseQueryResult<WorkoutSet[]>
  useAddSet(): UseMutationResult<void, Error, WorkoutSet>  // key ['addSet'], rpc add_set, id = crypto.randomUUID() no cliente
  useDeleteSet(): UseMutationResult<void, Error, string>
  interface BodyEntry { id: string; date: ISODate; weightKg: number | null; measurements: Partial<Record<'cintura'|'quadril'|'peito'|'braco'|'coxa', number>> }
  useBodyEntries(): UseQueryResult<BodyEntry[]>;  useAddBodyEntry(): UseMutationResult<void, Error, Omit<BodyEntry, 'id'>>
  interface WeekState {
    now: LocalNow; weekStart: ISODate; warmup: boolean; frozen: boolean; checkedInToday: boolean;
    progress: WeekProgress; streak: number; debt: number; freezeCheck: FreezeCheck; settings: Settings;
  }
  useWeekState(): WeekState | null   // null enquanto carrega ou sem settings
  ```
- Mutações `checkin` e `addSet` atualizam o cache de forma otimista (o check-in aparece na hora, mesmo offline). `PendingSyncBadge` mostra "Sincronizando…" quando `useMutationState({ filters: { status: 'pending' } })` tem itens pausados.

- [ ] **Step 1: Write the failing tests**
  - `useWeekState.test.tsx`: com relógio falso (`vi.useFakeTimers`, `vi.setSystemTime(new Date('2026-10-19T02:59:30Z'))`), settings fuso SP, check-in em `'2026-10-18'` → `now.date === '2026-10-18'` e `checkedInToday === true`; avançar 60 s (`vi.advanceTimersByTime(60_000)`) → `now.date === '2026-10-19'`, `checkedInToday === false`, `weekStart === '2026-10-19'` (Review Focus 5). Hooks de query mockados com `vi.mock('./checkins', …)` etc.
  - `checkins.test.tsx`: quando a RPC rejeita com `message: 'checkin_fora_da_janela'`, `useCheckin` chama `toast.show('Esse dia já fechou — o check-in não foi registrado.', 'error')` e remove a data otimista do cache (Review Focus 2). `supabase.rpc` mockado.
- [ ] **Step 2: Run** `npx vitest run src/data` — Expected: FAIL.
- [ ] **Step 3: Implement.** `useWeekState` combina os hooks com `localNow(new Date(), settings.timezone)` atualizado por `setInterval` de 60 s; `warmup = weekStart < firstEvaluatedWeek(data local de createdAt)`; `streak(weeks, progress.level === 'met' && !warmup)`. Erros de RPC conhecidos (`checkin_fora_da_janela`, `sem_checkin`) viram mensagens em português via `useToast`.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(data): hooks do Supabase, fila offline e estado da semana"`

---

### Task 8: Primeiro acesso (onboarding)

**Files:**
- Create: `src/features/onboarding/Onboarding.tsx`
- Modify: `src/App.tsx` (guarda: sessão sem settings → `/boas-vindas`)
- Test: `src/features/onboarding/Onboarding.test.tsx`

**Interfaces:**
- Consumes: `useSaveSettings`, `useSetGoal` (Task 7), `subscribePush` (Task 15 — até lá, o passo de notificações mostra só o texto e um botão "Ativar depois").
- Produces: ao concluir, grava `settings` (fuso de `Intl.DateTimeFormat().resolvedOptions().timeZone`, padrão `America/Sao_Paulo`) e `goal_history` com `effectiveWeekStart = weekStartOf(hoje)`, então navega para `/`.

- [ ] **Step 1: Invocar `frontend-design:frontend-design`.**
- [ ] **Step 2: Write the failing test** — passos: meta (seletor 1–7, padrão 4) → horário (padrão 18) → multa (valor padrão 10, descrição padrão "no cofrinho") → motivos (até 5; o 6º campo não aparece) → notificações. Ao concluir, `useSaveSettings().mutateAsync` é chamado com `{ preferredHour: 18, penaltyAmount: 10, penaltyDescription: 'no cofrinho', intensity: 'normal', motivations: ['ficar forte'] }` e `useSetGoal` com `{ weeklyGoal: 4, effectiveWeekStart: <segunda atual> }`.
- [ ] **Step 3: Run** — Expected: FAIL. **Step 4: Implement.** **Step 5: Run** — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat: primeiro acesso"`

---

### Task 9: Início

**Files:**
- Create: `src/features/home/Home.tsx`, `src/ui/ProgressRing.tsx`, `src/ui/RiskBadge.tsx`, `src/ui/StreakFlame.tsx`, `src/ui/CheckinBurst.tsx`
- Test: `src/features/home/Home.test.tsx`

**Interfaces:**
- Consumes: `useWeekState`, `useCheckin`, `useUndoCheckin`, `useFreeze`, `useUnfreeze` (Task 7); `pushStatus()` (Task 15 — até lá, o aviso de push fica oculto).
- Produces: `<ProgressRing done goal level />`, `<RiskBadge level />` (textos: met "Meta batida", green "Tranquilo", yellow "Apertado", fire "Decisivo", red "Meta perdida"), `<StreakFlame weeks />`.

- [ ] **Step 1: Invocar `frontend-design:frontend-design`.**
- [ ] **Step 2: Write the failing tests** (`useWeekState` e mutações mockados):
  - mostra `2/4`, "faltam 3 dias" e o selo "Apertado" para `progress = { done: 2, goal: 4, need: 2, available: 3, level: 'yellow' }`;
  - clicar **TREINEI HOJE** chama `useCheckin().mutate(now.date)`; com `checkedInToday: true` o botão vira "Treino de hoje registrado ✓" com opção "Desfazer";
  - `warmup: true` mostra "Semana de aquecimento — a cobrança começa segunda" e oculta streak e multa;
  - `debt: 20` mostra `R$20`; `debt: 0` oculta o cartão de dívida;
  - botão "Congelar semana" desabilitado com o motivo quando `freezeCheck.ok === false` (`monthly-limit` → "Você já congelou uma semana este mês");
  - link "Tô sem vontade" aponta para `/sos`.
- [ ] **Step 3: Run** `npx vitest run src/features/home` — Expected: FAIL.
- [ ] **Step 4: Implement.** Explosão: partículas CSS na cor de destaque + `navigator.vibrate?.(40)`; sem animação se `prefers-reduced-motion`. Nível `fire` com pulso animado no selo.
- [ ] **Step 5: Run** — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat: tela Início"`

---

### Task 10: Tô sem vontade

**Files:**
- Create: `src/features/sos/Sos.tsx`
- Test: `src/features/sos/Sos.test.tsx`

**Interfaces:**
- Consumes: `useWeekState`, `useCheckin`.

- [ ] **Step 1: Write the failing test** — 3 cartões em sequência com botão "Próximo": (1) lista os `settings.motivations` (sem motivos: "Você começou isso por um motivo. Lembra qual era?"); (2) com `streak: 6`, `penaltyAmount: 10`: texto contém "6 semanas" e "R$10"; com `streak: 0` não contém "0 semanas"; (3) "Só 15 minutos" e botão "Fui! Registrar treino" que chama `useCheckin().mutate(now.date)` e navega para `/`.
- [ ] **Step 2: Run** — Expected: FAIL. **Step 3: Implement** (com `frontend-design`). **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: tela Tô sem vontade"`

---

### Task 11: Treino e gráfico de cargas

**Files:**
- Create: `src/features/workout/Workout.tsx`, `src/features/workout/progress.ts`, `src/ui/LineChartCard.tsx`
- Test: `src/features/workout/progress.test.ts`

**Interfaces:**
- Consumes: `useWeekState`, `useSets`, `useExercises`, `useAddSet`, `useDeleteSet`.
- Produces:
  ```ts
  topSetByDate(sets: WorkoutSet[], exercise: string): { date: ISODate; weightKg: number }[]   // maior carga por sessão, ordem cronológica
  lastSession(sets: WorkoutSet[], before: ISODate): WorkoutSet[]                              // séries da data mais recente < before
  <LineChartCard title data={{ x: string; y: number }[]} unit />
  ```

- [ ] **Step 1: Write the failing test** — `topSetByDate` com séries de supino em 10-13 (60, 70 kg) e 10-15 (72 kg) → `[{date:'2026-10-13',weightKg:70},{date:'2026-10-15',weightKg:72}]`; `lastSession(sets, '2026-10-15')` → só as séries de 10-13.
- [ ] **Step 2: Run** — Expected: FAIL. **Step 3: Implement** helpers e tela (com `frontend-design`): sem check-in hoje → chamada para treinar; com check-in → formulário (exercício com autocompletar `<datalist>`, reps, kg) + "Repetir último treino" (gera novas séries com novos `id` a partir de `lastSession`) + lista do dia com excluir; abaixo, seletor de exercício e `LineChartCard` de `topSetByDate`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: registro de treino e evolução de carga"`

---

### Task 12: Corpo

**Files:**
- Create: `src/features/body/Body.tsx`
- Test: `src/features/body/Body.test.tsx`

**Interfaces:**
- Consumes: `useBodyEntries`, `useAddBodyEntry`, `LineChartCard`.

- [ ] **Step 1: Write the failing test** — enviar o formulário com peso `80,5` (vírgula aceita) e cintura `90` chama `useAddBodyEntry().mutate({ date: <hoje>, weightKg: 80.5, measurements: { cintura: 90 } })`; campos vazios não entram em `measurements`; formulário todo vazio não envia.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (com `frontend-design`): formulário + um `LineChartCard` para peso e um por medida com dados. **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: peso e medidas"`

---

### Task 13: Histórico

**Files:**
- Create: `src/features/history/History.tsx`
- Test: `src/features/history/History.test.tsx`

**Interfaces:**
- Consumes: `useCheckins`, `useWeeks`, `useMarkPaid`, `formatMoney`.

- [ ] **Step 1: Write the failing test** — calendário de outubro/2026 marca os dias com check-in (`data-trained="true"`); semana `failed` com multa `10` não paga mostra "R$10 no cofrinho" e botão "Marcar como paga" que chama `useMarkPaid().mutate('2026-10-12')`; semana paga mostra "Paga".
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (com `frontend-design`): navegação entre meses; cada linha de semana colorida por status (met destaque, failed vermelho, frozen cinza-azulado). **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: histórico e multas"`

---

### Task 14: Ajustes

**Files:**
- Create: `src/features/settings/Settings.tsx`
- Test: `src/features/settings/Settings.test.tsx`

**Interfaces:**
- Consumes: `useSettings`, `useSaveSettings`, `useGoals`, `useSetGoal`, `signOut`; lista/remove `push_subscriptions` direto via `supabase`.

- [ ] **Step 1: Write the failing test** — salvar meta 5 numa quarta (`2026-10-14`) chama `useSetGoal` com `{ weeklyGoal: 5, effectiveWeekStart: '2026-10-19' }` e mostra "Nova meta vale a partir de segunda (19/10)"; mudar a intensidade para `insistente` chama `useSaveSettings` com `{ intensity: 'insistente' }`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (com `frontend-design`): meta, horário, fuso, multa, intensidade, motivos, aparelhos com push, sair. **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: ajustes"`

---

### Task 15: PWA e inscrição de push

**Files:**
- Create: `src/sw.ts`, `src/lib/push.ts`, `public/icon.svg`
- Modify: `vite.config.ts` (VitePWA `strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'sw.ts'`, manifest `name: 'FORJA'`, `display: 'standalone'`, `background_color`/`theme_color: '#0A0A0B'`, `lang: 'pt-BR'`), `index.html` (meta `apple-mobile-web-app-capable`, `apple-touch-icon`), `src/features/home/Home.tsx` e `src/features/onboarding/Onboarding.tsx` (ligar o aviso/botão de push)
- Test: `src/lib/push.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type PushStatus = 'subscribed' | 'can-subscribe' | 'needs-install-ios' | 'denied' | 'unsupported'
  pushStatus(): Promise<PushStatus>
  subscribePush(): Promise<void>   // pede permissão, pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VITE_VAPID_PUBLIC_KEY }), upsert em push_subscriptions por endpoint
  ```
- SW: precache do Workbox; `push` → `showNotification(title, { body, icon, badge, data: { url: '/' } })`; `notificationclick` → foca janela aberta ou abre `/`.

- [ ] **Step 1: Write the failing test** — `pushStatus` com `navigator.userAgent` de iPhone e `matchMedia('(display-mode: standalone)')` falso → `'needs-install-ios'`; `Notification.permission === 'denied'` → `'denied'`; sem `PushManager` em `window` (não iOS) → `'unsupported'`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** Gerar ícones com `npx @vite-pwa/assets-generator --preset minimal-2023 public/icon.svg` (ícone: "F" em Anton, verde-limão sobre fundo `#0A0A0B`). Aviso no Início com instruções: iOS "Toque em Compartilhar → Adicionar à Tela de Início"; denied "Ative as notificações nas configurações do navegador".
- [ ] **Step 4: Run** `npx vitest run && npm run build` — Expected: PASS; `dist/sw.js` e `dist/manifest.webmanifest` existem.
- [ ] **Step 5: Commit** — `git commit -m "feat: PWA e inscrição de push"`

---

### Task 16: Edge Function `tick` e agendamento

**Files:**
- Create: `supabase/functions/tick/index.ts`, `supabase/functions/tick/push.ts`, `supabase/migrations/20261018000003_cron.sql`
- Modify: `supabase/config.toml` (`[functions.tick] verify_jwt = false`)

**Interfaces:**
- Consumes: `planUserTick`, `localNow` (`../_shared/rules/*.ts`).
- Produces: `POST /functions/v1/tick` com header `x-cron-secret` = secret `CRON_SECRET` (senão 401). Para cada linha de `settings`: carrega dados com o cliente service role → `planUserTick` → `insert into weeks ... on conflict (user_id, week_start) do nothing` → para cada notificação, `insert into notification_log ... on conflict do nothing returning id`; só envia se a linha foi inserida (`kind`, `local_date = now.date`, `slot_hour`). Erro em um usuário é logado e não interrompe os outros. Resposta JSON `{ users, weeksClosed, sent }`.
- `push.ts`: `sendToUser(userId: string, msg: Msg): Promise<number>` com `npm:web-push@3.6.7` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`); 404/410 → apaga a inscrição.
- `cron.sql`: `create extension if not exists pg_cron; create extension if not exists pg_net;` e `cron.schedule('forja-tick', '0 * * * *', …net.http_post(url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/tick', headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')))…)`.

- [ ] **Step 1: Implement** `push.ts` e `index.ts`.
- [ ] **Step 2: Segredos (com o usuário).** `npx web-push generate-vapid-keys`; gerar `CRON_SECRET` aleatório; perguntar ao usuário o e-mail de contato para `VAPID_SUBJECT` (`mailto:…`). `npx supabase secrets set VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_SUBJECT=… CRON_SECRET=…`. Colocar a chave pública em `.env.local` como `VITE_VAPID_PUBLIC_KEY`. No SQL Editor (fora do git): `select vault.create_secret('<url do projeto>', 'project_url'); select vault.create_secret('<CRON_SECRET>', 'cron_secret');`.
- [ ] **Step 3: Deploy** — `npx supabase functions deploy tick --use-api` e `npx supabase db push`. Expected: sem erros; `select jobname, schedule from cron.job` mostra `forja-tick | 0 * * * *`.
- [ ] **Step 4: Verificar** — com o app inscrito no push, ajustar o horário preferido para a hora atual e chamar `curl -X POST <url>/functions/v1/tick -H "x-cron-secret: <CRON_SECRET>"`. Expected: JSON com `sent ≥ 1` e notificação chegando; chamar de novo → `sent: 0` (deduplicação). Sem header → 401.
- [ ] **Step 5: Commit** — `git commit -m "feat: função tick de fechamento e notificações"`

---

### Task 17: Publicação e verificação em aparelhos reais

**Files:**
- Create: `vercel.json` (`{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`)

- [ ] **Step 1: Publicar (ação do usuário: login na Vercel).** `npx vercel login`, `npx vercel link`, configurar `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` com `npx vercel env add` (production), depois `npx vercel --prod`. Expected: URL `https://….vercel.app` abrindo a tela de login.
- [ ] **Step 2: Supabase Auth** — em Authentication → URL Configuration, definir *Site URL* = URL da Vercel. Depois que a conta do usuário existir: desativar "Allow new users to sign up".
- [ ] **Step 3: Checklist manual (spec §9).**
  - iPhone: Safari → Compartilhar → Adicionar à Tela de Início; abrir pelo ícone; ativar notificações.
  - Fechar o app, disparar o `tick` via curl → notificação chega.
  - Modo avião → TREINEI HOJE → "Sincronizando…" → voltar a conexão → check-in aparece no PC.
  - PC: dados iguais aos do celular.
- [ ] **Step 4: Commit** — `git commit -m "chore: configuração de publicação"`
