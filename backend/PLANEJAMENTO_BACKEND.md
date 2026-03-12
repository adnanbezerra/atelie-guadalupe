# Planejamento de Desenvolvimento do Backend

## 1. Objetivo

Construir um backend em Fastify para um ecommerce de cosméticos naturais, imagens católicas e terços, com autenticação JWT, controle de acesso por perfil, catálogo de produtos, carrinho e base de pedidos, mantendo separação clara entre backend e frontend, aderência à LGPD e arquitetura em camadas.

## 2. Diretrizes Técnicas Obrigatórias

- Framework HTTP: Fastify 5
- Linguagem: TypeScript
- Banco de dados: PostgreSQL
- ORM: Prisma
- Validação de entrada: Zod em 100% dos inputs externos
- Autenticação: JWT
- Senhas: hash com algoritmo forte, preferencialmente `argon2`
- Autorização: baseada em roles
- Arquitetura: `route -> controller -> service -> repository`
- Repositórios: única camada autorizada a acessar Prisma
- Tratamento de regras de negócio: padrão left/right monad (`Either`)
- Organização Fastify: uso de plugins para autenticação, Prisma, Zod, rate limit, CORS, suporte HTTP e decorators compartilhados
- UUID externo: `uuidv7` para entidades expostas
- Datas: `createdAt` e `updatedAt` em todas as entidades persistidas
- Valores monetários: sempre em centavos
- Soft constraints de segurança: rate limit, proteção contra enumeração de usuários, payload validation rigorosa e mensagens de erro consistentes
- Nunca faremos hard delete, somente em endereços e cart após limpar um cart. De resto, deve haver um campo de isActive e fazer soft delete com alteração no updatedAt

## 3. Escopo de Entrega

### Fase 1. Fundação da aplicação

- Configuração de plugins base
- Integração com Prisma e Postgres
- Infra de autenticação JWT
- Infra de autorização por role
- Infra de validação com Zod
- Infra do padrão `Either`
- Infra de tratamento padronizado de erros
- Infra de rate limit
- Infra de observabilidade mínima com logs estruturados

### Fase 2. Usuários e autenticação

- Registro de usuário
- Login
- Edição de perfil
- Cadastro e manutenção de endereços
- Criação de Admin/Subadmin restrita a Admin

### Fase 3. Produtos

- CRUD completo de produtos
- Leitura pública do catálogo
- CUD restrito a Admin/Subadmin

### Fase 4. Carrinho

- CRUD do carrinho do usuário autenticado
- Regras de consistência de estoque e preço de referência

### Fase 5. Pedidos

- CRUD base de pedidos
- Preparação estrutural para checkout futuro
- Congelamento de snapshot dos itens no momento do pedido

## 4. Arquitetura Proposta

## 4.1 Estrutura de diretórios

```text
src/
    app.ts
    plugins/
        prisma.ts
        auth.ts
        jwt.ts
        rate-limit.ts
        zod.ts
        sensible.ts
        support.ts
    core/
        either/
            either.ts
        errors/
            app-error.ts
            error-codes.ts
        types/
    modules/
        auth/
            routes/
            controllers/
            services/
            repositories/
            schemas/
            mappers/
        users/
            routes/
            controllers/
            services/
            repositories/
            schemas/
            mappers/
        addresses/
            routes/
            controllers/
            services/
            repositories/
            schemas/
            mappers/
        roles/
            repositories/
        products/
            routes/
            controllers/
            services/
            repositories/
            schemas/
            mappers/
        carts/
            routes/
            controllers/
            services/
            repositories/
            schemas/
            mappers/
        orders/
            routes/
            controllers/
            services/
            repositories/
            schemas/
            mappers/
    shared/
        http/
        utils/
        constants/
```

## 4.2 Responsabilidade por camada

### Route

- Registra endpoints Fastify
- Define `schema` com Zod
- Aplica pre-handlers de autenticação/autorização
- Encaminha request ao controller

### Controller

- Extrai dados validados do request
- Invoca service
- Converte `Either` em resposta HTTP
- Não contém regra de negócio complexa

### Service

- Implementa regras de negócio
- Orquestra repositórios
- Retorna `Either<DomainError, Result>`
- Não conhece detalhes HTTP

### Repository

- Única camada que usa Prisma
- Traduz consultas e persistência
- Não implementa autorização

## 4.3 Padrão Either

Todos os services devem retornar algo como:

```ts
type Either<L, R> = Left<L> | Right<R>
```

Exemplos:

- `left(new ValidationError(...))`
- `left(new UnauthorizedError(...))`
- `left(new ResourceNotFoundError(...))`
- `right({ user, token })`

Isso padroniza fluxos de erro sem lançar exceções para regras de negócio esperadas.

## 5. Plugins Fastify Necessários

### `src/plugins/prisma.ts`

- Registra o `PrismaClient`
- Conecta no bootstrap
- Fecha conexão no shutdown
- Decora `fastify.prisma`

### `src/plugins/jwt.ts`

- Registra `@fastify/jwt`
- Configura segredo via variável de ambiente
- Expõe helpers para sign/verify

### `src/plugins/auth.ts`

- Decora:
    - `authenticate`
    - `authorize(...roles)`
- Faz parse do token JWT
- Carrega claims mínimas do usuário

### `src/plugins/zod.ts`

- Centraliza integração de schemas Zod
- Gera mensagens padronizadas de erro de validação

### `src/plugins/rate-limit.ts`

- Registra `@fastify/rate-limit`
- Configuração sugerida:
    - rotas de login/register: limites mais restritivos
    - rotas autenticadas: limite por usuário/IP
    - rotas públicas: limite por IP

### `src/plugins/support.ts`

- Helpers de resposta
- Mapeamento de erros de domínio para HTTP

## 6. Variáveis de Ambiente

```env
NODE_ENV=
PORT=
HOST=
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
RATE_LIMIT_MAX=
RATE_LIMIT_TIME_WINDOW=
PASSWORD_HASH_PEPPER=
CORS_ORIGIN=
```

## 7. Modelagem de Banco de Dados

## 7.1 Enumerações

### RoleName

- `ADMIN`
- `SUBADMIN`
- `USER`

### OrderStatus

- `PENDING`
- `AWAITING_PAYMENT`
- `PAID`
- `PROCESSING`
- `SHIPPED`
- `DELIVERED`
- `CANCELLED`

### CartItemStatus

- `ACTIVE`
- `REMOVED`

## 7.2 Prisma Schema Proposto

```prisma
model Role {
    id        Int      @id @default(autoincrement())
    name      RoleName @unique
    users     User[]
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
}

model User {
    id           Int       @id @default(autoincrement())
    uuid         String    @unique @db.Uuid
    name         String
    email        String    @unique
    document     String    @unique
    passwordHash String
    isActive     Boolean   @default(true)
    roleId       Int
    role         Role      @relation(fields: [roleId], references: [id])
    addresses    Address[]
    cart         Cart?
    orders       Order[]
    createdAt    DateTime  @default(now())
    updatedAt    DateTime  @updatedAt

    @@index([roleId])
    @@index([uuid])
}

model Address {
    id           Int      @id @default(autoincrement())
    uuid         String   @unique @db.Uuid
    userId       Int
    label        String?
    recipient    String
    document     String?
    zipCode      String
    street       String
    number       String
    complement   String?
    neighborhood String
    city         String
    state        String
    country      String
    reference    String?
    isDefault    Boolean  @default(false)
    user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt

    @@index([userId])
    @@index([uuid])
}

model Product {
    id               Int      @id @default(autoincrement())
    uuid             String   @unique @db.Uuid
    name             String
    slug             String   @unique
    priceInCents     Int
    imageUrl         String
    stock            Int
    shortDescription String
    longDescription  String
    isActive         Boolean  @default(true)
    cartItems        CartItem[]
    orderItems       OrderItem[]
    createdAt        DateTime @default(now())
    updatedAt        DateTime @updatedAt

    @@index([slug])
    @@index([uuid])
    @@index([isActive])
}

model Cart {
    id         Int        @id @default(autoincrement())
    uuid       String     @unique @db.Uuid
    userId     Int        @unique
    user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
    items      CartItem[]
    createdAt  DateTime   @default(now())
    updatedAt  DateTime   @updatedAt

    @@index([uuid])
}

model CartItem {
    id                 Int            @id @default(autoincrement())
    uuid               String         @unique @db.Uuid
    cartId             Int
    productId          Int
    quantity           Int
    unitPriceInCents   Int
    productNameSnapshot String
    status             CartItemStatus @default(ACTIVE)
    cart               Cart           @relation(fields: [cartId], references: [id], onDelete: Cascade)
    product            Product        @relation(fields: [productId], references: [id])
    createdAt          DateTime       @default(now())
    updatedAt          DateTime       @updatedAt

    @@unique([cartId, productId])
    @@index([cartId])
    @@index([productId])
    @@index([uuid])
}

model Order {
    id               Int         @id @default(autoincrement())
    uuid             String      @unique @db.Uuid
    userId           Int
    addressId        Int?
    status           OrderStatus @default(PENDING)
    subtotalInCents  Int
    shippingInCents  Int         @default(0)
    discountInCents  Int         @default(0)
    totalInCents     Int
    notes            String?
    checkoutProvider String?
    checkoutReference String?
    placedAt         DateTime?
    user             User        @relation(fields: [userId], references: [id])
    address          Address?    @relation(fields: [addressId], references: [id])
    items            OrderItem[]
    createdAt        DateTime    @default(now())
    updatedAt        DateTime    @updatedAt

    @@index([userId])
    @@index([addressId])
    @@index([status])
    @@index([uuid])
}

model OrderItem {
    id                 Int      @id @default(autoincrement())
    uuid               String   @unique @db.Uuid
    orderId            Int
    productId          Int?
    productNameSnapshot String
    imageUrlSnapshot   String?
    quantity           Int
    unitPriceInCents   Int
    totalPriceInCents  Int
    order              Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
    product            Product? @relation(fields: [productId], references: [id])
    createdAt          DateTime @default(now())
    updatedAt          DateTime @updatedAt

    @@index([orderId])
    @@index([productId])
    @@index([uuid])
}

enum RoleName {
    ADMIN
    SUBADMIN
    USER
}

enum OrderStatus {
    PENDING
    AWAITING_PAYMENT
    PAID
    PROCESSING
    SHIPPED
    DELIVERED
    CANCELLED
}

enum CartItemStatus {
    ACTIVE
    REMOVED
}
```

## 7.3 Observações sobre modelagem

- O campo original `password` deve virar `passwordHash`, porque senha em texto puro não pode existir em banco.
- `uuidv7` deve ser gerado na aplicação por utilitário dedicado.
- `slug` em produto facilita rota pública e SEO para frontend.
- `Cart` é 1:1 com `User`.
- `CartItem` e `OrderItem` armazenam snapshots para preservar histórico mesmo se o produto mudar.
- `Order.addressId` é opcional para permitir evolução do checkout sem travar a fase atual.

## 8. Regras de Negócio

## 8.1 Usuários e autenticação

- Registro público sempre cria usuário com role `USER`.
- Registro público nunca aceita role enviado pelo cliente.
- Apenas `ADMIN` pode criar `ADMIN` ou `SUBADMIN`.
- `SUBADMIN` não pode criar `ADMIN`.
- Email deve ser único e normalizado para lowercase.
- Documento deve ser único e persistido em formato normalizado.
- Senha deve ser armazenada apenas como hash.
- Usuário inativo não pode autenticar.
- Login pode aceitar `email + password`.
- JWT deve carregar no mínimo:
    - `sub`: uuid do usuário
    - `role`: role atual
    - `email`
- Edição de usuário:
    - usuário comum só edita o próprio perfil
    - admin pode editar qualquer usuário
    - alteração de role apenas por admin
- Endereços pertencem a um único usuário.
- Usuário não pode editar endereço de outro usuário.
- Deve haver no máximo um endereço default por usuário.

## 8.2 Produtos

- Leitura pública permitida apenas para produtos ativos.
- CUD permitido a `ADMIN` e `SUBADMIN`.
- Nome obrigatório.
- `priceInCents` maior que zero.
- `stock` maior ou igual a zero.
- `imageUrl` deve ser URL válida.
- Remoção preferencialmente lógica via `isActive = false`, caso o produto já esteja ligado a pedido.

## 8.3 Carrinho

- Cada usuário possui um carrinho.
- Usuário autenticado gerencia apenas o próprio carrinho.
- Adicionar item:
    - se item já existir, incrementa quantidade
    - não pode exceder estoque disponível
- Quantidade deve ser maior que zero.
- Ao adicionar item, gravar `unitPriceInCents` e `productNameSnapshot`.
- Itens de carrinho de produto inativo não podem ser adicionados.
- Se estoque ficar insuficiente depois, o sistema deve sinalizar inconsistência na leitura do carrinho.

## 8.4 Pedidos

- Pedido deve pertencer a um único usuário.
- Usuário comum acessa apenas os próprios pedidos.
- Admin/Subadmin podem listar todos.
- Pedido nasce com snapshot completo dos itens.
- Não criar pedido sem itens válidos.
- Totais devem ser calculados no backend.
- `totalInCents = subtotalInCents + shippingInCents - discountInCents`.
- Cancelamento deve respeitar status atual.
- Estrutura deve permitir futura integração com checkout sem refatorar entidades centrais.

## 9. Requisitos LGPD

- Coletar apenas dados necessários para operação do ecommerce.
- Senha nunca retornada em resposta.
- Dados sensíveis devem ser minimizados em logs.
- Documento deve ser mascarado quando apropriado em respostas administrativas.
- Consentimento/ciência para uso dos dados deve existir no frontend, mas backend deve estar preparado para persistir aceite futuro se necessário.
- Endpoint de perfil deve permitir consulta dos próprios dados.
- Planejar endpoint futuro para anonimização ou desativação de conta conforme política do negócio.
- Tokens e segredos apenas via variáveis de ambiente.
- Não expor IDs internos sequenciais em contratos públicos; preferir `uuid`.

## 10. Contratos de API

Todos os endpoints devem responder em JSON. O dado de sucesso/falha deve ser explícito no HTTP StatusCode

Formato padrão sugerido:

```json
{
    "data": {},
    "metadata": {}
}
```

Erros:

```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Payload inválido",
        "details": []
    }
}
```

## 10.1 Autenticação e usuários

### `POST /auth/register`

Uso:

- Registro público
- Sempre cria role `USER`

Request:

```json
{
    "name": "Maria da Silva",
    "email": "maria@email.com",
    "document": "12345678900",
    "password": "Senha@123"
}
```

Resposta esperada `201`:

```json
{
    "data": {
        "user": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b101",
            "name": "Maria da Silva",
            "email": "maria@email.com",
            "document": "12345678900",
            "role": "USER",
            "isActive": true,
            "createdAt": "2026-03-12T10:00:00.000Z"
        },
        "token": "<jwt>"
    }
}
```

Falhas:

- `409` email já cadastrado
- `409` documento já cadastrado
- `422` payload inválido

### `POST /auth/login`

Request:

```json
{
    "email": "maria@email.com",
    "password": "Senha@123"
}
```

Resposta esperada `200`:

```json
{
    "data": {
        "user": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b101",
            "name": "Maria da Silva",
            "email": "maria@email.com",
            "role": "USER",
            "isActive": true
        },
        "token": "<jwt>"
    }
}
```

Falhas:

- `401` credenciais inválidas
- `403` usuário inativo
- `422` payload inválido

### `POST /users`

Uso:

- Criação administrativa de usuário

Autorização:

- `ADMIN`

Request:

```json
{
    "name": "Administrador",
    "email": "admin@atelie.com",
    "document": "98765432100",
    "password": "Senha@123",
    "role": "SUBADMIN"
}
```

Resposta esperada `201`:

```json
{
    "data": {
        "user": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b102",
            "name": "Administrador",
            "email": "admin@atelie.com",
            "document": "98765432100",
            "role": "SUBADMIN",
            "isActive": true
        }
    }
}
```

### `GET /users/me`

Autorização:

- usuário autenticado

Resposta esperada `200`:

```json
{
    "data": {
        "user": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b101",
            "name": "Maria da Silva",
            "email": "maria@email.com",
            "document": "12345678900",
            "role": "USER",
            "isActive": true,
            "addresses": []
        }
    }
}
```

### `PATCH /users/me`

Autorização:

- usuário autenticado

Campos permitidos:

- `name`
- `password`

Resposta esperada `200`

### `PATCH /users/:uuid`

Autorização:

- `ADMIN`

Campos permitidos:

- `name`
- `isActive`
- `role`

### `POST /users/me/addresses`

Autorização:

- usuário autenticado

Request:

```json
{
    "label": "Casa",
    "recipient": "Maria da Silva",
    "zipCode": "01001000",
    "street": "Praça da Sé",
    "number": "100",
    "complement": "Apto 10",
    "neighborhood": "Sé",
    "city": "São Paulo",
    "state": "SP",
    "country": "Brasil",
    "reference": "Próximo à catedral",
    "isDefault": true
}
```

### `GET /users/me/addresses`

Autorização:

- usuário autenticado

### `PATCH /users/me/addresses/:uuid`

Autorização:

- usuário autenticado

### `DELETE /users/me/addresses/:uuid`

Autorização:

- usuário autenticado

## 10.2 Produtos

### `GET /products`

Uso:

- Listagem pública

Query params sugeridos:

- `page`
- `pageSize`
- `search`
- `minPriceInCents`
- `maxPriceInCents`
- `inStock`

Resposta esperada `200`:

```json
{
    "data": {
        "items": [
            {
                "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b201",
                "name": "Sabonete Artesanal de Lavanda",
                "slug": "sabonete-artesanal-de-lavanda",
                "priceInCents": 2590,
                "imageUrl": "https://cdn.exemplo.com/produtos/lavanda.jpg",
                "stock": 18,
                "shortDescription": "Sabonete natural com óleo essencial de lavanda"
            }
        ],
        "pagination": {
            "page": 1,
            "pageSize": 20,
            "total": 1,
            "totalPages": 1
        }
    }
}
```

### `GET /products/:uuid`

Uso:

- Detalhe público

### `POST /products`

Autorização:

- `ADMIN`
- `SUBADMIN`

Request:

```json
{
    "name": "Terço de Madeira",
    "priceInCents": 4590,
    "imageUrl": "https://cdn.exemplo.com/produtos/terco.jpg",
    "stock": 30,
    "shortDescription": "Terço artesanal em madeira",
    "longDescription": "Terço artesanal em madeira natural, produzido manualmente."
}
```

Resposta esperada `201`

### `PATCH /products/:uuid`

Autorização:

- `ADMIN`
- `SUBADMIN`

### `DELETE /products/:uuid`

Autorização:

- `ADMIN`
- `SUBADMIN`

Comportamento sugerido:

- soft delete via `isActive = false`

## 10.3 Carrinho

### `GET /cart`

Autorização:

- usuário autenticado

Resposta esperada `200`:

```json
{
    "data": {
        "cart": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
            "items": [
                {
                    "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b302",
                    "productUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b201",
                    "name": "Sabonete Artesanal de Lavanda",
                    "quantity": 2,
                    "unitPriceInCents": 2590,
                    "totalPriceInCents": 5180,
                    "imageUrl": "https://cdn.exemplo.com/produtos/lavanda.jpg",
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

### `POST /cart/items`

Autorização:

- usuário autenticado

Request:

```json
{
    "productUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b201",
    "quantity": 2
}
```

Resposta esperada `201`

### `PATCH /cart/items/:uuid`

Autorização:

- usuário autenticado

Uso:

- altera quantidade

### `DELETE /cart/items/:uuid`

Autorização:

- usuário autenticado

Uso:

- remove item do carrinho

### `DELETE /cart/items`

Autorização:

- usuário autenticado

Uso:

- limpa carrinho inteiro

## 10.4 Pedidos

### `POST /orders`

Autorização:

- usuário autenticado

Comportamento:

- cria pedido a partir do carrinho atual
- valida estoque
- grava snapshot dos itens
- calcula subtotal e total
- opcionalmente vincula endereço

Request:

```json
{
    "addressUuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b401",
    "notes": "Entregar em horário comercial"
}
```

Resposta esperada `201`:

```json
{
    "data": {
        "order": {
            "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b501",
            "status": "PENDING",
            "subtotalInCents": 5180,
            "shippingInCents": 0,
            "discountInCents": 0,
            "totalInCents": 5180,
            "items": [
                {
                    "uuid": "0195f4aa-7f18-7db5-9f32-06f4a9a2b502",
                    "productNameSnapshot": "Sabonete Artesanal de Lavanda",
                    "quantity": 2,
                    "unitPriceInCents": 2590,
                    "totalPriceInCents": 5180
                }
            ]
        }
    }
}
```

### `GET /orders`

Autorização:

- usuário autenticado

Comportamento:

- `USER` vê apenas próprios pedidos
- `ADMIN` e `SUBADMIN` podem receber listagem ampla, preferencialmente com filtros

### `GET /orders/:uuid`

Autorização:

- usuário autenticado com restrição de ownership ou role administrativa

### `PATCH /orders/:uuid/status`

Autorização:

- `ADMIN`
- `SUBADMIN`

Uso:

- avançar ou cancelar status conforme regras

### `PATCH /orders/:uuid/cancel`

Autorização:

- usuário autenticado

Comportamento:

- permitido apenas em status definidos pela regra de negócio

## 11. Schemas Zod Recomendados

## 11.1 Autenticação

- `registerSchema`
- `loginSchema`
- `createAdminUserSchema`

Regras mínimas:

- `name`: string, mínimo 3
- `email`: email válido e normalizado
- `document`: string normalizada, tamanho conforme regra escolhida
- `password`: mínimo 8, exigir complexidade mínima

## 11.2 Produtos

- `createProductSchema`
- `updateProductSchema`
- `listProductsQuerySchema`

Regras mínimas:

- `name`: mínimo 3
- `priceInCents`: inteiro positivo
- `stock`: inteiro não negativo
- `imageUrl`: URL válida
- `shortDescription`: mínimo 10
- `longDescription`: mínimo 20

## 11.3 Carrinho

- `addCartItemSchema`
- `updateCartItemSchema`

Regras mínimas:

- `productUuid`: uuid válido
- `quantity`: inteiro positivo

## 11.4 Pedidos

- `createOrderSchema`
- `updateOrderStatusSchema`

## 12. Estratégia de Autorização

## 12.1 Helpers

- `fastify.authenticate`
- `fastify.authorize(['ADMIN'])`
- `fastify.authorize(['ADMIN', 'SUBADMIN'])`

## 12.2 Matriz de acesso

| Recurso | USER | SUBADMIN | ADMIN |
|---|---|---|---|
| Registrar conta pública | Sim | Sim | Sim |
| Fazer login | Sim | Sim | Sim |
| Editar próprio perfil | Sim | Sim | Sim |
| Editar qualquer usuário | Não | Não | Sim |
| Criar USER administrativamente | Não | Não | Sim |
| Criar SUBADMIN | Não | Não | Sim |
| Criar ADMIN | Não | Não | Sim |
| Ler produtos | Sim | Sim | Sim |
| Criar produto | Não | Sim | Sim |
| Editar produto | Não | Sim | Sim |
| Remover produto | Não | Sim | Sim |
| Gerir próprio carrinho | Sim | Sim | Sim |
| Criar pedido próprio | Sim | Sim | Sim |
| Listar todos os pedidos | Não | Sim | Sim |
| Alterar status de pedido | Não | Sim | Sim |

## 13. Estratégia de Rate Limit

Sugestão inicial:

- `POST /auth/login`: 5 requisições por minuto por IP
- `POST /auth/register`: 3 requisições por minuto por IP
- Demais rotas autenticadas: 60 requisições por minuto por usuário/IP
- Rotas públicas de leitura: 120 requisições por minuto por IP

Complementos:

- Adicionar header de rate limit
- Bloquear brute force em login
- Considerar blacklist temporária em caso de repetidas falhas

## 14. Tratamento de Erros

Mapeamento sugerido:

- `ValidationError` -> `422`
- `UnauthorizedError` -> `401`
- `ForbiddenError` -> `403`
- `ResourceNotFoundError` -> `404`
- `ConflictError` -> `409`
- `BusinessRuleError` -> `400`

Mensagens devem ser:

- claras
- sem vazar detalhes internos
- consistentes entre módulos

## 15. Critérios de Aceitação

## 15.1 Fundação

- Prisma conectado via plugin Fastify
- JWT funcional
- Rate limit funcional
- Zod validando body, params e querystring
- Services retornando `Either`
- Controllers convertendo `Either` em HTTP

## 15.2 Usuários e autenticação

- Registro público cria apenas `USER`
- Usuário não consegue se registrar como admin pelo payload
- Apenas admin cria admin/subadmin
- Login retorna token JWT válido
- Senhas armazenadas com hash
- Usuário inativo não autentica
- Usuário comum só edita o próprio perfil
- Endereços só são manipulados pelo dono

## 15.3 Produtos

- Catálogo público lista apenas itens ativos
- Admin/Subadmin conseguem criar, editar e remover
- Usuário comum não consegue CUD
- Validações impedem preço e estoque inválidos

## 15.4 Carrinho

- Usuário autenticado vê apenas o próprio carrinho
- Adicionar item respeita estoque
- Atualizar quantidade recalcula subtotal
- Remover item funciona sem afetar outros usuários

## 15.5 Pedidos

- Pedido é criado a partir do carrinho
- Snapshot dos itens é persistido
- Totais são calculados pelo backend
- Usuário acessa apenas próprios pedidos
- Admin/Subadmin conseguem gerenciar status

## 16. Estratégia de Implementação por Ordem

### Etapa 1. Infra base

- Instalar dependências:
    - Prisma
    - `@prisma/client`
    - `zod`
    - `@fastify/jwt`
    - `@fastify/rate-limit`
    - `@fastify/cors`
    - `argon2`
- Criar plugin Prisma
- Criar plugin JWT/Auth
- Criar utilitário `Either`
- Criar camada base de erros de domínio
- Criar plugin de rate limit

### Etapa 2. Migrations e seed

- Criar schema Prisma
- Criar migrations
- Criar seed de roles:
    - `ADMIN`
    - `SUBADMIN`
    - `USER`
- Opcional: seed de admin inicial controlado por env

### Etapa 3. Usuários

- Repositórios de role, user e address
- Services de register, login, edit user, create admin user
- Rotas de usuário e endereço
- Testes unitários e integração

### Etapa 4. Produtos

- Repositório de produtos
- Services de list, detail, create, update, delete
- Rotas públicas e administrativas
- Testes

### Etapa 5. Carrinho

- Repositórios de cart e cart items
- Service para obter ou criar carrinho
- Services de adicionar, atualizar, remover e limpar itens
- Testes

### Etapa 6. Pedidos

- Repositórios de pedidos e itens
- Service de criação de pedido a partir do carrinho
- Service de listagem e detalhe
- Service de atualização de status
- Testes

## 17. Estratégia de Testes

### Unitários

- Services com mocks de repositório
- Regras de autorização
- Regras de estoque
- Regras de transição de status

### Integração

- Rotas Fastify com banco de teste
- Fluxo completo:
    - register
    - login
    - create product
    - add to cart
    - create order

### Casos críticos

- tentativa de criar admin sem permissão
- login com senha inválida
- registro com email duplicado
- adição ao carrinho acima do estoque
- pedido com carrinho vazio
- acesso a recurso de outro usuário

## 18. Riscos e Decisões Importantes

- O requisito textual menciona quatro roles, mas a lista fornecida contém três: `Admin`, `Subadmin`, `User`. O planejamento assume três roles, pois são as únicas explicitadas.
- O campo `role` no model `User` e também `roleId` é redundante. O correto é manter a relação com `Role` por `roleId`; o nome da role vem da entidade relacionada.
- Para LGPD, talvez o documento precise de política de mascaramento mais forte em respostas administrativas. Isso deve ser validado com a regra de negócio.
- Checkout foi mantido como preparação estrutural, sem acoplamento prematuro com gateway.

## 19. Entregável Recomendado Após Este Planejamento

Se a implementação começar imediatamente, a primeira entrega prática deve ser:

- setup Prisma/Postgres
- plugin Prisma
- plugin JWT/Auth
- `Either`
- domínio de usuários com register/login/edit
- seed de roles
- testes da autenticação

Essa ordem reduz retrabalho e cria a fundação correta para produtos, carrinho e pedidos.
