# E2E do checkout em sandbox

Esta suite valida o fluxo completo do backend usando os ambientes de teste dos provedores:

1. autentica o administrador de seed e limpa o carrinho;
2. consulta uma cotacao publica da Superfrete;
3. cria o pedido e confirma o frete definitivo;
4. cria o checkout hospedado da AbacatePay e repete a chamada com a mesma `Idempotency-Key`;
5. consulta o checkout na AbacatePay e exige `devMode: true`;
6. envia duas vezes um evento `checkout.completed` com HMAC valido;
7. confirma que o pedido ficou pago e que somente um fulfillment foi criado;
8. reprocessa o fulfillment e exige etiqueta comprada no sandbox da Superfrete.

## Credenciais de teste da Superfrete

A Superfrete possui sandbox e token proprio, separado da producao. Gere o token em [Integracoes do sandbox](https://sandbox.superfrete.com/#/integrations) e use:

```env
SUPERFRETE_BASE_URL=https://sandbox.superfrete.com/api/v0
SUPERFRETE_TOKEN=<token-do-sandbox>
SUPERFRETE_USER_AGENT=Atelie Guadalupe Backend (tech@atelieguadalupe.com)
```

A carteira do sandbox precisa de saldo ficticio para comprar a etiqueta. Na interface do sandbox, adicione saldo por PIX e conclua a simulacao. Etiquetas geradas ali nao sao validas para postagem real. Consulte os [primeiros passos oficiais da Superfrete](https://superfrete.readme.io/reference/primeiros-passos).

A suite falha imediatamente se `SUPERFRETE_BASE_URL` nao apontar exatamente para o sandbox.

## AbacatePay

Use uma chave de API de desenvolvimento. Como o checkout hospedado nao oferece uma operacao documentada para simular o pagamento, a suite:

- cria e consulta um checkout real na API;
- exige que o provedor retorne `devMode: true`;
- injeta no backend um webhook sintetico, assinado com a chave HMAC configurada.

Assim, o contrato externo de criacao do checkout e o processamento integral do webhook sao testados sem confirmar artificialmente uma cobranca de producao.

## Preparacao

O PostgreSQL deve estar migrado e o seed deve existir. O administrador de seed precisa ter um endereco completo cadastrado. Configure um arquivo `.env` ou exporte:

```env
DATABASE_URL=postgresql://...
CHECKOUT_E2E_ALLOW_DATABASE_WRITES=true
SEED_ADMIN_EMAIL=admin@atelie.com
SEED_ADMIN_PASSWORD=...
ABACATEPAY_BASE_URL=https://api.abacatepay.com/v2
ABACATEPAY_API_KEY=...
ABACATEPAY_WEBHOOK_SECRET=...
ABACATEPAY_EXPECTED_DEV_MODE=true
SUPERFRETE_BASE_URL=https://sandbox.superfrete.com/api/v0
SUPERFRETE_TOKEN=...
SUPERFRETE_USER_AGENT=Atelie Guadalupe Backend (tech@atelieguadalupe.com)
```

Execute:

```bash
pnpm run test:e2e:checkout
```

A suite e opt-in. Nos testes normais ela aparece como ignorada e nao chama provedores externos. O comando dedicado define `RUN_CHECKOUT_E2E=true`.

`CHECKOUT_E2E_ALLOW_DATABASE_WRITES=true` e uma confirmacao explicita de que `DATABASE_URL`
aponta para banco descartavel de desenvolvimento, teste ou staging. A suite tambem recusa
`NODE_ENV=production`, chave AbacatePay sem prefixo `abc_dev_` e qualquer URL Superfrete fora do
sandbox antes de construir a aplicacao ou chamar provedores.

## Diagnostico de falhas

- `Usuario E2E precisa ter endereco completo`: cadastre o endereco no administrador de seed.
- checkout sem `devMode`: troque a chave AbacatePay por uma chave de desenvolvimento.
- nenhuma cotacao: confira CEP do endereco, dimensoes do produto, token e servicos habilitados.
- fulfillment nao concluido: a mensagem inclui o ultimo erro da Superfrete; confira principalmente saldo da carteira sandbox.
- resposta sem protocolo, rastreio ou etiqueta: consulte a operacao criada no painel sandbox antes de repetir o teste.

O teste cria dados persistentes nos dois sandboxes. Ele nao reutiliza pedidos de uma execucao anterior.
