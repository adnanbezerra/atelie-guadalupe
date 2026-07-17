# Contrato necessário: cotação de frete no carrinho

## Motivo

O contrato atual oferece apenas `POST /shipping/orders/:orderUuid/quote`. Essa
rota exige autenticação e um pedido já criado. O carrinho precisa calcular frete
antes do pedido e também para visitantes sem login.

## Endpoint solicitado

### `POST /shipping/quote`

Autenticação:

- opcional
- a resposta e as regras devem ser iguais para visitante e usuário autenticado

Comportamento:

- calcula opções de frete sem criar pedido, esvaziar carrinho ou persistir uma
  seleção
- usa a plataforma padrão ativa como remetente
- consulta produtos, pesos e caixas no backend; não confia em preço, peso ou
  dimensões enviados pelo navegador
- aceita itens do carrinho anônimo para que a rota funcione sem autenticação
- reutiliza as mesmas regras de empacotamento de
  `POST /shipping/orders/:orderUuid/quote`

Request:

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

Resposta `200`:

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

Validações esperadas:

- `zipCode`: exatamente 8 dígitos
- `items`: ao menos um item
- `productUuid`: produto existente e ativo
- `productSize`: opção disponível para o produto
- `quantity`: inteiro positivo e compatível com estoque

Erros esperados:

- `400 BUSINESS_RULE_ERROR`: produto sem peso/caixa compatível ou nenhuma
  transportadora disponível
- `404 RESOURCE_NOT_FOUND`: produto não encontrado
- `422 VALIDATION_ERROR`: CEP ou itens inválidos
- erro de integração com mensagem segura quando o SuperFrete estiver indisponível

## Continuidade do pedido

Esta rota serve apenas para preview no carrinho. Ao criar o pedido, o frontend
continua usando o fluxo persistente já documentado:

1. `POST /orders`
2. `POST /shipping/orders/:orderUuid/quote` com `serviceCode`

O backend deve recalcular e validar o preço ao confirmar, pois a cotação do
carrinho não é fonte de verdade para cobrança.
