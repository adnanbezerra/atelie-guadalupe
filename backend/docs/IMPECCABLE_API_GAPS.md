# Lacunas de API para correções Impeccable

Status: contratos propostos. Backend atual **não implementa** itens marcados como lacuna. Frontend não deve chamar estas rotas/campos antes de `docs/API.md` confirmá-los.

Fonte: `docs/API.md`, plano Impeccable e críticas em `.impeccable/critique/`.

## Cobertura atual confirmada

| Necessidade                  | Suporte atual                                                                               | Decisão frontend                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Produto por UUID             | `GET /products/:uuid`                                                                       | Usar direto. Não buscar 100 itens e filtrar no cliente.                                 |
| Catálogo paginado            | `GET /products?page&pageSize` retorna `pagination`                                          | Usar para catálogo público. Visibilidade de inativos continua ausente.                  |
| Pedidos do cliente           | `GET /users/me/orders?page&pageSize` retorna `pagination`                                   | Usar no perfil.                                                                         |
| Pedido por UUID              | `GET /orders/:uuid` retorna pedido, pagamento, envio e fulfillment                          | Usar no detalhe, checkout e sucesso.                                                    |
| Usuários                     | `GET /users`, `POST /users`, `PATCH /users/:uuid`                                           | CRUD básico existe. Listagem não pagina nem filtra. `POST` exige `document`.            |
| Testemunhos                  | `GET /testimonials`, `GET /testimonials/:uuid`, `PUT /testimonials`, desativação e exclusão | Editar e reativar já cabem em `PUT` com `uuid` e `isActive: true`. Listagem não pagina. |
| Cobranças avulsas            | `POST /payment-links` e `GET /payment-links?page&pageSize&status`                           | Criação e histórico paginado existem.                                                   |
| Checkout público de cobrança | `POST /payment-links/:uuid/payment`                                                         | Cria/recupera checkout. Não serve como prévia sem efeito.                               |
| Pedidos administrativos      | `GET /orders`                                                                               | Lista existe. Sem paginação, filtros ou agregações.                                     |

## GAP-01 — prévia pública de cobrança avulsa

Problema: página pública precisa mostrar valor, descrição, validade e estado antes de criar checkout. Única rota pública atual é mutativa.

### `GET /payment-links/:uuid`

Autenticação: nenhuma.

Efeito: nenhum. Não cria checkout, não muda estado, não chama AbacatePay.

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "paymentLink": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b411",
            "amountInCents": 12500,
            "description": "Encomenda personalizada para Maria",
            "expiresAt": "2026-08-16T02:59:59.000Z",
            "status": "ACTIVE"
        }
    }
}
```

Regras:

- Estados públicos: `ACTIVE`, `CREATING`, `PENDING`, `PAID`, `EXPIRED`, `REFUNDED`, `DISPUTED`, `LOST`.
- Estado não pagável ainda retorna `200`. Frontend explica estado e bloqueia CTA.
- Resposta não expõe `createdBy`, email, IDs do provedor, reembolso ou URL direta do checkout.
- Só `POST /payment-links/:uuid/payment` cria ou recupera checkout.

Erros:

- `404 RESOURCE_NOT_FOUND`: UUID válido, cobrança inexistente.
- `422 VALIDATION_ERROR`: UUID inválido.

## GAP-02 — dados e opção de venda por tipo de produto

Problema: produto atual só oferece texto livre e opções em gramas. Isso não sustenta ingredientes/uso em autocuidado nem material/técnica/dimensão/unidade em artesanato. Trocar só rótulo no frontend criaria dado falso.

### Extensão do modelo `Product`

Autocuidado:

```json
{
    "category": "SELFCARE",
    "details": {
        "kind": "SELFCARE",
        "ingredients": ["Sebo bovino purificado", "Óleo de lavanda"],
        "usageInstructions": "Aplicar pequena quantidade na pele limpa."
    },
    "saleOptions": [
        {
            "code": "GRAMS_70",
            "label": "70 g",
            "unit": "GRAM",
            "grams": 70,
            "priceInCents": 2590
        }
    ]
}
```

Artesanato:

```json
{
    "category": "ARTISANAL",
    "details": {
        "kind": "ARTISANAL",
        "material": "Cerâmica esmaltada",
        "technique": "Modelagem e pintura manual",
        "dimensionsCm": {
            "height": 18,
            "width": 7,
            "depth": 6
        }
    },
    "saleOptions": [
        {
            "code": "UNIT",
            "label": "1 peça",
            "unit": "UNIT",
            "grams": null,
            "priceInCents": 12900
        }
    ]
}
```

Regras:

- `details.kind` deve igualar `category`.
- `SELFCARE`: `ingredients` aceita lista não vazia de strings; `usageInstructions` obrigatório.
- `ARTISANAL`: `material`, `technique` e três dimensões positivas obrigatórios.
- `saleOptions` vira fonte canônica de preço/label. `priceOptions` pode permanecer temporariamente como compatibilidade de leitura.
- `code` é identificador estável, não texto visível.
- `shippingWeightGrams` continua sendo peso logístico de produto artesanal. Não usar dimensão física como peso.
- Carrinho passa a aceitar `saleOptionCode`. Durante transição, backend pode mapear `productSize` antigo para `code`.
- Snapshot de carrinho/pedido deve devolver `saleOptionCode` e `saleOptionLabel`; `grams` pode ser `null`.
- Dados antigos sem `details` retornam `details: null`. Frontend omite bloco; nunca inventa conteúdo.

Create/update continuam `multipart/form-data`. Campos estruturados enviados como JSON:

```http
details={"kind":"ARTISANAL","material":"Cerâmica esmaltada","technique":"Pintura manual","dimensionsCm":{"height":18,"width":7,"depth":6}}
saleOptions=[{"code":"UNIT","label":"1 peça","unit":"UNIT","grams":null,"priceInCents":12900}]
```

Erros:

- `400 BUSINESS_RULE_ERROR`: mudança de categoria deixa detalhes/opções incompatíveis.
- `409 CONFLICT`: `code` duplicado no mesmo produto.
- `422 VALIDATION_ERROR`: JSON inválido, campo obrigatório ausente, dimensão/preço não positivo ou `kind` divergente.

## GAP-03 — retirada local e restrição logística por produto

Problema: API atual exige endereço, frete e serviço SuperFrete. Nenhum produto declara retirada. Frontend não pode oferecer “Retirar” hoje.

### Extensão do produto

```json
{
    "deliveryModes": ["SHIPMENT", "LOCAL_PICKUP"]
}
```

Regras:

- Valores: `SHIPMENT`, `LOCAL_PICKUP`.
- Lista não vazia.
- Produto só retirada: `["LOCAL_PICKUP"]`.
- Produtos antigos: default `["SHIPMENT"]`.

### Extensão de `POST /shipping/quote`

Resposta mantém `quotedServices` por compatibilidade e adiciona:

```json
{
    "success": true,
    "data": {
        "quotedServices": [],
        "deliveryOptions": [
            {
                "type": "LOCAL_PICKUP",
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
            }
        ]
    }
}
```

Regras:

- Backend calcula interseção de `deliveryModes` entre itens.
- Modo sem suporte comum não aparece.
- `LOCAL_PICKUP` usa snapshot público da plataforma padrão ativa.
- CEP pode ser omitido somente quando carrinho oferece apenas retirada.

### Extensão de `POST /orders`

Entrega:

```json
{
    "addressUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
    "delivery": {
        "type": "SHIPMENT",
        "serviceCode": 1,
        "priceInCents": 1590
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

Resposta do pedido adiciona `delivery.type` e snapshot. Retirada grava `shippingInCents: 0`, `shipment: null` e local imutável no pedido.

Erros:

- `400 BUSINESS_RULE_ERROR`: modo não aceito por todos os itens; endereço ausente para envio; envio presente em retirada.
- `404 RESOURCE_NOT_FOUND`: plataforma/local de retirada não configurado.
- `409 CONFLICT`: preço de frete mudou.
- `422 VALIDATION_ERROR`: combinação inválida de campos.

## GAP-04 — remoção persistente de imagem

Problema: `PATCH /products/:uuid` substitui imagem, mas não remove. Limpar prévia apenas no frontend mente.

### Extensão de `PATCH /products/:uuid`

Request `multipart/form-data`:

```http
removeImage=true
```

Resposta: produto atualizado com `imageUrl: null`.

Regras:

- `image` e `removeImage=true` são mutuamente exclusivos.
- Remoção apaga arquivo no GridFS e zera referência no Postgres na mesma operação lógica.
- Repetir remoção sem imagem retorna sucesso com `imageUrl: null`.
- `Product.imageUrl` passa de `string` para `string | null`.

Erros:

- `404 RESOURCE_NOT_FOUND`: produto inexistente.
- `422 VALIDATION_ERROR`: `image` e `removeImage` juntos ou boolean inválido.
- `503 SERVICE_UNAVAILABLE`: storage indisponível; referência do produto deve permanecer intacta.

## GAP-05 — inativos e reativação de produto

Problema: `DELETE /products/:uuid` desativa, mas API não documenta como listar, abrir ou reativar inativos.

### Extensão de `GET /products`

Query administrativa autenticada:

```http
GET /products?page=1&pageSize=24&status=ALL
Authorization: Bearer <jwt>
```

`status`: `ACTIVE` (default público), `INACTIVE` ou `ALL`. `INACTIVE`/`ALL` exigem `ADMIN` ou `SUBADMIN`.

Resposta mantém `items` e `pagination`; `total` considera filtro inteiro, não só página atual.

### Extensão de `GET /products/:uuid`

- Público recebe só produto ativo.
- `ADMIN`/`SUBADMIN` autenticado recebe ativo ou inativo.

### Extensão de `PATCH /products/:uuid`

Request `multipart/form-data`:

```http
isActive=true
```

Resposta: `{ "product": { ... } }` atualizado.

Regras:

- `DELETE` continua desativação compatível.
- Reativação valida campos obrigatórios, opção de venda e logística antes de publicar.
- Operação idempotente: ativar ativo ou desativar inativo retorna estado atual.

Erros:

- `400 BUSINESS_RULE_ERROR`: produto incompleto não pode ser ativado.
- `403 FORBIDDEN`: papel sem permissão.
- `404 RESOURCE_NOT_FOUND`: produto inexistente.
- `422 VALIDATION_ERROR`: status inválido.

## GAP-06 — paginação, filtros e agregações administrativas

Problema: telas atuais calculam totais sobre recortes (`24`, `40` ou `100` itens) ou arrays completos sem paginação. Métricas ficam parciais; falha pode parecer zero.

### `GET /admin/dashboard`

Autenticação: `ADMIN` ou `SUBADMIN`.

Query:

```http
GET /admin/dashboard?from=2026-10-01T00:00:00.000Z&to=2026-10-31T23:59:59.999Z
```

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "period": {
            "from": "2026-10-01T00:00:00.000Z",
            "to": "2026-10-31T23:59:59.999Z"
        },
        "metrics": {
            "paidRevenueInCents": 250000,
            "paidOrders": 20,
            "averagePaidTicketInCents": 12500,
            "awaitingPaymentOrders": 3,
            "ordersToPrepare": 4,
            "ordersToShip": 2,
            "failedFulfillments": 1,
            "outOfStockProducts": 5,
            "lowStockProducts": 3
        },
        "priorityOrders": [
            {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b501",
                "status": "PAID",
                "paymentStatus": "PAID",
                "shipmentStatus": "CONFIRMED",
                "fulfillmentStatus": "FAILED",
                "totalInCents": 12500,
                "placedAt": "2026-10-05T12:00:00.000Z"
            }
        ]
    }
}
```

Regras:

- Receita, quantidade paga e ticket contam somente pagamento confirmado (`payment.status = PAID`).
- Cancelados, pendentes, disputados, perdidos e reembolsados não contam como receita paga.
- `priorityOrders` ordena: fulfillment falho, pago aguardando preparo, processamento aguardando envio, pagamento pendente antigo.
- Falha da consulta retorna erro. Nunca payload zerado sintético.

### Extensões de listas existentes

#### `GET /orders`

Query: `page`, `pageSize`, `status`, `paymentStatus`, `shipmentStatus`, `fulfillmentStatus`, `search`, `sort`.

Resposta mantém `orders` e adiciona `pagination` obrigatório.

#### `GET /users`

Query: `page`, `pageSize`, `search`, `role`, `isActive`, `sort`.

Resposta mantém `users` e adiciona `pagination` obrigatório.

#### `GET /testimonials`

Query: `page`, `pageSize`, `type`, `isActive`, `sort`.

Resposta mantém `testimonials` e adiciona `pagination` obrigatório.

Padrão comum:

- `page`: default `1`.
- `pageSize`: default `20`, máximo `100`.
- `sort`: whitelist por recurso; default mais recente primeiro.
- `pagination`: `{ "page": 1, "pageSize": 20, "total": 125, "totalPages": 7 }`.
- Filtro inválido: `422 VALIDATION_ERROR`.
- Sem permissão: `403 FORBIDDEN`.
- Resultado vazio: `200`, array vazio e paginação real.

Produtos já paginam. Administração deve usar GAP-05 (`status`) e `pagination.total`; não criar segunda contagem no cliente.

## Ordem de desbloqueio

1. GAP-01 desbloqueia prévia honesta de cobrança manual.
2. GAP-05 e GAP-06 desbloqueiam operação administrativa completa.
3. GAP-02 desbloqueia decisão e linguagem correta por categoria.
4. GAP-04 desbloqueia remoção real de imagem.
5. GAP-03 desbloqueia retirada local; maior impacto em produto, frete, pedido e pós-compra.

Enquanto backend não confirmar cada contrato em `docs/API.md`, frontend deve ocultar controle correspondente ou explicar limitação por `FeedbackDialog`. Nunca mockar sucesso.
