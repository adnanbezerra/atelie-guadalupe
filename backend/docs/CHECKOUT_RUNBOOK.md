# Runbook do checkout

## Kill switch de novas cobrancas

`CHECKOUT_ENABLED=false` impede somente novas chamadas de criacao de checkout nos fluxos de pedido
e link personalizado. Checkouts ja persistidos continuam acessiveis, e pagamentos com estado
`CREATING` continuam consultando a AbacatePay para reconciliar uma cobranca que possa ter sido
criada antes de um timeout. Webhooks, consultas, reembolsos e workers nao dependem desse switch.

### Desativar sem novo deploy

1. Registre o motivo, horario, responsavel e release atualmente em execucao.
2. Altere `CHECKOUT_ENABLED` para `false` no gerenciador de configuracao do ambiente. Nao altere
   `FULFILLMENT_WORKER_ENABLED`, `EMAIL_WORKER_ENABLED` nem
   `SHIPPING_TRACKING_WORKER_ENABLED`.
3. Reinicie ou recarregue as instancias usando a mesma release, conforme mecanismo da plataforma;
   nao gere nem publique novo artefato. A variavel de ambiente precisa chegar a todas as instancias.
4. Tente iniciar um pagamento de pedido valido ainda sem checkout e o pagamento de um link
   `ACTIVE` sem checkout. Ambos devem responder HTTP 503, com codigo `SERVICE_UNAVAILABLE`, e os
   logs/metricas da AbacatePay nao devem registrar chamada de criacao.
5. Consulte um pedido ou link com checkout ja persistido e confirme que sua URL continua sendo
   retornada. Se houver pagamento `CREATING`, repita a requisicao e confirme que a consulta de
   reconciliacao pode persistir o checkout encontrado sem criar outro.
6. Confirme que o endpoint de webhook permanece recebendo eventos e que filas de fulfillment,
   e-mail e rastreamento continuam processando pagamentos em voo.

Se qualquer instancia ainda criar checkout, mantenha o incidente aberto, retire essa instancia do
trafego e corrija sua configuracao antes de continuar.

### Reativar

1. Confirme que a causa do incidente foi corrigida e que nao existem cobrancas duplicadas, valores
   divergentes, webhooks pendentes nem pagamentos `CREATING` sem reconciliacao.
2. Registre aprovacao operacional e tecnica para reabertura.
3. Altere `CHECKOUT_ENABLED` para `true` e reinicie ou recarregue todas as instancias com a mesma
   release.
4. Crie uma unica cobranca controlada de baixo valor. Confirme uma chamada de criacao, valor e
   identificador corretos e persistencia local do checkout.
5. Monitore erros de criacao, webhooks e filas durante a janela definida para o incidente. Reverta
   imediatamente para `false` se reaparecer divergencia.

## Link personalizado em CREATING persistente

1. Localize o link pelo `uuid` e use `payment-link:<uuid>` como `externalId` na consulta da
   AbacatePay. Registre horario, responsavel, estado local e resposta integral do provedor.
2. Se o checkout existir e `externalId` e valor coincidirem, repita o fluxo de pagamento para
   reconciliar e persistir o mesmo `providerCheckoutId`. Link ja expirado deve continuar
   `EXPIRED`; sua URL nao pode ser devolvida para novo pagamento.
3. Se a consulta ainda nao encontrar checkout, mantenha `CREATING` e escale para reconciliacao
   operacional. Ausencia momentanea na listagem nao prova que a criacao falhou.
4. Se `externalId` ou valor divergirem, mantenha o link bloqueado, preserve identificador e resposta
   do checkout e escale como incidente financeiro para decisao manual.

Nunca altere link incerto para `ACTIVE`, limpe sua rastreabilidade nem crie outro checkout. Webhook
tardio valido deve ser preservado e processado contra o checkout reconciliado.

## Pagamento confirmado depois do cancelamento

O alerta `late_payment_on_cancelled_order` informa `orderUuid`, `providerCheckoutId` e
`paidAmountInCents`. O processamento grava o pagamento como `REFUND_PENDING`, mantém o pedido
`CANCELLED`, registra o webhook como processado e não cria fulfillment nem e-mail de confirmação.

1. Localize o pedido pelo `orderUuid` e confirme `order.status = CANCELLED` e
   `payment.status = REFUND_PENDING`.
2. Confira no provedor o checkout indicado por `providerCheckoutId`, o valor recebido e o pagador.
   Se houver divergência, escale como incidente financeiro antes de continuar.
3. Solicite o reembolso integral pelo mecanismo oficial autorizado da AbacatePay. Não altere o
   estado financeiro diretamente no banco.
4. Registre o identificador do reembolso no atendimento/incidente e acompanhe a chegada do webhook
   `checkout.refunded`.
5. Confirme que o pagamento passou para `REFUNDED`, com `refundPublicId` e `refundedAt`, e que o
   pedido permaneceu `CANCELLED` sem fulfillment.
6. Se o webhook não chegar, preserve o evento original, o comprovante do reembolso e escale para
   reprocessamento seguro; não envie novo `checkout.completed` manualmente.

O mesmo `checkout.completed` pode ser entregue novamente. A transição para `REFUND_PENDING` e o
alerta são condicionais, portanto uma repetição não deve abrir outra ação de reembolso.

## Fulfillment em falha terminal

Jobs incompatíveis com o estado do pedido ou que atingem `FULFILLMENT_WORKER_MAX_ATTEMPTS` ficam em
`FAILED`, com `attempts` e `lastError` consultáveis. Antes de usar o retry administrativo, corrija a
causa indicada; o retry explícito reinicia a contagem de tentativas.
