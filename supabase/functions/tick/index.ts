// Executada a cada hora pelo pg_cron (migração *_cron.sql). Só faz IO: o que gravar e enviar
// é decidido por planUserTick (regras puras e testadas em ../_shared/rules).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { localNow } from '../_shared/rules/dates.ts';
import { checkinsSince, planUserTick } from '../_shared/rules/tick.ts';
import type { ClosedWeek, Intensity } from '../_shared/rules/types.ts';
import { sendToUser } from './push.ts';

const CRON_SECRET = Deno.env.get('CRON_SECRET');

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: users, error } = await db.from('settings').select('*');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let weeksClosed = 0;
  let sent = 0;
  const failures: string[] = [];

  for (const s of users ?? []) {
    const uid: string = s.user_id;
    try {
      const [goals, freezes, weeks] = await Promise.all([
        db.from('goal_history').select('effective_week_start, weekly_goal').eq('user_id', uid),
        db.from('week_freezes').select('week_start').eq('user_id', uid),
        db.from('weeks').select('week_start, goal, done, status, penalty_amount, penalty_paid_at').eq('user_id', uid),
      ]);
      for (const r of [goals, freezes, weeks]) if (r.error) throw r.error;
      const closed = weeks.data!.map((w): ClosedWeek => ({
        weekStart: w.week_start, goal: w.goal, done: w.done, status: w.status,
        penaltyAmount: Number(w.penalty_amount), penaltyPaidAt: w.penalty_paid_at,
      }));
      const accountCreatedDate = localNow(new Date(s.created_at), s.timezone).date;
      // Só as semanas ainda abertas: o histórico inteiro passaria do limite de 1000 linhas da API.
      const checkins = await db.from('checkins').select('date').eq('user_id', uid).gte('date', checkinsSince(closed, accountCreatedDate));
      if (checkins.error) throw checkins.error;

      const now = localNow(new Date(), s.timezone);
      const plan = planUserTick({
        now,
        accountCreatedDate,
        settings: {
          preferredHour: s.preferred_hour,
          intensity: s.notification_intensity as Intensity,
          penaltyAmount: Number(s.penalty_amount),
          penaltyDescription: s.penalty_description,
          motivations: s.motivations ?? [],
        },
        goals: goals.data!.map((g) => ({ effectiveWeekStart: g.effective_week_start, weeklyGoal: g.weekly_goal })),
        checkinDates: checkins.data!.map((c) => c.date),
        freezes: freezes.data!.map((f) => f.week_start),
        closed,
      });

      if (plan.weeksToInsert.length) {
        const { data: inserted, error: e } = await db.from('weeks').upsert(
          plan.weeksToInsert.map((w) => ({
            user_id: uid, week_start: w.weekStart, goal: w.goal, done: w.done, status: w.status, penalty_amount: w.penaltyAmount,
          })),
          { onConflict: 'user_id,week_start', ignoreDuplicates: true },
        ).select('week_start');
        if (e) throw e;
        weeksClosed += inserted?.length ?? 0;
      }

      for (const n of plan.notifications) {
        // Registra antes de enviar: se outra execução já registrou este horário, não manda de novo.
        const { data: logged, error: e } = await db.from('notification_log').upsert(
          { user_id: uid, kind: n.kind, local_date: now.date, slot_hour: n.slotHour },
          { onConflict: 'user_id,kind,local_date,slot_hour', ignoreDuplicates: true },
        ).select('kind');
        if (e) throw e;
        if (logged?.length) sent += await sendToUser(db, uid, { title: n.title, body: n.body, tag: n.kind, url: '/' });
      }
    } catch (err) {
      console.error('tick falhou para usuário', uid, err);
      failures.push(uid);
    }
  }

  return Response.json({ users: users?.length ?? 0, weeksClosed, sent, failures: failures.length });
});
