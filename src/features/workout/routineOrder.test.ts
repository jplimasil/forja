import { nextPosition, reorder } from './routineOrder';

const ex = (id: string, position: number) => ({ id, position });

it('nova posição fica depois da maior, mesmo com buracos', () => {
  expect(nextPosition([ex('a', 0), ex('c', 2)])).toBe(3);
  expect(nextPosition([])).toBe(0);
});

it('mover renumera 0..n-1 e só envia o que mudou, mesmo com empates', () => {
  // empate em 2: A0, B2, C2 (lista já ordenada como aparece na tela)
  expect(reorder([ex('A', 0), ex('B', 2), ex('C', 2)], 0, 1)).toEqual([
    { id: 'B', position: 0 }, { id: 'A', position: 1 },
  ]);
  expect(reorder([ex('A', 0), ex('B', 1), ex('C', 2)], 2, -1)).toEqual([
    { id: 'C', position: 1 }, { id: 'B', position: 2 },
  ]);
});
