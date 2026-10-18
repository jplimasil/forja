-- Teste de regras anti-trapaça no servidor. Roda numa transação desfeita no final:
--   npx supabase db query --linked -f supabase/tests/anti_trapaca.sql
-- Termina com a linha 'OK'; qualquer falha interrompe com erro 'FALHOU: ...'.
begin;
insert into auth.users (id, instance_id, aud, role, email)
values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teste-forja@example.invalid');
insert into public.settings (user_id) values ('00000000-0000-0000-0000-0000000000f1');
insert into public.goal_history (user_id, effective_week_start, weekly_goal)
values ('00000000-0000-0000-0000-0000000000f1', date_trunc('week', now() at time zone 'America/Sao_Paulo')::date - 28, 4);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);

do $$ begin
  begin
    update public.settings set created_at = now() + interval '1 year';
    raise exception 'FALHOU: created_at editável pelo cliente';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.week_freezes (week_start) values (date_trunc('week', now() at time zone 'America/Sao_Paulo')::date - 7);
    raise exception 'FALHOU: congelamento direto na tabela';
  exception when insufficient_privilege then null;
  end;
end $$;

-- configurações continuam editáveis
update public.settings set penalty_amount = 15, preferred_hour = 19;

select public.freeze_week();
do $$ begin
  if not exists (select 1 from public.week_freezes where week_start = date_trunc('week', now() at time zone 'America/Sao_Paulo')::date) then
    raise exception 'FALHOU: freeze_week não congelou a semana atual';
  end if;
  begin
    perform public.freeze_week();
    raise exception 'FALHOU: congelou duas vezes';
  exception when raise_exception then
    if sqlerrm not like 'congelamento_%' then raise; end if;
  end;
end $$;
select public.unfreeze_week();
do $$ begin
  if exists (select 1 from public.week_freezes) then raise exception 'FALHOU: unfreeze_week não descongelou'; end if;
end $$;

select 'OK' as resultado;
rollback;
