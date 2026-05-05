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
    "category": "ARTISANAL",
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
    "shippingWeightGrams": 120,
    "description": "Texto longo opcional com historia do produto, modo de uso, composicao e observacoes.",
    "shortDescription": "Sabonete natural com lavanda",
    "longDescription": "Sabonete natural com oleo essencial de lavanda e processo artesanal.",
    "isActive": true,
    "createdAt": "2026-03-12T12:00:00.000Z",
    "updatedAt": "2026-03-12T12:00:00.000Z"
}
```

Observacoes:

- `category` define a regra de estoque do produto
- `ARTISANAL` usa controle de estoque e retorna `stock` numerico
- `SELFCARE` nao usa controle de estoque e retorna `stock` como `null`
- `ARTISANAL` usa `shippingWeightGrams` para cotacao de frete
- `SELFCARE` retorna `shippingWeightGrams` como `null`
- `description` e opcional e aceita texto longo
- a precificacao e orientada pela linha do produto, retornada em `line`
- `priceOptions` contem os precos cadastrados por tamanho
- tamanhos atuais: `GRAMS_70` e `GRAMS_100`

## 11.2 Modelo de linha/categoria

```json
{
    "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b210",
    "slug": "linha-rn",
    "name": "Linha RN",
    "price70gInCents": 11900,
    "price100gInCents": 17000,
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
                "price70gInCents": 11900,
                "price100gInCents": 17000,
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
- `inStock=true` considera produtos `ARTISANAL` com `stock > 0` e todos os produtos `SELFCARE`

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
                "category": "ARTISANAL",
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
                "shippingWeightGrams": 120,
                "description": "Texto longo opcional com historia do produto, modo de uso, composicao e observacoes.",
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
            "category": "ARTISANAL",
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
            "shippingWeightGrams": 120,
            "description": "Texto longo opcional com historia do produto, modo de uso, composicao e observacoes.",
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
    "price70gInCents": 11900,
    "price100gInCents": 17000
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
            "price70gInCents": 11900,
            "price100gInCents": 17000,
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
    "price70gInCents": 11900,
    "price100gInCents": 17000
}
```

Observacoes:

- qualquer campo e opcional
- precisa enviar ao menos um campo

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "line": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b210",
            "slug": "linha-rn-atualizada",
            "name": "Linha RN Atualizada",
            "price70gInCents": 11900,
            "price100gInCents": 17000,
            "createdAt": "2026-03-12T12:00:00.000Z",
            "updatedAt": "2026-03-12T12:05:00.000Z"
        }
    }
}
```

## 11.9 `POST /products`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Request:

```json
{
    "name": "Sabonete Artesanal de Lavanda",
    "category": "ARTISANAL",
    "lineUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b210",
    "image": {
        "filename": "lavanda.jpg",
        "contentType": "image/jpeg",
        "base64": "<base64>"
    },
    "stock": 8,
    "shippingWeightGrams": 120,
    "description": "Texto longo opcional com historia do produto, modo de uso, composicao e observacoes.",
    "shortDescription": "Sabonete natural com lavanda",
    "longDescription": "Sabonete natural com oleo essencial de lavanda e processo artesanal."
}
```

Observacoes:

- `category` aceita `SELFCARE` ou `ARTISANAL`
- para `ARTISANAL`, `stock` e obrigatorio
- para `ARTISANAL`, `shippingWeightGrams` e obrigatorio
- para `SELFCARE`, nao envie `stock` nem `shippingWeightGrams`
- `description` e opcional

Resposta `201`:

```json
{
    "success": true,
    "data": {
        "product": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b201",
            "slug": "sabonete-artesanal-de-lavanda",
            "name": "Sabonete Artesanal de Lavanda",
            "category": "ARTISANAL",
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
            "shippingWeightGrams": 120,
            "description": "Texto longo opcional com historia do produto, modo de uso, composicao e observacoes.",
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
    "category": "ARTISANAL",
    "lineUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b210",
    "image": {
        "filename": "novo.jpg",
        "contentType": "image/jpeg",
        "base64": "<base64>"
    },
    "stock": 4,
    "shippingWeightGrams": 120,
    "description": "Descricao longa opcional atualizada",
    "shortDescription": "Descricao curta atualizada",
    "longDescription": "Descricao longa atualizada"
}
```

Observacoes:

- qualquer campo e opcional
- se enviar `image`, o backend substitui a imagem anterior no storage
- `category` aceita `SELFCARE` ou `ARTISANAL`
- para mudar `SELFCARE` para `ARTISANAL`, informe `stock` e `shippingWeightGrams`
- para `SELFCARE`, nao envie `stock` nem `shippingWeightGrams`
- `description` e opcional

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "product": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b201",
            "slug": "novo-nome",
            "name": "Novo nome",
            "category": "ARTISANAL",
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
            "stock": 4,
            "shippingWeightGrams": 120,
            "description": "Descricao longa opcional atualizada",
            "shortDescription": "Descricao curta atualizada",
            "longDescription": "Descricao longa atualizada",
            "isActive": true,
            "createdAt": "2026-03-12T12:00:00.000Z",
            "updatedAt": "2026-03-12T12:05:00.000Z"
        }
    }
}
```

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
            "coupon": {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b601",
                "code": "BEMVINDA",
                "discountPercent": 10,
                "discountInCents": 518
            },
            "summary": {
                "itemsCount": 2,
                "subtotalInCents": 5180,
                "couponDiscountInCents": 518,
                "totalInCents": 4662
            }
        }
    }
}
```

Observacoes:

- o carrinho e criado automaticamente no primeiro acesso, se nao existir
- `isAvailable` ajuda o frontend a alertar item inativo ou sem estoque suficiente
- para produtos `SELFCARE`, `isAvailable` nao depende de estoque
- `unitPriceInCents` ja considera promocao vigente quando o item e adicionado ou atualizado
- `coupon` sera `null` quando nenhum cupom estiver aplicado

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
            "coupon": null,
            "summary": {
                "itemsCount": 2,
                "subtotalInCents": 5180,
                "couponDiscountInCents": 0,
                "totalInCents": 5180
            }
        }
    }
}
```

Possiveis erros:

- `404` produto nao encontrado
- `400` estoque insuficiente para produto `ARTISANAL`

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

Observacoes:

- `quantity` e obrigatorio
- `productSize` e opcional

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

## 13.6 `POST /cart/coupon`

Autenticacao:

- obrigatoria

Request:

```json
{
    "code": "BEMVINDA"
}
```

Comportamento:

- aplica cupom no carrinho atual
- valida validade, cancelamento, limite total de uso, segmentacao por email e uso unico por cliente
- se o cupom nao for acumulavel, rejeita quando existir promocao vigente nos itens do carrinho

Resposta:

- retorna o carrinho atualizado no mesmo formato de `GET /cart`

## 13.7 `DELETE /cart/coupon`

Autenticacao:

- obrigatoria

Comportamento:

- remove o cupom aplicado no carrinho

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
    "discountInCents": 777,
    "promotionDiscountInCents": 259,
    "couponDiscountInCents": 518,
    "couponCode": "BEMVINDA",
    "totalInCents": 4403,
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
- cupom aplicado gera registro de uso e impede novo uso pelo mesmo cliente
- promocoes vigentes sao recalculadas no fechamento do pedido

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
            "discountInCents": 777,
            "promotionDiscountInCents": 259,
            "couponDiscountInCents": 518,
            "couponCode": "BEMVINDA",
            "totalInCents": 4403,
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
- `400` estoque insuficiente em produto `ARTISANAL`
- `400` cupom expirado, cancelado, sem usos disponiveis, ja usado pelo usuario ou nao acumulavel com promocao vigente
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
                "promotionDiscountInCents": 0,
                "couponDiscountInCents": 0,
                "couponCode": null,
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

Resposta `200`:

- retorna `order` atualizado

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

## 15. Marketing

## 15.1 Cupons

Regras:

- cadastro, listagem, atualizacao e cancelamento administrativo em `/marketing/coupons`
- autenticacao obrigatoria com `ADMIN` ou `SUBADMIN`
- `code` e salvo em uppercase e deve ser unico
- `discountPercent` aceita `1` a `100`
- `validUntil` e opcional; `null` significa sem data de expiracao
- `maxUses` limita o total de usos entre todos os clientes
- `emails` vazio deixa o cupom publico; com emails, so esses emails podem usar
- cliente nao pode usar o mesmo cupom mais de uma vez
- `stackableWithPromotions` controla se cupom acumula com promocao vigente
- `POST /marketing/coupons/:uuid/cancel` desativa manualmente cupom vigente

### `GET /marketing/coupons`

Resposta:

```json
{
    "success": true,
    "data": {
        "coupons": [
            {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b601",
                "code": "BEMVINDA",
                "discountPercent": 10,
                "validUntil": "2026-06-01T23:59:59.000Z",
                "maxUses": 100,
                "usedCount": 0,
                "emails": ["maria@email.com"],
                "stackableWithPromotions": false,
                "isActive": true,
                "cancelledAt": null,
                "createdAt": "2026-03-12T12:00:00.000Z",
                "updatedAt": "2026-03-12T12:00:00.000Z"
            }
        ]
    }
}
```

### `POST /marketing/coupons`

Request:

```json
{
    "code": "BEMVINDA",
    "discountPercent": 10,
    "validUntil": "2026-06-01T23:59:59.000Z",
    "maxUses": 100,
    "emails": ["maria@email.com"],
    "stackableWithPromotions": false,
    "isActive": true
}
```

Resposta `201`:

- retorna `{ "coupon": { ... } }` no mesmo modelo de `GET /marketing/coupons`

### `PATCH /marketing/coupons/:uuid`

Comportamento:

- atualiza parcialmente
- `validUntil: null` remove expiracao
- `emails: []` remove segmentacao por email

Resposta `200`:

- retorna `{ "coupon": { ... } }` atualizado

### `POST /marketing/coupons/:uuid/cancel`

Comportamento:

- marca `isActive = false`
- preenche `cancelledAt`

Resposta `200`:

- retorna `{ "coupon": { ... } }` atualizado

## 15.2 Promocoes

Regras:

- cadastro, listagem e atualizacao administrativa em `/marketing/promotions`
- autenticacao obrigatoria com `ADMIN` ou `SUBADMIN`
- `scope = ALL_PRODUCTS` aplica em todos os produtos e nao aceita `category`
- `scope = CATEGORY` exige `category`
- `startsAt` e obrigatorio e inclui data/hora
- `endsAt` e opcional; `null` significa sem data de expiracao
- seed cadastra `Promocao inicial 5%`, todos os produtos, inicio `2026-05-04T00:00:00.000Z`, sem fim

### `GET /marketing/promotions`

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "promotions": [
            {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b701",
                "name": "Promocao Maio",
                "slug": "promocao-maio",
                "scope": "ALL_PRODUCTS",
                "category": null,
                "discountPercent": 5,
                "startsAt": "2026-05-04T00:00:00.000Z",
                "endsAt": null,
                "isActive": true,
                "createdAt": "2026-03-12T12:00:00.000Z",
                "updatedAt": "2026-03-12T12:00:00.000Z"
            }
        ]
    }
}
```

### `POST /marketing/promotions`

Request:

```json
{
    "name": "Promocao Maio",
    "scope": "ALL_PRODUCTS",
    "discountPercent": 5,
    "startsAt": "2026-05-04T00:00:00.000Z",
    "endsAt": null,
    "isActive": true
}
```

Para categoria especifica:

```json
{
    "name": "Selfcare Maio",
    "scope": "CATEGORY",
    "category": "SELFCARE",
    "discountPercent": 10,
    "startsAt": "2026-05-04T09:00:00.000Z",
    "endsAt": "2026-05-31T23:59:59.000Z",
    "isActive": true
}
```

Resposta `201`:

- retorna `{ "promotion": { ... } }` no mesmo modelo de `GET /marketing/promotions`

### `PATCH /marketing/promotions/:uuid`

Comportamento:

- atualiza parcialmente
- `endsAt: null` remove expiracao

Resposta `200`:

- retorna `{ "promotion": { ... } }` atualizado

## 16. Platforms

Os dados institucionais e o endereco de expedicao da loja ficam na model `Platform`.

Regras:

- CRUD administrativo
- o remetente do SuperFrete e lido da `Platform` padrao ativa
- o endereco da plataforma fica salvo em `Address`, mas com ownership da plataforma

### `GET /platforms`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "platforms": [
            {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b801",
                "name": "Atelie Guadalupe",
                "slug": "atelie-guadalupe",
                "email": "contato@atelieguadalupe.com",
                "phone": "11999999999",
                "document": "12345678000199",
                "websiteUrl": "https://atelieguadalupe.com",
                "isActive": true,
                "isDefault": true,
                "address": {
                    "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b802",
                    "label": "Plataforma",
                    "recipient": "Atelie Guadalupe",
                    "zipCode": "01153000",
                    "street": "Rua da Origem",
                    "number": "123",
                    "complement": "Sala 1",
                    "neighborhood": "Centro",
                    "city": "Sao Paulo",
                    "state": "SP",
                    "country": "Brasil",
                    "reference": "Porta azul",
                    "isDefault": false,
                    "createdAt": "2026-03-12T12:00:00.000Z",
                    "updatedAt": "2026-03-12T12:00:00.000Z"
                },
                "createdAt": "2026-03-12T12:00:00.000Z",
                "updatedAt": "2026-03-12T12:00:00.000Z"
            }
        ]
    }
}
```

### `GET /platforms/:uuid`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Resposta `200`:

- retorna `{ "platform": { ... } }` no mesmo modelo de `GET /platforms`

### `POST /platforms`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Request:

```json
{
    "name": "Atelie Guadalupe",
    "email": "contato@atelieguadalupe.com",
    "phone": "11999999999",
    "document": "12345678000199",
    "websiteUrl": "https://atelieguadalupe.com",
    "isActive": true,
    "isDefault": true,
    "address": {
        "label": "Plataforma",
        "recipient": "Atelie Guadalupe",
        "document": "12345678000199",
        "zipCode": "01153000",
        "street": "Rua da Origem",
        "number": "123",
        "complement": "Sala 1",
        "neighborhood": "Centro",
        "city": "Sao Paulo",
        "state": "SP",
        "country": "Brasil",
        "reference": "Porta azul"
    }
}
```

Observacoes:

- `address.isDefault` nao existe no request de plataforma
- `email`, `phone`, `document`, `websiteUrl`, `isActive` e `isDefault` sao opcionais

Resposta `201`:

- retorna `{ "platform": { ... } }` no mesmo modelo de `GET /platforms`

### `PATCH /platforms/:uuid`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Comportamento:

- atualiza parcialmente a plataforma e seu endereco
- `email`, `phone`, `document` e `websiteUrl` aceitam `null`

Resposta `200`:

- retorna `{ "platform": { ... } }` atualizado

### `DELETE /platforms/:uuid`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Comportamento:

- remove a plataforma e seu endereco vinculado

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "deleted": true
    }
}
```

## 17. Shipping

## 17.1 Configuracao de caixas

As caixas sao configuradas no banco e usadas pelo modulo de frete para decidir o empacotamento antes de consultar o SuperFrete.

Caixas seeded por padrao:

- `SELFCARE`: `11.5 x 6.5 x 6.5` com capacidade ate `2` itens
- `SELFCARE`: `21 x 12.5 x 12.5` com capacidade ate `4` itens
- `ARTISANAL`: `95 x 50 x 17` com capacidade ate `1` item

### `GET /shipping/boxes`

Uso:

- listar caixas cadastradas

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "boxes": [
            {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b777",
                "name": "Caixa Pequena",
                "slug": "caixa-pequena",
                "category": "SELFCARE",
                "dimensionsCm": {
                    "height": 11.5,
                    "width": 6.5,
                    "length": 6.5
                },
                "emptyWeightGrams": 0,
                "maxItems": 2,
                "isActive": true,
                "createdAt": "2026-03-12T12:00:00.000Z",
                "updatedAt": "2026-03-12T12:00:00.000Z"
            }
        ]
    }
}
```

### `POST /shipping/boxes`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Request:

```json
{
    "name": "Caixa Artesanato",
    "category": "ARTISANAL",
    "outerHeightCm": 95,
    "outerWidthCm": 50,
    "outerLengthCm": 17,
    "emptyWeightGrams": 0,
    "maxItems": 1,
    "isActive": true
}
```

Resposta `201`:

- retorna `{ "box": { ... } }` no mesmo modelo de `GET /shipping/boxes`

### `PATCH /shipping/boxes/:uuid`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Comportamento:

- atualiza parcialmente a caixa

Resposta `200`:

- retorna `{ "box": { ... } }` atualizado

### `DELETE /shipping/boxes/:uuid`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Comportamento:

- remove a caixa configurada

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "deleted": true
    }
}
```

## 17.2 Frete por pedido

Fluxo esperado:

1. criar pedido com endereco
2. cotar frete
3. confirmar o servico de frete escolhido
4. apos confirmacao do pagamento, chamar o checkout do frete para gerar a etiqueta

### `GET /shipping/orders/:orderUuid`

Autenticacao:

- obrigatoria

Comportamento:

- retorna o resumo do pedido e o snapshot de frete salvo no banco

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "order": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b999",
            "status": "PENDING",
            "subtotalInCents": 34000,
            "shippingInCents": 0,
            "discountInCents": 0,
            "totalInCents": 34000
        },
        "shipment": null
    }
}
```

### `POST /shipping/orders/:orderUuid/quote`

Autenticacao:

- obrigatoria

Uso:

- calcula frete no SuperFrete
- salva o snapshot das opcoes retornadas
- salva tambem o snapshot do remetente/plataforma usado na cotacao
- se `serviceCode` for enviado, confirma a opcao escolhida e atualiza `shippingInCents` e `totalInCents` do pedido

Request:

```json
{
    "serviceCode": 1,
    "ownHand": false,
    "receipt": false,
    "useInsuranceValue": false,
    "insuranceValueInCents": 0,
    "refresh": false
}
```

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "order": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b999",
            "status": "PENDING",
            "subtotalInCents": 34000,
            "shippingInCents": 0,
            "discountInCents": 0,
            "totalInCents": 34000
        },
        "shipment": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b998",
            "status": "CONFIRMED",
            "selectedServiceCode": 1,
            "selectedServiceName": "PAC",
            "shippingPriceInCents": 1590,
            "superfreteOrderId": null,
            "superfreteProtocol": null,
            "trackingCode": null,
            "labelUrl": null,
            "senderSnapshot": {},
            "quotedServices": [],
            "packaging": {
                "selectedBoxes": []
            },
            "quotedAt": "2026-03-12T12:00:00.000Z",
            "confirmedAt": "2026-03-12T12:00:00.000Z",
            "checkoutRequestedAt": null,
            "purchasedAt": null,
            "cancelledAt": null,
            "createdAt": "2026-03-12T12:00:00.000Z",
            "updatedAt": "2026-03-12T12:00:00.000Z"
        },
        "orderTotals": {
            "subtotalInCents": 34000,
            "shippingInCents": 1590,
            "discountInCents": 0,
            "totalInCents": 35590
        }
    }
}
```

Regras:

- depois que o frete fica `CONFIRMED`, a mesma cotacao fica congelada no pedido para evitar recobranca ou duplicidade
- a expedicao usa sempre a `Platform` padrao ativa cadastrada no banco
- pedidos `SELFCARE` usam as caixas de cosmeticos
- pedidos `ARTISANAL` usam exclusivamente caixas da categoria `ARTISANAL`
- produtos `ARTISANAL` precisam ter `shippingWeightGrams` configurado

Observacoes:

- sem `serviceCode`, resposta traz `shipment.status = "QUOTED"` e nao traz `orderTotals`
- com `serviceCode`, resposta confirma frete e inclui `orderTotals`

### `POST /shipping/orders/:orderUuid/checkout`

Autenticacao:

- obrigatoria

Comportamento:

- cria o frete no carrinho do SuperFrete
- executa o checkout da etiqueta
- salva `superfreteOrderId`, protocolo, tracking e link de etiqueta no banco
- reaproveita o `senderSnapshot` salvo no pedido para nao mudar o remetente historico se a `Platform` for editada depois
- se a etiqueta ja tiver sido comprada, retorna o snapshot persistido

Resposta `200`:

- retorna `order` e `shipment` atualizados

### `POST /shipping/orders/:orderUuid/cancel`

Autenticacao:

- obrigatoria
- `ADMIN` ou `SUBADMIN`

Comportamento:

- solicita cancelamento do frete no SuperFrete e salva o retorno

Resposta `200`:

- retorna `order` e `shipment` atualizados

## 18. Observacoes para frontend

- Todos os valores monetarios estao em centavos.
- Todas as datas estao em formato ISO.
- Datas de promocao e cupom devem incluir horario quando enviadas.
- Sempre use `uuid` nas rotas e no estado do frontend. Nao use IDs internos.
- O frontend deve guardar o JWT e reenviar em `Authorization`.
- Para imagem de produto, o frontend precisa converter o arquivo para base64 antes do envio.
- Para exibir imagem de produto, basta usar o valor de `imageUrl` retornado pelo backend.
- `GET /media/images/:id` responde com stream binario, entao `imageUrl` pode ser usado direto em `<img src="...">`.
- Para produtos `ARTISANAL`, envie tambem `shippingWeightGrams` em gramas no create/update.
- O `.env` nao carrega mais endereco de expedicao; esses dados ficam na `Platform` padrao cadastrada no banco.
