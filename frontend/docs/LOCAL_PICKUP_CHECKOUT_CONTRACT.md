# Contrato necessário: retirada grátis no carrinho e checkout

## Bloqueio atual

O frontend não pode oferecer retirada na loja com o contrato atual:

- `POST /shipping/quote` retorna somente serviços de transportadora.
- `POST /orders` exige `addressUuid`, `shipping.serviceCode` e `shipping.priceInCents` válidos.
- Inventar um `serviceCode` para retirada faria o backend rejeitar o pedido ou tratá-lo como envio.

## Cotação

`POST /shipping/quote` deve manter `quotedServices` por compatibilidade e adicionar uma lista unificada. Retirada deve sempre ser a primeira opção e custar zero.

```json
{
    "success": true,
    "data": {
        "quotedServices": [],
        "deliveryOptions": [
            {
                "id": "local-pickup",
                "type": "LOCAL_PICKUP",
                "name": "Retirada na loja",
                "priceInCents": 0,
                "location": {
                    "name": "Ateliê Guadalupe",
                    "street": "Rua da Origem",
                    "number": "123",
                    "complement": "Fundos",
                    "neighborhood": "Centro",
                    "city": "São Paulo",
                    "state": "SP",
                    "zipCode": "01153000"
                }
            },
            {
                "id": "shipping-1",
                "type": "SHIPMENT",
                "serviceCode": 1,
                "name": "PAC",
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

Regras:

- `LOCAL_PICKUP` sempre disponível, primeiro e com `priceInCents: 0`.
- Local vem da plataforma padrão ativa; frontend não mantém endereço da loja hardcoded.
- Opções `SHIPMENT` continuam dependendo de CEP e itens atuais.
- Backend devolve somente opções válidas para o carrinho atual.

## Criação do pedido

`POST /orders` deve aceitar união discriminada.

Envio:

```json
{
    "addressUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
    "delivery": {
        "type": "SHIPMENT",
        "serviceCode": 1,
        "priceInCents": 3526
    }
}
```

Retirada:

```json
{
    "delivery": {
        "type": "LOCAL_PICKUP"
    }
}
```

Regras:

- `addressUuid` obrigatório apenas para `SHIPMENT`.
- Retirada grava `shippingInCents: 0`, `shipment: null` e snapshot imutável do local.
- Backend recalcula e valida a opção no fechamento; frontend nunca define sozinho o valor cobrado.
- Resposta do pedido inclui `delivery.type` e o snapshot correspondente.

## Erros

- `400 BUSINESS_RULE_ERROR`: combinação de campos incompatível com o tipo.
- `404 RESOURCE_NOT_FOUND`: local de retirada ou serviço não configurado.
- `409 CONFLICT`: preço/serviço de envio mudou.
- `422 VALIDATION_ERROR`: payload inválido.
