# Preparacao do ambiente de staging do checkout

## Objetivo e estado

Staging deve reproduzir validacoes fail-closed do backend de producao usando exclusivamente dados,
segredos e provedores nao produtivos. Deploy de producao existe; ambiente de staging ainda precisa
ser criado.

Use `NODE_ENV=production` no processo de staging. O projeto nao possui modo `staging` no schema de
ambiente, e `production` ativa validacoes de TLS, URLs publicas, workers, observabilidade e modos
esperados dos provedores.

Staging nao pode compartilhar banco, MongoDB, JWT, webhook secret, chaves ou tokens com producao.

## Acessos e informacoes necessarios

Compartilhar somente metadados nao sensiveis:

- URL publica HTTPS do backend;
- URL publica HTTPS do frontend;
- plataforma/projeto de deploy;
- acesso read-only aos deploy logs;
- host, porta e nome do PostgreSQL, sem usuario/senha;
- confirmacao das roles de migration e runtime;
- mecanismo autorizado para executar migrations;
- nome do database MongoDB de staging;
- confirmacao de que credenciais sandbox/dev foram configuradas;
- UUID do usuario interno de staging;
- URL do agregador de logs;
- responsavel tecnico e operacional;
- mecanismo para alterar flags e reiniciar todas as replicas.

Secrets devem ficar no secret manager da plataforma. Nunca enviar `DATABASE_URL`, tokens, API
keys, webhook secret, JWT ou credenciais MongoDB em chat, ticket ou logs.

## PostgreSQL

Criar banco exclusivo. Preferir dados sinteticos com volume representativo. Clone de producao so e
aceitavel depois de sanitizacao verificavel de PII.

Conexao runtime:

```env
DATABASE_URL=postgresql://RUNTIME_USER:SECRET@STAGING_DB_HOST:5432/STAGING_DB_NAME?sslmode=verify-full
```

Requisitos:

- protocolo `postgresql:` ou `postgres:`;
- exatamente um `sslmode`;
- preferir `verify-full`; `verify-ca` e aceitavel; `require` e minimo permitido;
- nunca usar `sslmode=disable`;
- backup/snapshot antes de migration relevante;
- acesso read-only posterior para evidencias de webhook e migrations.

Separar roles:

- migration role: DDL/schema, usada somente pelo job `prisma:migrate:deploy`;
- runtime role: DML e sequences estritamente necessarios;
- runtime sem `SUPERUSER`, `CREATEDB`, `CREATEROLE`, replication ou `BYPASSRLS`;
- runtime sem ownership do banco/schema/tabelas;
- runtime sem `CREATE` no banco ou schema `public`, mas com `USAGE` e grants DML necessarios.

O `prisma.config.ts` atual le somente `DATABASE_URL`. No job de migration, injetar temporariamente
a URL da migration role. No servico implantado, `DATABASE_URL` deve voltar a ser a runtime role.
Nunca disponibilizar credencial de migration ao processo da aplicacao.

Sequencia:

```sh
pnpm run prisma:generate
pnpm exec prisma migrate status
pnpm run prisma:migrate:deploy
pnpm exec prisma migrate status
```

Nunca escrever migration manualmente, editar migration aplicada, alterar `_prisma_migrations` ou
usar `prisma migrate resolve` como atalho.

## MongoDB e midia

```env
MONGODB_URL=mongodb+srv://STAGING_USER:SECRET@STAGING_MONGO_HOST/
MONGODB_DB_NAME=atelie_guadalupe_staging
MEDIA_BASE_URL=https://media-staging.example.com
```

`MEDIA_BASE_URL` e opcional, mas recomendado. Database/collections e storage de staging nao podem
ser compartilhados com producao.

## URLs publicas e CORS

Todas devem usar HTTPS. URLs de retorno, conclusao e payment-link precisam ter mesma origin de
`FRONTEND_URL`. `CORS_ORIGIN` aceita lista separada por virgula, contendo somente origins, sem path.

```env
FRONTEND_URL=https://staging.example.com
CORS_ORIGIN=https://staging.example.com

ABACATEPAY_RETURN_URL=https://staging.example.com/checkout
ABACATEPAY_COMPLETION_URL=https://staging.example.com/checkout/success
PAYMENT_LINK_PUBLIC_BASE_URL=https://staging.example.com/checkout/manual
```

Backend esperado:

```text
https://api-staging.example.com
```

Webhook esperado no painel AbacatePay dev:

```text
https://api-staging.example.com/webhooks/abacatepay?webhookSecret=<secret-no-painel>
```

Nao registrar URL completa do webhook em logs porque query contem secret.

## Configuracao base

```env
NODE_ENV=production
PORT=3000

JWT_SECRET=<aleatorio-exclusivo-staging-minimo-32-bytes>
JWT_EXPIRES_IN=1d
RATE_LIMIT_MAX=120
RATE_LIMIT_TIME_WINDOW=1 minute
```

`PORT` pode ser substituida pela porta fornecida pela plataforma. JWT nao pode ser reutilizado em
desenvolvimento ou producao.

## AbacatePay desenvolvimento

```env
ABACATEPAY_BASE_URL=https://api.abacatepay.com/v2
ABACATEPAY_API_KEY=<chave-abc_dev_-exclusiva>
ABACATEPAY_WEBHOOK_SECRET=<secret-exclusivo-staging>
ABACATEPAY_EXPECTED_DEV_MODE=true
ABACATEPAY_TIMEOUT_MS=15000
ABACATEPAY_RECONCILIATION_MAX_RECORDS=100000
ABACATEPAY_RECONCILIATION_MAX_PAGES=2000
FINANCIAL_RECONCILIATION_MAX_LOCAL_RECORDS=100000
FINANCIAL_RECONCILIATION_MAX_LOCAL_PAGES=2000
```

Configurar eventos:

- `checkout.completed`;
- `checkout.refunded`;
- `checkout.disputed`;
- `checkout.lost`.

O backend exige query secret e `X-Webhook-Signature` valida sobre corpo raw. Webhook com
`devMode` diferente de `true` deve falhar fechado.

## Superfrete sandbox

```env
SUPERFRETE_BASE_URL=https://sandbox.superfrete.com/api/v0
SUPERFRETE_TOKEN=<token-sandbox-exclusivo>
SUPERFRETE_USER_AGENT=Atelie Guadalupe Staging (email-tecnico)
SUPERFRETE_EXPECTED_ENVIRONMENT=sandbox
SUPERFRETE_SERVICE_CODES=1,2,17
SUPERFRETE_TIMEOUT_MS=15000
```

Nunca usar token ou URL Superfrete de producao.

## Checkout e rollout

### Bootstrap sem usuario interno

Se usuario ainda nao existe:

```env
CHECKOUT_ENABLED=false
CHECKOUT_ROLLOUT_MODE=PUBLIC
CHECKOUT_ALLOWED_USER_UUIDS=
```

Master `false` impede toda nova cobranca. Esse estado serve somente para migrar, subir aplicacao e
criar/identificar usuario de staging.

### Estado seguro depois de obter UUID

```env
CHECKOUT_ENABLED=false
CHECKOUT_ROLLOUT_MODE=ALLOWLIST
CHECKOUT_ALLOWED_USER_UUIDS=<uuid-do-usuario-interno-staging>
```

Antes do teste externo, ativar somente depois de revisar config:

```env
CHECKOUT_ENABLED=true
CHECKOUT_ROLLOUT_MODE=ALLOWLIST
CHECKOUT_ALLOWED_USER_UUIDS=<uuid-do-usuario-interno-staging>
```

`ALLOWLIST` bloqueia nova criacao por payment-link publico. Checkouts ja persistidos continuam
consultaveis/pagaveis; fechar gate nao cancela cobranca existente.

## Workers

Primeiro deploy:

```env
FULFILLMENT_WORKER_ENABLED=false
EMAIL_WORKER_ENABLED=false
SHIPPING_TRACKING_WORKER_ENABLED=false

FULFILLMENT_WORKER_INTERVAL_MS=30000
FULFILLMENT_WORKER_LOCK_TIMEOUT_MS=300000
FULFILLMENT_WORKER_MAX_ATTEMPTS=8
FULFILLMENT_TRANSACTION_TIMEOUT_MS=70000

EMAIL_WORKER_INTERVAL_MS=15000
EMAIL_WORKER_LOCK_TIMEOUT_MS=300000

SHIPPING_TRACKING_WORKER_INTERVAL_MS=60000
SHIPPING_TRACKING_POLL_INTERVAL_MS=600000
SHIPPING_TRACKING_LOCK_TIMEOUT_MS=300000
```

GL-021 deve comecar com fulfillment desligado. Webhook autentico pode criar exatamente um job sem
comprar etiqueta. Em etapa posterior e aprovada, habilitar fulfillment com Superfrete sandbox e
confirmar etiqueta unica.

## E-mail

Mesmo com worker inicialmente desligado, validacao exige configuracao:

```env
RESEND_API_KEY=<chave-staging>
EMAIL_FROM=Atelie Guadalupe Staging <staging@dominio-validado>
EMAIL_REPLY_TO=<email-controlado>
EMAIL_WORKER_ENABLED=false
```

Usar dominio/remetente de staging ou destinatarios controlados. Nunca enviar para clientes reais.

## Observabilidade

```env
CHECKOUT_OBSERVABILITY_ENABLED=true
CHECKOUT_OBSERVABILITY_INTERVAL_MS=60000
PAYMENT_PENDING_ALERT_MINUTES=30

CHECKOUT_ALERT_CHANNEL=staging-checkout
CHECKOUT_ALERT_OWNER=<responsavel>
CHECKOUT_LOG_QUERY_URL=https://logs.example.com/staging-checkout
CHECKOUT_RUNBOOK_URL=https://github.com/ORGANIZACAO/REPOSITORIO/blob/main/backend/docs/CHECKOUT_RUNBOOK.md
```

URLs precisam ser HTTPS, publicamente enderecaveis e sem token/query sensivel. Acesso ao conteudo
pode continuar protegido por autenticacao da plataforma.

## Seed

Seed e operacao de escrita e nao deve rodar automaticamente em todo deploy. Se utilizado uma vez:

```env
SEED_ADMIN_EMAIL=<email-staging>
SEED_ADMIN_PASSWORD=<secret-staging>
SEED_ADMIN_DOCUMENT=<documento-ficticio-valido-para-staging>
SEED_ADMIN_NAME=<nome-staging>
```

Depois:

```sh
pnpm run prisma:seed
```

Confirmar que seed nao aponta para producao. Obter UUID do usuario criado e migrar rollout para
`ALLOWLIST` antes de habilitar checkout.

## Ordem operacional

1. Criar PostgreSQL, MongoDB e storage exclusivos.
2. Configurar secrets no secret manager.
3. Gerar Prisma Client e executar build.
4. Conferir `prisma migrate status` com migration role.
5. Criar backup/snapshot inicial.
6. Executar `prisma:migrate:deploy`.
7. Conferir status novamente e observar tempo/locks.
8. Executar seed uma vez, se necessario.
9. Obter UUID do usuario interno.
10. Trocar processo para runtime role.
11. Implantar com checkout e todos workers desligados.
12. Configurar `ALLOWLIST` e reiniciar todas replicas.
13. Confirmar DNS, HTTPS, CORS, logs e redacao de secrets.
14. Registrar webhook dev da AbacatePay.
15. Habilitar checkout somente para usuario interno.
16. Provar entrega externa e idempotencia do webhook.
17. Habilitar fulfillment somente na etapa Superfrete sandbox aprovada.
18. Registrar evidencia sem PII/secrets e voltar `CHECKOUT_ENABLED=false` ao terminar.

## Validacoes

Antes de aceitar staging:

```sh
pnpm run prisma:generate
pnpm run build:ts
pnpm run lint
pnpm test
pnpm exec prisma migrate status
```

`pnpm run config:verify-production` nao e preflight de staging: ele exige AbacatePay e Superfrete
de producao e deve retornar `AUTO_FAIL` para sandbox/dev. Em staging, usar validacao de startup,
`prisma migrate status` e este checklist. Um `config:verify-staging` dedicado pode ser criado em
trabalho posterior.

## Criterios para desbloquear GL-021/GL-040

- deploy staging HTTPS acessivel;
- certificado e DNS validos;
- banco exclusivo migrado e status limpo;
- migration executada primeiro em staging com tempo/locks registrados;
- webhook AbacatePay dev entregue externamente, sem `app.inject` ou chamada manual;
- query secret e assinatura HMAC validados;
- retry/redelivery oficial idempotente;
- `PaymentWebhookEvent.processedAt` preenchido e `error` nulo;
- exatamente um pedido/pagamento/job local;
- fulfillment desligado durante prova inicial;
- logs sem tokens, documentos, enderecos, e-mails ou payloads;
- responsaveis tecnico e operacional identificados.

## Rollback staging

1. `CHECKOUT_ENABLED=false` em todas replicas.
2. Manter workers desligados se houver incerteza financeira/logistica.
3. Reverter aplicacao para release compativel com schema atual.
4. Preservar schema aditivo e dados para diagnostico.
5. Preferir migration corretiva gerada pelo Prisma; nunca migration manual.
6. Restaurar backup somente em banco isolado, nunca sobre banco ativo sem aprovacao.
7. Reconciliar checkouts/webhooks/jobs/etiquetas antes de reativar.
