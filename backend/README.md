# Atelie Guadalupe Backend

Backend em Fastify para ecommerce de cosmeticos naturais, imagens catolicas e tercos.

## Stack

- Fastify 5
- TypeScript
- Prisma 7
- PostgreSQL
- MongoDB
- Zod
- JWT
- bcrypt

## Estrutura atual

- autenticacao e autorizacao por role
- usuarios e enderecos
- produtos
- carrinho
- pedidos
- storage de imagens de produtos em MongoDB/GridFS
- plugins base de JWT, Prisma, rate limit, CORS e tratamento de erro

## Scripts

- `pnpm dev`
- `pnpm start`
- `pnpm test`
- `pnpm prisma:generate`
- `pnpm prisma:migrate:dev`
- `pnpm prisma:seed`

## Ambiente

Use `.env.example` como referencia:

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/atelie_guadalupe
JWT_SECRET=change-me
JWT_EXPIRES_IN=1d
RATE_LIMIT_MAX=120
RATE_LIMIT_TIME_WINDOW=1 minute
CORS_ORIGIN=http://localhost:3000
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=atelie_guadalupe_media
MEDIA_BASE_URL=http://localhost:3000
SEED_ADMIN_EMAIL=admin@atelie.com
SEED_ADMIN_PASSWORD=Senha@123
SEED_ADMIN_DOCUMENT=00000000000
SEED_ADMIN_NAME=Admin Inicial
```

## Observacoes importantes

- O projeto usa `pnpm` como padrao.
- As migrations reais ainda nao foram executadas.
- O seed foi preparado, mas depende de um banco acessivel para ser rodado.
- O client do Prisma e gerado em `src/generated/prisma`.
- As imagens de produtos sao gravadas no MongoDB GridFS e o Postgres persiste apenas a URL resultante.

## Fluxo recomendado quando for ligar o banco

1. Configurar `DATABASE_URL`.
2. Rodar `pnpm prisma:generate`.
3. Rodar `pnpm prisma:migrate:dev`.
4. Rodar `pnpm prisma:seed`.
5. Subir a aplicacao com `pnpm dev`.

## Contratos de API

Resumo das rotas em [docs/API.md](/Users/leticia/projetos/atelie-guadalupe/backend/docs/API.md).

## Planejamento

- Escopo e arquitetura: [PLANEJAMENTO_BACKEND.md](/Users/leticia/projetos/atelie-guadalupe/backend/PLANEJAMENTO_BACKEND.md)
- Prompt base: [prompt.md](/Users/leticia/projetos/atelie-guadalupe/backend/prompt.md)
