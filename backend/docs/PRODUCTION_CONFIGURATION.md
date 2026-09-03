# Revisao final da configuracao de producao

Este procedimento valida parte da configuracao sem chamar AbacatePay, Superfrete, Resend ou outro
provedor. Ele consulta somente metadados de privilegios do PostgreSQL com a mesma `DATABASE_URL` da
aplicacao. Nao inicia servidor, worker, cobranca, webhook, e-mail ou etiqueta.

Nunca copie valores, URLs com credenciais, tokens, documentos, payloads ou hashes de segredo para
chat, ticket, documento ou log. Evidencia permitida: release, horario UTC, nomes/status dos checks e
identidade dos dois revisores.

## Preflight automatico

No gerenciador de configuracao da release, antes de aceitar trafego:

1. configure `NODE_ENV=production`, `CHECKOUT_ENABLED=false`,
   `CHECKOUT_ROLLOUT_MODE=ALLOWLIST` e uma lista interna aprovada em
   `CHECKOUT_ALLOWED_USER_UUIDS`;
2. use a credencial de runtime em `DATABASE_URL`, nunca a role de migration;
3. declare explicitamente `FULFILLMENT_WORKER_ENABLED`, `EMAIL_WORKER_ENABLED` e
   `SHIPPING_TRACKING_WORKER_ENABLED` em cada replica; use `true` somente onde planejado;
4. execute `pnpm run config:verify-production` no contexto da release, sem imprimir o ambiente;
5. corrija qualquer `AUTO_FAIL`; nao prossiga para revisao manual enquanto ele existir.

`DATABASE_URL` deve preferir TLS por `sslmode=require`, `verify-ca` ou `verify-full`. Enquanto TLS
nao estiver operacional, uma excecao explicita permite `sslmode=disable` somente para o host exato
declarado:

```env
DATABASE_URL=postgresql://RUNTIME_USER:SECRET@HOST_EXATO:5432/PRODUCTION_DB_NAME?sslmode=disable
PRODUCTION_DATABASE_ALLOW_INSECURE_INTERNAL=true
PRODUCTION_DATABASE_EXPECTED_INTERNAL_HOST=HOST_EXATO
```

O opt-in aceita host publico, mas nao fornece criptografia nem autenticacao do servidor. Restrinja
a porta PostgreSQL no firewall aos IPs necessarios e trate isso como configuracao temporaria. Quando
TLS estiver operacional, remova as duas variaveis de excecao e troque o `sslmode`.

Validacao automatica confirma opt-in e igualdade do host; nao prova topologia,
firewall ou ausencia de exposicao. Duas pessoas devem revisar esses pontos diretamente no
Easypanel. O probe read-only bloqueia role superuser, `CREATEROLE`, `CREATEDB`, replicacao,
`BYPASSRLS`, ownership do banco/schema/tabelas e `CREATE` no banco ou schema `public`; exige
`USAGE` no schema. Job separado de migration pode receber temporariamente role mais privilegiada.
Essa credencial nao pode chegar ao processo da aplicacao, inclusive na excecao interna.

Saida possui somente IDs e estados:

- `AUTO_PASS`: check verificavel passou;
- `AUTO_FAIL`: check verificavel falhou ou probe do banco nao terminou;
- `MANUAL_REQUIRED`: painel, inventario ou segunda pessoa ainda precisa confirmar.

Status global nunca sera `AUTO_PASS`. Sem falha automatica, sera `MANUAL_REQUIRED`; isso nao e
decisao `GO`.

## Revisao manual por duas pessoas

Ambas conferem diretamente no deploy, secret manager e paineis, sem transcrever valores:

1. inventario confirma banco de producao e grants DML estritamente necessarios da role de runtime;
   se usar excecao sem TLS, confirma host exato e firewall restrito; em rede privada, confirma
   tambem que somente servicos autorizados compartilham a rede;
2. `JWT_SECRET` possui pelo menos 32 bytes, foi gerado aleatoriamente para producao e nao e
   reutilizado em outro ambiente ou servico;
3. `CORS_ORIGIN` lista somente origens aprovadas e inclui origem de `FRONTEND_URL`;
4. AbacatePay usa `https://api.abacatepay.com/v2`, chave de producao e
   `ABACATEPAY_EXPECTED_DEV_MODE=false`;
5. URLs de retorno/conclusao usam HTTPS e origem do frontend;
6. webhook v2 de producao aponta ao endpoint HTTPS `/webhooks/abacatepay`, possui secret exclusivo,
   `devMode=false` e somente eventos `checkout.completed`, `checkout.refunded`,
   `checkout.disputed` e `checkout.lost`;
7. Superfrete usa `https://api.superfrete.com/api/v0`,
   `SUPERFRETE_EXPECTED_ENVIRONMENT=production`, token de producao e user agent aprovado;
8. numero de replicas vezes flags habilitadas corresponde a concorrencia planejada dos workers;
9. Resend confirma dominio, `EMAIL_FROM` e `EMAIL_REPLY_TO`; envie teste somente na fase autorizada;
10. amostra do agregador de logs confirma ausencia de query string, tokens, secrets, documentos,
    enderecos, e-mails e corpos de resposta dos provedores;
11. `CHECKOUT_ENABLED=false` permanece aplicado em todas replicas ate inicio controlado do smoke;
12. `CHECKOUT_ROLLOUT_MODE=ALLOWLIST` possui no maximo 100 UUIDs internos, sem repeticao. Modo
    `PUBLIC` e lista residual sao proibidos antes da liberacao total.

Procedimento de expansao e evidencia: `docs/CHECKOUT_CANARY.md`. Preflight exige inicio em
`ALLOWLIST`; mudanca posterior para `PUBLIC` depende do gate GL-051.

Documentacao oficial revisada ate 2026-09-03:

- AbacatePay API v2: `https://docs.abacatepay.com/pages/reference/introduction`;
- seguranca de webhook: `https://docs.abacatepay.com/pages/webhooks/security`;
- cadastro/lista de eventos: `https://docs.abacatepay.com/pages/webhooks/create`;
- Superfrete: `https://superfrete.readme.io/reference/primeiros-passos`.
- Easypanel Postgres: `https://easypanel.io/docs/services/postgres`.

## Evidencia e bloqueio

Registre apenas lista dos checks, resultado, release, horario e revisores na tabela de go-live. Se
painel, deploy, banco de producao ou segunda pessoa estiver indisponivel, resultado permanece
`BLOCKED`/`MANUAL_REQUIRED`. Validacao local com valores ficticios nao substitui essa evidencia.
