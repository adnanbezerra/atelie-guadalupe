# Resposta ao relatorio de endpoints faltantes

Este documento responde `prompts/endpoints-faltantes.md` e registra o que foi implementado agora.

## Implementado

- `PATCH /users/me`
    - Agora aceita `name`, `email`, `document`, `phone`, `birthDate` e `address`.
    - `address` e objeto estruturado, nao campo de texto unico.
    - Campos de endereco incluem `zipCode`, `street`, `number`, `apartmentNumber`, `complement`, `neighborhood`, `city`, `state` e `country`.
    - `address` faz upsert do endereco do usuario no mesmo endpoint do formulario de perfil.
    - `address` aceita update parcial quando o endereco ja existe.
    - Se `address.uuid` for enviado, o endereco precisa pertencer ao usuario logado.
    - Se `address.uuid` nao for enviado, o backend atualiza o endereco existente ou cria um novo.
    - Cada usuario possui no maximo um endereco.
    - `isDefault` foi removido de enderecos de usuario.
    - Retorna usuario atualizado com `phone`, `birthDate`, `address` e `addresses` compatível com zero ou um item.

- `GET /users/me/orders`
    - Nova rota explicita para pedidos do cliente logado.
    - Suporta `page` e `pageSize`.
    - Retorna pedidos com itens, endereco, status, totais e `paymentMethod`.

- `POST /orders`
    - Agora aceita `paymentMethod` opcional.
    - Valores aceitos: `PIX`, `CREDIT_CARD`, `DEBIT_CARD`.
    - `paymentMethod` fica salvo como snapshot no pedido.
    - `paymentMethod` tambem aparece em `GET /orders`, `GET /orders/:uuid` e `GET /users/me/orders`.

## Removido

- `GET /users/me/addresses`
- `POST /users/me/addresses`
- `PATCH /users/me/addresses/:uuid`
- `DELETE /users/me/addresses/:uuid`

Motivo: perfil e endereco sao salvos no mesmo formulario. O contrato final usa apenas `GET /users/me` para leitura e `PATCH /users/me` para escrita.

## Validado como ja existente

- `GET /orders`
    - Ja filtrava pedidos proprios para role `USER`.
    - Continua existindo para compatibilidade e para uso administrativo.
    - A nova rota `/users/me/orders` evita ambiguidade no frontend de perfil.

## Adiado de proposito

- `GET /users/me/payment-methods`
- `POST /users/me/payment-methods`
- `PATCH /users/me/payment-methods/:uuid`
- `DELETE /users/me/payment-methods/:uuid`
- `paymentMethodUuid` em `POST /orders`

Motivo: ainda nao existe provedor de pagamento, tokenizacao, tabela de metodos salvos, regra para cobranca pendente, nem politica de dados sensiveis. Implementar CRUD completo agora criaria contrato especulativo. O backend salva apenas `paymentMethod` simples no pedido.

## Endpoints finais para o frontend

- Perfil + endereco: `PATCH /users/me`
- Buscar perfil: `GET /users/me`
- Pedidos recentes do perfil: `GET /users/me/orders?page=1&pageSize=10`
- Criar pedido: `POST /orders`
- Listagem administrativa/legada de pedidos: `GET /orders`
- Detalhe de pedido: `GET /orders/:uuid`

## Banco de dados

Migrations geradas pelo Prisma:

- `prisma/migrations/20260507201545_user_profile_order_payment/migration.sql`
- `prisma/migrations/20260507204137_single_user_address_remove_is_default/migration.sql`

Campos adicionados:

- `User.phone`
- `User.birthDate`
- `PaymentMethod`
- `Order.paymentMethod`
- `User.address` relacao 1:1
- `Address.userId` unico
- `Address.isDefault` removido
- `Address.apartmentNumber` adicionado
