FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml tsconfig.json prisma.config.ts ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY src ./src

RUN pnpm exec prisma generate
RUN pnpm run build:ts

FROM base AS production-deps

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

EXPOSE 3000

CMD ["pnpm", "exec", "fastify", "start", "-l", "info", "dist/app.js"]
