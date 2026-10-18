import { persistOptions } from './queryClient';

it('cache salvo no aparelho tem versão, para descartar dados no formato antigo', () => {
  expect(persistOptions.buster).toBe('treino-v2');
});
