# FORJA — App de constância na academia

**Data:** 2026-10-18
**Status:** aguardando revisão

## 1. Objetivo

Web app pessoal que ajuda a manter constância na academia. Ataca os quatro motivos de falta relatados:

| Motivo | Resposta do app |
|---|---|
| Esquecimento / perder a hora | Notificações push no horário preferido, mesmo com o app fechado |
| Preguiça na hora | Tela "Tô sem vontade" (motivos próprios, o que está em jogo, desafio "Só 15 minutos") |
| Falta de compromisso | Streak de semanas, penalidade simbólica, notificações que endurecem conforme o risco |
| Não ver progresso | Calendário de frequência, gráficos de carga por exercício, peso e medidas |

**Sucesso:** o usuário bate a meta semanal com consistência e o app o alcança no momento certo sem depender de ser aberto.

**Fora de escopo:** fotos de evolução, parceiro de cobrança, recursos sociais, tema claro, app nativo, multiusuário além do próprio dono.

## 2. Plataforma e stack

- **Front-end:** React + TypeScript (Vite), Tailwind CSS, React Router, Recharts, TanStack Query (com persistência e fila offline de mutações), `vite-plugin-pwa`, `date-fns` + `date-fns-tz`.
- **Back-end:** Supabase — Auth (e-mail + senha), Postgres com RLS, Edge Function agendada via `pg_cron` a cada hora.
- **Push:** Web Push com chaves VAPID; envio pela Edge Function com a biblioteca `web-push`.
- **Hospedagem:** Vercel (front), Supabase (back). Tudo no plano gratuito.
- **Dispositivos:** celular (PWA instalado na tela inicial; no iPhone exige iOS 16.4+ e "Adicionar à Tela de Início" para receber push) e PC (navegador), sincronizados pela conta.
- **Segurança:** após criar a própria conta, o cadastro público é desativado no Supabase. Toda tabela tem RLS `user_id = auth.uid()`.
- **Fuso horário:** guardado em `settings.timezone` (padrão `America/Sao_Paulo`). Todas as regras de dia/semana usam o fuso do usuário.

## 3. Regras de negócio

Todas implementadas como funções puras em `shared/` (sem acesso a banco ou UI), usadas pelo front e pela Edge Function, e cobertas por testes unitários.

### 3.1 Semana
- Semana = segunda 00:00 a domingo 23:59 no fuso do usuário. Identificada pela data da segunda (`week_start`).
- A semana atual é calculada a partir dos check-ins; só é gravada em `weeks` quando fecha.
- **Fechamento:** segunda às 10:00 locais, a semana anterior é fechada. (A janela até 10h permite registrar o treino de domingo na segunda de manhã.)
- **Semana de aquecimento:** a semana em que a conta é criada mostra progresso, mas não gera status, streak ou multa. A primeira semana avaliada é a segunda-feira seguinte.

### 3.2 Check-in
- No máximo um check-in por data.
- Permitido para **hoje** ou **ontem** (datas locais). Check-in de ontem que pertença a uma semana já fechada é recusado.
- Validado no servidor por uma função RPC `do_checkin(date)`; o cliente nunca grava direto na tabela. Check-ins feitos offline entram na fila e, se ao sincronizar já estiverem fora da janela, a recusa é mostrada ao usuário.
- Check-in pode ser desfeito apenas no mesmo dia.

### 3.3 Meta
- Meta = número de treinos por semana (1 a 7).
- Mudança de meta vale **a partir da próxima semana**. Guardada em `goal_history(effective_week_start, weekly_goal)`; a meta de uma semana é a entrada mais recente com `effective_week_start <= week_start`.

### 3.4 Nível de risco (semana atual)
- `feitos` = check-ins da semana; `faltam` = max(meta − feitos, 0).
- `disponíveis` = dias de hoje até domingo, inclusive, menos hoje se já houve check-in hoje.

| Nível | Condição |
|---|---|
| `met` (batida) | faltam = 0 |
| `green` (tranquilo) | faltam ≤ disponíveis − 2 |
| `yellow` (apertado) | faltam = disponíveis − 1 |
| `fire` (decisivo) | faltam = disponíveis |
| `red` (perdida) | faltam > disponíveis |

### 3.5 Congelamento
- Pode ser pedido para a semana atual enquanto a meta ainda não foi batida; pode ser cancelado até o fim da semana.
- Limite: **1 por mês civil** (mês do `week_start`).
- Semana congelada fecha com status `frozen` independentemente dos check-ins (os check-ins continuam registrados).
- Guardado em `week_freezes(week_start)`.

### 3.6 Fechamento, streak e penalidade
- Ao fechar: `frozen` se congelada; senão `met` se feitos ≥ meta; senão `failed`.
- `failed` gera multa com o valor de `settings.penalty_amount` **no momento do fechamento** (snapshot em `weeks.penalty_amount`).
- **Dívida** = soma das multas com `penalty_paid_at` nulo. O usuário marca cada multa como paga.
- **Streak** = número de semanas `met` consecutivas, contando para trás a partir da última semana fechada; semanas `frozen` são puladas (não somam nem quebram); `failed` interrompe. Se a semana atual já está `met`, soma 1 na exibição.
- Fechamento é idempotente: `weeks` tem chave única `(user_id, week_start)`; a execução fecha todas as semanas pendentes desde a última fechada (recupera execuções perdidas).

## 4. Dados (Postgres)

Todas as tabelas têm `user_id uuid references auth.users` e RLS por dono.

| Tabela | Colunas principais |
|---|---|
| `settings` | `user_id` (PK), `preferred_hour` (0–23), `timezone`, `penalty_amount` (numeric), `penalty_description` (text), `notification_intensity` (`leve`/`normal`/`insistente`), `motivations` (text[], até 5), `created_at` |
| `goal_history` | `effective_week_start` (date), `weekly_goal` (int 1–7); único `(user_id, effective_week_start)` |
| `checkins` | `id`, `date` (date), `created_at`; único `(user_id, date)` |
| `week_freezes` | `week_start` (date); único `(user_id, week_start)` |
| `weeks` | `week_start`, `goal`, `done`, `status` (`met`/`failed`/`frozen`), `penalty_amount`, `penalty_paid_at`; único `(user_id, week_start)` |
| `exercises` | `id`, `name`; único `(user_id, name)` |
| `workout_sets` | `id`, `checkin_id` → `checkins`, `exercise_id` → `exercises`, `set_number`, `reps`, `weight_kg` |
| `body_entries` | `id`, `date`, `weight_kg` (nullable), `measurements` (jsonb com chaves `cintura`, `quadril`, `peito`, `braco`, `coxa`, em cm) |
| `push_subscriptions` | `id`, `endpoint` (único), `p256dh`, `auth`, `created_at` |
| `notification_log` | `kind`, `local_date`, `slot_hour`; único `(user_id, kind, local_date, slot_hour)` |

## 5. Telas

Mobile-first. Celular: barra inferior com **Início · Treino · Corpo · Histórico · Ajustes**. PC (≥1024px): menu lateral e painel em grade.

1. **Primeiro acesso (onboarding):** meta semanal, horário preferido, penalidade (valor + descrição), até 5 motivos para treinar, permissão de notificações (com instruções de instalação no iPhone).
2. **Início:** anel de progresso "feitos/meta" com dias restantes; selo do nível de risco; streak 🔥; dívida acumulada; botão grande **TREINEI HOJE** (animação de explosão + vibração quando suportada); botão **Tô sem vontade**; botão de congelar semana; aviso se notificações estiverem desativadas ou o app não instalado.
3. **Tô sem vontade:** sequência de cartões — (1) seus motivos; (2) o que está em jogo ("Seu streak de N semanas e R$X dependem disso", conforme o nível de risco); (3) desafio "Só 15 minutos: vá, faça o aquecimento; se quiser ir embora depois, o treino conta". Termina com atalho para o check-in.
4. **Treino:** após o check-in do dia, registrar exercícios (autocompletar dos já usados), séries, repetições e carga; botão **Repetir último treino** (copia exercícios e estrutura de séries da sessão anterior). Lista de exercícios com gráfico da maior carga por sessão.
5. **Corpo:** registrar peso e medidas por data; gráfico de linha para peso e para cada medida.
6. **Histórico:** calendário mensal com dias treinados e semanas coloridas por status; lista de semanas fechadas com multas e botão "marcar como paga".
7. **Ajustes:** meta (avisando que vale da próxima semana), horário preferido, fuso, penalidade, intensidade das notificações, motivos, aparelhos inscritos para push, sair.

## 6. Identidade visual

- Tema único escuro. Fundo `#0A0A0B`, cartões `#16161A`, texto `#F5F5F5` / secundário `#8A8A93`.
- Destaque verde-limão `#C6FF3D` (ações primárias, progresso, streak). Risco: `yellow` → laranja `#FF6B2C`; `fire` → laranja com pulso animado; `red` → `#FF3B3B`.
- Fontes (auto-hospedadas via Fontsource, para funcionar offline): **Anton** para números grandes estilo placar; **Barlow Condensed** para títulos e rótulos em caixa alta; **Inter** para texto corrido.
- Referências de tom: Nike Training Club, Whoop — painel esportivo, números grandes, contraste alto.
- Animações curtas e com propósito (anel enchendo, explosão no check-in); respeitam `prefers-reduced-motion`.

## 7. Notificações

Edge Function executada a cada hora por `pg_cron`. Para cada usuário, calcula hora local, nível de risco e se já houve check-in hoje.

- **Silêncio:** nenhuma notificação entre 22h e 7h; horários fora da janela são descartados. Nenhum lembrete se houve check-in hoje ou se o nível é `met`.
- **Horários** (P = `preferred_hour`):

| Nível | leve | normal | insistente |
|---|---|---|---|
| `green` | P | P | P |
| `yellow` | P | P−2, P, P+2 | P−2, P, P+2, P+4 |
| `fire` | P | P−2, P, P+2, P+4 | P−4, P−2, P, P+2, P+4 |
| `red` | P | P | P |

- **Resumo semanal:** na execução que fecha a semana (segunda 10h): resultado, streak atual, multa gerada.
- **Mensagens:** 4+ modelos por nível, escolhidos em rodízio, preenchidos com streak, multa, dias restantes e um dos motivos do usuário. Tom: neutro (`green`), firme (`yellow`), direto (`fire`), recomeço (`red`).
- **Deduplicação:** `notification_log` com chave `(user_id, kind, local_date, slot_hour)`; inserção antes do envio.
- **Inscrições inválidas:** resposta 404/410 do serviço de push remove a linha de `push_subscriptions`.

## 8. Tratamento de falhas

- **Offline:** service worker serve o app; TanStack Query mostra dados em cache; check-ins e séries ficam numa fila persistida e sincronizam ao reconectar. Indicador visual de "pendente de sincronização".
- **Recusa do servidor** (ex.: check-in fora da janela): mensagem clara e remoção do item da fila.
- **Push indisponível** (permissão negada, navegador sem suporte, iPhone sem instalação): aviso no Início com instruções específicas.
- **Execução agendada perdida:** a próxima execução fecha semanas pendentes; deduplicação evita multa ou notificação repetida.

## 9. Testes

- **Unitários (Vitest)** em `shared/`: limites da semana no fuso, janela de check-in (incluindo segunda antes/depois das 10h), meta por semana via `goal_history`, todos os níveis de risco, streak com `frozen` e `failed`, limite mensal de congelamento, semana de aquecimento, snapshot de multa, cálculo de horários de notificação por nível e intensidade com janela de silêncio.
- **Componentes (Testing Library):** fluxo de check-in no Início e fluxo "Tô sem vontade".
- **Verificação manual em aparelhos reais:** instalar no iPhone, receber push com app fechado, check-in offline sincronizando, dados iguais no PC.

## 10. Configuração necessária do usuário

Criar contas gratuitas no Supabase e na Vercel; o passo a passo será fornecido durante a implementação (criar projeto, aplicar migrações, configurar chaves VAPID e variáveis de ambiente, publicar).
