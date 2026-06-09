# Endpoint faltante: buscar produto por slug

## `GET /products/slug/:slug`

Uso:

- detalhe publico do produto por slug
- necessario para paginas publicas como `/produto/sabonete-artesanal-de-lavanda`
- deve retornar o mesmo payload de `GET /products/:uuid`

Autenticacao:

- nao obrigatoria

Params:

- `slug`: slug publico unico do produto

Exemplo:

```http
GET /products/slug/sabonete-artesanal-de-lavanda
```

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
            "activePromotion": {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b701",
                "name": "Semana da Lavanda",
                "slug": "semana-da-lavanda",
                "scope": "CATEGORY",
                "category": "ARTISANAL",
                "discountPercent": 15,
                "startsAt": "2026-05-01T00:00:00.000Z",
                "endsAt": null
            },
            "promotionDiscountPercent": 15,
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

Resposta `404`:

```json
{
    "success": false,
    "error": {
        "code": "PRODUCT_NOT_FOUND",
        "message": "Produto nao encontrado",
        "details": []
    }
}
```
