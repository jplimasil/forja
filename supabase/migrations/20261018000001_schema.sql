-- FORJA: esquema, RLS e permissões. Toda linha pertence a um usuário (auth.uid()).

create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  preferred_hour int not null default 18 check (preferred_hour between 0 and 23),
  timezone text not null default 'America/Sao_Paulo',
  penalty_amount numeric(10,2) not null default 10 check (penalty_amount >= 0),
  penalty_description text not null default 'no cofrinho',
  notification_intensity text not null default 'normal' check (notification_intensity in ('leve','normal','insistente')),
  motivations text[] not null default '{}' check (cardinality(motivations) <= 5),
  created_at timestamptz not null default now()
);

create table public.goal_history (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  effective_week_start date not null check (extract(isodow from effective_week_start) = 1),
  weekly_goal int not null check (weekly_goal between 1 and 7),
  primary key (user_id, effective_week_start)
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.week_freezes (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  primary key (user_id, week_start)
);

create table public.weeks (
  user_id uuid not null references auth.users on delete cascade,
  week_start date not null,
  goal int not null,
  done int not null,
  status text not null check (status in ('met','failed','frozen')),
  penalty_amount numeric(10,2) not null default 0,
  penalty_paid_at timestamptz,
  primary key (user_id, week_start)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(trim(name)) > 0)
);
create unique index exercises_user_name on public.exercises (user_id, lower(name));

create table public.workout_sets (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  checkin_id uuid not null references public.checkins on delete cascade,
  exercise_id uuid not null references public.exercises on delete cascade,
  set_number int not null check (set_number > 0),
  reps int not null check (reps > 0),
  weight_kg numeric(6,2) not null check (weight_kg >= 0)
);

create table public.body_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  weight_kg numeric(5,2),
  measurements jsonb not null default '{}'
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.notification_log (
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  local_date date not null,
  slot_hour int not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, local_date, slot_hour)
);

-- RLS: tudo fechado por padrão; cada política libera só as linhas do dono.
alter table public.settings enable row level security;
alter table public.goal_history enable row level security;
alter table public.checkins enable row level security;
alter table public.week_freezes enable row level security;
alter table public.weeks enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.body_entries enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_log enable row level security;

create policy own_all on public.settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_all on public.week_freezes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_all on public.exercises for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_all on public.body_entries for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_all on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Meta: leitura direta; gravação só pela RPC set_goal (mudança vale da próxima semana).
create policy own_select on public.goal_history for select to authenticated using (user_id = auth.uid());

-- Check-ins e séries: leitura e exclusão diretas; criação só pelas RPCs (janela validada no servidor).
create policy own_select on public.checkins for select to authenticated using (user_id = auth.uid());
create policy own_select on public.workout_sets for select to authenticated using (user_id = auth.uid());
create policy own_delete on public.workout_sets for delete to authenticated using (user_id = auth.uid());

-- Semanas fechadas: só a função tick grava; o usuário lê e marca a multa como paga.
create policy own_select on public.weeks for select to authenticated using (user_id = auth.uid());
create policy own_update on public.weeks for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.weeks from authenticated;
grant update (penalty_paid_at) on public.weeks to authenticated;

-- notification_log: sem políticas; só a service role (função tick) acessa.
