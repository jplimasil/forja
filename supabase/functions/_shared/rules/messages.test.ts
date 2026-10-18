import { it, expect } from 'vitest';
import { reminderMessage, weeklySummaryMessage } from './messages.ts';

const m = { penaltyDescription: 'no cofrinho', need: 2, available: 2, motivations: ['ficar forte'], seed: 0 };
it('fire cita streak e multa', () => {
  for (let seed = 0; seed < 8; seed++) {
    const { body } = reminderMessage({ ...m, level: 'fire', streak: 6, penaltyAmount: 10, seed });
    expect(body).toContain('6 semanas');
    expect(body).toContain('R$10');
  }
});
it('streak 0 nunca vira "0 semanas"', () => {
  for (let seed = 0; seed < 8; seed++)
    expect(reminderMessage({ ...m, level: 'fire', streak: 0, penaltyAmount: 10, seed }).body).not.toContain('0 semanas');
});
it('sem motivos não quebra', () => {
  expect(reminderMessage({ ...m, motivations: [], level: 'green', streak: 1, penaltyAmount: 10, seed: 3 }).title).toBeTruthy();
});
it('resumo semanal failed cita multa', () => {
  expect(weeklySummaryMessage({ status: 'failed', streak: 0, penaltyAmount: 10, penaltyDescription: 'no cofrinho' }).body).toContain('R$10');
});

it('concordância no singular: "Falta 1 treino", nunca "Faltam 1 treino"', () => {
  for (const level of ['green', 'yellow', 'fire'] as const) {
    for (let seed = 0; seed < 8; seed++) {
      const { body } = reminderMessage({ ...m, need: 1, available: 3, level, streak: 2, penaltyAmount: 10, seed });
      expect(body).not.toContain('Faltam 1 ');
    }
  }
});
