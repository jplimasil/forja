-- FORJA: regras de cobrança garantidas no servidor, não só no app.
-- Teste: supabase/tests/anti_trapaca.sql

-- settings.created_at define a semana de aquecimento: o cliente não pode alterá-la.
revoke insert, update on public.settings from authenticated;
grant insert (user_id, preferred_hour, timezone, penalty_amount, penalty_description, notification_intensity, motivations)
  on public.settings to authenticated;
grant update (user_id, preferred_hour, timezone, penalty_amount, penalty_description, notification_intensity, motivations)
  on public.settings to authenticated;

-- Congelamento só pelas RPCs abaixo, sempre da semana atual (espelha canFreeze em rules/freeze.ts).
drop policy own_all on public.week_freezes;
create policy own_select on public.week_freezes for select to authenticated using (user_id = auth.uid());

create or replace function public.freeze_week() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_week date;
  v_goal int;
  v_done int;
begin
  if v_uid is null then raise exception 'nao_autenticado'; end if;
  v_week := date_trunc('week', user_local_now(v_uid))::date;
  if exists (select 1 from week_freezes where user_id = v_uid and week_start = v_week) then
    raise exception 'congelamento_ja_existe';
  end if;
  select weekly_goal into v_goal from goal_history
    where user_id = v_uid and effective_week_start <= v_week order by effective_week_start desc limit 1;
  select count(*) into v_done from checkins where user_id = v_uid and date between v_week and v_week + 6;
  if v_goal is not null and v_done >= v_goal then raise exception 'congelamento_meta_batida'; end if;
  if exists (select 1 from week_freezes where user_id = v_uid and date_trunc('month', week_start) = date_trunc('month', v_week)) then
    raise exception 'congelamento_limite_mensal';
  end if;
  insert into week_freezes (user_id, week_start) values (v_uid, v_week);
end $$;

create or replace function public.unfreeze_week() returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'nao_autenticado'; end if;
  delete from week_freezes where user_id = v_uid and week_start = date_trunc('week', user_local_now(v_uid))::date;
end $$;

revoke execute on function public.freeze_week(), public.unfreeze_week() from public, anon;
grant execute on function public.freeze_week(), public.unfreeze_week() to authenticated;
