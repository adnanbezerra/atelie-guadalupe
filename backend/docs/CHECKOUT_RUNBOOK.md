# Runbook do checkout

Este documento e operacional. Execute somente com acesso autorizado ao ambiente e aos paineis dos
provedores. Nunca copie token, secret, payload integral de webhook, documento, endereco, e-mail ou
URL de checkout para terminal compartilhado, ticket, chat ou log. Registre apenas UUID do pedido,
IDs publicos dos provedores, estados, valores em centavos, horarios, responsavel e decisao.

Os exemplos HTTP assumem `API_BASE_URL`, `ORDER_UUID` e arquivos `OPS_CURL_CONFIG` e
`ABACATEPAY_CURL_CONFIG` protegidos (`0600`) e provisionados pelo gerenciador de secrets. Esses
arquivos contem autenticacao do operador/provedor; nao crie seu conteudo no historico do shell.
Filtre respostas antes de registra-las, pois endpoints de detalhe tambem retornam dados pessoais.

## Triagem e registro

1. Abra incidente e registre horario UTC, ambiente, release, impacto, responsaveis tecnico e
   operacional.
2. Preserve logs pelo ID da requisicao, `orderUuid`, `providerCheckoutId`, `eventId` e
   `superfreteOrderId`. Nao preserve corpo integral nem headers de autenticacao.
3. Classifique primeiro o estado financeiro. Nao altere `Order`, `OrderPayment`,
   `PaymentWebhookEvent`, `FulfillmentJob` ou `OrderShipment` diretamente no banco.
4. Se houver risco de nova cobranca incorreta ou duplicada, aplique o kill switch. Se houver risco
   de compra indevida de etiqueta, desative tambem o worker de fulfillment.
5. Toda operacao financeira ou cancelamento de etiqueta exige aprovacao registrada e conferencia
   por duas pessoas.

## Localizar pedido sem expor dados pessoais

### Por UUID

Use conta `ADMIN` ou `SUBADMIN`. Mostre somente campos operacionais:

```sh
curl --fail-with-body --silent --show-error --config "$OPS_CURL_CONFIG" \
  "$API_BASE_URL/orders/$ORDER_UUID" \
  | jq '.data.order | {uuid,status,totalInCents,payment:{status:.payment.status,providerCheckoutId:.payment.providerCheckoutId,paidAmountInCents:.payment.paidAmountInCents},shipment:{status:.shipment.status,superfreteOrderId:.shipment.superfreteOrderId},fulfillment:{status:.fulfillment.status,attempts:.fulfillment.attempts,nextAttemptAt:.fulfillment.nextAttemptAt},createdAt,updatedAt}'
```

### Por e-mail ou ID do checkout

Nao existe endpoint administrativo filtrado para essas buscas. Execute uma destas consultas
somente no console autorizado do banco, com bind parameter (`$1`); nunca concatene o valor no SQL.
A busca por e-mail recebe dado pessoal, mas nao o devolve:

```sql
-- $1: e-mail exato, informado no console seguro
SELECT o.uuid, o.status, o."totalInCents", op.status AS payment_status,
       op."providerCheckoutId", o."createdAt"
FROM "Order" o
JOIN "User" u ON u.id = o."userId"
LEFT JOIN "OrderPayment" op ON op."orderId" = o.id
WHERE lower(u.email) = lower($1)
ORDER BY o."createdAt" DESC;
```

```sql
-- $1: providerCheckoutId
SELECT o.uuid, o.status, o."totalInCents", op.status AS payment_status,
       op."expectedAmountInCents", op."paidAmountInCents", op."paidAt"
FROM "OrderPayment" op
JOIN "Order" o ON o.id = op."orderId"
WHERE op."providerCheckoutId" = $1;
```

Se nenhuma linha aparecer, procure tambem `PaymentLink.providerCheckoutId`. Checkout sem pedido nem
link local e incidente financeiro; nao crie registro manual para faze-lo "encaixar".

## Kill switch de novas cobrancas

`CHECKOUT_ENABLED=false` impede somente novas chamadas de criacao de checkout nos fluxos de pedido
e link personalizado. Checkouts ja persistidos continuam acessiveis, e pagamentos com estado
`CREATING` continuam consultando a AbacatePay para reconciliar cobranca talvez criada antes de um
timeout. Webhooks, consultas, reembolsos e workers nao dependem desse switch.

Com switch mestre ativo, `CHECKOUT_ROLLOUT_MODE=ALLOWLIST` limita pedidos novos aos donos
autenticados em `CHECKOUT_ALLOWED_USER_UUIDS` e bloqueia criacao nova por link publico. Modo
`PUBLIC` exige lista ausente. Configuracao ausente/invalida em producao falha fechada. Veja
`docs/CHECKOUT_CANARY.md`.

### Desativar sem novo deploy

1. Registre motivo, horario, responsavel e release em execucao.
2. Altere `CHECKOUT_ENABLED` para `false` no gerenciador de configuracao. Nao altere
   `FULFILLMENT_WORKER_ENABLED`, `EMAIL_WORKER_ENABLED` nem
   `SHIPPING_TRACKING_WORKER_ENABLED`, salvo risco logistico separado.
3. Reinicie ou recarregue todas as instancias com a mesma release; nao publique novo artefato.
4. Tente iniciar pagamento de pedido valido ainda sem checkout e de link `ACTIVE` sem checkout.
   Ambos devem responder HTTP 503, codigo `SERVICE_UNAVAILABLE`, sem chamada de criacao na
   AbacatePay.
5. Consulte pedido ou link com checkout persistido e confirme que continua acessivel. Confirme
   tambem recebimento de webhook e processamento de filas em voo.

Se alguma instancia ainda criar checkout, retire-a do trafego e mantenha incidente aberto.

## Reconciliar checkout `CREATING` ou `PENDING`

### Pedido

1. Consulte pedido e anote `status`, `totalInCents`, `payment.status`,
   `payment.providerCheckoutId` e `paymentIdempotencyKey`; nao registre URL de checkout.
2. No painel/API oficial da AbacatePay, busque por `externalId = <orderUuid>` em todas as paginas.
   Compare ID, `externalId`, valor, estado e `devMode` com ambiente esperado.
3. Para `CREATING` sem `providerCheckoutId`:
    - se nenhum checkout aparecer, aguarde propagacao e consulte novamente; ausencia momentanea nao
      autoriza segunda criacao;
    - se checkout exato aparecer, cliente autenticado deve repetir
      `POST /orders/:orderUuid/payment` com `Idempotency-Key` original. Backend consulta e persiste
      esse checkout, sem criar outro;
    - se ID, valor ou `externalId` divergirem, mantenha bloqueado e escale. Backend grava ID
      divergente, remove URL e exige acao manual.
4. Para `PENDING`, checkout ja esta persistido. Se provedor continua pendente, nao reprocesse. Se
   provedor mostra pago e local nao, use redelivery oficial do webhook conforme secao seguinte.
5. Confirme ao final: um `providerCheckoutId`, valor esperado igual ao provedor e estado local
   compativel. Nunca apague `OrderPayment` nem troque status diretamente.

Conta administrativa nao pode iniciar checkout em nome do cliente: endpoint valida dono do pedido.
Sem sessao autorizada do cliente, limite operacao a diagnostico e suporte; nao faca impersonacao.

### Link personalizado

1. Localize pelo UUID e consulte AbacatePay com `externalId = payment-link:<uuid>`.
2. Se checkout exato existir, repita `POST /payment-links/:uuid/payment`. Em `CREATING`, backend
   consulta e persiste mesmo `providerCheckoutId`.
3. Se nao existir, mantenha `CREATING` e consulte novamente depois. Nao altere para `ACTIVE` nem
   crie segundo checkout.
4. Se valor ou `externalId` divergir, mantenha bloqueado. Link expirado permanece `EXPIRED` e nao
   deve voltar a expor URL, mesmo quando checkout tardio for encontrado.

## Reprocessar webhook com seguranca

Nao existe endpoint administrativo de reprocessamento. Mecanismo seguro e redelivery oficial da
AbacatePay, preservando corpo, assinatura e mesmo `eventId`; `app.inject`, `curl` manual, nova
assinatura ou edicao do payload nao valem.

1. Localize evento sem abrir `payload`:

```sql
-- $1: eventId
SELECT "eventId", "eventType", "processedAt", error, "createdAt", "updatedAt"
FROM "PaymentWebhookEvent"
WHERE "eventId" = $1;
```

2. Se `processedAt` existe, evento concluiu. Redelivery do mesmo ID deve responder sucesso como
   duplicado e nao repetir fulfillment, e-mail nem reembolso.
3. Se `error = '__PROCESSING__'` e `updatedAt` tem menos de cinco minutos, aguarde tentativa atual.
   Depois de cinco minutos, claim fica expirado e redelivery pode tentar novamente.
4. Se `error` descreve falha, corrija causa primeiro: checkout local ausente, ambiente divergente,
   valor divergente ou indisponibilidade. Nao limpe `error`/`processedAt` no banco.
5. Solicite redelivery no painel/mecanismo oficial do provedor. Confirme HTTP 200 somente depois do
   processamento.
6. Consulte novamente: `processedAt IS NOT NULL` e `error IS NULL`. Confirme ainda cardinalidade de
   um evento, um pagamento, no maximo um fulfillment e um e-mail por chave de deduplicacao.

Se provedor nao oferecer redelivery, escale para criar ferramenta administrativa autenticada e
auditada. Nao improvise chamada manual em producao.

## Reexecutar fulfillment sem duplicar etiqueta

`POST /orders/:orderUuid/fulfillment/retry` exige `ADMIN` ou `SUBADMIN`, zera tentativas e processa
imediatamente. Pode comprar etiqueta real; nao use como simples teste de fila.

Compra segura mantem lock financeiro durante no maximo quatro chamadas sequenciais ao SuperFrete
(`createCart`, consulta, `checkout`, consulta) e operacoes no banco. Configure
`FULFILLMENT_TRANSACTION_TIMEOUT_MS >= 4 * SUPERFRETE_TIMEOUT_MS + 10000`; startup rejeita valor
menor. Mantenha `FULFILLMENT_WORKER_LOCK_TIMEOUT_MS >= FULFILLMENT_TRANSACTION_TIMEOUT_MS +
10000`; isso impede recovery do job antes da transacao acabar. A transacao longa e intencional
para impedir webhook de disputa/perda no meio da compra. Webhooks financeiros usam
`FULFILLMENT_TRANSACTION_TIMEOUT_MS + 10000ms` para aguardar esse lock e concluir a transicao.
Latencia ou expiracao desse lock deve gerar retry/alerta; nao reduza timeout para mascarar lentidao.

1. Confirme provedor pago, `payment.status = PAID`, pedido `PAID` ou `PROCESSING` e valor correto.
2. Consulte job e remessa:

```sql
-- $1: orderUuid
SELECT o.uuid, o.status, op.status AS payment_status,
       fj.status AS fulfillment_status, fj.attempts, fj."nextAttemptAt", fj."lockedAt",
       os.status AS shipment_status, os."superfreteOrderId", os."purchasedAt"
FROM "Order" o
LEFT JOIN "OrderPayment" op ON op."orderId" = o.id
LEFT JOIN "FulfillmentJob" fj ON fj."orderId" = o.id
LEFT JOIN "OrderShipment" os ON os."orderId" = o.id
WHERE o.uuid = $1::uuid;
```

3. Nao invoque retry enquanto job estiver `PROCESSING` e lock tiver menos que
   `FULFILLMENT_WORKER_LOCK_TIMEOUT_MS`.
4. Se remessa esta `LABEL_PURCHASED`, confirme no Superfrete mesmo ID/protocolo; retry pode concluir
   job usando remessa existente, sem nova compra.
5. Se existe `superfreteOrderId` em `CHECKOUT_REQUESTED`, consulte esse ID no Superfrete. Backend
   verifica informacao do pedido antes de chamar checkout.
6. Se nao existe `superfreteOrderId` depois de timeout ambiguo em criacao de carrinho, busque no
   painel/suporte do Superfrete pelo UUID/tag do pedido. Nao execute retry ate provar que nao existe
   carrinho orfao ou obter procedimento de vinculacao auditado.
7. Corrija causa de `lastError`, obtenha aprovacao operacional e execute:

```sh
curl --fail-with-body --silent --show-error --request POST \
  --config "$OPS_CURL_CONFIG" \
  "$API_BASE_URL/orders/$ORDER_UUID/fulfillment/retry" \
  | jq '.data | {scheduled}'
```

8. Confirme job `COMPLETED`, pedido `PROCESSING`, remessa `LABEL_PURCHASED` e exatamente um
   `superfreteOrderId`. Se resposta for incerta, consulte estados antes de repetir.

## Pagamento confirmado depois do cancelamento

Alerta `late_payment_on_cancelled_order` informa `orderUuid`, `providerCheckoutId` e
`paidAmountInCents`. Processamento grava pagamento `REFUND_PENDING`, mantem pedido `CANCELLED`,
marca webhook processado e nao cria fulfillment nem e-mail de confirmacao.

1. Confirme pedido `CANCELLED`, pagamento `REFUND_PENDING`, valor e checkout no provedor.
2. Confirme ausencia de fulfillment ou que ele nao produziu etiqueta. Se etiqueta existir, trate
   cancelamento logistico em paralelo.
3. Obtenha aprovacao financeira e execute reembolso integral conforme secao seguinte.
4. Mesmo `checkout.completed` repetido nao deve abrir segunda acao: transicao e alerta sao
   condicionais.

## Reembolsar e registrar identificador

Nao existe endpoint administrativo local de reembolso. Use painel oficial ou `POST
/checkouts/refund` da AbacatePay com credencial fornecida por arquivo seguro. Nunca altere estado
financeiro no banco.

1. Duas pessoas conferem ambiente, `providerCheckoutId`, valor recebido, motivo e ausencia de
   reembolso anterior.
2. Registre aprovacao e motivo padronizado sem dados do pagador. Execute uma unica vez. Exemplo da
   API usada pelo codigo:

```sh
jq -n --arg id "$PROVIDER_CHECKOUT_ID" --arg reason "$REFUND_REASON" \
  '{id:$id,reason:$reason}' \
  | curl --fail-with-body --silent --show-error --request POST \
      --config "$ABACATEPAY_CURL_CONFIG" \
      --header 'content-type: application/json' \
      --data-binary @- \
      "$ABACATEPAY_BASE_URL/checkouts/refund" \
  | jq '.data | {refundPublicId}'
```

3. Registre `refundPublicId`, horario e responsaveis no incidente; nao cole resposta integral.
4. Aguarde `checkout.refunded`. Confirme pagamento/link `REFUNDED`, mesmo `refundPublicId`,
   `refundedAt` preenchido e evento processado sem erro.
5. Se chamada teve resposta incerta, consulte painel pelo checkout antes de repetir. Se webhook nao
   chegar, use redelivery oficial; nao envie `checkout.refunded` manualmente.

## Disputa e perda

1. Ao receber `checkout.disputed` ou `checkout.lost`, confirme assinatura, `eventId`, checkout,
   valor e estado local `DISPUTED` ou `LOST`.
2. Confirme que fulfillment ainda nao concluido virou `FAILED` com motivo financeiro. O worker e
   retry manual bloqueiam nova compra enquanto pagamento nao estiver `PAID`. Se houver anomalia,
   altere `FULFILLMENT_WORKER_ENABLED=false` em todas as instancias e recarregue mesma release.
3. Se existe `superfreteOrderId`, avalie elegibilidade e aprovacao antes de cancelar. Endpoint real:

```sh
curl --fail-with-body --silent --show-error --request POST \
  --config "$OPS_CURL_CONFIG" \
  "$API_BASE_URL/shipping/orders/$ORDER_UUID/cancel" \
  | jq '.data | {orderUuid:.order.uuid,orderStatus:.order.status,shipmentStatus:.shipment.status,superfreteOrderId:.shipment.superfreteOrderId,cancelledAt:.shipment.cancelledAt}'
```

4. Preserve comprovantes no sistema restrito do incidente, responda dentro do prazo do provedor e
   atribua dono financeiro. Nao marque pedido como pago/cancelado para ocultar disputa.
5. `DISPUTED` pode mudar depois da analise; `LOST` exige contabilizacao e decisao de atendimento.
   Aguarde evento oficial e reconcilie antes de liberar fulfillment.

## Reconciliacao financeira diaria

Execute em ambiente operacional autorizado, com credenciais somente leitura quando disponiveis:

```sh
FINANCIAL_RECONCILIATION_OWNER=finance-ops \
FINANCIAL_RECONCILIATION_FROM=2026-08-27T00:00:00.000Z \
FINANCIAL_RECONCILIATION_TO=2026-08-28T00:00:00.000Z \
pnpm run reconcile:order-payments
```

Periodo e intervalo semiaberto: inclui atividade do provedor com
`updatedAt >= FROM && updatedAt < TO`. `/checkouts/list` nao aceita filtro de data; ferramenta
percorre todas as paginas e classifica atividade localmente. Independentemente do periodo, compara
todo checkout provider `PAID`/`REFUNDED`. Banco percorre todos os `OrderPayment` em `PAID`,
`REFUND_PENDING`, `REFUNDED`, `DISPUTED` ou `LOST` e pedidos em `PAID`, `PROCESSING`, `SHIPPED` ou
`DELIVERED`. Assim, periodo mede atividade sem apagar orfao ou invariante financeira antiga.

Comparacao de horario usa `provider.updatedAt` contra `OrderPayment.paidAt` em `PAID` e contra
`OrderPayment.refundedAt` em `REFUNDED`. Ausencia ou diferenca acima da tolerancia vira
`TIME_MISMATCH`. Estado do pedido tambem e invariante: pagamento `PAID` exige pedido `PAID`,
`PROCESSING`, `SHIPPED` ou `DELIVERED`; estado financeiro terminal ou `REFUND_PENDING` exige pedido
`CANCELLED`. Divergencia vira `ORDER_PAYMENT_STATUS_MISMATCH`.

Listagens usam cursor e tetos configuraveis. `hasMore` sem `next`, cursor/ID repetido, pagina ou
volume acima do limite interrompem execucao sem produzir relatorio parcial. Ajuste somente apos
medir volume:

- `ABACATEPAY_RECONCILIATION_MAX_RECORDS` e `ABACATEPAY_RECONCILIATION_MAX_PAGES`;
- `FINANCIAL_RECONCILIATION_MAX_LOCAL_RECORDS` e `FINANCIAL_RECONCILIATION_MAX_LOCAL_PAGES`.

Relatorio nao inclui URL de checkout nem `externalId` arbitrario. UUID valido pode aparecer; demais
IDs sao anulados ou resumidos por hash. Cada divergencia recebe `fingerprint` e dono. Para registrar
andamento, forneca `FINANCIAL_RECONCILIATION_RESOLUTIONS_FILE` apontando para JSON restrito:

```json
{
    "0123456789abcdef0123": [
        {
            "at": "2026-08-28T12:00:00.000Z",
            "owner": "finance-ops",
            "status": "RESOLVED",
            "resolutionCode": "WEBHOOK_REPROCESSED",
            "auditReference": "INC-2026-0042"
        }
    ]
}
```

Nunca marque `RESOLVED` sem evidencia no sistema restrito. Saida nao zero, limite excedido ou
falha de qualquer fonte invalida execucao inteira; corrija causa e rode novamente.

## Indisponibilidade de provedores

### AbacatePay

1. Aplique `CHECKOUT_ENABLED=false` se criacao/consulta falhar, latencia exceder timeout ou houver
   respostas divergentes.
2. Mantenha endpoint de webhook ativo. Nao apague pagamentos `CREATING`/`PENDING` nem crie cobranca
   alternativa.
3. Consulte pagina de status/suporte, registre janela e IDs afetados. Apos recuperacao, reconcilie
   `CREATING` e redeliver webhooks antes de reativar.

### Superfrete

1. Altere `FULFILLMENT_WORKER_ENABLED=false` e recarregue todas as instancias. Checkouts pagos e
   webhooks continuam registrados; jobs ficam pendentes.
2. Nao repita checkout de etiqueta com resposta incerta. Consulte `superfreteOrderId` ou procure
   carrinho por UUID/tag no painel/suporte.
3. Se cotacao tambem estiver indisponivel e impedir venda correta, aplique `CHECKOUT_ENABLED=false`.
4. Apos recuperacao, valide cotacao controlada e informacao de remessa existente; depois reative
   worker e acompanhe backlog.

### Resend/e-mail

1. Pagamento e fulfillment continuam validos sem e-mail. Nao reverta estado financeiro.
2. Se erro for persistente, rate limit ou risco de envio indevido, altere `EMAIL_WORKER_ENABLED=false`
   e recarregue instancias. Preserve jobs `PENDING`/`RETRY_SCHEDULED`.
3. Corrija remetente, dominio ou disponibilidade; faca envio controlado e reative worker. Confirme
   deduplicacao e drenagem do backlog sem criar novo job manualmente.

### Banco de dados

1. Retire instancias sem conexao do trafego; nao aceite checkout degradado sem persistencia.
2. Mantenha `CHECKOUT_ENABLED=false` no proximo start. Confirme com provedores cobrancas e eventos
   ocorridos na janela antes de reabrir.
3. Restaure/repare somente pelo plano de banco aprovado; depois execute reconciliacao financeira.

## Escalar incidente e comunicar cliente

Escale imediatamente quando houver cobranca duplicada/orfa, valor divergente, pagamento sem pedido,
reembolso incerto, disputa/perda, etiqueta duplicada, impossibilidade de reconciliar ou impacto
acima do limiar do alerta.

Registro minimo: severidade, horario UTC, ambiente/release, UUIDs/IDs publicos, valores em centavos,
estados local/provedor, alcance, acao de contencao, donos tecnico/financeiro/operacional e proxima
atualizacao. Compartilhe dados pessoais apenas no canal restrito de atendimento.

Mensagem ao cliente deve informar impacto conhecido, se houve ou nao cobranca confirmada, acao em
curso e horario da proxima atualizacao. Nao atribua culpa sem evidencia, nao prometa prazo do
provedor e nao envie URL interna, payload ou identificador secreto.

## Confirmar recuperacao e reativar

1. Confirme causa corrigida e janela estavel definida pelo incidente.
2. Confirme zero cobranca duplicada/orfa, zero valor divergente, zero webhook com erro/pendente acima
   do limite, zero pagamento pago incompativel com pedido e zero etiqueta duplicada.
3. Reconcilie todos `CREATING`, pagamentos `PENDING` vencidos, `REFUND_PENDING`, `DISPUTED`, `LOST`
   e jobs de fulfillment afetados. Atribua dono ao que ainda depender de terceiro.
4. Valide uma consulta de checkout na AbacatePay, uma consulta/cotacao controlada na Superfrete e,
   se afetado, um envio controlado no Resend.
5. Reative primeiro workers pausados, um por vez, e monitore backlog. Depois obtenha aprovacao
   operacional e tecnica para `CHECKOUT_ENABLED=true` com `CHECKOUT_ROLLOUT_MODE=ALLOWLIST`.
6. Recarregue todas as instancias com mesma release. Crie uma unica cobranca controlada de baixo
   valor; confirme uma criacao, identificador/valor corretos e persistencia local.
7. Monitore criacao, webhooks, fulfillment, e-mail e reconciliacao durante janela definida. Volte
   imediatamente ao switch seguro se divergencia reaparecer.

Nao altere para `PUBLIC` durante recuperacao. Expansao posterior segue gate canario e nova
aprovacao.

Feche incidente somente depois de registrar evidencia filtrada, impacto final, conciliacao,
decisao dos responsaveis e acoes preventivas.
