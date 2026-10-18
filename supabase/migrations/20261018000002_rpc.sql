-- FORJA: operações validadas no servidor. Espelham as regras de supabase/functions/_shared/rules.

-- Agora local do usuário (sem fuso), a partir de settings.timezone.
create or replace function public.user_local_now(p_uid uuid) returns timestamp
language sql stable security definer set search_path = public as $$
  select now() at time zone coalesce((select timezone from settings where user_id = p_uid), 'America/Sao_Paulo');
$$;
revoke execute on function public.user_local_now(uuid) from public, anon, authenticated;

-- Espelha canCheckin (rules/checkin.ts): hoje, ou ontem salvo segunda a partir das 10h.
create or replace function public.do_checkin(p_date date) returns void
language plpgsql security definer set search_path = public as $$
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
  insert into checkins (user_id, date) values (v_uid, p_date) on conflict (user_id, date) do nothing;
end $$;

-- Espelha canUndoCheckin: só o check-in de hoje. Séries do dia vão junto (cascade).
create or replace function public.undo_checkin(p_date date) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'nao_autenticado'; end if;
  if p_date <> user_local_now(v_uid)::date then raise exception 'desfazer_fora_da_janela'; end if;
  delete from checkins where user_id = v_uid and date = p_date;
end $$;

-- Série de treino; o id vem do cliente para que o reenvio da fila offline seja idempotente.
create or replace function public.add_set(
  p_id uuid, p_date date, p_exercise_name text, p_set_number int, p_reps int, p_weight_kg numeric
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_checkin uuid;
  v_exercise uuid;
  v_name text := trim(p_exercise_name);
begin
  if v_uid is null then raise exception 'nao_autenticado'; end if;
  select id into v_checkin from checkins where user_id = v_uid and date = p_date;
  if v_checkin is null then raise exception 'sem_checkin'; end if;
  insert into exercises (user_id, name) values (v_uid, v_name) on conflict (user_id, lower(name)) do nothing;
  select id into v_exercise from exercises where user_id = v_uid and lower(name) = lower(v_name);
  insert into workout_sets (id, user_id, checkin_id, exercise_id, set_number, reps, weight_kg)
  values (p_id, v_uid, v_checkin, v_exercise, p_set_number, p_reps, p_weight_kg)
  on conflict (id) do nothing;
end $$;

-- Meta: a primeira vale já na semana atual (aquecimento); mudanças valem da próxima segunda.
create or replace function public.set_goal(p_goal int) returns date
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_week date;
  v_effective date;
begin
  if v_uid is null then raise exception 'nao_autenticado'; end if;
  v_week := date_trunc('week', user_local_now(v_uid))::date;
  v_effective := case when exists (select 1 from goal_history where user_id = v_uid) then v_week + 7 else v_week end;
  insert into goal_history (user_id, effective_week_start, weekly_goal) values (v_uid, v_effective, p_goal)
  on conflict (user_id, effective_week_start) do update set weekly_goal = excluded.weekly_goal;
  return v_effective;
end $$;

revoke execute on function public.do_checkin(date), public.undo_checkin(date),
  public.add_set(uuid, date, text, int, int, numeric), public.set_goal(int) from public, anon;
grant execute on function public.do_checkin(date), public.undo_checkin(date),
  public.add_set(uuid, date, text, int, int, numeric), public.set_goal(int) to authenticated;
