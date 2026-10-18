-- Teste da aba Treino no servidor (fichas, músculos, séries planejadas, RPE). Transação desfeita no final:
--   npx supabase db query --linked -f supabase/tests/treino.sql
-- Termina com 'OK'; qualquer falha interrompe com 'FALHOU: ...'.
begin;
insert into auth.users (id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teste-treino-a@example.invalid'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teste-treino-b@example.invalid');
insert into public.settings (user_id) values ('00000000-0000-0000-0000-0000000000f2'), ('00000000-0000-0000-0000-0000000000f3');
insert into public.routines (id, user_id, name, position) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f2', 'Treino A', 0),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f3', 'Ficha alheia', 0);
-- dados de outra pessoa
insert into public.exercises (id, user_id, name) values ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000f3', 'Supino alheio');
insert into public.checkins (id, user_id, date) values ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000f3', current_date - 30);
insert into public.workout_sets (id, user_id, checkin_id, exercise_id, set_number, reps, weight_kg, done) values
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000e3', 1, 10, 50, true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);

do $$
declare
  d date := (now() at time zone 'America/Sao_Paulo')::date;
  n int;
begin
  perform public.do_checkin(d, '00000000-0000-0000-0000-0000000000a1', '{peito,biceps}');
  if not exists (select 1 from public.checkins where date = d and routine_id = '00000000-0000-0000-0000-0000000000a1' and muscle_groups = '{peito,biceps}') then
    raise exception 'FALHOU: ficha e músculos não gravados';
  end if;

  perform public.do_checkin(d, null, '{costas}');
  if not exists (select 1 from public.checkins where date = d and routine_id = '00000000-0000-0000-0000-0000000000a1' and muscle_groups = '{costas}') then
    raise exception 'FALHOU: atualizar músculos apagou a ficha ou não atualizou';
  end if;

  begin
    perform public.do_checkin(d, '00000000-0000-0000-0000-0000000000b1', null);
    raise exception 'FALHOU: aceitou ficha de outra pessoa';
  exception when raise_exception then
    if sqlerrm <> 'ficha_invalida' then raise; end if;
  end;

  begin
    perform public.do_checkin(d, null, '{braco}');
    raise exception 'FALHOU: aceitou grupo muscular inválido';
  exception when check_violation then null;
  end;

  perform public.add_set('00000000-0000-0000-0000-0000000000d1', d, 'Supino reto', 1, null, null, null, false, 'peito', 'composto');
  if not exists (select 1 from public.workout_sets where id = '00000000-0000-0000-0000-0000000000d1' and not done and reps is null) then
    raise exception 'FALHOU: série planejada sem carga não foi criada';
  end if;
  if not exists (select 1 from public.exercises where name = 'Supino reto' and muscle_group = 'peito' and kind = 'composto') then
    raise exception 'FALHOU: exercício novo sem grupo/tipo';
  end if;

  begin
    update public.workout_sets set done = true where id = '00000000-0000-0000-0000-0000000000d1';
    raise exception 'FALHOU: marcou concluída sem carga';
  exception when check_violation then null;
  end;

  update public.workout_sets set reps = 10, weight_kg = 80, rpe = 8.5, done = true where id = '00000000-0000-0000-0000-0000000000d1';
  if not exists (select 1 from public.workout_sets where id = '00000000-0000-0000-0000-0000000000d1' and done and rpe = 8.5) then
    raise exception 'FALHOU: edição da série';
  end if;

  begin
    update public.workout_sets set rpe = 8.3 where id = '00000000-0000-0000-0000-0000000000d1';
    raise exception 'FALHOU: aceitou RPE fora de passos de 0,5';
  exception when check_violation then null;
  end;

  update public.workout_sets set reps = 1 where id = '00000000-0000-0000-0000-0000000000d3';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: editou série de outra pessoa'; end if;
end $$;

select 'OK' as resultado;
rollback;
