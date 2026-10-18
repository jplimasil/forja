# FORJA — Aba Treino "Kinetic Stealth"

**Data:** 2026-10-18
**Status:** aguardando revisão
**Base:** app FORJA existente (spec `2026-10-18-app-constancia-academia-design.md`). Referências visuais do usuário: mockup `code.html` e `DESIGN.md` "Kinetic Stealth".

## 1. Objetivo

Transformar a aba Treino num registro de treino completo no estilo do mockup: marcar que treinou e os grupos musculares do dia, seguir fichas de treino com séries pré-preenchidas, marcar cada série (carga, reps, RPE, ✓), ver tonelagem, PRs e evolução.

**Sucesso:** no dia de treino, um toque registra o treino com a ficha; a tabela já vem com as cargas da última vez; marcar séries funciona offline; os gráficos mostram progresso real.

**Fora de escopo:** cronômetro e início/fim de treino; frequência cardíaca; fotos; selo "encriptado"; mapa anatômico; meta de volume ("88% da meta"); migrar as outras abas para o novo visual (será feito aos poucos, depois); mais de um treino por dia.

## 2. Regras que não mudam

- Um check-in por dia continua sendo a unidade de presença. Semana, streak, multa, congelamento e notificações seguem contando **check-ins**, não séries.
- Janela do check-in (hoje, ou ontem até segunda 10h) vale também para registrar o treino.
- O "Treinei hoje" do Início continua fazendo só o check-in.

## 3. Dados (migração `*_treino.sql`)

**Grupos musculares** (chave → rótulo): `peito` Peito, `costas` Costas, `ombros` Ombros, `biceps` Bíceps, `triceps` Tríceps, `quadriceps` Quadríceps, `posterior` Posterior, `gluteos` Glúteos, `panturrilha` Panturrilha, `abdomen` Abdômen.
**Tipo de exercício:** `composto` | `isolador`.

| Tabela | Mudança |
|---|---|
| `exercises` | + `muscle_group text null` (check nas 10 chaves), + `kind text null` (check `composto`/`isolador`) |
| `routines` (nova) | `id`, `user_id`, `name` (1–60 caracteres), `position int`, `created_at`; RLS dono (todas as operações) |
| `routine_exercises` (nova) | `id`, `user_id`, `routine_id → routines on delete cascade`, `exercise_id → exercises on delete cascade`, `position int`, `target_sets int` (1–10); RLS dono |
| `checkins` | + `routine_id uuid null → routines on delete set null`, + `muscle_groups text[] not null default '{}'` (só chaves válidas) |
| `workout_sets` | `reps` e `weight_kg` passam a aceitar null (série planejada sem histórico); + `rpe numeric(3,1) null` (1–10, múltiplos de 0,5); + `done boolean not null default false`; séries existentes recebem `done = true`; check: `done` exige `reps` e `weight_kg` preenchidos |

**RPCs:**
- `do_checkin(p_date date, p_routine_id uuid default null, p_muscles text[] default null)` — substitui a versão de 1 parâmetro (mesma janela e mesmos erros). Insere o check-in; se já existir, atualiza `routine_id`/`muscle_groups` quando os parâmetros vierem não nulos. `p_routine_id` precisa ser do próprio usuário.
- `add_set(p_id, p_date, p_exercise_name, p_set_number, p_reps, p_weight_kg, p_rpe default null, p_done default true, p_muscle_group default null, p_kind default null)` — substitui a versão atual; idempotente por `p_id`; ao criar exercício novo grava grupo e tipo; se o exercício existir sem grupo/tipo, preenche.
- Edição de série (`reps`, `weight_kg`, `rpe`, `done`) e de exercício (`muscle_group`, `kind`): update direto com RLS de dono e grant só dessas colunas.

## 4. Fluxo

**Antes do registro do dia:** cartão "Qual foi o treino de hoje?" com as fichas + "Treino livre" e as tags de grupo (pré-marcadas com os grupos dos exercícios da ficha; editáveis). Botão **REGISTRAR TREINO**:
1. enfileira `do_checkin(hoje, ficha, músculos)`;
2. se houver ficha, enfileira um `add_set` com `done=false` para cada série planejada (seção 5, pré-preenchimento).
Tudo pela fila offline existente (mesmo `scope`, em ordem, com nova tentativa em erro de rede), com atualização otimista do cache.
Se já houver check-in (feito pelo Início), o cartão completa o registro com ficha e músculos.

**Treino registrado:** status `TREINO REGISTRADO // <ficha ou TREINO LIVRE>`, tags editáveis; cartões **Tonelagem hoje** (+ variação) e **Séries concluídas** (`x/y`); "Exercícios programados x/y"; um cartão por exercício com tabela `SET · CARGA · REPS · RPE · ✓`, selo PR, "+ Adicionar série" (copia carga/reps da última série do exercício no dia, `done=false`), menu ⋮ (editar grupo/tipo; remover exercício do dia = apagar suas séries do dia). "+ Adicionar exercício ao treino": escolher existente ou criar com nome, grupo e tipo. Sem botão finalizar: tudo salva na hora.
Marcar ✓ numa série sem carga ou reps abre a edição desses campos primeiro.

**Evolução** (sempre, no fim da aba): 1RM estimado por exercício (seletor) e séries por grupo muscular na semana.

**Minhas fichas** (rota `/treino/fichas`): listar, criar, renomear, apagar; adicionar exercício (existente ou novo com grupo/tipo) com séries-alvo; reordenar com ↑/↓; remover.

## 5. Cálculos (`src/features/workout/stats.ts`, puros e testados)

- **Tonelagem do dia:** Σ `weight_kg × reps` das séries `done` da data.
- **Comparação:** sessão anterior = data mais recente < hoje com séries `done` e mesma ficha (se o dia tem ficha) ou qualquer ficha (treino livre). Variação % = (hoje − anterior) / anterior; oculta sem anterior ou anterior = 0.
- **Séries concluídas:** `done` / total do dia. **Exercícios concluídos:** exercícios do dia com todas as séries `done` / exercícios do dia.
- **1RM estimado (Epley):** `reps = 1` → carga; senão `carga × (1 + reps/30)`; só séries `done`.
- **PR:** no dia, a série `done` de maior 1RM estimado de um exercício recebe o selo se superar o maior 1RM estimado de todas as datas anteriores desse exercício. Primeira sessão do exercício não gera PR.
- **Gráfico 1RM:** melhor 1RM estimado por semana (segunda a domingo) nas últimas 6 semanas, incluindo a atual; semanas sem dado omitidas.
- **Volume por grupo:** séries `done` da semana atual agrupadas pelo `muscle_group` do exercício; sem grupo → "Sem grupo".
- **Pré-preenchimento da ficha:** para cada exercício da ficha, com `target_sets = n`, pega as séries `done` da sessão mais recente anterior a hoje que tenha esse exercício; a série planejada i recebe carga/reps da série i dessa sessão (ou da última, se houver menos); sem histórico → carga e reps vazios. `rpe` vazio, `done=false`, `set_number` 1..n.

## 6. Visual (só Treino e Fichas, por enquanto)

Tokens novos com prefixo próprio (`k-`), ao lado dos atuais:
- Cores: base `#0B0D0F`; superfícies `#121519`, `#181C22`, `#20252E`; borda `#242A35`; destaque `#CCFF00` (brilho `rgba(204,255,0,.15–.45)`); texto `#FFFFFF`, secundário `#9BA3AF`, apagado `#525C6A`; perigo `#FF3344`.
- Fontes (Fontsource, só latin, offline): Bebas Neue (títulos e números de destaque), Montserrat 400–700 (texto), JetBrains Mono 500–700 (números da tabela, rótulos em caixa alta com espaçamento).
- Formas: cantos 4px; pílula só em chips de status (PR, tags). Bordas finas em vez de sombras borradas; brilho verde só em ação principal e item ativo.
- Ícones em SVG embutido (sem fonte Material Symbols).
- Linhas de série com altura mínima de 48px.
- Nenhum número decorativo: todo dado exibido vem dos registros.

## 7. Testes

- **Unitários** (`stats.test.ts`): tonelagem (só `done`), comparação com sessão anterior (com/sem ficha, sem anterior), Epley (reps 1), PR (primeira sessão sem PR; só a melhor do dia), semanas do gráfico, volume por grupo (sem grupo), pré-preenchimento (sem histórico, menos séries que o alvo).
- **Banco** (`supabase/tests/treino.sql`, transação com rollback): `do_checkin` com ficha e músculos; recusa de ficha de outro usuário; recusa de grupo inválido; `add_set` planejado (`done=false`, reps nulos); série `done` sem carga recusada; update de série de outro usuário bloqueado.
- **Telas:** estado antes/depois do registro; marcar ✓ e editar carga; criar ficha e adicionar exercício.
- **Visual:** capturas celular (390px) e computador.
