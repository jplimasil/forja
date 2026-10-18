import webpush from 'npm:web-push@3.6.7';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { Msg } from '../_shared/rules/messages.ts';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

/** Envia para todos os aparelhos do usuário; remove inscrições que o serviço de push diz não existirem mais. */
export async function sendToUser(db: SupabaseClient, userId: string, msg: Msg & { tag?: string; url?: string }): Promise<number> {
  const { data: subs, error } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId);
  if (error) throw error;
  let delivered = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(msg),
        { TTL: 60 * 60, urgency: 'high' },
      );
      delivered++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.from('push_subscriptions').delete().eq('id', s.id);
      } else {
        console.error('push falhou', userId, status, (err as Error).message);
      }
    }
  }
  return delivered;
}
