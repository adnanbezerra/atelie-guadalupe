# Plano de correção Impeccable

Fonte: `.impeccable/critique/`. Escopo: 20 páginas. Meta: resolver P0 primeiro, depois P1/P2 sem inventar backend.

## Regras comuns

- Preservar `PRODUCT.md` e `DESIGN.md`.
- Usar `FeedbackDialog` para erro/sucesso/confirmação. Nada escrito solto no HTML; nada de toast.
- Ler `docs/API.md` antes de integrar dados.
- Endpoint/campo ausente: não simular. Registrar contrato em `docs/IMPECCABLE_API_GAPS.md`.
- Sem migrations manuais. Sem servidor local. `pnpm`, nunca `npm`.
- Validar por etapa: `pnpm lint`, `pnpm build` quando mudança permitir, detector Impeccable uma vez no fim dos alvos alterados.
- Commit atômico. Formato: `(front)fix: descrição`; docs: `(front)docs: descrição`.

## Etapa 0 — contratos e viabilidade

Alvos: `docs/API.md`, tipos/hooks/API client.

Trabalho:

1. Confirmar suporte atual para produto por UUID, paginação, usuários, pedidos, testemunhos e cobranças.
2. Criar `docs/IMPECCABLE_API_GAPS.md` para lacunas reais:
   - prévia pública de link manual antes de criar pagamento;
   - atributos estruturados por tipo de produto: ingredientes/uso ou material/técnica/dimensão/unidade;
   - retirada local, se produto exigir;
   - remoção persistente de imagem;
   - ativação/reativação de produto;
   - agregações/paginação administrativas quando contrato atual não sustentar métrica completa.
3. Implementar apenas helpers/tipos exigidos por contratos já existentes.

Aceite: nenhuma UI depende de endpoint inventado; lacunas têm request/response/erros propostos.

## Etapa 1 — descoberta pública

Alvos: home, header, Beleza Natural, Artesanato, catálogo compartilhado.

Trabalho:

1. Busca aponta para catálogo real e preserva termo; resultado, vazio e falha distintos.
2. Home explica produto primeiro; hierarquia: comprar beleza, pedir orientação, explorar artesanato.
3. Remover/reformular alegacões clínicas não comprovadas. Dar contexto real aos depoimentos sem inventar identidade.
4. Mobile mostra produtos cedo; filtros compactos; linha recebe explicação por uso com dados existentes.
5. CTA do card descreve ação real. Erro de linhas/produtos abre modal com retry.
6. Artesanato não promete atributos ausentes. Lacunas ficam vinculadas ao contrato da etapa 0.

Aceite: busca funcional; estados claros; primeira dobra orienta; fluxo mobile não enterra produto.

Commits esperados: busca; home/hierarquia; estados do catálogo; UX mobile/filtros.

## Etapa 2 — decisão de produto e carrinho

Alvos: produto, carrinho, frete, provider do carrinho.

Trabalho:

1. Produto separa 404 de falha de API; corrige semântica/layout; mostra informação disponível por categoria.
2. Variante usa linguagem compatível com categoria e contrato atual. Não inventar unidade artesanal.
3. Adicionar ao carrinho usa modal com próximo passo: continuar ou abrir carrinho.
4. Carrinho permite remoção individual; limpar tudo exige confirmação modal.
5. Item indisponível fica visível, bloqueia checkout e orienta remoção.
6. Erros de carrinho/CEP/frete usam modal. Retirada local só entra com contrato real.

Aceite: usuário controla itens; indisponibilidade nunca passa silenciosa; nenhum toast.

Commits esperados: produto/erros; modal de adição; remoção/limpeza; indisponibilidade/frete.

## Etapa 3 — checkout e pós-compra

Alvos: checkout, sucesso, cobrança manual, detalhe de pedido.

Trabalho:

1. Garantir CTA de pagamento para pedido `AWAITING_PAYMENT`; recuperar checkout persistido.
2. Total usa subtotal menos descontos mais frete; ordem e snapshot do backend vencem estado local.
3. Stepper representa estados reais. Endereço pode voltar a modo de edição antes do pedido.
4. Sucesso consulta pedido autenticado; nunca afirma pagamento por simples acesso à URL. Mostrar recibo/entrega ou estado pendente/erro com ação.
5. Cobrança manual mostra dados antes do pagamento somente quando contrato público existir. Até lá, linguagem honesta e suporte/retry.
6. Detalhe combina pedido, pagamento, envio e fulfillment; estados transitórios atualizam; exceções oferecem pagar, atualizar ou suporte.

Aceite: sem falso sucesso; total correto; pagamento sempre recuperável; status coerentes.

Commits esperados: total/CTA; stepper/endereço; sucesso verificado; cobrança manual; detalhe/refresh.

## Etapa 4 — autenticação e perfil

Alvos: login, cadastro, recuperação, perfil, histórico.

Trabalho:

1. Remover “Lembrar de mim” inerte ou ligá-lo a contrato real; mostrar origem e volta à loja; toggle de senha.
2. Cadastro trata documento conforme contrato, explica finalidade, mostra regras de senha antes do envio e associa erro ao campo.
3. Recuperação preserva marca no mobile, ação contextual no modal, orienta remetente/spam e persiste cooldown local.
4. Perfil ganha dirty state, cancelar real, proteção contra saída e documento de 11/14 dígitos.
5. Histórico usa paginação real; labels acessíveis; hash inválido cai em aba válida.

Aceite: controles não mentem; dados sensíveis têm contexto; editar/cancelar é reversível; pedidos completos.

Commits esperados: login; cadastro; recuperação; dirty state/documento; paginação/a11y.

## Etapa 5 — operação admin: painel e produtos

Alvos: dashboard, lista de produtos, novo produto, editar produto.

Trabalho:

1. Receita/ticket contam somente pedidos pagos. Falha não vira zero. Pedido abre detalhe. Fila prioriza pagamento, preparo, envio e falha.
2. Remover controles decorativos ou torná-los reais.
3. Lista usa total/paginação do contrato; estoque zero, baixo e sem controle distintos; categoria e linha são filtros nomeados corretamente.
4. Desativação pede confirmação e explica reversibilidade real. Reativar só com contrato.
5. Editor carrega por `GET /products/:uuid`; valida trim/NaN/linhas; pending impede duplo envio; feedback por modal.
6. Estado de publicação e remoção de imagem só aparecem quando persistem. Prévia espelha card real. Dirty state protege alterações estruturais.

Aceite: métricas honestas; lista operacional; edição direta por UUID; nenhuma ação decorativa/destrutiva ambígua.

Commits esperados: dashboard; filtros/estoque; desativação; fetch UUID; validação/modais; dirty state/prévia.

## Etapa 6 — administração: cobranças, testemunhos e acesso

Alvos: cobrança admin, testemunhos, usuários.

Trabalho:

1. Cobrança revisa valor/descrição/validade antes de criar; alerta valor incomum; diálogo final e histórico permitem copiar/abrir novamente.
2. Testemunho confirma exclusão permanente; diferencia erro/vazio; permite editar, reativar via `PUT`, pré-visualizar; upload bloqueia fechamento ou cancela de modo seguro.
3. Usuário envia `document`; separa equipe/clientes; explica papéis e menor privilégio; busca/filtros reais; altera/revoga via `PATCH /users/:uuid`.
4. Diferenciar 403, falha e vazio. Não expor senha temporária insegura sem fluxo contratual.

Aceite: recurso externo pede revisão; exclusão destrutiva nunca ocorre em um clique; gestão de acesso usa contrato e menor privilégio.

Commits esperados: revisão de cobrança; histórico/ações; ciclo de testemunhos; upload/exclusão; contrato/CRUD de usuário; estados de permissão.

## Etapa 7 — verificação integrada

Trabalho:

1. Revisar histórico: todos commits começam com `(front)`.
2. Rodar `pnpm lint`, `pnpm format:check`, `pnpm build`. Corrigir apenas regressões deste trabalho.
3. Rodar detector Impeccable uma vez sobre todos alvos alterados.
4. Sem servidor. QA visual fica para execução manual da proprietária.
5. Registrar itens bloqueados por backend e itens deliberadamente não implementados.

Aceite: checks verdes ou falhas preexistentes documentadas; worktree limpo; nenhum commit fora do prefixo.
