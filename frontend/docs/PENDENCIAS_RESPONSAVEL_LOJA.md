# Pendencias da responsavel pela loja

Atualizado em 2026-10-01. Esta lista reúne somente ações humanas, operacionais ou externas. Ela
não inclui criar, copiar ou alterar chaves e valores no `.env`.

O checkout continua em **NO-GO** enquanto os itens obrigatórios abaixo não tiverem evidência real.

## 1. Respostas e decisões que preciso receber

- [ ] Informar o domínio oficial do frontend e dizer se o domínio temporário pode ser usado no
      smoke test.
- [ ] Informar qual commit/release está implantado no Easypanel.
- [ ] Nomear uma segunda pessoa para a revisão técnica/operacional.
- [ ] Nomear o responsável técnico e o responsável operacional/financeiro.
- [ ] Escolher o canal humano que receberá alertas e garantir que essas pessoas tenham acesso a
      AbacatePay, SuperFrete, Resend, logs e Easypanel.
- [ ] Definir quem pode desligar checkout e workers em um incidente.
- [ ] Confirmar, com documento ou resposta oficial da SuperFrete, se o limite de 30 caracteres é
      somente para `street`/logradouro ou para outra composição do endereço. Hoje o frontend
      limita `street` a 30, mas o contrato em `docs/API.md` e o backend ainda aceitam 50; o contrato
      precisa ser uniformizado depois dessa confirmação.
- [ ] Decidir se o rastreamento por consulta periódica à SuperFrete é suficiente. Se quiser webhook
      ou link direto já preenchido, solicitar à SuperFrete a documentação oficial e disponibilizar
      a resposta, sem enviar credenciais. A página pública atual exige que o cliente cole o código.

## 2. Teste manual das mudanças do checkout

Executar em desktop e celular, usando uma conta de teste controlada:

- [ ] Sem CPF cadastrado, tentar fechar o pedido, cadastrar o CPF dentro do checkout e prosseguir.
- [ ] Sem endereço cadastrado, cadastrar o endereço dentro do checkout e prosseguir.
- [ ] Testar logradouro com exatamente 30 caracteres e confirmar que 31 caracteres são impedidos.
- [ ] Escolher uma cotação cujo `serviceCode` seja `33`, usar uma conta sem telefone, cadastrar o
      telefone dentro do checkout e prosseguir.
- [ ] Repetir o fluxo com CPF, endereço e telefone já cadastrados, confirmando que os formulários
      não aparecem sem necessidade.
- [ ] Confirmar que erros e sucessos aparecem no modal do projeto, sem mensagem solta na página.
- [ ] Concluir um checkout de teste e conferir produto, endereço, frete e total antes de pagar.

## 3. Infraestrutura de staging e controles de entrega

- [ ] Enviar os commits aprovados ao repositório remoto e implantar exatamente a release revisada;
      correção local ainda não é correção em produção.
- [ ] Provisionar um backend HTTPS de staging, banco PostgreSQL e MongoDB exclusivos, DNS,
      certificado e acesso a logs.
- [ ] Criar uma conta interna allowlisted para os testes.
- [ ] Configurar no painel da AbacatePay de desenvolvimento o webhook de staging para
      `checkout.completed`, `checkout.refunded`, `checkout.disputed` e `checkout.lost`.
- [ ] Fazer um evento autêntico sair da AbacatePay e chegar ao staging; chamada manual ao endpoint
      não conta.
- [ ] Usar o redelivery oficial, se disponível, e confirmar que o evento repetido não duplica
      efeitos.
- [ ] Rodar `prisma migrate status` no staging, aplicar somente as migrations já versionadas e
      validar constraints, duração e locks. Nunca escrever migration Prisma à mão.
- [ ] Repetir o teste de backup e restauração com o inventário real do ambiente autorizado.
- [ ] Ativar proteção da branch `main` para impedir merge/deploy quando o CI falhar.

## 4. Operação e alertas antes de cobrar de verdade

- [ ] Rotear os alertas da aplicação para o canal humano escolhido.
- [ ] Fazer um alerta controlado e comprovar que chegou ao responsável com link para os logs.
- [ ] Confirmar que outra pessoa consegue seguir o runbook sem ajuda de quem escreveu o código.
- [ ] Aprovar a janela de migration, backup e restauração.
- [ ] Revisar a configuração implantada com duas pessoas, sem copiar segredos para chat, ticket,
      documento ou log.
- [ ] Manter novos checkouts desligados e a liberação em `ALLOWLIST` até o smoke test terminar.

## 5. Smoke test PIX real em produção

- [ ] Aprovar uma conta interna, o produto de menor valor adequado, endereço controlado, limite de
      gasto, janela de até 24 horas e destino final do pedido/etiqueta.
- [ ] Criar um único pedido, abrir o checkout uma única vez e conferir valor e referência no painel
      da AbacatePay.
- [ ] Fazer um único PIX real de baixo valor na página oficial da AbacatePay.
- [ ] Confirmar uma única cobrança liquidada, um único pedido, um único fulfillment, uma única
      etiqueta e um único e-mail.
- [ ] Confirmar no banco e nos painéis que pagamento, pedido, frete e reconciliação concordam, sem
      ajuste manual ou retry improvisado.
- [ ] Aplicar ao pedido/etiqueta o destino previamente aprovado.
- [ ] Desligar novos checkouts imediatamente se houver qualquer incerteza ou divergência.

## 6. Postagem, rastreio e e-mail reais

Este teste é separado do pagamento: ele só termina quando a encomenda for fisicamente postada.

- [ ] Confirmar que o domínio e o remetente estão verificados no Resend e que o e-mail chega à
      caixa de entrada de teste.
- [ ] Confirmar no Easypanel que o backend e os workers permanecem ativos continuamente; o
      rastreamento atual consulta a SuperFrete periodicamente e não recebe webhook de postagem.
- [ ] Emitir uma etiqueta real da SuperFrete e postar fisicamente a encomenda.
- [ ] Confirmar que a SuperFrete passou a devolver status de postagem e um código de rastreio real.
- [ ] Confirmar que o pedido virou `SHIPPED`, que o job de e-mail terminou como enviado e que não
      houve e-mail duplicado.
- [ ] Abrir o e-mail recebido, copiar o código e validá-lo na página oficial de rastreamento da
      SuperFrete.
- [ ] Confirmar que o link de “Meus pedidos” abre `/perfil#pedidos` e mostra o mesmo código.

## 7. Cartão, canário e decisão final

- [ ] Autorizar um cartão e valor de teste; digitar os dados somente na página HTTPS oficial do
      provedor, nunca enviar número, validade ou CVV.
- [ ] Fazer uma cobrança controlada, conferir o pagamento e executar um único reembolso oficial.
- [ ] Decidir com o financeiro se disputa/perda pode ser simulada oficialmente; se não puder,
      registrar o item como bloqueado e não afirmar que foi validado.
- [ ] Conferir todo o fluxo de cartão em desktop e celular.
- [ ] Definir para cada etapa do canário: usuários permitidos, duração mínima, quantidade mínima de
      pedidos, responsáveis e critérios de parada.
- [ ] Liberar somente usuários aprovados, acompanhar suporte/painéis e aprovar cada expansão.
- [ ] Mudar para `PUBLIC` somente depois de canário sem divergência, reconciliação aprovada e
      decisão técnica e operacional explícita de `GO`.

## Evidencias para devolver ao Codex

Enviar somente dados sanitizados: domínio público, commit/release, horários, UUIDs/IDs não
secretos, status dos painéis, contagens, capturas sem dados pessoais e resultados `PASS`/`FAIL`.
Nunca enviar senhas, tokens, chaves, CPF, telefone, dados de cartão ou conteúdo integral de
webhooks.
