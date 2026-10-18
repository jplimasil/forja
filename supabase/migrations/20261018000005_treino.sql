-- FORJA: aba Treino — fichas, grupos musculares do dia, RPE e séries planejadas.
-- Teste: supabase/tests/treino.sql

-- Grupos musculares (mesma lista de src/features/workout/muscles.ts)
alter table public.exercises
  add column muscle_group text check (muscle_group in ('peito','costas','ombros','biceps','triceps','quadriceps','posterior','gluteos','panturrilha','abdomen')),
  add column kind text check (kind in ('composto','isolador'));

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  routine_id uuid not null references public.routines on delete cascade,
  exercise_id uuid not null references public.exercises on delete cascade,
  position int not null default 0,
  target_sets int not null default 3 check (target_sets between 1 and 10)
);

alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
create policy own_all on public.routines for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_all on public.routine_exercises for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- O check-in do dia é a sessão: ficha usada e músculos treinados.
alter table public.checkins
  add column routine_id uuid references public.routines on delete set null,
  add column muscle_groups text[] not null default '{}'
    check (muscle_groups <@ array['peito','costas','ombros','biceps','triceps','quadriceps','posterior','gluteos','panturrilha','abdomen']);

-- Séries: planejadas (sem carga, não concluídas) ou concluídas (com carga e reps), com RPE opcional.
alter table public.workout_sets
  alter column reps drop not null,
  alter column weight_kg drop not null,
  add column rpe numeric(3,1) check (rpe is null or (rpe between 1 and 10 and rpe * 2 = floor(rpe * 2))),
  add column done boolean not null default false;
update public.workout_sets set done = true;
alter table public.workout_sets
  add constraint done_requires_values check (not done or (reps is not null and weight_kg is not null));

create policy own_update on public.workout_sets for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.workout_sets from authenticated;
grant update (reps, weight_kg, rpe, done) on public.workout_sets to authenticated;

-- do_checkin agora também grava ficha e músculos do dia (mesma janela de antes).
drop function public.do_checkin(date);
create function public.do_checkin(p_date date, p_routine_id uuid default null, p_muscles text[] default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamp;
  v_today date;
begin
  if v_uid is null then raise exception 'nao_autenticado'; end if;
  v_now := user_local_now(v_uid);
  v_today := v_now::date;
  if not (p_date = v_today
          or (p_date = v_today - 1 and (extract(isodow from v_today) <> 1 or extract(hour from v_now) < 10))) then
    raise exception 'checkin_fora_da_janela';
  end if;
  if exists (select 1 from weeks where user_id = v_uid and week_start = date_trunc('week', p_date)::date) then
    raise exception 'checkin_fora_da_janela';
  end if;
  if p_routine_id is not null and not exists (select 1 from routines where id = p_routine_id and user_id = v_uid) then
    raise exception 'ficha_invalida';
  end if;
  insert into checkins (user_id, date, routine_id, muscle_groups)
  values (v_uid, p_date, p_routine_id, coalesce(p_muscles, '{}'))
  on conflict (user_id, date) do update set
    routine_id = coalesce(excluded.routine_id, checkins.routine_id),
    muscle_groups = case when p_muscles is null then checkins.muscle_groups else excluded.muscle_groups end;
end $$;

-- add_set: séries planejadas (done=false, carga/reps opcionais), RPE, e grupo/tipo ao criar o exercício.
drop function public.add_set(uuid, date, text, int, int, numeric);
create function public.add_set(
  p_id uuid, p_date date, p_exercise_name text, p_set_number int, p_reps int, p_weight_kg numeric,
  p_rpe numeric default null, p_done boolean default true, p_muscle_group text default null, p_kind text default null
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_checkin uuid;
  v_exercise uuid;
  v_name text := trim(p_exercise_name);
begin
  if v_uid is null then raise exception 'nao_autenticado'; end if;
  select id into v_checkin from checkins where user_id = v_uid and date = p_date;
  if v_checkin is null then raise exception 'sem_checkin'; end if;
  insert into exercises (user_id, name, muscle_group, kind) values (v_uid, v_name, p_muscle_group, p_kind)
  on conflict (user_id, lower(name)) do update set
    muscle_group = coalesce(exercises.muscle_group, excluded.muscle_group),
    kind = coalesce(exercises.kind, excluded.kind);
  select id into v_exercise from exercises where user_id = v_uid and lower(name) = lower(v_name);
  insert into workout_sets (id, user_id, checkin_id, exercise_id, set_number, reps, weight_kg, rpe, done)
  values (p_id, v_uid, v_checkin, v_exercise, p_set_number, p_reps, p_weight_kg, p_rpe, p_done)
  on conflict (id) do nothing;
end $$;

revoke execute on function public.do_checkin(date, uuid, text[]),
  public.add_set(uuid, date, text, int, int, numeric, numeric, boolean, text, text) from public, anon;
grant execute on function public.do_checkin(date, uuid, text[]),
  public.add_set(uuid, date, text, int, int, numeric, numeric, boolean, text, text) to authenticated;
