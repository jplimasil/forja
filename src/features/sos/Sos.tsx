import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { penaltyText, stakesText, treinos } from '@rules/messages.ts';
import { useWeekState } from '../../data/useWeekState';
import { useCheckin } from '../../data/checkins';
import { Button } from '../../ui/Button';

export function Sos() {
  const s = useWeekState();
  const checkin = useCheckin();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  if (!s) return null;

  const { motivations, penaltyAmount, penaltyDescription } = s.settings;
  const stakes = stakesText(s.streak, penaltyText(penaltyAmount, penaltyDescription));

  const cards: { title: string; body: ReactNode }[] = [
    {
      title: 'Lembra por que você começou',
      body: motivations.length ? (
        <ul className="space-y-4">
          {motivations.map((m) => (
            <li key={m} className="border-l-4 border-accent pl-4 font-head text-3xl font-semibold leading-tight">{m}</li>
          ))}
        </ul>
      ) : (
        <p className="font-head text-3xl font-semibold leading-tight">Você começou isso por um motivo. Lembra qual era?</p>
      ),
    },
    {
      title: 'O que está em jogo',
      body: (
        <div className="space-y-4">
          <p data-testid="stakes" className="font-head text-3xl font-semibold leading-tight">
            {s.warmup
              ? 'Esta semana ainda é de aquecimento. O hábito que você cria agora é o que vai valer a partir de segunda.'
              : `Nesta semana estão em jogo ${stakes}.`}
          </p>
          {!s.warmup && s.progress.need > 0 && (
            <p className="text-muted">Faltam {treinos(s.progress.need)} para fechar a semana.</p>
          )}
        </div>
      ),
    },
    {
      title: 'Só 15 minutos',
      body: (
        <div className="space-y-4">
          <p className="font-head text-3xl font-semibold leading-tight">
            Vá e faça só o aquecimento. Se depois de 15 minutos quiser ir embora, pode ir: o treino conta.
          </p>
          <p className="text-muted">Quase sempre, o mais difícil é sair de casa. Quando você já está lá, o resto vem.</p>
        </div>
      ),
    },
  ];
  const last = step === cards.length - 1;

  function went() {
    checkin.mutate(s!.now.date);
    navigate('/', { replace: true });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-xl flex-col">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-muted hover:text-fg">Voltar</Link>
        <p className="text-sm text-muted tabular" aria-label={`Cartão ${step + 1} de ${cards.length}`}>{step + 1}/{cards.length}</p>
      </div>

      <section key={step} className="flex-1 py-10">
        <h1 className="mb-8 font-display text-5xl uppercase leading-[0.95] text-accent sm:text-6xl">{cards[step].title}</h1>
        {cards[step].body}
      </section>

      {last ? (
        <div className="space-y-3">
          <Button className="h-16 w-full text-2xl" onClick={went}>Fui! Registrar treino</Button>
          <p className="text-center text-sm text-muted">Toque quando chegar na academia.</p>
        </div>
      ) : (
        <Button className="h-14 w-full" onClick={() => setStep(step + 1)}>Próximo</Button>
      )}
    </div>
  );
}
