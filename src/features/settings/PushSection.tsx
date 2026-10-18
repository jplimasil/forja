import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscribePush, unsubscribePush, usePushStatus, type PushStatus } from '../../lib/push';
import { supabase, unwrap } from '../../lib/supabase';
import { notifyError } from '../../lib/errors';
import { Button } from '../../ui/Button';

export const PUSH_HELP: Record<Exclude<PushStatus, 'subscribed' | 'can-subscribe'>, string> = {
  'needs-install-ios': 'No iPhone, as notificações só funcionam com o FORJA na Tela de Início: no Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início". Abra o app pelo ícone e volte aqui.',
  denied: 'As notificações estão bloqueadas para o FORJA. Libere nas configurações do navegador ou do celular e volte aqui.',
  unsupported: 'Este navegador não recebe notificações. No celular, use o app instalado na Tela de Início.',
};

function deviceName(ua: string | null): string {
  if (!ua) return 'Aparelho';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS/.test(ua)) return 'Mac';
  return 'Aparelho';
}

interface Device { id: string; user_agent: string | null; created_at: string }

export function PushSection() {
  const { status, refresh } = usePushStatus();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const devices = useQuery({
    queryKey: ['pushDevices'],
    queryFn: async (): Promise<Device[]> =>
      unwrap(await supabase.from('push_subscriptions').select('id, user_agent, created_at').order('created_at')) ?? [],
  });

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(false);
      refresh();
      void qc.invalidateQueries({ queryKey: ['pushDevices'] });
    }
  }

  async function removeDevice(id: string) {
    await run(async () => {
      unwrap(await supabase.from('push_subscriptions').delete().eq('id', id));
    });
  }

  return (
    <div className="space-y-4 rounded-2xl bg-card p-5">
      <p className="font-head text-lg font-semibold">Notificações neste aparelho</p>
      {status === 'subscribed' && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-accent">Ativadas.</p>
          <Button variant="ghost" disabled={busy} onClick={() => run(unsubscribePush)}>Desativar neste aparelho</Button>
        </div>
      )}
      {status === 'can-subscribe' && (
        <Button disabled={busy} onClick={() => run(subscribePush)}>Ativar notificações</Button>
      )}
      {status && status !== 'subscribed' && status !== 'can-subscribe' && <p className="text-sm text-muted">{PUSH_HELP[status]}</p>}

      {(devices.data?.length ?? 0) > 0 && (
        <div>
          <p className="text-sm text-muted">Aparelhos que recebem lembretes</p>
          <ul className="mt-2 divide-y divide-line">
            {devices.data!.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {deviceName(d.user_agent)}
                  <span className="text-muted"> desde {new Date(d.created_at).toLocaleDateString('pt-BR')}</span>
                </span>
                <button type="button" onClick={() => removeDevice(d.id)} className="text-muted hover:text-danger">Remover</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
