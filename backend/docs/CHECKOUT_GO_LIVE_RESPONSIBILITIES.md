# Guia de responsabilidades para liberar o checkout

## Objetivo

Este documento explica, em linguagem direta, o que a responsavel pela loja precisa fazer, o que o
Codex pode fazer e quais atividades precisam ser feitas em conjunto antes de liberar o checkout
para clientes reais.

A fonte de verdade dos criterios tecnicos continua sendo `docs/CHECKOUT_GO_LIVE.md`. Os
procedimentos detalhados continuam nos runbooks citados ao longo deste guia.

## Indice

- [Resposta curta](#resposta-curta)
- [Regra de seguranca](#regra-de-seguranca)
- [Quem faz o que](#quem-faz-o-que)
- [Termos tecnicos, em linguagem simples](#termos-tecnicos-em-linguagem-simples)
    - [Staging](#staging)
    - [Producao](#producao)
    - [Preflight de producao](#preflight-de-producao)
    - [Migration](#migration)
    - [Webhook](#webhook)
    - [Fulfillment](#fulfillment)
    - [Worker](#worker)
    - [Kill switch](#kill-switch)
    - [Allowlist](#allowlist)
    - [Smoke test](#smoke-test)
    - [Canario](#canario)
    - [Reconciliacao](#reconciliacao)
    - [Idempotencia](#idempotencia)
    - [Rollback](#rollback)
- [Ordem exata do trabalho](#ordem-exata-do-trabalho)
    - [Fase 1 — confirmar a base tecnica atual](#fase-1--confirmar-a-base-tecnica-atual)
    - [Fase 2 — criar e validar staging](#fase-2--criar-e-validar-staging)
    - [Fase 3 — preparar operacao de producao](#fase-3--preparar-operacao-de-producao)
    - [Fase 4 — executar preflight de producao](#fase-4--executar-preflight-de-producao)
    - [Fase 5 — executar smoke PIX em producao](#fase-5--executar-smoke-pix-em-producao)
    - [Fase 6 — validar cartao](#fase-6--validar-cartao)
    - [Fase 7 — executar canario](#fase-7--executar-canario)
    - [Fase 8 — decisao final](#fase-8--decisao-final)
- [Quando parar imediatamente](#quando-parar-imediatamente)
- [Evidencia que pode ser registrada](#evidencia-que-pode-ser-registrada)
- [Checklist resumido da responsavel pela loja](#checklist-resumido-da-responsavel-pela-loja)
- [Checklist resumido do Codex](#checklist-resumido-do-codex)
- [Proximo passo concreto](#proximo-passo-concreto)

## Resposta curta

O codigo do backend esta preparado para um teste real controlado, mas o checkout ainda nao deve ser
aberto ao publico. A responsavel pela loja precisa configurar e validar os servicos externos, fazer
os pagamentos reais de teste e tomar as decisoes financeiras e operacionais. O Codex deve verificar
codigo, configuracao verificavel, banco, testes e evidencias sanitizadas, alem de registrar o
resultado.

Uma compra real feita pela responsavel faz parte do processo, mas nao e o primeiro passo. Antes dela,
precisamos provar que configuracao, webhook, alertas, banco, kill switch e responsaveis estao prontos.

## Regra de seguranca

Nunca envie para o Codex, chat, ticket, documento ou commit:

- senhas;
- `DATABASE_URL` completa;
- chaves da AbacatePay, Superfrete ou Resend;
- secret do webhook;
- dados de cartao;
- documentos, endereco ou dados pessoais de cliente;
- URL individual de checkout;
- payload integral de webhook;
- cookies, tokens de sessao ou codigos de autenticacao.

Esses valores devem ser inseridos diretamente no secret manager, painel do provedor ou pagina HTTPS
oficial. Para revisao, compartilhe somente nomes das variaveis, estados dos checks, contagens,
horarios, release e mensagens de erro sanitizadas.

## Quem faz o que

| Area               | Voce, responsavel pela loja                                          | Codex                                                                        |
| ------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Easypanel/deploy   | Acessa painel, cria staging, configura variaveis e reinicia replicas | Revisa nomes e regras, verifica release e interpreta checks acessiveis       |
| Secrets            | Gera e cadastra secrets sem revela-los                               | Verifica se validacoes existem e se resultado sanitizado passou              |
| AbacatePay         | Configura webhook, usa paineis e realiza PIX/cartao real             | Revisa integracao, valida registros e procura duplicidade/inconsistencia     |
| Superfrete         | Confirma token/ambiente e decide destino da etiqueta de teste        | Valida fulfillment, unicidade da etiqueta e estado persistido                |
| Resend/e-mail      | Confirma dominio e verifica e-mail recebido                          | Valida job/delivery e links implementados                                    |
| Banco              | Autoriza ambiente, backup e migrations; fornece inventario sem senha | Executa ou orienta probes seguros e read-only; interpreta migration status   |
| Alertas            | Escolhe canal e pessoas responsaveis; confirma recebimento           | Gera evento controlado e verifica formato/redacao do alerta                  |
| Compra real        | Faz o pagamento e autoriza gasto/reembolso                           | Acompanha estados tecnicos antes/depois, sem inserir dados financeiros       |
| Decisao de liberar | Aprova risco, janela, valores, canario e `GO` operacional            | Emite parecer tecnico `PASS`, `FAIL`, `HOLD` ou `NO-GO` com evidencias       |
| Incidente          | Decide comunicacao, reembolso, cancelamento e destino fisico         | Ajuda a diagnosticar, reconciliar e executar runbook sem alterar dados a mao |

## Termos tecnicos, em linguagem simples

### Staging

Ambiente separado que imita producao, mas usa banco, usuarios e credenciais de teste. Serve para
provar integracoes externas sem cobrar clientes nem comprar etiquetas reais. Staging nao pode
compartilhar banco ou secrets com producao.

### Producao

Ambiente usado por clientes reais. Operacoes podem movimentar dinheiro, enviar e-mail e comprar
etiqueta valida. Um teste em producao precisa de valor baixo, conta interna, horario combinado e
plano de interrupcao.

### Preflight de producao

Inspecao feita antes de abrir o checkout. Equivale ao checklist de um aviao antes da decolagem. O
comando `pnpm run config:verify-production` valida configuracao, modo dos provedores, seguranca da
conexao com o banco, privilegios da role e flags criticas. Ele nao cobra, nao envia e-mail e nao
compra etiqueta.

Um resultado `AUTO_PASS` significa somente que um check automatico passou. `MANUAL_REQUIRED`
significa que uma pessoa ainda precisa conferir painel, inventario ou segredo. O preflight nunca
declara o sistema inteiro pronto sozinho.

### Migration

Alteracao versionada na estrutura do banco, por exemplo adicionar coluna, indice ou novo estado.
Primeiro executamos `prisma migrate status`; depois aplicamos migrations versionadas com
`prisma:migrate:deploy`. Nunca escrevemos migration Prisma manualmente nem alteramos migration ja
aplicada.

### Webhook

Mensagem HTTPS enviada pela AbacatePay ao backend quando algo acontece, como pagamento concluido,
reembolso, disputa ou perda. O webhook externo prova que a mensagem saiu do provedor e chegou ao
servidor real. Chamar a rota manualmente ou usar um teste sintetico nao prova isso.

### Fulfillment

Etapa operacional executada depois do pagamento confirmado. Neste projeto, inclui criar e comprar
a etiqueta na Superfrete, persistir a remessa e mover o pedido para processamento. Fulfillment nao
e o pagamento; e o trabalho necessario para preparar o envio depois dele.

### Worker

Processo em segundo plano que busca trabalhos pendentes. Existem workers para fulfillment, e-mail e
rastreamento. Eles podem continuar trabalhando sem uma pessoa com a pagina aberta. Por isso suas
flags, quantidade de replicas e locks precisam ser revisados.

### Kill switch

Interruptor de emergencia controlado por `CHECKOUT_ENABLED`. Quando `false`, bloqueia novas
cobrancas sem desligar webhooks e reconciliacao de cobrancas que ja existem. Ele nao cancela um
checkout ja criado.

### Allowlist

Lista de usuarios autorizados a criar checkout durante testes e liberacao controlada.
`CHECKOUT_ROLLOUT_MODE=ALLOWLIST` deve conter somente contas internas aprovadas. Assim, o site pode
continuar acessivel enquanto novas cobrancas ficam restritas.

### Smoke test

Teste curto do caminho completo em producao. Neste projeto: criar um pedido pequeno, pagar de
verdade, receber webhook real, confirmar pagamento, gerar exatamente um fulfillment, comprar uma
unica etiqueta, receber e-mail e reconciliar valores. O objetivo nao e testar tudo; e provar que o
caminho essencial funciona no ambiente real.

### Canario

Liberacao gradual depois do smoke. Primeiro equipe interna, depois grupo pequeno e somente depois
publico geral. Cada etapa tem duracao minima, numero minimo de pedidos e criterios de parada
definidos antes de comecar.

### Reconciliacao

Comparacao entre o que os paineis dos provedores dizem e o que o banco local registra. Exemplo:
AbacatePay informa pagamento de R$ 10,00; banco precisa ter o mesmo pedido, valor e estado. A
reconciliacao encontra pagamento perdido, valor divergente ou estado incoerente.

### Idempotencia

Garantia de que repetir a mesma operacao nao cria um segundo efeito. Um clique repetido ou webhook
reenviado nao pode gerar outra cobranca, outro fulfillment, outro e-mail ou outra etiqueta.

### Rollback

Retorno da aplicacao para uma release anterior compativel. Rollback de codigo nao desfaz pagamento,
etiqueta ou migration ja executada. Problemas financeiros exigem reconciliacao e, quando aprovado,
reembolso no provedor.

## Ordem exata do trabalho

Cada fase termina com um gate. Nao avance quando houver `FAIL`, `BLOCKED`, `AUTO_FAIL`, divergencia
nao explicada ou falta de responsavel.

### Fase 1 — confirmar a base tecnica atual

#### Codex faz

- confirmar que `main` e `origin/main` apontam para o mesmo commit;
- rodar build, lint e suite normal sem iniciar servidor;
- confirmar CI em Node 22;
- revisar se o deploy corresponde ao commit aprovado, quando essa informacao estiver acessivel;
- conferir que nenhuma mudanca local inesperada entrou no escopo;
- registrar resultado no plano de go-live.

#### Voce faz

- informar qual release aparece implantada no Easypanel, sem enviar secrets;
- confirmar qual e o dominio oficial do frontend;
- decidir se o dominio temporario `adnanbezerra.tech` pode ser usado no smoke;
- habilitar protecao da branch `main` para exigir CI, se quiser impedir merge quebrado.

#### Gate

Build, lint, testes e CI passam; release implantada e dominio oficial estao identificados.

### Fase 2 — criar e validar staging

Procedimento completo: `docs/STAGING_SETUP.md`.

#### Voce faz

- criar no Easypanel um backend HTTPS de staging;
- criar PostgreSQL e MongoDB exclusivos de staging;
- cadastrar credenciais de desenvolvimento/sandbox, nunca as de producao;
- configurar DNS/certificado e acesso aos logs;
- criar usuario interno e informar ao Codex somente que existe uma allowlist configurada;
- configurar na AbacatePay dev o endpoint de webhook de staging e os quatro eventos:
  `checkout.completed`, `checkout.refunded`, `checkout.disputed` e `checkout.lost`;
- indicar uma segunda pessoa para revisao tecnica/operacional.

#### Codex faz

- revisar nomes e coerencia das variaveis sem receber valores secretos;
- executar ou orientar build, lint, testes e `prisma migrate status` em staging;
- aplicar somente migrations Prisma ja versionadas, com autorizacao e role de migration;
- medir tempo/locks e verificar constraints criticas;
- manter fulfillment desligado durante a primeira prova de webhook;
- verificar `PaymentWebhookEvent.processedAt`, `error`, idempotencia e contagens;
- registrar evidencia sanitizada.

#### Voce faz durante o teste externo

- criar o checkout de desenvolvimento pela conta interna;
- concluir ou simular pagamento somente pelo mecanismo oficial oferecido pela AbacatePay;
- usar redelivery oficial, se disponivel;
- confirmar no painel que o evento saiu do provedor.

#### Gate

Webhook autentico chega ao staging, passa por assinatura/query secret, responde 200 depois do
processamento e cria somente um efeito. Migration status fica limpo e nenhuma credencial de
producao aparece em staging.

### Fase 3 — preparar operacao de producao

#### Voce faz

- escolher canal de alerta, por exemplo e-mail, Slack ou ferramenta de incidentes;
- nomear responsavel tecnico e responsavel operacional/financeiro;
- garantir acesso aos paineis AbacatePay, Superfrete, Resend, logs e Easypanel;
- confirmar que chaves/tokens de producao sao diferentes de sandbox;
- definir quem pode desligar checkout e workers;
- definir destino do pedido/etiqueta de teste: receber, cancelar ou descartar;
- obter inventario independente do banco: host, porta e nome, sem senha;
- aprovar backup/restore e janela de migration.

#### Codex faz

- revisar runbooks e configuracao fail-closed;
- testar kill switch localmente e, com voce, no ambiente implantado;
- gerar alerta controlado sem dados sensiveis;
- verificar se alerta chegou ao canal e possui dono/link de investigacao;
- executar/verificar backup e restore somente em ambiente autorizado e isolado;
- revisar role runtime com privilegio minimo;
- preparar checklist de revisao por duas pessoas.

#### Gate

Alerta chega a uma pessoa, kill switch funciona em todas as replicas, backup/restore possui
evidencia aceitavel, acessos estao disponiveis e incidentes possuem donos.

### Fase 4 — executar preflight de producao

Procedimento completo: `docs/PRODUCTION_CONFIGURATION.md`.

#### Voce faz no Easypanel

1. Selecionar a release exata aprovada.
2. Manter `CHECKOUT_ENABLED=false`.
3. Usar `CHECKOUT_ROLLOUT_MODE=ALLOWLIST` com somente a conta interna aprovada.
4. Cadastrar secrets de producao diretamente no secret manager.
5. Confirmar URLs HTTPS, CORS, webhook, modos dos provedores, workers e e-mail.
6. Confirmar em todas as replicas que a configuracao foi recarregada.
7. Fazer revisao com a segunda pessoa, sem copiar valores.

#### Codex faz

- executar `pnpm run config:verify-production` no contexto autorizado da release, se tiver acesso;
- caso voce execute, interpretar somente a saida sanitizada;
- investigar todo `AUTO_FAIL`;
- conferir migration status, role do banco, flags e origem do frontend;
- produzir lista final de itens automaticos e manuais.

#### Gate

Zero `AUTO_FAIL`. Todo `MANUAL_REQUIRED` possui confirmacao humana registrada. Checkout continua
desligado.

Mensagem segura para retomar com o Codex:

> Configurei a release `<commit>` no Easypanel. Checkout continua desligado e em allowlist com uma
> conta interna. Duas pessoas revisaram secrets, provedores, banco, workers, URLs e logs. Pode
> conduzir o preflight. Nao vou enviar valores secretos.

### Fase 5 — executar smoke PIX em producao

Procedimento completo: `docs/PRODUCTION_SMOKE.md`.

#### Voce prepara

- uma conta interna;
- produto de menor valor adequado;
- endereco controlado;
- valor maximo aprovado;
- janela de ate 24 horas;
- pessoa responsavel pelo PIX;
- pessoa responsavel pela etiqueta/reconciliacao;
- acesso aos paineis e canal de alerta;
- regra para o pedido e etiqueta depois do teste.

#### Codex faz antes do pagamento

- confirmar release, preflight, migrations, alertas e inventario de checkouts existentes;
- conferir `ALLOWLIST` com exatamente uma conta;
- confirmar checkout ainda desligado;
- preparar monitoramento e criterios de parada;
- orientar ativacao de `CHECKOUT_ENABLED=true` sem trocar para `PUBLIC`.

#### Voce faz no frontend e no provedor

1. Entrar com a conta interna.
2. Criar um unico pedido de baixo valor.
3. Conferir produto, endereco, frete e total.
4. Abrir o checkout uma unica vez.
5. Conferir no painel AbacatePay que ambiente, valor e referencia estao corretos.
6. Pagar uma unica vez por PIX real na pagina oficial.
7. Nao atualizar compulsivamente, recriar pedido ou repetir pagamento se houver demora.
8. Confirmar recebimento do e-mail e abrir seus links em dispositivo controlado.

O Codex nao deve digitar seus dados, efetuar o PIX, aprovar gasto ou confirmar transacao financeira
em seu lugar.

#### Codex faz depois do pagamento

- acompanhar webhook externo e estados persistidos;
- confirmar pagamento `PAID` por `PIX` e pedido `PROCESSING`;
- confirmar exatamente um fulfillment, uma etiqueta e um e-mail;
- rodar `pnpm run smoke:verify-production` em modo read-only, no ambiente autorizado;
- comparar contagens com inventario anterior;
- orientar reconciliacao e registrar `PASS` ou `FAIL` sanitizado.

#### Voce encerra

- confirmar no painel AbacatePay uma unica cobranca e valor liquidado;
- confirmar no painel Superfrete uma unica etiqueta;
- aplicar o destino aprovado ao pedido/etiqueta;
- confirmar e-mail realmente recebido;
- aprovar reconciliacao;
- colocar `CHECKOUT_ENABLED=false` se houver qualquer incerteza.

#### Gate

Um fluxo real completo termina sem ajuste manual no banco, webhook manual, retry improvisado,
duplicidade ou divergencia. `PASS` do smoke nao autoriza liberar para todos.

### Fase 6 — validar cartao

Procedimento completo: `docs/CHECKOUT_CARD_RUNBOOK.md`.

O backend oferece `PIX` e `CARD`; portanto, cartao precisa ser validado antes de ser oferecido ao
publico como fluxo suportado.

#### Voce faz

- autorizar cartao e valor de teste;
- inserir dados somente na pagina HTTPS oficial da AbacatePay;
- confirmar cobranca no painel;
- aprovar e executar reembolso oficial uma unica vez;
- decidir com financeiro se disputa/perda pode ser simulada oficialmente ou deve ficar `BLOCKED`;
- conferir mensagens do frontend em desktop e mobile.

#### Codex faz

- confirmar `providerMethod=CARD`, webhook autentico e idempotencia;
- confirmar fulfillment/etiqueta unica quando autorizado;
- confirmar evento de reembolso e bloqueio de fulfillment em disputa/perda;
- revisar estados e mensagens do frontend;
- registrar claramente o que passou, o que ficou manual e o que o provedor nao permite testar.

Nunca envie numero, validade ou CVV do cartao ao Codex.

### Fase 7 — executar canario

Procedimento completo: `docs/CHECKOUT_CANARY.md`.

#### Voce decide antes de cada etapa

- usuarios permitidos;
- duracao minima;
- numero minimo de pedidos concluidos;
- inicio/fim UTC;
- dono tecnico;
- dono operacional/financeiro;
- criterio de parada.

#### Codex faz

- validar arquivo de evidencia sanitizado;
- executar `pnpm run canary:evaluate`;
- explicar `ADVANCE`, `HOLD` ou `ROLLBACK`;
- verificar alertas, webhooks, pagamentos, fulfillment, e-mails e reconciliacao;
- recomendar parada imediata diante de risco financeiro/logistico.

#### Voce faz

- adicionar somente usuarios aprovados a `ALLOWLIST`;
- acompanhar suporte e paineis;
- aprovar avancar, manter ou reverter;
- usar kill switch imediatamente quando criterio de parada ocorrer;
- mudar para `PUBLIC` somente depois da decisao final conjunta.

#### Gate

Duracao e volume minimos cumpridos, zero divergencia, reconciliacao `PASS`, evidencias registradas e
duas aprovacoes. Somente entao considerar `PUBLIC`.

### Fase 8 — decisao final

#### Codex entrega

- commit/release avaliados;
- resultados de build, lint, testes e CI;
- resultado de staging, preflight, smoke, cartao e canario;
- lista de riscos residuais;
- parecer tecnico `GO` ou `NO-GO`.

#### Voce entrega

- aprovacao operacional/financeira;
- nome do responsavel tecnico e operacional;
- confirmacao de paineis, e-mail, etiqueta e reconciliacao;
- decisao explicita de manter checkout desligado ou mudar para `PUBLIC`.

Decisao `GO` exige concordancia tecnica e operacional. Ausencia de evidencia significa `NO-GO`,
mesmo quando nenhum erro foi observado.

## Quando parar imediatamente

Defina `CHECKOUT_ENABLED=false` em todas as replicas e nao tente novamente automaticamente quando
ocorrer qualquer um destes casos:

- duas cobrancas para o mesmo pedido;
- valor cobrado diferente do pedido;
- `devMode=true` em producao;
- webhook ausente, invalido ou parado;
- pagamento confirmado sem pedido correspondente;
- pedido pago sem fulfillment;
- duas etiquetas;
- etiqueta comprada depois de reembolso, disputa ou perda;
- e-mail ou pagina expondo dado sensivel;
- painel e banco impossiveis de reconciliar;
- resposta incerta que incentive repetir cobranca;
- replica com configuracao diferente das demais.

Depois de fechar o gate, preserve os registros, consulte estados antes de repetir qualquer acao e
siga `docs/CHECKOUT_RUNBOOK.md`. Nao corrija pagamento diretamente no banco.

## Evidencia que pode ser registrada

Pode registrar:

- commit e release;
- horario UTC;
- nomes dos checks e seus estados;
- contagens de cobrancas, webhooks, fulfillment, etiquetas e e-mails;
- duracao;
- resultado de reconciliacao;
- nomes dos responsaveis;
- referencia para sistema restrito.

Nao registre secrets, dados pessoais, dados de cartao, URLs individuais ou payloads integrais.

## Checklist resumido da responsavel pela loja

- [ ] Definir dominio oficial.
- [ ] Provisionar staging separado.
- [ ] Configurar webhook dev em staging.
- [ ] Confirmar chaves sandbox/producao separadas.
- [ ] Nomear segunda pessoa revisora.
- [ ] Definir canal e responsaveis por alertas.
- [ ] Revisar configuracao real de producao no Easypanel.
- [ ] Manter checkout desligado e em allowlist ate o smoke.
- [ ] Aprovar conta, produto, endereco, valor e janela do smoke.
- [ ] Fazer PIX real de baixo valor.
- [ ] Confirmar paineis, e-mail, etiqueta e reconciliacao.
- [ ] Fazer validacao controlada de cartao/reembolso.
- [ ] Definir thresholds do canario.
- [ ] Aprovar cada expansao.
- [ ] Assinar decisao operacional final.

## Checklist resumido do Codex

- [ ] Validar commit, arvore, build, lint, testes e CI.
- [ ] Revisar staging e configuracao sem receber secrets.
- [ ] Verificar migrations, constraints e role do banco.
- [ ] Provar webhook externo e idempotencia em staging.
- [ ] Testar kill switch e alerta.
- [ ] Conduzir preflight e interpretar checks.
- [ ] Preparar e acompanhar smoke sem efetuar pagamento.
- [ ] Verificar estado persistido em modo read-only.
- [ ] Verificar fulfillment, etiqueta, e-mail e reconciliacao.
- [ ] Acompanhar validacao CARD sem manipular dados de cartao.
- [ ] Avaliar canario e recomendar `ADVANCE`, `HOLD` ou `ROLLBACK`.
- [ ] Atualizar evidencia e emitir parecer tecnico final.

## Proximo passo concreto

Antes de fazer qualquer compra, a responsavel deve responder, sem compartilhar secrets:

1. qual e o dominio oficial do site;
2. se existe staging separado e qual e sua URL publica;
3. qual commit/release aparece implantado em producao;
4. se ha uma segunda pessoa para revisar configuracao e acompanhar o teste;
5. se possui acesso aos paineis AbacatePay, Superfrete, Resend, Easypanel e logs;
6. se deseja primeiro concluir staging ou registrar formalmente a ausencia dele como bloqueio.

Com essas respostas, o Codex pode conduzir as fases seguintes sem pedir nem expor credenciais.
