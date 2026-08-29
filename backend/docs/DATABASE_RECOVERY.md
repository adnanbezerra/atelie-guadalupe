# Backup, restauracao e rollback do checkout

Procedimento operacional para PostgreSQL. Nunca cole `DATABASE_URL`, dump, dados pessoais ou
credenciais em chat, ticket ou log. Backup deve permanecer criptografado no armazenamento aprovado,
com acesso minimo, retencao definida e checksum registrado fora do arquivo.

## Verificacao automatizada em banco de teste

Pre-requisitos: PostgreSQL client compativel (`pg_dump`, `pg_restore`, `createdb`, `dropdb`), role
capaz de criar bancos temporarios no mesmo servidor e banco fonte cujo nome termina em `_test`.
Script exige `NODE_ENV=test` e falha fechado se opt-in faltar ou banco, host e porta esperados
divergirem. Os tres valores esperados devem ser fornecidos independentemente; nao os derive de
`DATABASE_URL` no mesmo comando.

```sh
NODE_ENV=test \
CHECKOUT_DB_RESTORE_VERIFY_ALLOW_DATABASE_WRITES=true \
CHECKOUT_DB_RESTORE_VERIFY_EXPECTED_SOURCE_DATABASE="$EXPECTED_TEST_DATABASE" \
CHECKOUT_DB_RESTORE_VERIFY_EXPECTED_SOURCE_HOST="$EXPECTED_TEST_DATABASE_HOST" \
CHECKOUT_DB_RESTORE_VERIFY_EXPECTED_SOURCE_PORT="$EXPECTED_TEST_DATABASE_PORT" \
pnpm run db:verify-backup
```

Configure `EXPECTED_TEST_DATABASE`, `EXPECTED_TEST_DATABASE_HOST` e
`EXPECTED_TEST_DATABASE_PORT` por inventario autorizado, nao por parsing da URL. A porta efetiva e
`5432` quando `DATABASE_URL` nao declara outra. Para manter mesma semantica de conexao, script
propaga parametros libpq suportados (`sslmode`, certificados/chaves SSL, CRL, channel binding,
timeout, options, application name e target session attrs), ignora somente parametros exclusivos
do Prisma e rejeita qualquer parametro desconhecido.

Fluxo executado:

1. abre transacao read-only e exporta snapshot consistente;
2. gera dump custom em diretorio temporario privado e valida arquivo com `pg_restore --list`;
3. cria banco aleatorio `checkout_restore_verify_<uuid>` no mesmo servidor usando `template0`;
4. restaura sem owner/ACL;
5. compara checksums e estados de todas migrations versionadas, tabela/colunas ordenadas de cada
   indice unico critico (rejeitando parcial, expressao ou `NULLS NOT DISTINCT`) e contagens de
   `Order`, `OrderPayment`, `PaymentWebhookEvent`, `FulfillmentJob` e `OrderShipment`;
6. mede duracao de cada etapa;
7. em `finally`, executa `dropdb --force` somente para prefixo rigido e remove dump/diretorio.

Saida esperada: JSON com `result: passed`, `targetCreationAttempted`,
`temporaryDatabaseDropConfirmed` e `temporaryFilesRemoved` iguais a `true`. Falha agrega etapa
primaria e falhas de cleanup sem nomes/credenciais; `potentialOrphan: true` exige procurar banco
pelo prefixo exato e remove-lo somente apos duas pessoas confirmarem que nao e fonte nem ambiente
compartilhado.

Evidencia local em 2026-08-28, banco de testes: PASS; dump 9690 ms, verificacao do arquivo 31 ms,
criacao do banco isolado 605 ms, restore 26270 ms, validacao 791 ms e remocao do banco 563 ms. As
12 migrations/checksums, nomes de 6 indices unicos e contagens das 5 tabelas essenciais
coincidiram. Banco temporario e arquivos temporarios tiveram cleanup confirmado. Nenhuma migration
foi criada ou aplicada ao banco fonte nesse teste.

Essa execucao derivou o nome esperado da propria `DATABASE_URL` e ocorreu antes dos guardas
independentes de host/porta e da verificacao estrutural exata dos indices. Ela prova que backup e
restore do banco autorizado com sufixo `_test` funcionaram, mas nao prova independentemente a
identidade do ambiente nem a validacao estrutural nova. Antes de aceitar GL-040 operacionalmente,
repita com banco, host e porta fornecidos por inventario autorizado.

## Pre-deploy em staging

1. Mantenha `CHECKOUT_ENABLED=false` e workers desativados.
2. Registre release, horario UTC, responsavel, versoes de PostgreSQL/Prisma e quantidade de
   migrations, sem credenciais.
3. Crie backup restauravel pelo mecanismo gerenciado e rode a verificacao acima contra clone de
   teste autorizado. Backup de producao nao deve ser restaurado em ambiente com acesso mais amplo.
4. Execute `pnpm exec prisma migrate status`; divergencia ou migration falha bloqueia deploy.
5. Observe `pg_stat_activity` e `pg_locks`, então execute `pnpm run prisma:migrate:deploy` primeiro
   em staging. Registre inicio/fim, espera por lock, duracao e migration aplicada.
6. Execute novamente `pnpm exec prisma migrate status` e valide constraints/listagens do script.
7. Somente depois repita em producao, dentro da janela aprovada e com backup confirmado.

Nunca edite migration aplicada nem escreva migration manualmente. Mudanca necessaria deve ser
gerada pelo Prisma em desenvolvimento, revisada e versionada.

## Rollback operacional

Migration Prisma e forward-only. Ordem de resposta:

1. mantenha `CHECKOUT_ENABLED=false`; pause worker afetado se houver risco financeiro/logistico;
2. interrompa rollout e reverta aplicacao para release compatível com schema atual;
3. se migration for aditiva e aplicacao anterior continuar compativel, preserve dados e prepare
   migration corretiva gerada pelo Prisma;
4. se houver corrupção/perda, bloqueie writes, preserve banco afetado e restaure backup em banco
   isolado; compare pedidos, pagamentos, webhooks, fulfillment e remessas antes de qualquer troca;
5. prefira reconciliar registros afetados usando IDs dos provedores. Restore completo em producao
   exige aprovacao tecnica/financeira por duas pessoas, calculo explicito de perda entre backup e
   incidente e plano para reaplicar eventos legítimos;
6. confirme invariantes financeiros, filas, webhook idempotente e reconciliacao antes de reativar
   workers e checkout gradualmente.

Nao use `prisma migrate resolve`, SQL direto, edicao de `_prisma_migrations` ou restore sobre banco
ativo como atalho de rollback.
