# Contrato necessário — detalhes do pedido do cliente

## Objetivo

Completar a página autenticada `GET /perfil/pedidos/:uuid` sem combinar respostas de múltiplos endpoints.

O endpoint `GET /orders/:uuid` já fornece itens, quantidades, valores, endereço, status do pedido e os resumos de pagamento e frete. Para a tela, faltam os dados seguros do cartão e a identificação do serviço de entrega.

## Endpoint existente a ampliar

```http
GET /orders/:uuid
Authorization: Bearer <jwt>
```

As regras atuais de autorização devem ser mantidas:

- `USER` acessa somente pedidos próprios;
- `ADMIN` e `SUBADMIN` podem acessar qualquer pedido;
- pedido inexistente ou não pertencente ao usuário não deve vazar dados de outra conta.

## Campos adicionais na resposta

```json
{
    "success": true,
    "data": {
        "order": {
            "paymentMethod": "CREDIT_CARD",
            "payment": {
                "status": "PAID",
                "method": "CREDIT_CARD",
                "providerCheckoutId": "bill_abc123",
                "checkoutUrl": null,
                "paidAmountInCents": 7680,
                "card": {
                    "brand": "Mastercard",
                    "lastFourDigits": "4242"
                }
            },
            "shipment": {
                "status": "LABEL_PURCHASED",
                "selectedServiceCode": 1,
                "selectedServiceName": "PAC",
                "deliveryDays": 7,
                "estimatedDeliveryAt": "2026-03-19T23:59:59.000Z",
                "trackingCode": "BR123456789",
                "trackingUrl": "https://rastreamento.superfrete.com/...",
                "labelUrl": null
            }
        }
    }
}
```

### Regras dos campos

- `payment.method`: `PIX`, `CREDIT_CARD`, `DEBIT_CARD` ou `null`.
- `payment.card`: presente somente para pagamento por cartão; `null` nos demais métodos.
- `payment.card.brand`: bandeira amigável, quando fornecida pelo provedor.
- `payment.card.lastFourDigits`: exatamente quatro dígitos. Nunca retornar PAN completo, CVV ou token do cartão.
- `shipment.selectedServiceName`: nome exibível do serviço confirmado, como `PAC`, `SEDEX` ou `J&T`.
- `shipment.deliveryDays`: prazo contratado em dias úteis, quando disponível.
- `shipment.estimatedDeliveryAt`: previsão absoluta, quando o provedor fornecer uma data confiável.
- `shipment.trackingUrl`: URL pública já pronta para o cliente; pode ser `null` antes da postagem.

Todos os novos campos podem ser `null` para pedidos antigos. O frontend já trata essa ausência sem inventar dados.

## Observação de persistência

Os últimos quatro dígitos e a bandeira precisam ser persistidos como snapshot seguro no momento em que o provedor confirmar o pagamento. Não devem depender de uma consulta ao provedor toda vez que o cliente abrir o histórico.
