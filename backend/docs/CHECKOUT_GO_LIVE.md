# Plano de go-live do checkout

## Estado atual

**Decisao atual: NO-GO.**

Este documento transforma os riscos conhecidos do checkout em tarefas verificaveis. O go-live
somente pode acontecer quando todos os itens marcados como bloqueadores estiverem concluidos e
suas evidencias estiverem registradas.

Evidencias coletadas em 2026-08-26:

- o build TypeScript passou;
- 12 de 12 testes isolados de pagamento, webhook, link de pagamento e fulfillment passaram;
- o E2E de sandbox existe, mas foi ignorado pela suite normal porque e opt-in;
- o E2E cria e consulta um checkout real no sandbox da AbacatePay, mas injeta o webhook
  sinteticamente no Fastify; ele nao prova a entrega do webhook pela AbacatePay para uma URL
  publica;
- uma execucao observada da suite completa parou de produzir progresso e foi interrompida; ela
  precisa ser repetida de forma limpa e terminar com codigo zero;
- existe risco de pagamento tardio: um pedido `AWAITING_PAYMENT` pode ser cancelado e depois
  receber `checkout.completed`. O pagamento fica `PAID`, o pedido permanece `CANCELLED` e o
  fulfillment entra em retentativas sem conseguir comprar a etiqueta;
- `SUPERFRETE_BASE_URL` possui valor padrao de sandbox. Uma configuracao de producao incompleta
  pode iniciar usando o ambiente errado.

Revisao adicional de codigo e documentacao oficial em 2026-08-27:

- a corrida tambem existe entre cancelamento e criacao do checkout: o provedor pode criar a
  cobranca depois de o pedido ser cancelado e a persistencia local pode recolocar o pedido em
  `AWAITING_PAYMENT`;
- a API v2 documentada da AbacatePay permite consultar checkout comum, mas nao documenta operacao
  para cancela-lo; ate confirmacao oficial em contrario, pedido com `providerCheckoutId` deve ser
  considerado nao cancelavel pelo fluxo simples;
- o ambiente da AbacatePay e determinado pela chave de API, nao pela URL base; por isso a aplicacao
  precisa rejeitar `devMode: true` em respostas e webhooks quando estiver em producao;
- uma transacao sem atualizacao condicional nao resolve sozinha a corrida de estados: cancelamento
  e confirmacao precisam disputar uma transicao atomica no banco e somente o vencedor pode gerar
  efeitos;
- o worker de fulfillment aplica backoff, mas nao possui limite de tentativas nem estado terminal
  de falha; jobs impossiveis podem permanecer em `RETRY_SCHEDULED` indefinidamente;
- existem dois fluxos que criam cobrancas, checkout de pedido e pagamento de link personalizado;
  o kill switch precisa cobrir ambos.

## Definicao de pronto

Checkout esta pronto para producao somente quando:

- [ ] todos os bloqueadores P0 deste documento estiverem concluidos;
- [ ] build, lint, suite completa e testes criticos terminarem com codigo zero;
- [ ] E2E sandbox passar tres vezes consecutivas;
- [ ] webhook real da AbacatePay chegar a uma URL publica de staging;
- [ ] observabilidade, alertas, kill switch e runbook estiverem operacionais;
- [ ] smoke test de producao confirmar um pagamento real de baixo valor de ponta a ponta;
- [ ] periodo canario terminar sem inconsistencias financeiras ou logisticas;
- [ ] responsavel tecnico e responsavel operacional registrarem decisao `GO`.

## Fase 0 — corrigir bloqueadores de codigo

### GL-001 — Tratar pagamento recebido depois do cancelamento (P0)

**Risco:** cliente paga, mas pedido cancelado nao e enviado nem reembolsado automaticamente.

Tarefas:

- [x] definir regra de negocio para cancelamento quando ja existe `providerCheckoutId`;
- [x] enquanto nao houver operacao oficial de cancelamento de checkout comum, bloquear o
      cancelamento simples depois de persistir `providerCheckoutId`;
- [x] impedir cancelamento simples de pedido com checkout ativo ou implementar cancelamento do
      checkout no provedor, caso exista operacao oficialmente suportada;
- [x] tornar corrida entre cancelamento e `checkout.completed` deterministica no banco;
- [x] tornar corrida entre cancelamento e criacao/persistencia do checkout deterministica no
      banco, sem ressuscitar pedido cancelado;
- [x] implementar transicoes condicionais no banco e verificar quantas linhas foram alteradas
      antes de criar qualquer efeito colateral;
- [x] nunca criar fulfillment para pedido que nao transitou de `AWAITING_PAYMENT` para `PAID`;
- [x] quando pagamento confirmado chegar para pedido ja cancelado, registrar ocorrencia financeira
      e encaminhar para reembolso/acao manual, sem perder o evento;
- [x] impedir que job impossivel fique em retentativa infinita;
- [x] definir limite de tentativas e estado terminal consultavel para fulfillment impossivel;
- [x] gerar alerta operacional contendo UUID do pedido, checkout do provedor e valor pago;
- [x] documentar procedimento de reembolso desse caso no runbook.

Testes obrigatorios:

- [x] cancelamento antes de criar checkout continua funcionando;
- [x] cancelamento depois de criar checkout segue a nova regra;
- [x] `checkout.completed` vence a corrida: pedido fica `PAID` e um unico fulfillment e criado;
- [x] cancelamento vence a corrida: nenhum fulfillment e criado e pagamento tardio fica visivel
      para reconciliacao;
- [x] cancelamento vence corrida com criacao do checkout: pedido continua `CANCELLED`, cobranca
      criada fica rastreavel e nenhum novo checkout e criado no retry;
- [x] webhook tardio repetido nao duplica fulfillment, e-mail nem acao de reembolso;
- [x] worker nao retenta indefinidamente pedido cancelado.

**Criterio de aceite:** nenhum estado permite `payment.status = PAID` ficar silenciosamente
associado a `order.status = CANCELLED`. Todo pagamento recebido termina em fulfillment valido ou
acao de reembolso rastreavel.

### GL-002 — Tornar configuracao de provedores segura em producao (P0)

Tarefas:

- [x] remover fallback silencioso da Superfrete para sandbox quando `NODE_ENV=production`;
- [x] exigir `SUPERFRETE_BASE_URL` explicita em producao;
- [x] rejeitar URL conhecida de sandbox em producao;
- [x] confirmar URL oficial de producao na documentacao atual da Superfrete;
- [x] validar que URLs de retorno e conclusao da AbacatePay usam HTTPS e dominio de producao;
- [x] validar que `PAYMENT_LINK_PUBLIC_BASE_URL`, `FRONTEND_URL` e `CORS_ORIGIN` apontam para os
      dominios corretos;
- [ ] confirmar separacao entre tokens/chaves de sandbox e producao;
- [x] rejeitar resposta de criacao/consulta e webhook da AbacatePay com `devMode: true` em
      producao;
- [x] garantir que nenhum segredo real esteja versionado ou presente em logs;
- [x] adicionar testes de validacao para configuracao completa, sandbox indevido e URLs locais.

**Criterio de aceite:** processo com `NODE_ENV=production` falha antes de aceitar trafego quando
qualquer provedor ou URL publica estiver ausente, local ou em sandbox.

### GL-003 — Adicionar kill switch para novos checkouts (P0)

Tarefas:

- [x] adicionar configuracao explicita, por exemplo `CHECKOUT_ENABLED`;
- [x] exigir valor explicito em producao e falhar de forma fechada; ausencia ou valor invalido nao
      pode habilitar cobrancas;
- [x] quando desativada, bloquear somente criacao de novos pedidos/pagamentos conforme regra
      definida;
- [x] aplicar o bloqueio tanto ao checkout de pedido quanto ao checkout de link de pagamento;
- [x] retornar erro controlado e mensagem segura ao frontend;
- [x] manter webhook, consulta de pedidos, reembolso e workers funcionando para pagamentos em voo;
- [x] criar teste provando que nenhuma chamada ao provedor ocorre com checkout desativado;
- [x] testar valor ausente e invalido em producao, alem de `false` explicito;
- [x] documentar como desativar, verificar e reativar sem novo deploy.

**Criterio de aceite:** operacao consegue interromper novas cobrancas em poucos minutos sem
abandonar cobrancas ja criadas.

### GL-004 — Impedir cobranca orfa ou duplicada em links personalizados (P0)

**Risco:** timeout depois de o provedor criar checkout pode recolocar o link em `ACTIVE`; um retry
cria segunda cobranca. Expiracao concorrente tambem pode ocultar checkout criado ainda nao
persistido localmente.

Tarefas:

- [x] manter link em `CREATING` quando o resultado da criacao no provedor for incerto;
- [x] em retry de `CREATING`, consultar pelo `externalId` `payment-link:<uuid>` e persistir o mesmo
      checkout sem chamar `createCheckout` novamente;
- [x] nao criar segunda cobranca automaticamente quando a consulta ainda nao encontrar resultado
      para uma tentativa anterior incerta;
- [x] reconciliar link `CREATING` antes de conclui-lo como expirado;
- [x] manter checkout encontrado rastreavel sem reabrir link expirado nem expor URL para novo
      pagamento;
- [x] aceitar e auditar webhook tardio valido de checkout expirado;
- [x] tornar duas chamadas concorrentes deterministicas, com no maximo uma chamada de criacao ao
      provedor;
- [x] encaminhar estado incerto persistente para reconciliacao operacional.

Testes obrigatorios:

- [x] timeout depois da criacao no provedor e antes da persistencia local;
- [x] retry encontra e persiste o checkout original, sem criar outro;
- [x] retry sem resultado definitivo nao cria segunda cobranca;
- [x] expiracao antes e depois da persistencia do checkout;
- [x] webhook tardio depois da expiracao;
- [x] duas chamadas concorrentes criam no maximo um checkout;
- [x] checkout reconciliado com valor divergente fica bloqueado para acao manual.

**Criterio de aceite:** nenhum checkout personalizado criado no provedor fica sem rastreabilidade
local, nenhuma incerteza gera segunda cobranca e expiracao nao oculta pagamento possivel ou tardio.

## Fase 1 — ampliar testes automatizados

### GL-010 — Cobrir estados e falhas do pagamento (P0)

Adicionar testes para:

- [ ] chave de idempotencia ausente, invalida e pertencente a outro pedido;
- [ ] duas criacoes concorrentes com a mesma chave;
- [ ] timeout antes de o provedor criar checkout;
- [ ] timeout depois de o provedor criar checkout, antes da persistencia local;
- [ ] reconciliacao de pagamento `CREATING` sem criar segunda cobranca;
- [ ] checkout reconciliado com valor divergente;
- [ ] checkout nao encontrado na primeira pagina da listagem do provedor;
- [ ] erro ao criar produto do catalogo;
- [ ] webhook com assinatura invalida, secret invalido e corpo alterado;
- [ ] webhook duplicado e dois webhooks concorrentes com mesmo `eventId`;
- [ ] `externalId`, `amount` e `paidAmount` divergentes;
- [ ] evento desconhecido sem quebrar eventos futuros;
- [ ] falha transacional no meio do processamento e retentativa posterior;
- [ ] eventos `checkout.refunded`, `checkout.disputed` e `checkout.lost`;
- [ ] fulfillment interrompido, lock expirado, retry e conclusao unica;
- [ ] e-mail indisponivel sem desfazer confirmacao financeira.

**Criterio de aceite:** testes reproduzem os cenarios antes das correcoes relevantes e passam
depois delas, sem depender de rede externa.

### GL-011 — Estabilizar suite completa (P0)

Executar em ambiente limpo:

```bash
pnpm run build:ts
pnpm run lint
pnpm test
```

Tarefas:

- [ ] confirmar que cada comando termina sem intervencao e com codigo zero;
- [ ] investigar handles abertos, dependencia externa acidental ou disputa de banco se a suite
      voltar a parar;
- [ ] garantir que testes normais nunca chamem AbacatePay ou Superfrete;
- [ ] registrar duracao total e lista de testes ignorados;
- [ ] executar os mesmos comandos no CI usando Node 22 e pnpm definido no projeto;
- [ ] bloquear merge/deploy quando algum comando falhar.

**Criterio de aceite:** duas execucoes locais e uma execucao no CI passam integralmente.

## Fase 2 — provar integracoes em sandbox e staging

### GL-020 — Executar E2E sandbox tres vezes (P0)

Seguir `docs/CHECKOUT_E2E.md` e executar:

```bash
pnpm run test:e2e:checkout
```

Para cada uma das tres execucoes:

- [ ] registrar data, commit e ambiente;
- [ ] confirmar `devMode: true` na AbacatePay;
- [ ] confirmar que retry devolve mesmo `checkoutId` e `checkoutUrl`;
- [ ] confirmar valor do checkout igual ao total do pedido;
- [ ] confirmar webhook sintetico duplicado sem efeitos duplicados;
- [ ] confirmar somente um fulfillment e um e-mail por finalidade;
- [ ] confirmar etiqueta no sandbox da Superfrete;
- [ ] guardar UUID do pedido, IDs dos provedores e resultado do teste;
- [ ] conferir que dados criados nao afetaram producao.

**Criterio de aceite:** tres execucoes consecutivas passam sem alteracao de codigo ou limpeza
manual entre elas.

### GL-021 — Validar entrega real do webhook em staging (P0)

O E2E atual nao cobre entrega externa. Criar webhook v2 da AbacatePay apontando para endpoint HTTPS
publico de staging e usando segredo exclusivo de staging.

Tarefas:

- [ ] confirmar DNS, HTTPS e certificado;
- [ ] configurar eventos `checkout.completed`, `checkout.refunded`, `checkout.disputed` e
      `checkout.lost`;
- [ ] criar checkout com chave de desenvolvimento;
- [ ] concluir/simular pagamento por mecanismo oficialmente suportado pelo provedor;
- [ ] provar que evento veio da AbacatePay, sem injecao via `app.inject` ou chamada manual;
- [ ] confirmar validacao do query secret e de `X-Webhook-Signature` sobre corpo raw;
- [ ] confirmar resposta HTTP 200 somente depois do processamento;
- [ ] reenviar evento pelo mecanismo do provedor, quando disponivel, e confirmar idempotencia;
- [ ] verificar `PaymentWebhookEvent.processedAt` e `error`;
- [ ] medir tempo entre confirmacao no provedor e estado `PAID` local.

**Criterio de aceite:** evento externo autentico atualiza um unico pedido e inicia um unico
fulfillment sem intervencao manual.

## Fase 3 — observabilidade e operacao

### GL-030 — Criar metricas e alertas (P0)

Monitorar pelo menos:

- [ ] quantidade e taxa de criacoes de checkout por resultado HTTP;
- [ ] latencia e erros da AbacatePay e Superfrete;
- [ ] pagamentos `CREATING` acima de 2 minutos;
- [ ] pagamentos `PENDING` acima do prazo esperado do negocio;
- [ ] webhooks com `error` ou sem `processedAt` acima de 2 minutos;
- [ ] pagamento `PAID` cujo pedido nao esta `PAID`, `PROCESSING`, `SHIPPED` ou `DELIVERED`;
- [ ] pedido `PAID` sem fulfillment;
- [ ] fulfillment `RETRY_SCHEDULED`, numero de tentativas e idade do job;
- [ ] divergencia entre valor esperado e pago;
- [ ] pedidos cancelados com pagamento pago;
- [ ] e-mails falhos e etiquetas nao compradas.

Cada alerta precisa ter:

- [ ] limiar e janela definidos;
- [ ] canal e responsavel definidos;
- [ ] link para consulta/log relevante;
- [ ] acao imediata descrita no runbook;
- [ ] teste controlado provando que alerta chega.

**Criterio de aceite:** falha financeira ou logistica conhecida gera alerta acionavel antes de um
cliente precisar reclamar.

### GL-031 — Preparar runbook operacional (P0)

Documentar procedimentos para:

- [ ] desativar novos checkouts sem desligar webhooks/workers;
- [ ] localizar pedido por UUID, e-mail e ID do provedor;
- [ ] reconciliar checkout `CREATING` ou `PENDING`;
- [ ] reprocessar webhook com seguranca;
- [ ] reexecutar fulfillment sem duplicar etiqueta;
- [ ] tratar pagamento confirmado de pedido cancelado;
- [ ] reembolsar pagamento e registrar identificador do reembolso;
- [ ] tratar disputa e perda;
- [ ] responder indisponibilidade de cada provedor;
- [ ] escalar incidente e comunicar cliente;
- [ ] confirmar recuperacao antes de reativar checkout.

**Criterio de aceite:** outra pessoa da equipe consegue executar os procedimentos usando somente o
runbook e acessos autorizados.

### GL-032 — Preparar reconciliacao financeira diaria (P1)

Tarefas:

- [ ] comparar checkouts pagos no provedor com `OrderPayment` local;
- [ ] comparar valor, `externalId`, status e horario;
- [ ] listar pagamento sem pedido, pedido pago sem pagamento e status divergentes;
- [ ] registrar resolucao e responsavel por divergencia;
- [ ] manter trilha de auditoria sem expor dados sensiveis.

**Criterio de aceite:** toda divergencia financeira aparece em relatorio diario e possui dono.

## Fase 4 — pre-deploy de producao

### GL-040 — Validar banco, migracoes e rollback operacional (P0)

Tarefas:

- [ ] criar backup restauravel do banco;
- [ ] testar restauracao em ambiente isolado;
- [ ] conferir migracoes geradas e versionadas;
- [ ] executar `pnpm exec prisma migrate status` contra staging;
- [ ] executar `pnpm run prisma:migrate:deploy` primeiro em staging;
- [ ] validar constraints unicas de pedido, pagamento, idempotencia e evento de webhook;
- [ ] medir tempo e locks das migracoes;
- [ ] definir rollback por deploy de aplicacao e restauracao/reconciliacao de dados;
- [ ] nunca editar ou criar migracao Prisma manualmente.

**Criterio de aceite:** staging parte do mesmo estado de banco esperado em producao e procedimento de
recuperacao foi testado.

### GL-041 — Revisar configuracao final de producao (P0)

- [ ] `NODE_ENV=production`;
- [ ] `DATABASE_URL` aponta para producao com SSL e usuario de privilegio minimo;
- [ ] `JWT_SECRET` forte e exclusivo;
- [ ] `CORS_ORIGIN` contem somente origens esperadas;
- [ ] `ABACATEPAY_BASE_URL` confere com documentacao oficial;
- [ ] `ABACATEPAY_API_KEY` e chave de producao;
- [ ] `ABACATEPAY_RETURN_URL` e `ABACATEPAY_COMPLETION_URL` usam HTTPS;
- [ ] webhook de producao usa endpoint HTTPS, secret exclusivo e eventos corretos;
- [ ] `SUPERFRETE_BASE_URL` e URL de producao, nunca sandbox;
- [ ] token e user agent da Superfrete sao de producao;
- [ ] workers necessarios estao habilitados e com apenas concorrencia planejada;
- [ ] Resend, remetente, reply-to e dominio estao validados;
- [ ] logs nao imprimem tokens, secrets, documentos ou payloads sensiveis;
- [ ] kill switch inicia desativado durante deploy e preflight.

**Criterio de aceite:** revisao por duas pessoas, sem copiar valores de segredo para documento,
ticket, chat ou log.

## Fase 5 — smoke test e liberacao gradual

### GL-050 — Executar smoke test real em producao (P0)

Usar conta interna, produto de menor valor adequado e endereco controlado. Este teste movimenta
dinheiro e pode comprar etiqueta real; responsavel financeiro e operacional precisa aprovar antes.

- [ ] ativar checkout somente para conta interna ou mecanismo equivalente;
- [ ] criar um unico pedido real;
- [ ] confirmar checkout com `devMode: false`, valor e `externalId` corretos;
- [ ] pagar por PIX real;
- [ ] confirmar entrega real do webhook;
- [ ] confirmar `PaymentWebhookEvent` processado sem erro;
- [ ] confirmar pedido `PAID` e depois `PROCESSING`;
- [ ] confirmar somente um fulfillment e uma etiqueta;
- [ ] confirmar e-mail recebido e links corretos;
- [ ] conferir pedido nos paineis AbacatePay e Superfrete;
- [ ] executar procedimento planejado para etiqueta/pedido de teste;
- [ ] reconciliar valor financeiro e registrar evidencias sem segredos ou dados pessoais.

**Criterio de aceite:** fluxo real completo termina no tempo esperado, sem ajuste direto no banco,
webhook manual ou retry improvisado.

### GL-051 — Liberar em canario (P0)

Ordem sugerida:

1. equipe interna;
2. grupo pequeno de clientes ou percentual baixo de trafego;
3. aumento gradual depois de janela sem incidentes;
4. liberacao total.

Durante cada etapa:

- [ ] definir duracao minima e numero minimo de pedidos;
- [ ] acompanhar pagamentos, webhooks, fulfillment, e-mails e suporte;
- [ ] reconciliar pedidos com paineis dos provedores;
- [ ] parar expansao diante de qualquer divergencia financeira;
- [ ] usar kill switch diante de cobranca duplicada, valor incorreto, webhook indisponivel ou
      incapacidade de reconciliar pagamentos;
- [ ] registrar decisao de avancar, manter ou reverter.

**Criterio de aceite:** canario completa janela definida sem duplicidade, perda de pagamento,
divergencia de valor, pedido pago parado ou etiqueta duplicada.

### GL-052 — Validar cartao antes de declarar cobertura completa (P1)

O backend oferece `PIX` e `CARD`. Passar somente PIX nao prova cartao.

- [ ] executar compra controlada por cartao;
- [ ] confirmar pagamento, webhook e fulfillment;
- [ ] testar ou validar procedimento de reembolso;
- [ ] validar eventos de disputa e perda em ambiente suportado;
- [ ] confirmar mensagens e estados no frontend.

**Criterio de aceite:** fluxo e runbook especificos de cartao foram comprovados.

## Gate final GO/NO-GO

Preencher imediatamente antes da liberacao total:

| Verificacao                            | Resultado | Evidencia | Responsavel | Data |
| -------------------------------------- | --------- | --------- | ----------- | ---- |
| Bloqueadores P0 concluidos             |           |           |             |      |
| Build, lint e suite completa           |           |           |             |      |
| E2E sandbox 3x                         |           |           |             |      |
| Webhook externo em staging             |           |           |             |      |
| Alertas testados                       |           |           |             |      |
| Runbook validado                       |           |           |             |      |
| Backup/restauracao testados            |           |           |             |      |
| Configuracao revisada por duas pessoas |           |           |             |      |
| Smoke real de producao                 |           |           |             |      |
| Canario sem incidentes                 |           |           |             |      |
| Reconciliacao financeira               |           |           |             |      |

Decisao final:

- [ ] **GO** — todos os P0 e criterios obrigatorios possuem evidencia;
- [ ] **NO-GO** — existe bloqueador, evidencia ausente ou divergencia nao explicada.

Responsavel tecnico: **\*\*\*\***\_\_\_\_**\*\*\*\***

Responsavel operacional: **\*\*\*\***\_\_\_\_**\*\*\*\***

Data e hora: **\*\*\*\***\_\_\_\_**\*\*\*\***

Commit/deploy: **\*\*\*\***\_\_\_\_**\*\*\*\***

## Registro de execucoes

Usar uma linha por execucao relevante. Nao registrar secrets, tokens, documentos, enderecos ou
payloads sensiveis.

| Data/hora  | Ambiente    | Commit             | Tarefa/teste            | Resultado    | IDs seguros/evidencia                                                                                                     | Responsavel |
| ---------- | ----------- | ------------------ | ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 2026-08-27 | local/teste | `60d2888..72cc362` | Fase 0: GL-001 a GL-004 | PASS tecnico | 60/60 focados; suite 121 pass/3 skip/0 fail; corrida PostgreSQL 1/1; build, test-tsc, `eslint src test` e Prisma validate | Codex + QA  |
