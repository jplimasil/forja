import { pushStatus, syncPushSubscription } from './push';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

function env(o: { ua: string; standalone?: boolean; push?: boolean; permission?: NotificationPermission }) {
  vi.stubGlobal('navigator', {
    userAgent: o.ua, maxTouchPoints: 0, platform: 'x',
    serviceWorker: { getRegistration: async () => ({ pushManager: { getSubscription: async () => null } }) },
  });
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('standalone') && !!o.standalone }));
  if (o.push) vi.stubGlobal('PushManager', function PushManager() {});
  else Reflect.deleteProperty(window, 'PushManager');
  vi.stubGlobal('Notification', { permission: o.permission ?? 'default' });
}

afterEach(() => vi.unstubAllGlobals());

it('iPhone fora da tela inicial precisa instalar', async () => {
  env({ ua: IPHONE, standalone: false, push: true });
  expect(await pushStatus()).toBe('needs-install-ios');
});

it('permissão negada', async () => {
  env({ ua: CHROME, push: true, permission: 'denied' });
  expect(await pushStatus()).toBe('denied');
});

it('navegador sem PushManager não suporta', async () => {
  env({ ua: CHROME, push: false });
  expect(await pushStatus()).toBe('unsupported');
});

it('suportado e ainda não inscrito', async () => {
  env({ ua: IPHONE, standalone: true, push: true });
  expect(await pushStatus()).toBe('can-subscribe');
});

describe('syncPushSubscription', () => {
  const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
  beforeEach(() => upsert.mockClear());

  function withSub(sub: object | null, permission: NotificationPermission) {
    vi.stubGlobal('navigator', {
      userAgent: CHROME, maxTouchPoints: 0, platform: 'x',
      serviceWorker: { getRegistration: async () => ({ pushManager: { getSubscription: async () => sub } }) },
    });
    vi.stubGlobal('PushManager', function PushManager() {});
    vi.stubGlobal('Notification', { permission });
  }
  const sub = { endpoint: 'https://push.example/abc', toJSON: () => ({ keys: { p256dh: 'p', auth: 'a' } }) };

  it('regrava no servidor a inscrição existente deste aparelho', async () => {
    withSub(sub, 'granted');
    await syncPushSubscription({ from: () => ({ upsert }) } as never);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ endpoint: 'https://push.example/abc', p256dh: 'p', auth: 'a' }), { onConflict: 'endpoint' });
  });

  it('sem inscrição ou sem permissão não grava nada', async () => {
    withSub(null, 'granted');
    await syncPushSubscription({ from: () => ({ upsert }) } as never);
    withSub(sub, 'default');
    await syncPushSubscription({ from: () => ({ upsert }) } as never);
    expect(upsert).not.toHaveBeenCalled();
  });
});
