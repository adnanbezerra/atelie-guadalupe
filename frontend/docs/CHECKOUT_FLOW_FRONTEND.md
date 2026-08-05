# Guia frontend: fluxo completo de checkout

Este documento descreve o fluxo que o frontend deve seguir desde o carrinho ate a confirmacao do pagamento e acompanhamento da entrega.

## Visao geral

```text
Carrinho
  -> preview de frete
  -> cria pedido PENDING e recebe paymentIdempotencyKey
  -> confirma frete definitivo
  -> cria/recupera checkout AbacatePay
  -> redireciona usuario
  -> retorna ao site
  -> consulta pedido ate PAID/PROCESSING
```

O redirecionamento da AbacatePay nao confirma o pagamento. Somente `order.status` e `order.payment.status`, atualizados pelo webhook no backend, sao fontes confiaveis.

## Tipos sugeridos

```ts
type OrderStatus =
    | "PENDING"
    | "AWAITING_PAYMENT"
    | "PAID"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";

type PaymentStatus =
    | "CREATING"
    | "PENDING"
    | "PAID"
    | "REFUND_PENDING"
    | "REFUNDED"
    | "DISPUTED"
    | "LOST";

type ShippingStatus =
    | "DRAFT"
    | "QUOTED"
    | "CONFIRMED"
    | "CHECKOUT_REQUESTED"
    | "LABEL_PURCHASED"
    | "CANCELLED";

type FulfillmentStatus =
    | "PENDING"
    | "PROCESSING"
    | "RETRY_SCHEDULED"
    | "COMPLETED";

type Order = {
    uuid: string;
    paymentIdempotencyKey: string;
    status: OrderStatus;
    subtotalInCents: number;
    shippingInCents: number;
    discountInCents: number;
    totalInCents: number;
    payment: null | {
        status: PaymentStatus;
        providerCheckoutId: string | null;
        checkoutUrl: string | null;
        paidAmountInCents: number | null;
    };
    shipment: null | {
        status: ShippingStatus;
        trackingCode: string | null;
        labelUrl: string | null;
    };
    fulfillment: null | {
        status: FulfillmentStatus;
        attempts: number;
        lastError: string | null;
        nextAttemptAt: string;
    };
};

type CheckoutResponse = {
    success: true;
    data: {
        paymentStatus: PaymentStatus;
        checkoutId: string;
        checkoutUrl: string;
        amountInCents: number;
    };
};

type ApiError = {
    success: false;
    error: {
        code: string;
        message: string;
        details: Array<Record<string, unknown>>;
    };
};
```

## 1. Preview do frete

Use `POST /shipping/quote` sempre que CEP, produto, tamanho ou quantidade mudar. Guarde apenas o `serviceCode` escolhido; o preco do preview nao e o valor definitivo.

```ts
const quote = await api("/shipping/quote", {
    method: "POST",
    body: JSON.stringify({
        zipCode,
        items: cartItems.map((item) => ({
            productUuid: item.productUuid,
            productSize: item.productSize,
            quantity: item.quantity,
        })),
    }),
});
```

## 2. Criar o pedido

`addressUuid` e obrigatorio.

```ts
const created = await api<{ success: true; data: { order: Order } }>(
    "/orders",
    {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ addressUuid, notes }),
    },
);

const order = created.data.order;
sessionStorage.setItem(
    `checkout:${order.uuid}:key`,
    order.paymentIdempotencyKey,
);
```

Desabilite o botao enquanto a requisicao estiver em andamento. Depois de receber o pedido, nao crie outro automaticamente por timeout de uma etapa posterior.

## 3. Confirmar o frete definitivo

```ts
await api(`/shipping/orders/${order.uuid}/quote`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ serviceCode: selectedServiceCode }),
});
```

Use os totais devolvidos por esta resposta. Se a cotacao mudou, mostre o novo valor antes de continuar.

## 4. Criar ou recuperar o checkout

Sempre reutilize a chave criada pelo backend.

```ts
const key = order.paymentIdempotencyKey;

const checkout = await api<CheckoutResponse>(`/orders/${order.uuid}/payment`, {
    method: "POST",
    headers: {
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": key,
    },
});

window.location.assign(checkout.data.checkoutUrl);
```

Duplo clique, retry de rede e refresh devem repetir essa mesma chamada com a mesma chave. Nunca gere uma chave no frontend.

Se a resposta do checkout for perdida, consulte `GET /orders/:uuid`. A resposta devolve a mesma chave e, quando existente, `payment.checkoutUrl`.

## 5. Retorno da AbacatePay

Na pagina configurada como `completionUrl`:

1. recupere o UUID do pedido salvo no estado/URL da aplicacao;
2. consulte `GET /orders/:uuid` imediatamente;
3. se ainda estiver `AWAITING_PAYMENT`, inicie polling;
4. pare quando chegar a estado terminal ou no limite de tempo.

Exemplo:

```ts
async function waitForPayment(orderUuid: string, signal: AbortSignal) {
    const deadline = Date.now() + 2 * 60_000;

    while (Date.now() < deadline && !signal.aborted) {
        const response = await api<{ success: true; data: { order: Order } }>(
            `/orders/${orderUuid}`,
            { headers: { Authorization: `Bearer ${token}` }, signal },
        );
        const order = response.data.order;

        if (
            ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(
                order.status,
            )
        ) {
            return order;
        }
        if (
            ["REFUNDED", "DISPUTED", "LOST"].includes(
                order.payment?.status ?? "",
            )
        ) {
            return order;
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    return null;
}
```

Ao encerrar o polling sem confirmacao, mostre "Pagamento em processamento" e permita atualizar manualmente. Nao crie outro pedido ou pagamento.

## Estados na interface

Mostre pagamento e entrega separadamente:

| Pedido/pagamento               | Mensagem sugerida                                  |
| ------------------------------ | -------------------------------------------------- |
| `PENDING`                      | Confirme o frete para continuar                    |
| `AWAITING_PAYMENT` / `PENDING` | Aguardando pagamento                               |
| `PAID`                         | Pagamento confirmado; preparando envio             |
| `REFUNDED`                     | Pagamento reembolsado                              |
| `DISPUTED`                     | Pagamento em disputa; contate o suporte            |
| `LOST`                         | Disputa encerrada contra a loja; contate o suporte |

| Fulfillment/entrega             | Mensagem sugerida                                    |
| ------------------------------- | ---------------------------------------------------- |
| `PENDING` ou `PROCESSING`       | Preparando etiqueta                                  |
| `RETRY_SCHEDULED`               | Pagamento confirmado; envio aguardando processamento |
| `COMPLETED` / `LABEL_PURCHASED` | Etiqueta emitida                                     |
| pedido `SHIPPED`                | Pedido enviado                                       |
| pedido `DELIVERED`              | Pedido entregue                                      |

Nao mostre `lastError` diretamente ao cliente; ele e diagnostico operacional.

## Tratamento de erros

| HTTP  | Acao do frontend                                                  |
| ----- | ----------------------------------------------------------------- |
| `400` | Exibir a mensagem e retornar para endereco/frete quando aplicavel |
| `401` | Renovar sessao ou solicitar login                                 |
| `403` | Bloquear acesso ao pedido                                         |
| `404` | Informar que o pedido nao foi encontrado                          |
| `409` | Recarregar o pedido e usar a chave retornada pelo backend         |
| `422` | Corrigir UUID, payload ou header ausente                          |
| `503` | Manter pedido/chave e oferecer tentar novamente                   |

## Regras para evitar duplicidade

- nunca gere `Idempotency-Key` no frontend;
- salve a chave retornada pelo pedido;
- reutilize a mesma chave em toda tentativa;
- desabilite botoes durante requests;
- depois de criar o pedido, retome sempre pelo UUID existente;
- em timeout, consulte o pedido antes de qualquer outra acao;
- uma URL de checkout existente deve ser reutilizada;
- nao considere a `completionUrl` uma confirmacao financeira.

## Checklist de sandbox

- [ ] Configurar AbacatePay e Superfrete em sandbox.
- [ ] Adicionar saldo na carteira sandbox da Superfrete.
- [ ] Criar carrinho e obter preview de frete.
- [ ] Criar pedido e conferir a chave retornada.
- [ ] Confirmar frete e conferir o novo total.
- [ ] Chamar pagamento duas vezes com a mesma chave e conferir o mesmo `checkoutId`.
- [ ] Simular/concluir o pagamento na AbacatePay.
- [ ] Conferir pedido `PAID` ou `PROCESSING` após o webhook.
- [ ] Conferir tarefa logística sem duplicidade.
- [ ] Conferir etiqueta, rastreio e URL persistidos.
- [ ] Reenviar o mesmo webhook e confirmar que nada foi duplicado.
