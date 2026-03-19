# CLAUDE.md

## Objetivo deste arquivo

Este documento serve como guia de contexto para qualquer agente ou pessoa trabalhando neste repositório. Ele resume a arquitetura atual, os padrões já adotados, as regras de negócio existentes e a forma esperada de evoluir o backend sem quebrar consistência.

## Visão geral do projeto

- Nome: Atelie Guadalupe Backend
- Tipo: backend de ecommerce
- Domínio: cosméticos naturais, imagens católicas e terços
- Stack principal:
    - Fastify 5
    - TypeScript
    - Prisma 7
    - PostgreSQL
    - MongoDB/GridFS para imagens
    - Zod
    - JWT
    - bcrypt
- Gerenciador de pacotes padrão: `pnpm`

## Estado atual do backend

O projeto já possui base funcional para:

- healthcheck
- autenticação por JWT
- autorização por role
- registro e login
- gestão do próprio usuário
- gestão de endereços do usuário autenticado
- CRUD de produtos
- carrinho
- pedidos
- storage de imagens de produtos em MongoDB/GridFS
- tratamento padronizado de erros e validações
- testes unitários e alguns testes de rota

## Comandos principais

- desenvolvimento: `pnpm dev`
- build TypeScript: `pnpm build:ts`
- produção local: `pnpm start`
- testes: `pnpm test`
- lint: `pnpm lint`
- corrigir lint: `pnpm lint:fix`
- formatar: `pnpm format`
- checar formatação: `pnpm format:check`
- gerar Prisma Client: `pnpm prisma:generate`
- migration local: `pnpm prisma:migrate:dev`
- seed: `pnpm prisma:seed`

## Variáveis de ambiente esperadas

Baseadas em `.env.example`:

- `NODE_ENV`
- `PORT`
- `HOST`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `RATE_LIMIT_MAX`
- `RATE_LIMIT_TIME_WINDOW`
- `CORS_ORIGIN`
- `MONGODB_URL`
- `MONGODB_DB_NAME`
- `MEDIA_BASE_URL`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_DOCUMENT`
- `SEED_ADMIN_NAME`

## Bootstrap da aplicação

Arquivo principal: `src/app.ts`

O app usa `@fastify/autoload` para carregar automaticamente:

- `src/plugins`
- `src/routes`

Isso significa:

- plugins devem expor decorators, hooks e infraestrutura compartilhada
- `src/routes/*` monta os prefixos públicos do backend
- a composição real dos módulos acontece nas rotas de cada domínio

## Rotas públicas montadas atualmente

Os agregadores em `src/routes` expõem:

- `/`
- `/auth`
- `/users`
- `/products`
- `/cart`
- `/orders`
- `/media`
- `/example`

Ao adicionar um novo domínio, o padrão esperado é:

1. criar o módulo em `src/modules/<dominio>`
2. criar um agregador em `src/routes/<dominio>/index.ts`
3. registrar o plugin de rotas com prefixo explícito

## Arquitetura adotada

O projeto segue arquitetura em camadas:

- `route -> controller -> service -> repository`

### Responsabilidades por camada

#### Routes

- registram endpoints Fastify
- instanciam repositories, services e controllers
- aplicam `preHandler` de autenticação/autorização
- definem o prefixo do módulo

#### Controllers

- recebem `FastifyRequest` e `FastifyReply`
- validam `body`, `params` e `query` usando `fastify.validateSchema(...)`
- chamam services
- convertem `Either` em resposta HTTP via `sendEither`
- não devem carregar regra de negócio relevante

#### Services

- concentram regra de negócio
- orquestram múltiplos repositories e integrações
- retornam `Either<AppError, Resultado>`
- não devem depender de HTTP
- devem normalizar e sanitizar dados quando necessário

#### Repositories

- são a única camada autorizada a acessar Prisma
- encapsulam consultas e escrita no banco
- não devem conter regra de autorização

## Padrão de erros

Erros de negócio usam `AppError` em `src/core/errors/app-error.ts`.

Tipos principais já existentes:

- `validation`
- `unauthorized`
- `forbidden`
- `notFound`
- `conflict`
- `business`

Os services retornam `Either`, e os controllers usam `sendEither` para transformar o resultado em payload HTTP padronizado:

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
        "code": "RESOURCE_NOT_FOUND",
        "message": "Recurso nao encontrado",
        "details": []
    }
}
```

## Padrão de validação

- toda entrada externa deve passar por Zod
- a validação é feita nos controllers com `fastify.validateSchema(...)`
- erros de Zod são tratados centralmente no plugin `src/plugins/support.ts`
- schemas ficam em `src/modules/<dominio>/schemas/*`

Não pular validação por conveniência. Se a rota recebe `body`, `params` ou `query`, o schema deve existir.

## Plugins importantes

### `src/plugins/prisma.ts`

- cria `fastify.prisma`
- exige `DATABASE_URL`
- usa `@prisma/adapter-pg`
- fecha conexão no shutdown

### `src/plugins/jwt.ts`

- registra `@fastify/jwt`
- usa `JWT_SECRET`
- usa `JWT_EXPIRES_IN`

### `src/plugins/auth.ts`

- adiciona `fastify.authenticate`
- adiciona `fastify.authorize([...roles])`
- popula `request.currentUser`

Payload JWT mínimo esperado:

```json
{
    "sub": "uuid-do-usuario",
    "email": "usuario@email.com",
    "role": "USER",
    "name": "Nome"
}
```

### `src/plugins/zod.ts`

- adiciona `fastify.validateSchema`

### `src/plugins/support.ts`

- adiciona `fastify.getNow()`
- centraliza tratamento de erro HTTP

### `src/plugins/mongodb.ts`

- conecta no Mongo quando `MONGODB_URL` e `MONGODB_DB_NAME` estão definidos
- expõe `fastify.imageStorage`
- usa GridFS com bucket `product-images`

### Outros plugins ativos

- `cors`
- `rate-limit`
- `sensible`

## Modelo de dados atual

Definido em `prisma/schema.prisma`.

### Enums

- `RoleName`: `ADMIN`, `SUBADMIN`, `USER`
- `OrderStatus`: `PENDING`, `AWAITING_PAYMENT`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`
- `CartItemStatus`: `ACTIVE`, `REMOVED`

### Entidades principais

- `Role`
- `User`
- `Address`
- `Product`
- `ProductLine`
- `Cart`
- `CartItem`
- `Order`
- `OrderItem`

## Regra atual de produtos e precificacao

- todo produto pertence a uma linha
- a linha concentra o campo `pricePerGramInCents`
- o produto nao possui mais preco proprio salvo no banco
- os tamanhos disponiveis sao fixos: `70g` e `100g`
- o backend calcula o preco final a partir de `pricePerGramInCents * gramas`
- o carrinho e o pedido armazenam o tamanho escolhido e o `unitPriceInCents` calculado no momento da operacao
- a API publica de produtos deve expor os precos calculados por tamanho, nao um preco unico fixo

### Convenções de modelagem

- IDs internos numéricos
- UUID externo em praticamente todas as entidades expostas
- `createdAt` e `updatedAt` em todas as tabelas
- valores monetários sempre em centavos
- produtos usam `slug` único
- pedidos congelam snapshot do item no momento da compra

## Regras de negócio já implementadas

### Auth e usuários

- registro público sempre cria usuário com role `USER`
- login bloqueia usuário inativo
- apenas `ADMIN` pode criar usuários gerenciados via `/users`
- `ADMIN` pode criar `ADMIN`, `SUBADMIN` e `USER`
- atualização de perfil próprio permite mudar `name` e `password`
- email e documento são normalizados antes de persistir

### Endereços

- endereço pertence a um único usuário
- usuário só pode listar, editar e remover os próprios endereços
- quando um endereço é marcado como default, os demais do usuário são desmarcados
- exclusão de endereço é hard delete

### Produtos

- listagem e detalhe são públicos
- criação, edição e remoção exigem `ADMIN` ou `SUBADMIN`
- produto usa soft delete com `isActive = false`
- nome gera `slug`
- `slug` não pode colidir
- imagem do produto é armazenada via `imageStorage`
- ao trocar imagem, a antiga é removida do storage

### Carrinho

- cada usuário tem um carrinho
- o carrinho é criado sob demanda na primeira leitura/operação
- só produtos ativos podem entrar no carrinho
- quantidade não pode exceder estoque
- se o produto já existe no carrinho, a quantidade é incrementada
- limpar carrinho remove itens

### Pedidos

- pedido nasce a partir do carrinho
- não pode criar pedido com carrinho vazio
- pedido falha se houver item inativo ou estoque insuficiente
- o pedido salva snapshot de nome, imagem e preço
- após criar pedido, os itens do carrinho são removidos
- usuário comum só enxerga os próprios pedidos
- `ADMIN` e `SUBADMIN` podem listar todos
- apenas `ADMIN` e `SUBADMIN` podem alterar status
- usuário pode cancelar apenas em certos status

### Transições de status de pedido

- `PENDING -> AWAITING_PAYMENT | CANCELLED`
- `AWAITING_PAYMENT -> PAID | CANCELLED`
- `PAID -> PROCESSING | CANCELLED`
- `PROCESSING -> SHIPPED`
- `SHIPPED -> DELIVERED`
- `DELIVERED` sem transição
- `CANCELLED` sem transição

## Convenções de código observadas

- indentação de 4 espaços
- nomes de arquivos em kebab-case
- classes para controllers, services e repositories
- métodos públicos em controllers definidos como arrow functions
- uso consistente de `public constructor(...)`
- imports absolutos internos não são usados; o projeto prefere caminhos relativos
- mensagens de erro e textos do domínio estão em português
- respostas HTTP seguem `{ success, data }` e `{ success, error }`
- presenters transformam entidades em payloads de saída

## Funções utilitárias relevantes

Em `src/core/utils`:

- `email.ts`: normalização de email
- `document.ts`: normalização de documento
- `slug.ts`: geração de slug
- `uuid.ts`: geração de UUID

Em `src/core/security`:

- `password.ts`: hash e verificação de senha
- `jwt-user-payload.ts`: contrato do payload JWT

## Estratégia de testes atual

Os testes ficam em `test/` e usam:

- `node:test`
- `assert`
- mocks manuais simples
- `fastify-cli/helper.js` para subir app em testes de rota

Cobertura atual mais visível:

- rota raiz
- service de autenticação
- service de produtos
- service de carrinho
- service de pedidos

Ao adicionar regra de negócio nova:

1. priorize teste de service
2. adicione teste de rota quando houver comportamento HTTP específico
3. mantenha os mocks pequenos e explícitos

## Como implementar novas features neste repositório

### Para um novo endpoint em domínio existente

1. criar ou ajustar schema Zod
2. adicionar método no service com retorno `Either<AppError, ...>`
3. adicionar/ajustar acesso no repository, se necessário
4. expor método no controller validando a entrada
5. registrar rota com `preHandler` adequado
6. criar presenter se o payload crescer ou precisar de formatação
7. escrever testes da regra de negócio

### Para um novo domínio

1. criar pasta em `src/modules/<dominio>/`
2. criar `schemas`, `repositories`, `services`, `controllers`, `routes`
3. criar agregador em `src/routes/<dominio>/index.ts`
4. manter o padrão de instanciação manual nas rotas
5. registrar autenticação/autorização apenas onde fizer sentido

## Cuidados importantes ao editar

- não acessar Prisma diretamente fora de repository
- não mover regra de negócio para controller
- não retornar entidades do Prisma cruas quando já existe presenter
- não lançar exceções para erros de negócio esperados; retornar `left(AppError...)`
- não quebrar o contrato de resposta HTTP já documentado
- não introduzir valores monetários em decimal
- não expor ID interno numérico para clientes quando o padrão é UUID
- ao mexer em produto, considerar impacto no storage da imagem
- ao mexer em pedido, preservar a lógica de snapshot

## Limitações e pontos de atenção atuais

- o README cita que migrations reais ainda não foram executadas
- o seed depende de banco acessível
- o plano original sugeria `argon2`, mas a implementação atual usa `bcrypt`
- há referência histórica a um `PLANEJAMENTO_BACKEND.md` na raiz, mas o arquivo presente está em `prompts/PLANEJAMENTO_BACKEND.md`
- alguns testes assumem mocks parciais; ao endurecer contratos, vale revisar a suíte

## Fonte de verdade para contexto adicional

Consultar primeiro:

- `README.md`
- `docs/API.md`
- `prompts/PLANEJAMENTO_BACKEND.md`
- `prisma/schema.prisma`

Arquivos especialmente úteis para entender padrões:

- `src/modules/auth/routes/auth-routes.ts`
- `src/modules/users/routes/user-routes.ts`
- `src/modules/products/services/product-service.ts`
- `src/modules/orders/services/order-service.ts`
- `src/plugins/support.ts`
- `src/core/http/send-either.ts`

## Instruções recomendadas para futuras sessões

- Preserve a arquitetura em camadas já adotada.
- Use Zod em toda entrada externa.
- Retorne `Either<AppError, T>` nos services.
- Centralize persistência em repositories.
- Mantenha textos de domínio e erros em português.
- Siga o formato padronizado de resposta HTTP.
- Ao criar funcionalidades novas, atualize testes e documentação quando o contrato externo mudar.
