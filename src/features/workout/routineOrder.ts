/** Posição para um exercício novo: depois da maior existente (posições podem ter buracos). */
export function nextPosition(list: { position: number }[]): number {
  return list.reduce((m, e) => Math.max(m, e.position + 1), 0);
}

/**
 * Move o item `i` uma casa (`dir`) e renumera a lista inteira 0..n-1 na nova ordem, o que desfaz empates.
 * Devolve só os itens cuja posição mudou. `list` deve estar na ordem em que aparece na tela.
 */
export function reorder<T extends { id: string; position: number }>(list: T[], i: number, dir: -1 | 1): { id: string; position: number }[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return [];
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next.flatMap((e, position) => (e.position === position ? [] : [{ id: e.id, position }]));
}
