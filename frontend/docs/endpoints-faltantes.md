# Endpoints faltantes para fechamento do fluxo

Este documento lista contratos que o frontend precisa para as telas publicas e de perfil funcionarem sem mocks ou campos incompletos.

## Perfil do usuario

### `PATCH /users/me`

Status atual:

- existe no guia da API, mas aceita apenas `name` e `password`

Necessario:

- editar `name`
- editar `email`
- editar `document`
- editar `phone`
- editar `birthDate`
- retornar usuario atualizado com os mesmos campos

Payload sugerido:

```json
{
    "name": "Maria da Silva",
    "email": "maria@email.com",
    "document": "12345678900",
    "phone": "11987654321",
    "birthDate": "1988-08-12"
}
```

## Enderecos

### `POST /users/me/addresses`

Status atual:

- existe no guia da API

Necessario validar no backend:

- criacao pelo formulario de perfil
- suporte a endereco principal com `isDefault`

### `PATCH /users/me/addresses/:uuid`

Status atual:

- existe no guia da API

Necessario validar no backend:

- edicao do endereco principal na tela de perfil
- troca de endereco padrao

## Pedidos recentes

### `GET /users/me/orders`

Status atual:

- frontend usa `GET /orders`
- guia diz que `USER` ve apenas proprios pedidos, mas rota tambem e usada no admin

Necessario:

- rota explicita para pedidos do cliente logado
- filtro/paginacao de pedidos recentes
- incluir itens, status, endereco de entrega e metodo de pagamento

Query sugerida:

```http
GET /users/me/orders?page=1&pageSize=10
```

Resposta sugerida:

```json
{
    "success": true,
    "data": {
        "orders": [
            {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b501",
                "status": "AWAITING_PAYMENT",
                "paymentMethod": "PIX",
                "totalInCents": 12990,
                "createdAt": "2026-03-12T12:00:00.000Z",
                "address": {},
                "items": []
            }
        ],
        "pagination": {
            "page": 1,
            "pageSize": 10,
            "total": 1,
            "totalPages": 1
        }
    }
}
```

Status esperados no frontend:

- `AWAITING_PAYMENT` ou `PENDING`: pagamento pendente
- `PAID` ou `PROCESSING`: pagamento confirmado
- `SHIPPED`: enviado
- `DELIVERED`: entregue
- `CANCELLED`: cancelado

## Informacoes de pagamento

### `GET /users/me/payment-methods`

Necessario:

- listar cartoes/token de pagamento salvos
- listar chave Pix preferida, se existir
- indicar metodo padrao
- nunca retornar dados sensiveis completos de cartao

Resposta sugerida:

```json
{
    "success": true,
    "data": {
        "paymentMethods": [
            {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b601",
                "type": "CREDIT_CARD",
                "brand": "Visa",
                "last4": "2481",
                "holderName": "Maria da Silva",
                "expiresAt": "2029-08",
                "isDefault": true
            },
            {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b602",
                "type": "PIX",
                "pixKeyType": "CPF",
                "pixKeyMasked": "***.456.789-**",
                "isDefault": false
            }
        ]
    }
}
```

### `POST /users/me/payment-methods`

Necessario:

- criar metodo de pagamento por token retornado pelo provedor
- suportar `CREDIT_CARD`, `DEBIT_CARD` e `PIX`
- definir `isDefault`

Payload sugerido:

```json
{
    "type": "CREDIT_CARD",
    "providerToken": "tok_123",
    "holderName": "Maria da Silva",
    "isDefault": true
}
```

### `PATCH /users/me/payment-methods/:uuid`

Necessario:

- editar apelido, validade/token renovado quando aplicavel
- alterar metodo padrao
- atualizar chave Pix preferida

Payload sugerido:

```json
{
    "holderName": "Maria da Silva",
    "isDefault": true
}
```

### `DELETE /users/me/payment-methods/:uuid`

Necessario:

- remover metodo salvo
- impedir remocao se houver cobranca pendente vinculada, ou manter historico sem expor no perfil

## Checkout e pedidos

### `POST /orders`

Status atual:

- existe no guia da API

Necessario complementar:

- receber `paymentMethodUuid` ou `paymentMethod`
- persistir `paymentMethod` no pedido
- retornar `paymentMethod` em `GET /orders`, `GET /orders/:uuid` e `GET /users/me/orders`

Payload sugerido:

```json
{
    "addressUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
    "paymentMethodUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b601",
    "paymentMethod": "CREDIT_CARD",
    "notes": "Entregar no periodo da tarde"
}
```
