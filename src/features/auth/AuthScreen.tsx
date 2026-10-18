import { useState, type FormEvent } from 'react';
import { signIn, signUp } from '../../lib/auth';
import { Button } from '../../ui/Button';

type Mode = 'entrar' | 'criar';

const inputClass =
  'w-full rounded-xl border border-line bg-card px-4 py-3.5 text-base text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'entrar') {
        await signIn(email, password);
      } else if (!(await signUp(email, password))) {
        setInfo('Conta criada. Abra o link que enviamos para o seu e-mail e depois entre aqui.');
        setMode('entrar');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative flex flex-col justify-end overflow-hidden px-6 pb-10 pt-[max(3rem,env(safe-area-inset-top))] lg:justify-center lg:px-16">
        <p className="font-display text-[clamp(5.5rem,26vw,13rem)] leading-[0.82] text-accent">FORJA</p>
        <p className="mt-5 max-w-sm font-head text-2xl font-medium leading-tight text-fg/90">
          Constância não se encontra. Se forja, um treino por vez.
        </p>
      </div>

      <div className="flex items-start px-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:items-center lg:px-16">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h1 className="font-head text-3xl font-bold">{mode === 'entrar' ? 'Entrar' : 'Criar conta'}</h1>
          <label className="block space-y-1.5">
            <span className="text-sm text-muted">E-mail</span>
            <input className={inputClass} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-muted">Senha</span>
            <input
              className={inputClass}
              type="password"
              minLength={6}
              autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {info && <p role="status" className="text-sm text-accent">{info}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
          </Button>
          <button
            type="button"
            onClick={() => { setMode(mode === 'entrar' ? 'criar' : 'entrar'); setError(null); }}
            className="w-full py-2 text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
          >
            {mode === 'entrar' ? 'Primeira vez aqui? Criar conta' : 'Já tenho conta. Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
