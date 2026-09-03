# Smoke controlado do checkout em producao

Este procedimento movimenta dinheiro e pode comprar etiqueta real. Execute somente em janela
aprovada, com responsaveis tecnico, financeiro e operacional presentes. Implementacao local e
probe read-only nao autorizam execucao nem comprovam GL-050.

Nunca coloque UUID, event ID, e-mail, documento, endereco, URL de checkout/etiqueta, payload,
resposta de provedor, token ou chave idempotente em chat, ticket, log ou historico do shell. Valores
operacionais ficam no gerenciador de secrets/job restrito. Evidencia compartilhavel contem apenas
release, horario UTC, IDs/status dos checks, contagens, duracao, referencias do sistema restrito e
identidade dos aprovadores.

## Pre-condicoes e aprovacao

Antes da janela, duas pessoas conferem e registram no sistema restrito:

1. release exata; preflight, migration, backup/restore, alertas e kill switch validados;
2. janela UTC semiaberta `[inicio,fim)` com no maximo 24 horas, valor exato aprovado e limite
   financeiro;
3. uma unica conta interna ativa, produto de menor valor adequado e endereco controlado;
4. regra para receber, cancelar ou descartar pedido e etiqueta depois do teste;
5. acessos aos paineis AbacatePay, Superfrete, Resend, logs e banco com role somente leitura;
6. responsaveis por pagamento PIX, operacao logistica, reconciliacao e interrupcao;
7. inventario de outros checkouts ainda pagaveis. Conte separadamente `OrderPayment` e
   `PaymentLink` em `PENDING`, com ID e URL de checkout presentes. Registre somente contagens;
8. zero incidente financeiro/logistico aberto e canal de alerta funcional.

Checkouts ja persistidos continuam pagaveis mesmo em `ALLOWLIST` ou depois de
`CHECKOUT_ENABLED=false`. Inventario nao promete exclusividade de movimentos financeiros; ele
detecta mudanca nao explicada durante smoke.

## Isolamento da criacao

Prepare todas replicas com:

```dotenv
NODE_ENV=production
CHECKOUT_ENABLED=false
CHECKOUT_ROLLOUT_MODE=ALLOWLIST
CHECKOUT_ALLOWED_USER_UUIDS=<um unico UUID interno aprovado>
```

Confirme preflight com switch mestre desligado. No inicio aprovado, altere somente
`CHECKOUT_ENABLED=true` e recarregue todas replicas. `ALLOWLIST` permite checkout novo apenas para
pedido pertencente a essa identidade autenticada e bloqueia criacao por link publico.

Nao use tentativa negativa em producao para provar isolamento: se configuracao estiver errada, ela
criara uma cobranca adicional. Use schema de ambiente, testes da release, configuracao efetiva das
replicas e logs de criacao. Checkout existente e reconciliacao de `CREATING` nao contam como nova
criacao.

## Execucao unica

1. Registre inicio UTC e confirme painel de alertas sem anomalia.
2. Com sessao da conta interna, crie um pedido com produto/endereco aprovados e confirme frete.
3. Crie checkout uma vez, preservando a chave idempotente somente no cliente seguro.
4. No painel AbacatePay, confira `devMode=false`, valor e `externalId`; nao copie resposta integral.
5. Pague uma vez por PIX real. Nao simule webhook, nao use `app.inject` e nao assine payload manual.
6. Observe entrega oficial do webhook e transicao do pedido de `PAID` para `PROCESSING`.
7. Aguarde fulfillment e e-mail normais. Nao invoque retry manual para fazer smoke passar.
8. Confira exatamente uma cobranca, um fulfillment e uma etiqueta nos paineis e no backend.
9. Confirme recebimento do e-mail e links em dispositivo controlado.
10. Aplique imediatamente disposicao aprovada ao pedido/etiqueta e reconcilie valor financeiro.

Qualquer timeout ou resposta incerta exige consulta de estado antes de repetir. Smoke falha diante
de cobranca/etiqueta duplicada, valor divergente, webhook manual/ausente, escrita direta no banco,
retry improvisado, alerta, dado impossivel de reconciliar ou operacao fora da janela.

## Probe local read-only

Depois do fluxo, injete pelo job restrito, sem imprimir ambiente:

- `PRODUCTION_SMOKE_ORDER_UUID`;
- `PRODUCTION_SMOKE_WEBHOOK_EVENT_ID`;
- `PRODUCTION_SMOKE_EXPECTED_AMOUNT_IN_CENTS`;
- `PRODUCTION_SMOKE_APPROVED_FROM_UTC` e `PRODUCTION_SMOKE_APPROVED_TO_UTC`, ISO 8601 UTC;
- `PRODUCTION_SMOKE_EXPECTED_OTHER_PAYABLE_ORDER_CHECKOUTS`;
- `PRODUCTION_SMOKE_EXPECTED_OTHER_PAYABLE_PAYMENT_LINKS`;
- `PRODUCTION_SMOKE_EXPECTED_DATABASE_HOST`, `PRODUCTION_SMOKE_EXPECTED_DATABASE_PORT` e
  `PRODUCTION_SMOKE_EXPECTED_DATABASE_NAME`, copiados do inventario aprovado.

Mantenha tambem `NODE_ENV=production`, `CHECKOUT_ENABLED=true`, `CHECKOUT_ROLLOUT_MODE=ALLOWLIST`,
lista com exatamente uma conta e `DATABASE_URL` da role runtime/read-only. Execute:

```sh
pnpm run smoke:verify-production
```

`DATABASE_URL` deve usar protocolo PostgreSQL e conter exatamente um `sslmode`. Prefira `require`,
`verify-ca` ou `verify-full`. A excecao temporaria com `sslmode=disable`, inclusive para host
publico, exige tambem:

```env
PRODUCTION_DATABASE_ALLOW_INSECURE_INTERNAL=true
PRODUCTION_DATABASE_EXPECTED_INTERNAL_HOST=HOST_EXATO
```

Host declarado deve ser exatamente o host de `DATABASE_URL`. Preflight/probe nao prova isolamento
de rede nem criptografia. Para host publico, restrinja a porta PostgreSQL no firewall e restaure TLS
assim que possivel.

Probe abre transacao PostgreSQL
`REPEATABLE READ, READ ONLY`; esse comando e a primeira instrucao SQL. Em seguida confirma
`current_database()` contra nome aprovado antes de ler qualquer registro. Nao chama provedor,
servidor ou worker e nao altera registro. Host, porta e nome do banco precisam coincidir exatamente
com inventario esperado, sem aparecer na saida. Consultas selecionam somente escalares necessarios.
Comparacoes do JSON persistido viram booleanos dentro do banco; payload/resposta nao saem da
transacao. A excecao de transporte nao altera uso da role runtime/read-only; role de migration
continua restrita ao job separado e nunca participa do smoke.

Checks automaticos exigem:

- configuracao de producao habilitada em `ALLOWLIST`, uma conta ativa e pedido dentro da janela;
- pedido `PROCESSING`; pagamento `PAID` por `PIX`, valores iguais e vinculos provider/order exatos;
- `devMode=false`, ID, `externalId` e valores coerentes nos registros provider/webhook;
- evento `checkout.completed` processado sem erro dentro da janela;
- um `FulfillmentJob` `COMPLETED` e uma `OrderShipment` `LABEL_PURCHASED` com ID Superfrete;
- um `payment-paid:<orderUuid>` `SENT`, com um delivery `ACCEPTED`;
- contagens de outros checkouts pagaveis iguais ao inventario aprovado.

Todo horario verificado precisa ser maior ou igual ao inicio e estritamente menor que o fim. Evento
no instante exato de `PRODUCTION_SMOKE_APPROVED_TO_UTC` pertence a proxima janela e falha o probe.

Saida nunca inclui IDs, valor, datas da janela ou conteudo persistido. `AUTO_FAIL` termina com
codigo nao zero. Todos checks automaticos passando geram `MANUAL_REQUIRED`, nao `PASS`/`GO`, pois
banco nao comprova pagamento humano, entrega externa, recebimento/links do e-mail, paineis,
disposicao da etiqueta nem reconciliacao.

## Encerramento

1. Aplique `CHECKOUT_ENABLED=false` e recarregue todas replicas antes de investigar qualquer falha.
2. Preserve IDs e comprovantes somente no sistema restrito.
3. Confirme no painel AbacatePay pagamento unico e valor liquidado.
4. Confirme no Superfrete etiqueta unica e disposicao concluida.
5. Confirme no Resend/e-mail recebimento e links; status `ACCEPTED` local nao prova entrega humana.
6. Execute reconciliacao financeira para janela semiaberta aprovada e resolva toda divergencia.
7. Registre resultado, release, checks sanitizados, responsaveis e decisao `PASS` ou `FAIL` do smoke.

Mesmo `PASS` do smoke nao habilita `PUBLIC`. Proxima etapa segue `docs/CHECKOUT_CANARY.md` e exige
nova decisao.
