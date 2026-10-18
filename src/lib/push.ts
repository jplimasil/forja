import { useCallback, useEffect, useState } from 'react';
import { supabase, unwrap } from './supabase';
import { VAPID_PUBLIC_KEY } from './env';

export type PushStatus = 'subscribed' | 'can-subscribe' | 'needs-install-ios' | 'denied' | 'unsupported';

export function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export async function pushStatus(): Promise<PushStatus> {
  // No iPhone, push só existe para apps adicionados à Tela de Início.
  if (isIos() && !isStandalone()) return 'needs-install-ios';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'subscribed' : 'can-subscribe';
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function subscribePush(): Promise<void> {
  const key = VAPID_PUBLIC_KEY;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permissão de notificações não concedida.');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
  await saveSubscription(supabase, sub);
}

async function saveSubscription(db: Pick<typeof supabase, 'from'>, sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  unwrap(
    await db.from('push_subscriptions').upsert(
      { endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, user_agent: navigator.userAgent },
      { onConflict: 'endpoint' },
    ),
  );
}

/**
 * Regrava no servidor a inscrição deste aparelho, se existir. Roda ao abrir o app: cobre a linha
 * apagada pelo servidor (404/410), removida por engano ou um endpoint trocado pelo navegador.
 */
export async function syncPushSubscription(db: Pick<typeof supabase, 'from'> = supabase): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await saveSubscription(db, sub);
}

export async function unsubscribePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  unwrap(await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint));
  await sub.unsubscribe();
}

export function usePushStatus(): { status: PushStatus | null; refresh: () => void } {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const refresh = useCallback(() => {
    pushStatus().then(setStatus, () => setStatus('unsupported'));
  }, []);
  useEffect(refresh, [refresh]);
  return { status, refresh };
}
