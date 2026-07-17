# Handoff frontend: preview de frete no carrinho

Este documento contem o contrato isolado do endpoint que o frontend pode usar para cotar frete antes de criar um pedido.

## Endpoint

```http
POST /shipping/quote
Content-Type: application/json
```

Autenticacao e opcional. O frontend pode chamar a rota para visitantes ou enviar `Authorization: Bearer <jwt>` para usuarios autenticados; o resultado e as regras sao iguais.

## Tipos sugeridos

```ts
type ProductSize = "GRAMS_70" | "GRAMS_100";

type ShippingQuoteRequest = {
    zipCode: string;
    items: Array<{
        productUuid: string;
        productSize: ProductSize;
        quantity: number;
    }>;
};

type QuotedShippingService = {
    serviceCode: number;
    serviceName: string;
    priceInCents: number;
    deliveryDays: number | null;
    deliveryRange: {
        min: number | null;
        max: number | null;
    };
};

type ShippingQuoteResponse = {
    success: true;
    data: {
        quotedServices: QuotedShippingService[];
    };
};

type ApiErrorResponse = {
    success: false;
    error: {
        code:
            | "BUSINESS_RULE_ERROR"
            | "RESOURCE_NOT_FOUND"
            | "VALIDATION_ERROR"
            | "SERVICE_UNAVAILABLE";
        message: string;
        details: Array<Record<string, unknown>>;
    };
};
```

## Request

```json
{
    "zipCode": "01001000",
    "items": [
        {
            "productUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b401",
            "productSize": "GRAMS_70",
            "quantity": 2
        }
    ]
}
```

Envie o CEP sem mascara. Envie somente UUID, tamanho e quantidade dos itens. Preco, peso e dimensoes nao fazem parte do contrato porque o backend sempre consulta esses dados novamente.

## Resposta `200`

```json
{
    "success": true,
    "data": {
        "quotedServices": [
            {
                "serviceCode": 1,
                "serviceName": "PAC",
                "priceInCents": 3526,
                "deliveryDays": 7,
                "deliveryRange": {
                    "min": null,
                    "max": null
                }
            }
        ]
    }
}
```

`deliveryDays` e os dois valores de `deliveryRange` podem ser `null`. Valores monetarios estao sempre em centavos.

## Erros tratados pelo frontend

| HTTP  | `error.code`          | Quando ocorre                                                                               |
| ----- | --------------------- | ------------------------------------------------------------------------------------------- |
| `400` | `BUSINESS_RULE_ERROR` | Produto sem configuracao logistica, caixa incompativel ou nenhuma transportadora disponivel |
| `404` | `RESOURCE_NOT_FOUND`  | Produto inexistente ou inativo                                                              |
| `422` | `VALIDATION_ERROR`    | CEP, array de itens, UUID, tamanho, quantidade ou estoque invalidos                         |
| `503` | `SERVICE_UNAVAILABLE` | SuperFrete indisponivel; mensagem segura: `SuperFrete indisponivel no momento`              |

## Regras importantes

- A rota nao cria pedido, nao altera o carrinho e nao salva a opcao escolhida.
- Uma nova chamada deve ser feita quando CEP, produto, tamanho ou quantidade mudar.
- O frontend deve guardar `serviceCode` apenas como escolha temporaria do checkout.
- Nao use `priceInCents` do preview como valor definitivo da cobranca.

## Continuidade ao criar o pedido

1. Criar o pedido com `POST /orders`.
2. Confirmar o frete com `POST /shipping/orders/:orderUuid/quote`, enviando o `serviceCode` escolhido.
3. Usar o valor recalculado e persistido retornado pelo backend como fonte de verdade.

Exemplo da confirmacao:

```json
{
    "serviceCode": 1
}
```
