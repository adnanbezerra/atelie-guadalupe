# Guia de Integracao da API

Este documento descreve os contratos atuais do backend para implementacao do frontend.

## 1. Base URL

Ambiente local:

```text
http://localhost:3000
```

## 2. Formato padrao de resposta

### Sucesso

```json
{
    "success": true,
    "data": {}
}
```

### Erro

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

## 3. Headers

### JSON

Enviar:

```http
Content-Type: application/json
```

### Autenticacao

Rotas autenticadas exigem:

```http
Authorization: Bearer <jwt>
```

## 4. Regras de autenticacao e autorizacao

- `USER` gerencia apenas o proprio perfil, enderecos, carrinho e pedidos.
- `ADMIN` pode criar `ADMIN`, `SUBADMIN` e `USER`.
- `SUBADMIN` e `ADMIN` podem criar, editar e remover produtos.
- `SUBADMIN` e `ADMIN` podem alterar status de pedidos.
- `USER` nao pode acessar pedidos de outros usuarios.

## 5. JWT retornado pelo backend

Payload minimo esperado:

```json
{
    "sub": "0195f4aa-7f18-7db5-9f32-06f4a9a2b101",
    "email": "maria@email.com",
    "role": "USER",
    "name": "Maria da Silva"
}
```

## 6. Erros mais comuns

### `422 VALIDATION_ERROR`

Quando body, params ou querystring nao seguem o schema.

Exemplo:

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Payload invalido",
        "details": [
            {
                "path": "email",
                "message": "Invalid email address",
                "code": "invalid_format"
            }
        ]
    }
}
```

### `401 UNAUTHORIZED`

Token ausente, expirado ou invalido.

### `403 FORBIDDEN`

Usuario autenticado sem permissao para a acao.

### `404 RESOURCE_NOT_FOUND`

Recurso nao encontrado.

### `409 CONFLICT`

Conflito de negocio, como email duplicado ou slug de produto ja existente.

### `400 BUSINESS_RULE_ERROR`

Regra de negocio invalida, como carrinho vazio ou estoque insuficiente.

## 7. Healthcheck

### `GET /`

Uso:

- verificar se a API esta de pe

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "service": "atelie-guadalupe-backend",
        "status": "ok",
        "timestamp": "2026-03-12T12:00:00.000Z"
    }
}
```

## 8. Auth

## 8.1 `POST /auth/register`

Uso:

- cria conta publica
- sempre cria usuario com role `USER`

Request:

```json
{
    "name": "Maria da Silva",
    "email": "maria@email.com",
    "document": "12345678900",
    "password": "Senha@123"
}
```

Resposta `201`:

```json
{
    "success": true,
    "data": {
        "user": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b101",
            "name": "Maria da Silva",
            "email": "maria@email.com",
            "document": "12345678900",
            "role": "USER",
            "isActive": true,
            "createdAt": "2026-03-12T12:00:00.000Z"
        },
        "token": "<jwt>"
    }
}
```

Possiveis erros:

- `409` email ja cadastrado
- `409` documento ja cadastrado
- `422` payload invalido

## 8.2 `POST /auth/login`

Request:

```json
{
    "email": "maria@email.com",
    "password": "Senha@123"
}
```

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "user": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b101",
            "name": "Maria da Silva",
            "email": "maria@email.com",
            "document": "12345678900",
            "role": "USER",
            "isActive": true,
            "createdAt": "2026-03-12T12:00:00.000Z"
        },
        "token": "<jwt>"
    }
}
```

Possiveis erros:

- `401` credenciais invalidas
- `403` usuario inativo
- `422` payload invalido

## 9. Users

## 9.1 `GET /users/me`

Autenticacao:

- obrigatoria

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "user": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b101",
            "name": "Maria da Silva",
            "email": "maria@email.com",
            "document": "12345678900",
            "role": "USER",
            "isActive": true,
            "createdAt": "2026-03-12T12:00:00.000Z",
            "addresses": [
                {
                    "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
                    "label": "Casa",
                    "recipient": "Maria da Silva",
                    "zipCode": "01001000",
                    "street": "Praca da Se",
                    "number": "100",
                    "complement": null,
                    "neighborhood": "Se",
                    "city": "Sao Paulo",
                    "state": "SP",
                    "country": "Brasil",
                    "reference": null,
                    "isDefault": true,
                    "createdAt": "2026-03-12T12:00:00.000Z",
                    "updatedAt": "2026-03-12T12:00:00.000Z"
                }
            ]
        }
    }
}
```

## 9.2 `PATCH /users/me`

Autenticacao:

- obrigatoria

Campos permitidos:

```json
{
    "name": "Maria de Guadalupe",
    "password": "NovaSenha@123"
}
```

Observacoes:

- pode enviar apenas `name`
- pode enviar apenas `password`
- precisa enviar ao menos um campo

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "user": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b101",
            "name": "Maria de Guadalupe",
            "email": "maria@email.com",
            "document": "12345678900",
            "role": "USER",
            "isActive": true,
            "createdAt": "2026-03-12T12:00:00.000Z",
            "addresses": []
        }
    }
}
```

## 9.3 `POST /users`

Autenticacao:

- obrigatoria
- apenas `ADMIN`

Uso:

- criacao administrativa de usuarios

Request:

```json
{
    "name": "Novo Subadmin",
    "email": "subadmin@atelie.com",
    "document": "98765432100",
    "password": "Senha@123",
    "role": "SUBADMIN"
}
```

Resposta `201`:

```json
{
    "success": true,
    "data": {
        "user": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b111",
            "name": "Novo Subadmin",
            "email": "subadmin@atelie.com",
            "document": "98765432100",
            "role": "SUBADMIN",
            "isActive": true,
            "createdAt": "2026-03-12T12:00:00.000Z"
        }
    }
}
```

## 9.4 `PATCH /users/:uuid`

Autenticacao:

- obrigatoria
- apenas `ADMIN`

Campos permitidos:

```json
{
    "name": "Nome Atualizado",
    "isActive": false,
    "role": "USER"
}
```

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "user": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b111",
            "name": "Nome Atualizado",
            "email": "subadmin@atelie.com",
            "document": "98765432100",
            "role": "USER",
            "isActive": false,
            "createdAt": "2026-03-12T12:00:00.000Z"
        }
    }
}
```

## 10. Addresses

## 10.1 `GET /users/me/addresses`

Autenticacao:

- obrigatoria

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "addresses": [
            {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
                "label": "Casa",
                "recipient": "Maria da Silva",
                "zipCode": "01001000",
                "street": "Praca da Se",
                "number": "100",
                "complement": "Apto 10",
                "neighborhood": "Se",
                "city": "Sao Paulo",
                "state": "SP",
                "country": "Brasil",
                "reference": "Proximo a catedral",
                "isDefault": true,
                "createdAt": "2026-03-12T12:00:00.000Z",
                "updatedAt": "2026-03-12T12:00:00.000Z"
            }
        ]
    }
}
```

## 10.2 `POST /users/me/addresses`

Autenticacao:

- obrigatoria

Request:

```json
{
    "label": "Casa",
    "recipient": "Maria da Silva",
    "document": "12345678900",
    "zipCode": "01001000",
    "street": "Praca da Se",
    "number": "100",
    "complement": "Apto 10",
    "neighborhood": "Se",
    "city": "Sao Paulo",
    "state": "SP",
    "country": "Brasil",
    "reference": "Proximo a catedral",
    "isDefault": true
}
```

Resposta `201`:

```json
{
    "success": true,
    "data": {
        "address": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
            "label": "Casa",
            "recipient": "Maria da Silva",
            "zipCode": "01001000",
            "street": "Praca da Se",
            "number": "100",
            "complement": "Apto 10",
            "neighborhood": "Se",
            "city": "Sao Paulo",
            "state": "SP",
            "country": "Brasil",
            "reference": "Proximo a catedral",
            "isDefault": true,
            "createdAt": "2026-03-12T12:00:00.000Z",
            "updatedAt": "2026-03-12T12:00:00.000Z"
        }
    }
}
```

## 10.3 `PATCH /users/me/addresses/:uuid`

Autenticacao:

- obrigatoria

Request exemplo:

```json
{
    "complement": "Casa 2",
    "isDefault": true
}
```

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "address": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
            "label": "Casa",
            "recipient": "Maria da Silva",
            "zipCode": "01001000",
            "street": "Praca da Se",
            "number": "100",
            "complement": "Casa 2",
            "neighborhood": "Se",
            "city": "Sao Paulo",
            "state": "SP",
            "country": "Brasil",
            "reference": "Proximo a catedral",
            "isDefault": true,
            "createdAt": "2026-03-12T12:00:00.000Z",
            "updatedAt": "2026-03-12T12:05:00.000Z"
        }
    }
}
```

## 10.4 `DELETE /users/me/addresses/:uuid`

Autenticacao:

- obrigatoria

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "deleted": true
    }
}
```

## 11. Products

## 11.1 Modelo retornado ao frontend

```json
{
    "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b201",
    "slug": "sabonete-artesanal-de-lavanda",
    "name": "Sabonete Artesanal de Lavanda",
    "line": {
        "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b210",
        "slug": "linha-rn",
        "name": "Linha RN"
    },
    "priceOptions": [
        {
            "size": "GRAMS_70",
            "grams": 70,
            "priceInCents": 2590
        },
        {
            "size": "GRAMS_100",
            "grams": 100,
            "priceInCents": 3700
        }
    ],
    "imageUrl": "http://localhost:3000/media/images/507f1f77bcf86cd799439011",
    "stock": 8,
    "shortDescription": "Sabonete natural com lavanda",
    "longDescription": "Sabonete natural com oleo essencial de lavanda e processo artesanal.",
    "isActive": true,
    "createdAt": "2026-03-12T12:00:00.000Z",
    "updatedAt": "2026-03-12T12:00:00.000Z"
}
```

Observacoes:

- a precificacao e orientada pela categoria do produto (representada por `line`)
- `priceOptions` contem os precos calculados por tamanho
- tamanhos atuais: `GRAMS_70` e `GRAMS_100`

## 11.2 Modelo de linha/categoria

```json
{
    "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b210",
    "slug": "linha-rn",
    "name": "Linha RN",
    "pricePerGramInCents": 37,
    "createdAt": "2026-03-12T12:00:00.000Z",
    "updatedAt": "2026-03-12T12:00:00.000Z"
}
```

## 11.3 Formato da imagem no request

O frontend deve enviar a imagem como objeto:

```json
{
    "image": {
        "filename": "sabonete.jpg",
        "contentType": "image/jpeg",
        "base64": "<base64 sem data:image/...;base64,>"
    }
}
```

Regras:

- tipos aceitos: `image/jpeg`, `image/png`, `image/webp`
- o backend grava a imagem no MongoDB GridFS
- o backend salva no Postgres apenas a `imageUrl`

## 11.4 `GET /products/lines`

Uso:

- listagem publica de linhas/categorias

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "lines": [
            {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b210",
                "slug": "linha-rn",
                "name": "Linha RN",
                "pricePerGramInCents": 37,
                "createdAt": "2026-03-12T12:00:00.000Z",
                "updatedAt": "2026-03-12T12:00:00.000Z"
            }
        ]
    }
}
```

## 11.5 `GET /products`

Uso:

- listagem publica

Query params:

- `page`
- `pageSize`
- `search`
- `lineUuid`
- `size` (`GRAMS_70` ou `GRAMS_100`)
- `minPriceInCents`
- `maxPriceInCents`
- `inStock`

Exemplo:

```http
GET /products?page=1&pageSize=12&search=lavanda&lineUuid=0195f4aa-7f18-7db5-9f32-06f4a9a2b210&size=GRAMS_70&minPriceInCents=2000&maxPriceInCents=3000&inStock=true
```

Observacao:

- para usar `minPriceInCents` e/ou `maxPriceInCents`, e obrigatorio informar `size`

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "items": [
            {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b201",
                "slug": "sabonete-artesanal-de-lavanda",
                "name": "Sabonete Artesanal de Lavanda",
                "line": {
                    "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b210",
                    "slug": "linha-rn",
                    "name": "Linha RN"
                },
                "priceOptions": [
                    {
                        "size": "GRAMS_70",
                        "grams": 70,
                        "priceInCents": 2590
                    },
                    {
                        "size": "GRAMS_100",
                        "grams": 100,
                        "priceInCents": 3700
                    }
                ],
                "imageUrl": "http://localhost:3000/media/images/507f1f77bcf86cd799439011",
                "stock": 8,
                "shortDescription": "Sabonete natural com lavanda",
                "longDescription": "Sabonete natural com oleo essencial de lavanda e processo artesanal.",
                "isActive": true,
                "createdAt": "2026-03-12T12:00:00.000Z",
                "updatedAt": "2026-03-12T12:00:00.000Z"
            }
        ],
        "pagination": {
            "page": 1,
            "pageSize": 12,
            "total": 1,
            "totalPages": 1
        }
    }
}
```

## 11.6 `GET /products/:uuid`

Uso:

- detalhe publico do produto

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "product": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b201",
            "slug": "sabonete-artesanal-de-lavanda",
            "name": "Sabonete Artesanal de Lavanda",
            "line": {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b210",
                "slug": "linha-rn",
                "name": "Linha RN"
            },
            "priceOptions": [
                {
                    "size": "GRAMS_70",
                    "grams": 70,
                    "priceInCents": 2590
                },
                {
                    "size": "GRAMS_100",
                    "grams": 100,
                    "priceInCents": 3700
                }
            ],
            "imageUrl": "http://localhost:3000/media/images/507f1f77bcf86cd799439011",
            "stock": 8,
            "shortDescription": "Sabonete natural com lavanda",
            "longDescription": "Sabonete natural com oleo essencial de lavanda e processo artesanal.",
            "isActive": true,
            "createdAt": "2026-03-12T12:00:00.000Z",
            "updatedAt": "2026-03-12T12:00:00.000Z"
        }
    }
}
```

## 11.7 `POST /products/lines`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Request:

```json
{
    "name": "Linha RN",
    "pricePerGramInCents": 37
}
```

Resposta `201`:

```json
{
    "success": true,
    "data": {
        "line": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b210",
            "slug": "linha-rn",
            "name": "Linha RN",
            "pricePerGramInCents": 37,
            "createdAt": "2026-03-12T12:00:00.000Z",
            "updatedAt": "2026-03-12T12:00:00.000Z"
        }
    }
}
```

## 11.8 `PATCH /products/lines/:uuid`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Campos permitidos:

```json
{
    "name": "Linha RN Atualizada",
    "pricePerGramInCents": 39
}
```

Observacoes:

- qualquer campo e opcional
- precisa enviar ao menos um campo

## 11.9 `POST /products`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Request:

```json
{
    "name": "Sabonete Artesanal de Lavanda",
    "lineUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b210",
    "image": {
        "filename": "lavanda.jpg",
        "contentType": "image/jpeg",
        "base64": "<base64>"
    },
    "stock": 8,
    "shortDescription": "Sabonete natural com lavanda",
    "longDescription": "Sabonete natural com oleo essencial de lavanda e processo artesanal."
}
```

Resposta `201`:

```json
{
    "success": true,
    "data": {
        "product": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b201",
            "slug": "sabonete-artesanal-de-lavanda",
            "name": "Sabonete Artesanal de Lavanda",
            "line": {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b210",
                "slug": "linha-rn",
                "name": "Linha RN"
            },
            "priceOptions": [
                {
                    "size": "GRAMS_70",
                    "grams": 70,
                    "priceInCents": 2590
                },
                {
                    "size": "GRAMS_100",
                    "grams": 100,
                    "priceInCents": 3700
                }
            ],
            "imageUrl": "http://localhost:3000/media/images/507f1f77bcf86cd799439011",
            "stock": 8,
            "shortDescription": "Sabonete natural com lavanda",
            "longDescription": "Sabonete natural com oleo essencial de lavanda e processo artesanal.",
            "isActive": true,
            "createdAt": "2026-03-12T12:00:00.000Z",
            "updatedAt": "2026-03-12T12:00:00.000Z"
        }
    }
}
```

## 11.10 `PATCH /products/:uuid`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Campos permitidos:

```json
{
    "name": "Novo nome",
    "lineUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b210",
    "image": {
        "filename": "novo.jpg",
        "contentType": "image/jpeg",
        "base64": "<base64>"
    },
    "stock": 4,
    "shortDescription": "Descricao curta atualizada",
    "longDescription": "Descricao longa atualizada"
}
```

Observacoes:

- qualquer campo e opcional
- se enviar `image`, o backend substitui a imagem anterior no storage

## 11.11 `DELETE /products/:uuid`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Comportamento:

- soft delete via `isActive = false`

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "deleted": true
    }
}
```

## 12. Media

## 12.1 `GET /media/images/:id`

Uso:

- servir imagem armazenada no MongoDB GridFS

Exemplo:

```http
GET /media/images/507f1f77bcf86cd799439011
```

Resposta:

- stream binario da imagem
- `Content-Type` conforme metadata salva

Possiveis erros:

- `404` imagem nao encontrada
- `503` storage de imagens nao configurado

## 13. Cart

## 13.1 `GET /cart`

Autenticacao:

- obrigatoria

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "cart": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b401",
            "items": [
                {
                    "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b402",
                    "productUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b201",
                    "name": "Sabonete Artesanal de Lavanda",
                    "productSize": "GRAMS_70",
                    "grams": 70,
                    "quantity": 2,
                    "unitPriceInCents": 2590,
                    "totalPriceInCents": 5180,
                    "imageUrl": "http://localhost:3000/media/images/507f1f77bcf86cd799439011",
                    "isAvailable": true
                }
            ],
            "summary": {
                "itemsCount": 2,
                "subtotalInCents": 5180
            }
        }
    }
}
```

Observacoes:

- o carrinho e criado automaticamente no primeiro acesso, se nao existir
- `isAvailable` ajuda o frontend a alertar item inativo ou sem estoque suficiente

## 13.2 `POST /cart/items`

Autenticacao:

- obrigatoria

Request:

```json
{
    "productUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b201",
    "productSize": "GRAMS_70",
    "quantity": 2
}
```

Resposta `201`:

```json
{
    "success": true,
    "data": {
        "cart": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b401",
            "items": [
                {
                    "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b402",
                    "productUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b201",
                    "name": "Sabonete Artesanal de Lavanda",
                    "productSize": "GRAMS_70",
                    "grams": 70,
                    "quantity": 2,
                    "unitPriceInCents": 2590,
                    "totalPriceInCents": 5180,
                    "imageUrl": "http://localhost:3000/media/images/507f1f77bcf86cd799439011",
                    "isAvailable": true
                }
            ],
            "summary": {
                "itemsCount": 2,
                "subtotalInCents": 5180
            }
        }
    }
}
```

Possiveis erros:

- `404` produto nao encontrado
- `400` estoque insuficiente

## 13.3 `PATCH /cart/items/:uuid`

Autenticacao:

- obrigatoria

Request:

```json
{
    "quantity": 3,
    "productSize": "GRAMS_100"
}
```

Resposta:

- retorna o carrinho atualizado no mesmo formato de `GET /cart`

## 13.4 `DELETE /cart/items/:uuid`

Autenticacao:

- obrigatoria

Resposta:

- retorna o carrinho atualizado no mesmo formato de `GET /cart`

## 13.5 `DELETE /cart/items`

Autenticacao:

- obrigatoria

Uso:

- limpa o carrinho inteiro

Resposta:

- retorna o carrinho atualizado no mesmo formato de `GET /cart`

## 14. Orders

## 14.1 Modelo retornado ao frontend

```json
{
    "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b501",
    "status": "PENDING",
    "subtotalInCents": 5180,
    "shippingInCents": 0,
    "discountInCents": 0,
    "totalInCents": 5180,
    "notes": "Entregar em horario comercial",
    "placedAt": "2026-03-12T12:00:00.000Z",
    "createdAt": "2026-03-12T12:00:00.000Z",
    "updatedAt": "2026-03-12T12:00:00.000Z",
    "address": {
        "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
        "recipient": "Maria da Silva",
        "zipCode": "01001000",
        "street": "Praca da Se",
        "number": "100",
        "complement": null,
        "neighborhood": "Se",
        "city": "Sao Paulo",
        "state": "SP",
        "country": "Brasil"
    },
    "items": [
        {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b502",
            "productSize": "GRAMS_70",
            "grams": 70,
            "productNameSnapshot": "Sabonete Artesanal de Lavanda",
            "imageUrlSnapshot": "http://localhost:3000/media/images/507f1f77bcf86cd799439011",
            "quantity": 2,
            "unitPriceInCents": 2590,
            "totalPriceInCents": 5180
        }
    ]
}
```

## 14.2 `POST /orders`

Autenticacao:

- obrigatoria

Uso:

- cria pedido a partir do carrinho atual

Request:

```json
{
    "addressUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
    "notes": "Entregar em horario comercial"
}
```

Observacoes:

- `addressUuid` e opcional
- o carrinho e esvaziado apos a criacao do pedido
- os itens sao congelados como snapshot

Resposta `201`:

```json
{
    "success": true,
    "data": {
        "order": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b501",
            "status": "PENDING",
            "subtotalInCents": 5180,
            "shippingInCents": 0,
            "discountInCents": 0,
            "totalInCents": 5180,
            "notes": "Entregar em horario comercial",
            "placedAt": "2026-03-12T12:00:00.000Z",
            "createdAt": "2026-03-12T12:00:00.000Z",
            "updatedAt": "2026-03-12T12:00:00.000Z",
            "address": {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
                "recipient": "Maria da Silva",
                "zipCode": "01001000",
                "street": "Praca da Se",
                "number": "100",
                "complement": null,
                "neighborhood": "Se",
                "city": "Sao Paulo",
                "state": "SP",
                "country": "Brasil"
            },
            "items": [
                {
                    "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b502",
                    "productSize": "GRAMS_70",
                    "grams": 70,
                    "productNameSnapshot": "Sabonete Artesanal de Lavanda",
                    "imageUrlSnapshot": "http://localhost:3000/media/images/507f1f77bcf86cd799439011",
                    "quantity": 2,
                    "unitPriceInCents": 2590,
                    "totalPriceInCents": 5180
                }
            ]
        }
    }
}
```

Possiveis erros:

- `400` carrinho vazio
- `400` item indisponivel
- `400` estoque insuficiente
- `404` endereco nao encontrado

## 14.3 `GET /orders`

Autenticacao:

- obrigatoria

Comportamento:

- `USER` ve apenas os proprios pedidos
- `ADMIN` e `SUBADMIN` veem todos

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "orders": [
            {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b501",
                "status": "PENDING",
                "subtotalInCents": 5180,
                "shippingInCents": 0,
                "discountInCents": 0,
                "totalInCents": 5180,
                "notes": "Entregar em horario comercial",
                "placedAt": "2026-03-12T12:00:00.000Z",
                "createdAt": "2026-03-12T12:00:00.000Z",
                "updatedAt": "2026-03-12T12:00:00.000Z",
                "address": null,
                "items": []
            }
        ]
    }
}
```

## 14.4 `GET /orders/:uuid`

Autenticacao:

- obrigatoria

Comportamento:

- `USER` so acessa se o pedido for seu
- `ADMIN` e `SUBADMIN` acessam qualquer pedido

Resposta:

- retorna `order` no mesmo formato de `POST /orders`

## 14.5 `PATCH /orders/:uuid/status`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Request:

```json
{
    "status": "AWAITING_PAYMENT"
}
```

Transicoes validas hoje:

- `PENDING -> AWAITING_PAYMENT`
- `PENDING -> CANCELLED`
- `AWAITING_PAYMENT -> PAID`
- `AWAITING_PAYMENT -> CANCELLED`
- `PAID -> PROCESSING`
- `PAID -> CANCELLED`
- `PROCESSING -> SHIPPED`
- `SHIPPED -> DELIVERED`

Erro comum:

- `400` transicao de status invalida

## 14.6 `PATCH /orders/:uuid/cancel`

Autenticacao:

- obrigatoria

Comportamento:

- usuario cancela o proprio pedido
- statuses cancelaveis hoje:
    - `PENDING`
    - `AWAITING_PAYMENT`
    - `PAID`

Request:

```json
{}
```

Resposta:

- retorna `order` atualizado

## 15. Observacoes para frontend

- Todos os valores monetarios estao em centavos.
- Todas as datas estao em formato ISO.
- Sempre use `uuid` nas rotas e no estado do frontend. Nao use IDs internos.
- O frontend deve guardar o JWT e reenviar em `Authorization`.
- Para imagem de produto, o frontend precisa converter o arquivo para base64 antes do envio.
- Para exibir imagem de produto, basta usar o valor de `imageUrl` retornado pelo backend.
- `GET /media/images/:id` responde com stream binario, entao `imageUrl` pode ser usado direto em `<img src="...">`.
