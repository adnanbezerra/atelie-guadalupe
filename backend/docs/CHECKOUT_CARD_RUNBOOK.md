# Runbook de validacao de cartao (GL-052)

Este runbook prepara e conduz a validacao de `CARD` sem confundir cobertura automatizada local com
prova real do provedor. Ele complementa `docs/CHECKOUT_RUNBOOK.md`; em incidente, reconciliacao,
reembolso, disputa, perda ou recuperacao, os procedimentos gerais daquele documento continuam
sendo a fonte operacional.

Nunca registre PAN, CVV, validade, nome do titular, documento, endereco, e-mail, token, secret, URL
de checkout, payload integral, assinatura ou resposta integral dos provedores. Nao use cartao
pessoal sem autorizacao. Dados de teste ou de pagamento devem ser inseridos somente na pagina
HTTPS oficial da AbacatePay, nunca no backend, terminal, chat, ticket ou captura de tela.

## O que constitui evidencia

| Camada              | O que pode provar                                                                                               | Estado de GL-052                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Local automatizada  | Request oferece `CARD`; webhook sintetico persiste metodo/estados; idempotencia e bloqueio de fulfillment       | `PASS_LOCAL` somente quando teste correspondente passar   |
| Staging/sandbox     | Integracao externa, se AbacatePay oferecer mecanismo oficial de cartao e eventos no ambiente de desenvolvimento | `MANUAL_REQUIRED`; `BLOCKED` enquanto staging nao existir |
| Producao controlada | Autorizacao/captura real, webhook autentico, estado local, fulfillment e reembolso real                         | `MANUAL_REQUIRED`                                         |
| Provedor/suporte    | Disputa e perda por mecanismo oficialmente suportado, sem forjar evento                                         | `MANUAL_REQUIRED` ou `BLOCKED` se mecanismo nao existir   |

`app.inject`, mock, fixture, assinatura criada localmente, edicao de payload ou alteracao direta do
banco nunca provam entrega externa, cobranca, reembolso, disputa ou perda reais. `paymentMethod =
CREDIT_CARD` no pedido registra intencao do cliente, mas nao prova pagamento por cartao. A prova
financeira exige `providerMethod = CARD` recebido em evento autentico e confirmacao do mesmo
checkout no painel do provedor.

Nao marque GL-052 concluido com base apenas na preparacao ou nos testes locais. Evidencia real
precisa identificar ambiente, release, horario UTC, responsaveis e referencias seguras.

## Preparacao local automatizada

Esta etapa nao movimenta dinheiro nem substitui execucao real. Use provedores falsos e banco de
teste autorizado; a suite normal nao pode acessar AbacatePay ou Superfrete.

Cobertura minima esperada:

- criacao de checkout envia `methods: ["PIX", "CARD"]` e preserva um unico checkout no retry com a
  mesma chave de idempotencia;
- `checkout.completed` com `payerInformation.method = "CARD"` persiste `providerMethod = CARD`,
  valor integral, `paidAt`, pagamento `PAID` e pedido em estado financeiro compativel;
- repeticao do mesmo `eventId` nao cria segundo pagamento, fulfillment, e-mail ou etiqueta;
- pagamento CARD cria no maximo um fulfillment e o worker nao compra segunda etiqueta em retry;
- `checkout.refunded`, `checkout.disputed` e `checkout.lost` persistem estado/timestamp correto;
- disputa ou perda antes da compra impede fulfillment novo e deixa job nao concluido em `FAILED`;
- frontend mostra espera sem criar outro pedido, confirmacao, reembolso, disputa e perda; refresh e
  retorno ao checkout preservam mesmo pedido;
- fixtures, snapshots e logs nao contem dado real de cartao nem segredo.

Execute somente os comandos existentes que cubram esses cenarios e registre comando, commit,
quantidade de testes e resultado. Uma execucao local pode ser registrada assim:

| Campo     | Valor permitido                                                                |
| --------- | ------------------------------------------------------------------------------ |
| Resultado | `PASS_LOCAL`, `FAIL` ou `NOT_RUN`                                              |
| Evidencia | comando/teste, commit, contagem pass/fail/skip e duracao                       |
| Limite    | "sem rede externa; nao comprova cobranca/webhook/reembolso/disputa/perda real" |

Evidencia em 2026-09-02: commit `1411aba`; 35/35 testes focados e suite completa com 226 pass, 4
skips opt-in e 0 falhas. Build, lint, Prettier dos arquivos tocados e `git diff --check` passaram.
Resultado `PASS_LOCAL` restrito ao backend, sem banco, rede externa ou provedor real. Frontend
permanece `MANUAL_REQUIRED`.

Se teste especifico nao existir, mantenha `NOT_RUN`; nao substitua por inspecao informal do codigo.

## Gate antes da compra controlada

Compra CARD real somente depois de todos os itens abaixo confirmados por duas pessoas:

- ambiente e release exatos registrados; producao exige GL-041 revisado;
- GL-021 comprovou webhook externo autentico no ambiente usado ou a execucao CARD inclui essa
  prova sem depender de webhook manual;
- conta interna, produto de menor valor adequado e endereco controlado definidos;
- responsaveis tecnico, financeiro e operacional presentes, com janela e criterio de parada;
- cartao autorizado para teste e procedimento contabilidade/estorno aprovados;
- `CHECKOUT_ENABLED=false` inicialmente; `CHECKOUT_ROLLOUT_MODE=ALLOWLIST` e somente UUID interno
  configurado antes de habilitar;
- links publicos permanecem bloqueados e nenhuma expansao para `PUBLIC` ocorre nesta validacao;
- mecanismo para aplicar flags e recarregar todas as replicas testado;
- `FULFILLMENT_WORKER_ENABLED=false` inicialmente, evitando etiqueta antes da verificacao
  financeira; demais workers seguem decisao registrada;
- dashboards/logs e paineis AbacatePay/Superfrete acessiveis sem copiar segredos;
- procedimento de reembolso e, se aplicavel, cancelamento/disposicao da etiqueta aprovado.

Falha em qualquer precondicao resulta em `NO-GO` para compra. Nao contorne allowlist, webhook,
aprovacao ou painel com alteracao direta no banco.

## Compra controlada CARD

1. Registre horario UTC, ambiente, commit/deploy, responsaveis e valor previsto em centavos.
2. Com checkout ainda desligado, confirme zero incidente financeiro aberto e workers no estado
   aprovado. Ative `CHECKOUT_ENABLED=true` mantendo `ALLOWLIST` apenas para conta interna.
3. No frontend, use conta interna, carrinho minimo, endereco e frete controlados. Confirme total
   antes de criar um unico pedido.
4. Abra pagamento uma unica vez. Confirme no painel AbacatePay um checkout com `externalId` igual ao
   UUID do pedido, valor exato, ambiente esperado e metodos incluindo `CARD`. Nao registre URL.
5. Na pagina HTTPS oficial do provedor, selecione cartao e conclua pelo mecanismo autorizado. Nao
   coloque dados de cartao em ferramenta de desenvolvedor, automacao, log ou evidencia.
6. Nao repita a criacao se resposta for lenta ou incerta. Consulte pedido e painel pelo UUID/ID;
   siga a reconciliacao `CREATING`/`PENDING` em `docs/CHECKOUT_RUNBOOK.md`.
7. Confirme evento `checkout.completed` autentico, assinatura valida, HTTP 200 depois do
   processamento e uma linha `PaymentWebhookEvent` com `processedAt` preenchido e `error` nulo.
8. Confirme valor esperado = valor pago, pagamento `PAID`, `providerMethod = CARD`, `paidAt`
   preenchido e pedido `PAID`. Metodo solicitado no pedido, sozinho, nao atende este item.
9. Reenvie o mesmo evento apenas pelo mecanismo oficial do provedor, se disponivel. Confirme
   resposta de duplicado sem segundo efeito. Se nao houver redelivery oficial, registre
   `MANUAL_REQUIRED`; nao fabrique evento.
10. Mantenha checkout em `ALLOWLIST`. Pare imediatamente e aplique kill switch se houver valor,
    ambiente, metodo, externalId, cardinalidade ou estado divergente.

## Fulfillment controlado

1. Antes de habilitar worker, confirme pagamento CARD e checkout no painel, valor correto e um
   unico fulfillment `PENDING`; confirme ausencia de etiqueta.
2. Obtenha aprovacao operacional para uma compra de etiqueta sandbox ou real conforme ambiente.
3. Habilite `FULFILLMENT_WORKER_ENABLED=true` em todas as replicas e processe somente pedido
   controlado. Nao use retry administrativo como teste de fila.
4. Confirme job `COMPLETED`, pedido `PROCESSING`, remessa `LABEL_PURCHASED` e exatamente um
   `superfreteOrderId`. Confira mesmo identificador no painel Superfrete.
5. Prove que poll/reload e redelivery do webhook nao geram segundo fulfillment, checkout de frete
   ou etiqueta.
6. Desabilite worker se surgir estado financeiro divergente, lock vencido, resposta ambigua ou
   risco de nova etiqueta. Siga "Reexecutar fulfillment sem duplicar etiqueta" no runbook geral.

Compra de etiqueta real exige destino/disposicao previamente definidos. Etiqueta sandbox nao
comprova logistica de producao; registre ambiente claramente.

## Reembolso controlado

Nao altere `OrderPayment` ou `Order` diretamente. Siga integralmente "Reembolsar e registrar
identificador" em `docs/CHECKOUT_RUNBOOK.md`.

1. Duas pessoas conferem ambiente, checkout CARD, valor, motivo e ausencia de reembolso anterior.
2. Execute reembolso uma unica vez pelo painel/API oficial e guarde somente `refundPublicId`,
   horario UTC, valor em centavos e referencia restrita da aprovacao.
3. Aguarde `checkout.refunded` autentico. Confirme evento processado, pagamento `REFUNDED`, mesmo
   `refundPublicId` e `refundedAt`. Registre separadamente estado e disposicao do pedido; se ele
   permanecer `PAID` ou `PROCESSING`, escale e mantenha fulfillment bloqueado, sem corrigir banco
   diretamente.
4. Confirme mensagem "Pagamento reembolsado" no frontend e orientacao de atendimento, sem expor
   dado de cartao.
5. Se resposta for incerta, consulte painel antes de qualquer repeticao. Ausencia de evento exige
   redelivery oficial ou escalacao.

Teste local do endpoint/client e webhook sintetico prova somente logica. Reembolso real permanece
`MANUAL_REQUIRED` ate existir ID confirmado no provedor e evento externo.

## Disputa e perda

Nao abra chargeback real apenas para cumprir teste. Primeiro obtenha da AbacatePay mecanismo
oficial de sandbox, simulacao ou caso controlado e autorizacao financeira. Se provedor nao oferecer
mecanismo seguro, registre `BLOCKED` com referencia ao chamado/documentacao e dono; nao envie
`checkout.disputed` ou `checkout.lost` manualmente.

Para cada evento oficialmente produzido:

1. Confirme ambiente, `eventId`, checkout CARD, valor, assinatura e estado no painel.
2. Confirme `PaymentWebhookEvent.processedAt`, `error = null` e pagamento `DISPUTED`/`LOST` com
   timestamp correspondente.
3. Registre estado do pedido e confirme fulfillment ainda nao concluido em `FAILED`; worker e retry
   devem bloquear nova etiqueta porque pagamento nao esta `PAID`. Pedido pode permanecer `PAID` ou
   `PROCESSING`; nao altere estado para esconder divergencia financeira.
4. Se etiqueta ja existir, desligue worker, avalie cancelamento logistico com aprovacao e siga
   "Disputa e perda" no runbook geral.
5. Confirme frontend: "Pagamento em disputa; fale com o atendimento" para `DISPUTED` e "Disputa
   encerrada; fale com o atendimento" para `LOST`.
6. Prove idempotencia somente com redelivery oficial do mesmo evento. Registre dono financeiro e
   prazo de resposta ao provedor.

`DISPUTED` nao implica `LOST`; registre e prove cada transicao que o ambiente suportar. Caso real
nao controlavel nao deve ser provocado.

## Validacao do frontend

Execute em viewport desktop e mobile, navegacao por teclado e leitor de tela quando disponivel.
Sem iniciar servidor por automacao; use deploy autorizado iniciado pela responsavel.

- frontend informa que pagamento ocorre no ambiente seguro da AbacatePay e redireciona para URL
  HTTPS oficial;
- selecao de CARD ocorre no provedor. A tela local atual nao deve alegar CARD antes de receber
  `providerMethod = CARD`;
- retorno/completion restaura mesmo UUID e consulta estado sem criar pedido ou checkout novo;
- `CREATING`/`PENDING` mostra espera, atualizacao manual e, quando persistida, opcao de voltar ao
  mesmo checkout;
- timeout de polling orienta atualizar, sem incentivar nova compra;
- `PAID`/`PROCESSING` mostra confirmacao e estado de entrega correto;
- `REFUNDED`, `DISPUTED` e `LOST` mostram mensagens distintas e orientacao segura;
- erro, refresh, back/forward e recarga nao duplicam pedido, cobranca, fulfillment ou etiqueta;
- telas e telemetria nao exibem dado do cartao, URL de checkout, secret ou payload integral.

Captura de tela e aceitavel somente se sanitizada e armazenada no sistema restrito. Prefira
registro textual dos estados e IDs publicos.

## Evidencia segura e decisao

Use uma linha por etapa. Referencias apontam para sistema restrito; nao cole conteudo sensivel.

| Data/hora UTC | Ambiente/release | Etapa              | Resultado                                 | Evidencia segura                             | Responsaveis |
| ------------- | ---------------- | ------------------ | ----------------------------------------- | -------------------------------------------- | ------------ |
|               |                  | Local automatizada | `PASS_LOCAL`/`FAIL`/`NOT_RUN`             | commit, comando, contagem                    |              |
|               |                  | Compra CARD        | `PASS`/`FAIL`/`MANUAL_REQUIRED`/`BLOCKED` | orderUuid, checkoutId, valor, providerMethod |              |
|               |                  | Webhook externo    | `PASS`/`FAIL`/`MANUAL_REQUIRED`/`BLOCKED` | eventId, timestamps, estado                  |              |
|               |                  | Fulfillment        | `PASS`/`FAIL`/`MANUAL_REQUIRED`/`BLOCKED` | job/remessa/ID publico                       |              |
|               |                  | Reembolso          | `PASS`/`FAIL`/`MANUAL_REQUIRED`/`BLOCKED` | refundPublicId, eventId, estados             |              |
|               |                  | Disputa/perda      | `PASS`/`FAIL`/`MANUAL_REQUIRED`/`BLOCKED` | eventIds, estados ou referencia do bloqueio  |              |
|               |                  | Frontend           | `PASS`/`FAIL`/`MANUAL_REQUIRED`/`BLOCKED` | rotas, estados, referencia sanitizada        |              |

Resultado `PASS` de GL-052 exige compra CARD, webhook, fulfillment, procedimento de reembolso e
frontend comprovados, mais disputa/perda comprovadas em ambiente suportado ou decisao formal do
dono do gate sobre evidencia equivalente aceita. Ate la, mantenha tarefa aberta. `PASS_LOCAL`
nunca promove sozinho resultado operacional.

## Parada, rollback e kill switch

Pare execucao diante de checkout duplicado/orfao, valor ou ambiente divergente, metodo nao CARD,
webhook invalido/ausente, estado financeiro incompativel, reembolso incerto, fulfillment duplicado,
etiqueta sem aprovacao ou exposicao de dado sensivel.

1. Defina `CHECKOUT_ENABLED=false` e recarregue todas as replicas sem novo deploy. Isso bloqueia
   novas cobrancas, mas preserva webhooks e reconciliacao de checkouts existentes.
2. Se houver risco logistico, defina tambem `FULFILLMENT_WORKER_ENABLED=false` e recarregue todas
   as replicas. Pause e-mail/tracking somente se incidente exigir.
3. Nao reverta cobranca com rollback de deploy ou banco. Reembolso usa provedor; estados locais
   sao atualizados por evento autentico e reconciliacao.
4. Para regressao de aplicacao, reverta para artefato anterior compativel mantendo checkout
   desligado. Nao escreva migration corretiva nem restaure banco para apagar transacao financeira.
5. Reconcile painel/local, resolva etiqueta e reembolso, preserve evidencia filtrada e siga
   "Confirmar recuperacao e reativar" em `docs/CHECKOUT_RUNBOOK.md`.
6. Reative workers um por vez; depois checkout somente em `ALLOWLIST`. Nao use `PUBLIC` durante
   recuperacao ou repeticao do teste.

Feche execucao apenas com decisao `PASS`, `FAIL`, `MANUAL_REQUIRED` ou `BLOCKED`, dono e proxima
acao registrados. Incidente permanece aberto enquanto houver cobranca, reembolso, disputa, perda
ou etiqueta sem reconciliacao.
