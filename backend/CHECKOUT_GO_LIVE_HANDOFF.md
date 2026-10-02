# Handoff historico — endurecimento e preparacao do checkout

> Snapshot gerado em 2026-08-29. Commits, contagens e pendencias abaixo descrevem aquele momento e
> foram preservados como historico; nao representam o estado atual da branch. A fonte de verdade
> para a decisao de go-live continua em `docs/CHECKOUT_GO_LIVE.md`.

## 1. Resumo executivo

Estado atual: **NO-GO**.

O backend recebeu correcoes e ferramentas locais para:

- impedir cobrancas orfas/duplicadas nos fluxos de pedido e link personalizado;
- resolver corridas entre cancelamento, webhook financeiro e fulfillment;
- bloquear compra de etiqueta sem pagamento financeiro ainda `PAID`;
- falhar fechado diante de configuracao de producao incompleta ou divergente;
- interromper novas cobrancas por kill switch sem parar webhooks e workers;
- restringir criacao de checkout a uma allowlist durante smoke/canario;
- emitir telemetria e alertas estruturados sem expor identificadores sensiveis;
- reconciliar pagamentos diariamente em modo read-only;
- verificar backup/restore isolado com guardas destrutivos;
- auditar configuracao final de producao em modo read-only;
- avaliar evidencia sanitizada de canario;
- verificar estado persistido de um smoke real sem chamar provedores nem escrever no banco.

Fases 0 a 4 possuem implementacao local concluida. GL-050 e GL-051 possuem preparacao local
concluida. GL-052 ainda nao foi implementada: faltam testes logicos de `CARD`, runbook e QA.

Go-live real continua bloqueado porque nao existe ambiente de staging com backend, URL publica,
deploy e logs. Deploy final de producao existe, mas ainda precisa receber/validar releases novas de
forma controlada. Nao foram executados smoke, canario ou cartao reais em producao. Tambem faltam
paineis dos provedores, canal humano de alertas e revisao por duas pessoas.

## 2. Estado Git no momento do handoff

- Repositorio: `/Users/leticia/projetos/atelie-guadalupe`
- Backend: `/Users/leticia/projetos/atelie-guadalupe/backend`
- Branch: `main`
- `HEAD`: `828efa7`
- Referencia local `origin/main`: `302a220`
- Commits locais sobre `origin/main`: **5**
- Nenhum push foi executado durante este trabalho.
- Antes de criar este handoff, arvore estava limpa.
- Este arquivo foi posteriormente versionado como registro historico.

Confirme sem alterar estado:

```sh
cd /Users/leticia/projetos/atelie-guadalupe/backend
rtk git status --short
rtk git log -10 --oneline
rtk git rev-list --count origin/main..HEAD
```

Os cinco commits ainda locais sao:

| Commit    | Conteudo                                    |
| --------- | ------------------------------------------- |
| `d7a9e9d` | `(back)feat/add checkout rollout allowlist` |
| `f6fa07a` | `(back)ops/add checkout canary evaluator`   |
| `bc64ebc` | `(back)docs/add checkout canary runbook`    |
| `96bb861` | `(back)ops/add production smoke verifier`   |
| `828efa7` | `(back)docs/add production smoke procedure` |

## 3. Historico factual por fase

### Fase 0 — bloqueadores de codigo

Commits:

| Commit    | Mudanca principal                                           |
| --------- | ----------------------------------------------------------- |
| `60d2888` | Migration Prisma gerada para `FulfillmentJobStatus.FAILED`. |
| `83eb0ee` | Configuracao de provedores endurecida em producao.          |
| `a42af69` | Redacao de query strings/segredos em logs.                  |
| `fe857c1` | Pagamento tardio e fulfillment terminal tratados.           |
| `20c13a4` | Kill switch e reconciliacao segura de checkout incerto.     |
| `72cc362` | Plano e runbook inicial de go-live.                         |
| `e76f94a` | Evidencias locais da fase 0.                                |

Resultados:

- cancelamento simples e bloqueado depois de existir `providerCheckoutId`;
- webhook `checkout.completed` usa transicao condicional de pedido;
- pagamento recebido depois de cancelamento vira `REFUND_PENDING`, permanece rastreavel e nao cria
  fulfillment;
- link personalizado fica `CREATING` quando resultado do provedor e incerto;
- retry consulta `externalId` e nunca cria automaticamente segunda cobranca;
- fulfillment possui limite de tentativas e estado terminal `FAILED`;
- kill switch cobre pedido e link de pagamento;
- configuracao de producao falha antes de aceitar trafego quando URLs/modos esperados divergem.

Evidencia registrada: 60/60 testes focados; suite 121 pass, 3 skips opt-in, 0 falhas; corrida real
PostgreSQL 1/1; build, test-tsc, lint e Prisma validate passaram.

### Fase 1 — cobertura e suite

Commits:

| Commit    | Mudanca principal                                               |
| --------- | --------------------------------------------------------------- |
| `ed9acb0` | Cobertura de estados e falhas de pagamento/webhook/fulfillment. |
| `76fc218` | Isolamento de rede e estabilizacao/velocidade da suite.         |
| `d46f3c1` | Quality gate de CI para backend.                                |
| `b07f1e5` | Evidencia local da fase 1.                                      |

Resultados:

- rede externa e bloqueada pela suite normal;
- E2E/integracao reais ficam opt-in;
- duas execucoes locais terminaram com 141 pass, 3 skips, 0 falhas;
- 57/57 testes focados passaram;
- CI real usando Node 22 ainda nao foi observado; merge/deploy bloqueado pelo CI ainda precisa ser
  confirmado na plataforma.

### Fase 2 — sandbox e staging

Commits:

| Commit    | Mudanca principal                                        |
| --------- | -------------------------------------------------------- |
| `eace94e` | Ambiente esperado da AbacatePay e `devMode` fail-closed. |
| `946bd75` | Evidencia do E2E sandbox endurecida.                     |
| `da86c4d` | Recalculo de frete dentro do E2E.                        |
| `c74554e` | Destino persistido usado no E2E.                         |
| `46e1ef9` | Tres execucoes sandbox registradas.                      |
| `0e134ff` | Ambiente esperado da Superfrete obrigatorio.             |
| `95df3d3` | Isolamento de provedores em staging documentado.         |
| `d2e8924` | Ausencia de staging registrada como bloqueio.            |

Resultados:

- E2E sandbox passou 3 vezes consecutivas no commit `c74554e`;
- cada rodada confirmou um checkout, um fulfillment, um e-mail e uma etiqueta;
- retry devolveu mesmo checkout;
- webhook foi sintetico via aplicacao, nao entregue externamente pela AbacatePay;
- dados foram gravados somente em banco autorizado de teste e ambientes sandbox;
- GL-021 permanece **BLOCKED**: nao existe backend staging, URL HTTPS publica, deploy staging ou
  logs staging.

### Fase 3 — observabilidade, runbook e reconciliacao

Commits:

| Commit    | Mudanca principal                                                        |
| --------- | ------------------------------------------------------------------------ |
| `bd1511a` | Fulfillment serializado com estado financeiro pela linha `OrderPayment`. |
| `f33fead` | Observabilidade, alertas estruturados e reconciliacao financeira.        |
| `8e2cb2a` | Runbook operacional expandido.                                           |

Resultados:

- fulfillment e webhooks terminais disputam o mesmo lock financeiro;
- worker somente compra etiqueta enquanto `OrderPayment.status = PAID`;
- `REFUNDED`, `DISPUTED` e `LOST` tornam jobs nao concluidos `FAILED`;
- telemetria de checkout/provedores usa buffers limitados O(1), conta descarte e calcula p95;
- IDs arbitrarios sao sanitizados/hashados antes de aparecer em evidencia;
- reconciliacao pagina todos registros com tetos fail-closed e executa sweep persistente;
- corrida GL-005 executada duas vezes no PostgreSQL real de teste com `pg_blocking_pids`:
    - fulfillment vence: exatamente uma autorizacao; evento terminal aguarda;
    - `LOST` vence: zero autorizacoes; job termina `FAILED`;
- suite da fase: 194 pass, 4 skips opt-in, 0 falhas; 76/76 focados.

Bloqueios restantes:

- canal humano, responsavel real, consulta de logs e teste de entrega do alerta;
- risco P2 conhecido: transacao longa de fulfillment pode pressionar pool; monitorar antes/durante
  canario.

### Fase 4 — banco e configuracao de producao

Commits:

| Commit    | Mudanca principal                               |
| --------- | ----------------------------------------------- |
| `fd57c2b` | Verificador seguro de backup/restore.           |
| `6be3080` | Procedimento de recuperacao do banco.           |
| `2de0f7e` | Preflight de configuracao de producao.          |
| `d190f4b` | Remocao de payload/PII de erros dos provedores. |
| `302a220` | Revisao final de configuracao documentada.      |

#### Drill de backup/restore ja executado

Foi executado em banco PostgreSQL autorizado de teste. O script:

- abriu snapshot `REPEATABLE READ, READ ONLY`;
- criou dump custom;
- criou banco temporario com nome aleatorio;
- restaurou o dump;
- comparou migrations/checksums, indices unicos e contagens essenciais;
- removeu banco e arquivos temporarios em `finally`.

Evidencia do drill:

- PostgreSQL client: 18.3;
- migrations: 12;
- contagens fonte/restore:
    - `Order`: 28;
    - `OrderPayment`: 13;
    - `PaymentWebhookEvent`: 10;
    - `FulfillmentJob`: 10;
    - `OrderShipment`: 28;
- dump: 9690 ms;
- verificacao do arquivo: 31 ms;
- criacao do banco temporario: 605 ms;
- restore: 26270 ms;
- validacao: 791 ms;
- drop do banco: 563 ms;
- consulta posterior confirmou zero bancos temporarios restantes.

Limitacao importante: o primeiro drill derivou o nome esperado da propria `DATABASE_URL` e ocorreu
antes dos guardas independentes de host/porta e da validacao estrutural exata dos indices. Portanto
ele e registrado como **PASS parcial**. Nao repetir automaticamente. Proximo drill precisa receber
banco, host e porta de inventario independente.

O verificador final agora exige:

- `NODE_ENV=test`;
- banco fonte terminado em `_test`;
- opt-in explicito de escrita;
- nome, host e porta esperados independentes;
- destino aleatorio com regex rigida;
- conexao real no banco temporario confirmada por `current_database()`;
- indices por nome, tabela, colunas ordenadas, sem parcial/expressao/`NULLS NOT DISTINCT`;
- cleanup agregado, com `potentialOrphan` quando drop nao puder ser confirmado.

#### Migration aplicada no banco de teste

O banco de teste estava uma migration atras. Foi executado `pnpm run prisma:migrate:deploy`, que
aplicou a migration versionada `20260827120000_fulfillment_job_failed`. Nenhuma migration foi
escrita manualmente.

**Nao trate revert de Git como rollback da migration.** Migration Prisma aplicada e forward-only.
Nao apagar arquivo, nao editar `_prisma_migrations`, nao usar SQL direto nem `prisma migrate resolve`
como atalho.

#### Preflight de producao

`pnpm run config:verify-production` foi implementado, mas nunca executado contra producao. Ele:

- exige `NODE_ENV=production`;
- valida TLS PostgreSQL com exatamente um `sslmode` seguro;
- exige JWT com no minimo 32 bytes, sem placeholders obvios e com variacao minima;
- exige flags explicitas dos tres workers;
- exige remetente/reply-to sintaticamente validos;
- exige checkout desabilitado e rollout `ALLOWLIST` no preflight;
- confirma modos exatos de AbacatePay/Superfrete;
- consulta privilegios PostgreSQL em transacao read-only;
- falha se role possui atributos perigosos, ownership ou `CREATE` no banco/schema;
- nunca declara `GO`; resultado maximo e `MANUAL_REQUIRED`.

GL-040 e GL-041 continuam bloqueados operacionalmente: faltam staging, `migrate status/deploy`,
medicao de locks, novo drill independente, inventario/grants reais, paineis, logs, secrets reais e
segunda pessoa.

### Fase 5 — preparacao local de smoke e canario

Commits locais ainda nao presentes em `origin/main`:

| Commit    | Mudanca principal                                 |
| --------- | ------------------------------------------------- |
| `d7a9e9d` | Gate `ALLOWLIST/PUBLIC` para criacao de checkout. |
| `f6fa07a` | Avaliador sanitizado de canario.                  |
| `bc64ebc` | Runbook de canario.                               |
| `96bb861` | Verificador read-only do smoke de producao.       |
| `828efa7` | Procedimento de smoke.                            |

#### Gate de rollout

- `CHECKOUT_ENABLED=false` e master e sempre bloqueia nova criacao;
- `CHECKOUT_ENABLED=true` + `ALLOWLIST` permite somente dono autenticado do pedido listado;
- `ALLOWLIST` bloqueia nova criacao por link publico;
- `PUBLIC` preserva comportamento geral e rejeita allowlist residual;
- producao exige modo explicito;
- allowlist aceita no maximo 100 UUIDs validos e sem repeticao;
- checkout ja persistido continua retornavel;
- estado `CREATING` continua reconciliavel antes do gate;
- usuario nao pode acessar pedido de outro dono para entrar na coorte.

#### Avaliador de canario

`pnpm run canary:evaluate` recebe arquivo JSON local sanitizado. Thresholds de duracao e pedidos sao
obrigatorios no input; nao existem defaults de negocio escondidos. Saida: `ADVANCE`, `HOLD` ou
`ROLLBACK`, mais `reasonIds`. Qualquer condicao financeira/logistica de rollback prevalece sobre
hold. Schema rejeita campos desconhecidos e aceita apenas estagios `INTERNAL`, `SMALL_GROUP` ou
`PUBLIC`.

O avaliador nao altera config, nao conecta DB, nao chama provedor e nao substitui aprovacao humana.

#### Verificador do smoke

`pnpm run smoke:verify-production` foi implementado, mas **nunca executado**. Ele:

- exige producao, checkout habilitado e exatamente um usuario em `ALLOWLIST`;
- exige pedido, event ID, valor, janela UTC semiaberta `[inicio,fim)` e inventarios esperados;
- rejeita datas calendariamente impossiveis;
- exige URL PostgreSQL com exatamente um `sslmode` seguro;
- compara host, porta e banco com inventario independente;
- confirma `current_database()` depois de iniciar transacao `REPEATABLE READ, READ ONLY`;
- faz somente consultas parametrizadas;
- valida pedido `PROCESSING`, pagamento `PAID/PIX/devMode=false`, webhook oficial processado,
  fulfillment unico, etiqueta unica, e-mail `PAYMENT_CONFIRMED` e delivery `ACCEPTED` vinculado;
- conta outros checkouts locais ainda pagaveis;
- nunca imprime IDs, valor, datas, URLs, payloads ou dados pessoais;
- nunca retorna `PASS` global; sucesso automatico resulta em `MANUAL_REQUIRED`.

Limitacao intencional: exige estado exato `PROCESSING`. Se tracking avancar legitimamente para
`SHIPPED/DELIVERED` antes do probe, ele falha de forma conservadora. Execute cedo no smoke.

GL-050 e GL-051 nao foram executados operacionalmente. Nenhum PIX real, deploy, webhook externo,
e-mail humano, etiqueta de producao ou reconciliacao real foi realizado.

#### GL-052 — trabalho ainda nao iniciado

Auditoria read-only concluiu:

- backend envia `methods: ["PIX", "CARD"]` nos dois fluxos;
- webhook e method-agnostic e persiste `payerInformation.method` em `providerMethod`;
- refund/dispute/lost possuem logica local;
- testes existentes provam PIX/sintetico, nao cartao real;
- `Order.paymentMethod` e snapshot de intencao e nao escolhe metodos enviados ao provedor;
- `DEBIT_CARD` nao corresponde a metodo separado documentado pelo provedor; isso exige decisao de
  produto futura, nao migration improvisada.

Proximo trabalho local:

1. testes provando `methods === ["PIX", "CARD"]` em pedido e payment-link;
2. teste de webhook completed CARD persistindo `providerMethod=CARD` sem duplicar efeitos;
3. testes CARD para refund/dispute/lost e bloqueio de fulfillment;
4. `docs/CHECKOUT_CARD_RUNBOOK.md`;
5. QA independente;
6. commits `(back)test/...` e `(back)docs/...`.

Mesmo depois disso, GL-052 real continuara bloqueada por frontend, cartao real, webhook externo,
refund/disputa/lost reais, paineis e aprovacoes.

## 4. Trechos criticos do codigo

Trechos abaixo sao explicativos. Consulte arquivos reais antes de mudar.

### 4.1 Kill switch e rollout fail-closed

Arquivo: `src/modules/payments/services/checkout-availability.ts`

```ts
export function isCheckoutCreationEnabled(
    context: CheckoutCreationContext,
    environment: NodeJS.ProcessEnv = process.env
) {
    if (environment.CHECKOUT_ENABLED === "false") return false;
    if (environment.CHECKOUT_ENABLED !== "true" && environment.NODE_ENV === "production") {
        return false;
    }

    const mode =
        environment.CHECKOUT_ROLLOUT_MODE ??
        (environment.NODE_ENV === "production" ? undefined : "PUBLIC");
    const allowedUsers = checkoutAllowedUserUuids(environment);
    if (mode === "PUBLIC") return allowedUsers?.length === 0;
    if (mode !== "ALLOWLIST" || !allowedUsers || context.flow === "PAYMENT_LINK") return false;
    return allowedUsers.includes(context.userUuid.toLowerCase());
}
```

Invariante: `CHECKOUT_ENABLED=false` nunca pode ser contornado por allowlist. Alterar essa ordem
quebra kill switch.

### 4.2 Checkout existente/reconciliacao antes do gate

Arquivo: `src/modules/payments/services/payment-service.ts`

```ts
if (order.payment?.providerCheckoutId) {
    // Retorna checkout persistido; nao cria outro.
    return right(paymentResponse(order.payment));
}

let payment = order.payment;
if (payment) {
    const reconciled = await this.reconcileCreatingPayment(order.uuid, payment);
    // Estado incerto e reconciliado antes de avaliar nova criacao.
    // ...
}

if (!isCheckoutCreationEnabled({ flow: "ORDER", userUuid: currentUserUuid })) {
    return left(checkoutUnavailableError());
}
```

Invariante: gate governa somente **nova criacao**. Nao mover antes dos retornos/reconciliacao sem
reavaliar cobrancas em voo.

### 4.3 Confirmacao financeira condicional

Arquivo: `src/modules/payments/services/payment-webhook-service.ts`

```ts
await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "OrderPayment" WHERE "orderId" = ${payment.orderId} FOR UPDATE`
);
const orderTransition = await tx.order.updateMany({
    where: { id: payment.orderId, status: OrderStatus.AWAITING_PAYMENT },
    data: { status: OrderStatus.PAID }
});

if (orderTransition.count === 0) {
    // CANCELLED => pagamento fica REFUND_PENDING e evento continua auditavel.
    // Nenhum fulfillment e criado.
}
```

Invariante: efeitos colaterais somente depois de transicao atomica bem-sucedida.

### 4.4 Fulfillment serializado com pagamento

Arquivo: `src/modules/payments/services/fulfillment-service.ts`

```ts
const claimed = await this.prisma.fulfillmentJob.updateMany({
    where: {
        id: jobId,
        status: { in: [FulfillmentJobStatus.PENDING, FulfillmentJobStatus.RETRY_SCHEDULED] },
        attempts: { lt: this.maxAttempts() },
        order: {
            status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] },
            payment: { is: { status: PaymentStatus.PAID } }
        }
    },
    data: {
        status: FulfillmentJobStatus.PROCESSING,
        lockedAt: new Date(),
        attempts: { increment: 1 }
    }
});

await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "OrderPayment" WHERE "orderId" = ${job.orderId} FOR UPDATE`
);
```

Invariante: lock financeiro permanece durante operacao Superfrete. Reduzir timeout/lease ou soltar
lock antes da compra reabre corrida com refund/dispute/lost.

### 4.5 Eventos terminais bloqueiam fulfillment

Arquivo: `src/modules/payments/services/payment-webhook-service.ts`

```ts
await tx.orderPayment.update({
    where: { id: payment.id },
    data: { status: state.status /* timestamps/reason */ }
});
await tx.fulfillmentJob.updateMany({
    where: {
        orderId: payment.orderId,
        status: { in: ["PENDING", "PROCESSING", "RETRY_SCHEDULED"] }
    },
    data: {
        status: "FAILED",
        lockedAt: null,
        lastError: `Pagamento em estado ${state.status}; fulfillment bloqueado`
    }
});
```

### 4.6 Avaliador de canario sem threshold oculto

Arquivo: `src/scripts/canary-release-safety.ts`

```ts
const decision: CanaryDecision =
    rollbackReasons.length > 0 ? "ROLLBACK" : holdReasons.length > 0 ? "HOLD" : "ADVANCE";
```

Thresholds entram em `policy.minimumDurationMinutes` e `policy.minimumCompletedOrders`. Nunca
adicionar default silencioso; decisao pertence aos responsaveis tecnico/operacional.

### 4.7 Probe de smoke realmente read-only

Arquivo: `src/scripts/verify-production-smoke.ts`

```ts
const snapshot = await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
        SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY
    `;
    const database = await transaction.$queryRaw<Array<{ name: string }>>`
        SELECT current_database() AS name
    `;
    if (database.length !== 1 || database[0].name !== input.expectedDatabaseName) {
        throw new Error("unexpected connected database");
    }
    return readSnapshot(transaction, input);
});
```

Invariante: `SET TRANSACTION ... READ ONLY` deve continuar sendo primeiro SQL da transacao.

## 5. Como validar localmente

### 5.1 Baseline segura, sem rede externa

Nao iniciar servidor. Use Node 22 e pnpm do projeto.

```sh
cd /Users/leticia/projetos/atelie-guadalupe/backend
rtk pnpm run build:ts
rtk pnpm exec tsc -p test/tsconfig.json --noEmit --pretty false
rtk pnpm run lint
rtk pnpm test
rtk git diff --check
```

Ultima evidencia completa, depois de GL-050:

- 230 testes contabilizados;
- 226 pass;
- 4 skips opt-in;
- 0 falhas;
- build, test-tsc, lint, Prettier dos arquivos tocados e diff-check passaram.

`pnpm test` bloqueia rede externa por `test/setup/no-external-network.cjs`. Os quatro skips sao
fluxos opt-in que exigem DB/provedores.

### 5.2 Divida de formatacao preexistente

Em 2026-08-29, `rtk pnpm run format:check` falha em exatamente cinco arquivos:

```text
src/modules/orders/services/order-service.ts
src/modules/payments/services/payment-service.ts
test/e2e/checkout-e2e-guard.test.ts
test/e2e/checkout-e2e-guard.ts
test/e2e/checkout-payment-flow.e2e.test.ts
```

Isso nao foi introduzido pelos ultimos commits. Nao execute `pnpm format` indiscriminadamente antes
de revisar diff: ele criaria mudancas fora do escopo. Para validar arquivos novos/tocados, use
`pnpm exec prettier --check <arquivos>`.

### 5.3 Testes focados de seguranca operacional

```sh
rtk pnpm exec node --test \
  -r ts-node/register/transpile-only \
  -r ./test/setup/no-external-network.cjs \
  test/config/env.test.ts \
  test/scripts/database-backup-safety.test.ts \
  test/scripts/production-config-safety.test.ts \
  test/scripts/canary-release-safety.test.ts \
  test/scripts/production-smoke-safety.test.ts \
  test/services/payments/checkout-availability.test.ts
```

### 5.4 Testes focados financeiros/logisticos

```sh
rtk pnpm exec node --test \
  -r ts-node/register/transpile-only \
  -r ./test/setup/no-external-network.cjs \
  test/services/payments/payment-service.test.ts \
  test/services/payments/payment-link-service.test.ts \
  test/services/payments/payment-webhook-service.test.ts \
  test/services/payments/fulfillment-service.test.ts \
  test/services/payments/financial-reconciliation-service.test.ts \
  test/services/observability/checkout-observability-service.test.ts \
  test/services/observability/checkout-telemetry.test.ts \
  test/services/observability/provider-observability.test.ts
```

### 5.5 Corridas reais no PostgreSQL de teste

Esse teste escreve e limpa fixtures no banco apontado por `DATABASE_URL`. Use somente banco de
teste autorizado. Provedores permanecem fake; nao ha rede externa.

```sh
RUN_CHECKOUT_RACE_INTEGRATION=true \
rtk pnpm exec node --test --test-reporter=spec \
  -r dotenv/config \
  -r ts-node/register \
  test/integration/payment-races.integration.test.ts
```

Antes:

- confirme banco terminado em `_test`;
- confira host/porta/nome sem imprimir credenciais;
- mantenha chave/provedor reais fora do processo;
- nao rode junto com E2E.

### 5.6 E2E sandbox

Nao repetir casualmente: cria checkout sandbox, etiqueta sandbox e dados no banco de teste.

```sh
rtk pnpm run test:e2e:checkout
```

Pre-requisitos/procedimento: `docs/CHECKOUT_E2E.md`. O teste exige opt-in e credenciais sandbox.
Ele nao prova webhook externo.

### 5.7 Backup/restore

Nao repetir com valores derivados automaticamente da URL. Obtenha identidade do inventario:

```sh
NODE_ENV=test \
CHECKOUT_DB_RESTORE_VERIFY_ALLOW_DATABASE_WRITES=true \
CHECKOUT_DB_RESTORE_VERIFY_EXPECTED_SOURCE_DATABASE="$EXPECTED_TEST_DATABASE" \
CHECKOUT_DB_RESTORE_VERIFY_EXPECTED_SOURCE_HOST="$EXPECTED_TEST_DATABASE_HOST" \
CHECKOUT_DB_RESTORE_VERIFY_EXPECTED_SOURCE_PORT="$EXPECTED_TEST_DATABASE_PORT" \
rtk pnpm run db:verify-backup
```

Esse comando cria e remove banco temporario. Leia `docs/DATABASE_RECOVERY.md` integralmente antes.

### 5.8 Preflight, canario e smoke

Nao executar preflight/smoke com valores ficticios contra ambiente real.

```sh
# Conecta ao banco configurado em modo read-only e sempre termina MANUAL_REQUIRED/AUTO_FAIL.
rtk pnpm run config:verify-production

# Nao conecta DB; le somente arquivo sanitizado.
CHECKOUT_CANARY_EVIDENCE_FILE=/caminho/restrito/evidencia.json \
rtk pnpm run canary:evaluate

# Conecta ao banco de producao em transacao read-only. Exige autorizacao e inventario.
rtk pnpm run smoke:verify-production
```

Leia antes:

- `docs/PRODUCTION_CONFIGURATION.md`;
- `docs/CHECKOUT_CANARY.md`;
- `docs/PRODUCTION_SMOKE.md`.

## 6. O que foi escrito em bancos/provedores

### Banco de teste

- migration `20260827120000_fulfillment_job_failed` aplicada com Prisma migrate deploy;
- testes de corrida GL-005 gravaram fixtures transacionais e limparam ao final;
- E2E sandbox criou pedidos/pagamentos/fulfillment/e-mails/remessas no banco de teste;
- drill de backup criou banco temporario de restore e o removeu;
- consulta posterior confirmou nenhum banco `checkout_restore_verify_*` restante.

### Provedores sandbox

- AbacatePay sandbox: tres checkouts E2E;
- Superfrete sandbox: tres etiquetas E2E;
- webhooks do E2E foram sinteticos, nao entregues externamente;
- nenhuma operacao de producao foi executada.

### Producao/staging

- deploy final de producao existe; esta sessao nao confirmou qual release esta implantada;
- nenhum deploy de staging;
- nenhum servidor iniciado por Codex;
- nenhum acesso a banco de producao;
- nenhum pagamento real;
- nenhum webhook externo;
- nenhuma etiqueta real;
- nenhum e-mail real de smoke;
- nenhum canario.

## 7. Estrategia de rollback por Git

Antes de qualquer rollback, preserve referencia atual:

```sh
cd /Users/leticia/projetos/atelie-guadalupe
rtk git branch backup/checkout-go-live-2026-08-29 828efa7
```

Prefira `git revert`; evita reescrever historico e permite auditoria. Nao use `git reset --hard`.

### Reverter somente smoke local

Ordem:

```sh
rtk git revert 828efa7
rtk git revert 96bb861
```

### Reverter toda fase 5 local

Dependencias exigem ordem inversa:

```sh
rtk git revert 828efa7
rtk git revert 96bb861
rtk git revert bc64ebc
rtk git revert f6fa07a
rtk git revert d7a9e9d
```

Motivo: smoke importa parser/gate introduzido por `d7a9e9d`; docs dependem dos scripts.

### Reverter preflight de producao

Somente depois de remover fase 5 que depende dele:

```sh
rtk git revert 302a220
rtk git revert d190f4b
rtk git revert 2de0f7e
```

Atencao: reverter `d190f4b` reintroduz corpos de resposta/erros de transporte em mensagens e pode
vazar PII/segredos. Nao recomendado.

### Reverter backup tooling

```sh
rtk git revert 6be3080
rtk git revert fd57c2b
```

Isso remove tooling/docs, nao desfaz migration nem altera DB.

### Migration e schema

Nao reverta `60d2888` mecanicamente em ambiente onde migration ja foi aplicada. A mudanca adiciona
estado usado pelo codigo atual. Se rollback de aplicacao for necessario:

1. mantenha schema aditivo;
2. reverta aplicacao para release compativel;
3. valide que release anterior tolera enum adicional;
4. gere eventual migration corretiva com Prisma em desenvolvimento;
5. nunca escreva migration manualmente.

## 8. Checklist de revisao manual antes de aceitar ou reverter

### Codigo

- [ ] revisar `git show` de cada commit por fase;
- [ ] confirmar que toda linha alterada pertence ao risco descrito;
- [ ] executar build, test-tsc, lint e suite;
- [ ] revisar falhas de formatacao conhecidas sem misturar reformatacao;
- [ ] confirmar ausencia de segredo em commits e logs;
- [ ] revisar timeouts/lease do fulfillment contra `SUPERFRETE_TIMEOUT_MS`;
- [ ] revisar gate depois de retorno/reconciliacao de checkout existente;
- [ ] revisar que `CHECKOUT_ENABLED=false` continua master.

### Banco

- [ ] `pnpm exec prisma migrate status` em ambiente autorizado;
- [ ] confirmar migration versionada sem edicao manual;
- [ ] confirmar indices unicos criticos;
- [ ] repetir drill somente com identidade independente;
- [ ] medir migrations/locks em staging quando staging existir;
- [ ] confirmar role runtime sem ownership/CREATE e com apenas DML necessario.

### Operacao

- [ ] provisionar staging HTTPS e webhook real;
- [ ] configurar canal/dono/link de alerta e provar entrega;
- [ ] confirmar chaves/tokens realmente separados;
- [ ] revisar config de producao por duas pessoas;
- [ ] aprovar thresholds do canario antes de preencher evidencia;
- [ ] executar smoke real autorizado;
- [ ] reconciliar AbacatePay/Superfrete/DB/e-mail;
- [ ] executar GL-052 com cartao real somente depois da cobertura local.

## 9. Pontos que nao devem ser interpretados como concluidos

- teste local nao prova configuracao real de segredo/token;
- `AUTO_PASS` de um check nao significa `GO` global;
- `MANUAL_REQUIRED` e bloqueio, nao sucesso operacional;
- E2E com webhook sintetico nao prova entrega externa;
- contagem local de checkout nao substitui painel do provedor;
- e-mail `SENT/ACCEPTED` no DB nao prova recebimento humano nem links corretos;
- restore parcial anterior nao prova identidade independente do ambiente;
- allowlist exige reload/restart consistente de todas replicas;
- kill switch nao cancela checkout ja criado;
- checkout existente pode continuar pagavel mesmo depois de fechar nova criacao;
- `Order.paymentMethod` nao prova metodo efetivamente usado no provedor;
- cobertura CARD ainda nao existe;
- ausencia de staging impede GL-021/GL-040 operacional;
- ausencia de producao/autoridade impede GL-041/GL-050/GL-051/GL-052 operacionais.

## 10. Ordem recomendada para retomada

1. Ler este handoff e `docs/CHECKOUT_GO_LIVE.md`.
2. Verificar `git status`, `HEAD` e cinco commits locais.
3. Executar suite local uma vez; nao repetir E2E/drill.
4. Revisar commits fase 5 e decidir manter/reverter antes de push.
5. Implementar GL-052 local com subagent dedicado.
6. Rodar QA independente da fase 5.
7. Criar commits separados para teste CARD e runbook.
8. Manter decisao `NO-GO` ate infraestrutura/autorizacoes existirem.
9. Quando staging existir, retomar GL-021 e partes pendentes de GL-040.
10. Quando producao estiver autorizada, executar GL-041, GL-050, GL-051 e GL-052 na ordem.

## 11. Documentos de referencia

- `docs/CHECKOUT_GO_LIVE.md` — plano e estado oficial;
- `docs/CHECKOUT_RUNBOOK.md` — resposta operacional;
- `docs/CHECKOUT_E2E.md` — E2E sandbox;
- `docs/CHECKOUT_OBSERVABILITY.md` — alertas/metricas;
- `docs/FINANCIAL_RECONCILIATION.md` — reconciliacao diaria;
- `docs/DATABASE_RECOVERY.md` — backup/restore/rollback;
- `docs/PRODUCTION_CONFIGURATION.md` — preflight e revisao por duas pessoas;
- `docs/CHECKOUT_CANARY.md` — rollout allowlist e avaliador;
- `docs/PRODUCTION_SMOKE.md` — smoke real e probe read-only.

## 12. Conclusao

Implementacao local reduziu riscos conhecidos e possui cobertura automatizada forte. Nao existe
evidencia suficiente para go-live. Melhor ponto de pausa e o atual: arvore versionada limpa em
`828efa7`, cinco commits locais ainda revisaveis, GL-052 nao iniciado e nenhuma operacao real em
andamento.
