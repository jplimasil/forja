import { fetchAll } from './supabase';

it('fetchAll pagina além do limite de 1000 linhas do PostgREST', async () => {
  const calls: [number, number][] = [];
  const rows = await fetchAll(async (from, to) => {
    calls.push([from, to]);
    const n = from === 0 ? 1000 : 5;
    return { data: Array.from({ length: n }, (_, i) => from + i), error: null };
  });
  expect(rows).toHaveLength(1005);
  expect(calls).toEqual([[0, 999], [1000, 1999]]);
});
