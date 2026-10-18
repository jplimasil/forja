import type { RiskLevel, WeekStatus } from './types.ts';
import { formatMoney } from './money.ts';

export interface Msg { title: string; body: string }

interface Ctx { need: number; available: number; stakes: string; motivation: string }

const treinos = (n: number) => (n === 1 ? '1 treino' : `${n} treinos`);
const dias = (n: number) => (n === 1 ? '1 dia' : `${n} dias`);
export const semanas = (n: number) => (n === 1 ? '1 semana' : `${n} semanas`);

const TEMPLATES: Record<Exclude<RiskLevel, 'met'>, ((c: Ctx) => Msg)[]> = {
  green: [
    (c) => ({ title: 'Hora do treino', body: `Faltam ${treinos(c.need)} na semana. Bora fazer um hoje?` }),
    (c) => ({ title: 'Seu horário chegou', body: c.motivation ? `Lembra: ${c.motivation}. Vai lá.` : 'Treino de hoje garante a semana tranquila.' }),
    (c) => ({ title: 'Mantém o ritmo', body: `Treinar hoje deixa a semana leve: ${treinos(c.need)} para a meta.` }),
    () => ({ title: 'Partiu academia', body: 'O mais difícil é sair de casa. O resto é só repetição.' }),
  ],
  yellow: [
    (c) => ({ title: 'A semana está apertando', body: `Faltam ${treinos(c.need)} e restam ${dias(c.available)}. Hoje conta.` }),
    (c) => ({ title: 'Sem folga sobrando', body: `Se pular hoje, vai precisar treinar quase todo dia até domingo. Em jogo: ${c.stakes}.` }),
    (c) => ({ title: 'Não deixa acumular', body: c.motivation ? `${c.motivation}: isso não acontece pulando treino. Faltam ${treinos(c.need)}.` : `Faltam ${treinos(c.need)} em ${dias(c.available)}. Vai hoje.` }),
    (c) => ({ title: 'Hoje é dia', body: `Você tem ${dias(c.available)} para ${treinos(c.need)}. Não queime a margem.` }),
  ],
  fire: [
    (c) => ({ title: 'Hoje decide', body: `Sem treino hoje você perde ${c.stakes}.` }),
    (c) => ({ title: 'Não tem mais margem', body: `Cada dia até domingo precisa de treino. Pular hoje = perder ${c.stakes}.` }),
    (c) => ({ title: 'É agora', body: `${treinos(c.need)} em ${dias(c.available)}. Se faltar, vai embora ${c.stakes}.` }),
    (c) => ({ title: 'Levanta e vai', body: `Só 15 minutos já contam. O que está em jogo: ${c.stakes}.` }),
  ],
  red: [
    () => ({ title: 'A semana já foi', body: 'Mas não deixe a próxima ir junto. Vá hoje e chegue na segunda embalado.' }),
    (c) => ({ title: 'Recomeço começa hoje', body: c.motivation ? `Ainda vale: ${c.motivation}. Treina hoje.` : 'A meta escapou, o hábito não precisa escapar. Treina hoje.' }),
    () => ({ title: 'Não zera o hábito', body: 'A multa já veio. A disciplina você ainda pode manter.' }),
    () => ({ title: 'Volta pro jogo', body: 'Um treino hoje é o primeiro da próxima sequência.' }),
  ],
};

export function penaltyText(amount: number, description: string): string {
  return `${formatMoney(amount)} ${description}`.trim();
}

/** "seu streak de 6 semanas e R$10 no cofrinho" — sem citar streak quando é zero. */
export function stakesText(streak: number, penalty: string): string {
  return streak > 0 ? `seu streak de ${semanas(streak)} e ${penalty}` : penalty;
}

export function reminderMessage(p: {
  level: RiskLevel; streak: number; penaltyAmount: number; penaltyDescription: string;
  need: number; available: number; motivations: string[]; seed: number;
}): Msg {
  const list = TEMPLATES[p.level === 'met' ? 'green' : p.level];
  return list[p.seed % list.length]({
    need: p.need,
    available: p.available,
    stakes: stakesText(p.streak, penaltyText(p.penaltyAmount, p.penaltyDescription)),
    motivation: p.motivations.length ? p.motivations[p.seed % p.motivations.length] : '',
  });
}

export function weeklySummaryMessage(p: { status: WeekStatus; streak: number; penaltyAmount: number; penaltyDescription: string }): Msg {
  if (p.status === 'met') return { title: 'Semana batida! 🔥', body: `Streak: ${semanas(p.streak)}. Nova semana, mesma fome.` };
  if (p.status === 'frozen') {
    return { title: 'Semana congelada', body: p.streak > 0 ? `Streak mantido em ${semanas(p.streak)}. Agora é voltar com tudo.` : 'Agora é voltar com tudo.' };
  }
  return { title: 'Meta não batida', body: `Multa: ${penaltyText(p.penaltyAmount, p.penaltyDescription)}. Streak zerado. A nova semana começa agora.` };
}
