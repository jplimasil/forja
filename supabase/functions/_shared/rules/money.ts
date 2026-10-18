/** R$10 para inteiros, R$12,50 para valores com centavos. */
export function formatMoney(n: number): string {
  return Number.isInteger(n) ? `R$${n}` : `R$${n.toFixed(2).replace('.', ',')}`;
}
