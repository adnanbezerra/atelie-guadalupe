# API

## Base response

Sucesso:

```json
{
    "success": true,
    "data": {}
}
```

Erro:

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Payload invalido",
        "details": []
    }
}
```

## Rotas

### Health

- `GET /`

### Auth

- `POST /auth/register`
- `POST /auth/login`

### Users

- `GET /users/me`
- `PATCH /users/me`
- `POST /users`
- `PATCH /users/:uuid`

### Addresses

- `GET /users/me/addresses`
- `POST /users/me/addresses`
- `PATCH /users/me/addresses/:uuid`
- `DELETE /users/me/addresses/:uuid`

### Products

- `GET /products`
- `GET /products/:uuid`
- `POST /products`
- `PATCH /products/:uuid`
- `DELETE /products/:uuid`

### Cart

- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/:uuid`
- `DELETE /cart/items/:uuid`
- `DELETE /cart/items`

### Orders

- `POST /orders`
- `GET /orders`
- `GET /orders/:uuid`
- `PATCH /orders/:uuid/status`
- `PATCH /orders/:uuid/cancel`

## Regras de acesso

- `USER` gerencia apenas o próprio perfil, endereços, carrinho e pedidos.
- `ADMIN` cria `ADMIN`, `SUBADMIN` e `USER`.
- `SUBADMIN` e `ADMIN` gerenciam produtos.
- `SUBADMIN` e `ADMIN` atualizam status de pedidos.

## JWT

Payload mínimo:

```json
{
    "sub": "user-uuid",
    "email": "user@email.com",
    "role": "USER",
    "name": "Nome do Usuario"
}
```
