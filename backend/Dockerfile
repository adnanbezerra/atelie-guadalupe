# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch --frozen-lockfile

FROM deps AS build

COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline

COPY src ./src

RUN pnpm exec prisma generate
RUN pnpm run build:ts

FROM build AS migrate

ENV NODE_ENV=production

CMD ["pnpm", "run", "prisma:migrate:deploy"]

FROM build AS seed

ENV NODE_ENV=production

CMD ["pnpm", "run", "prisma:seed"]

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV HOST=0.0.0.0
ENV PORT=3000
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --from=build --chown=node:node /app/tsconfig.json ./tsconfig.json
COPY --chown=node:node package.json ./

USER node

EXPOSE 80

CMD ["sh", "-c", "pnpm exec fastify start --address \"$HOST\" --port \"$PORT\" -l info dist/app.js"]
