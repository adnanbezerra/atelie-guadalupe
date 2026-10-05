# Inventário de páginas

Este documento registra as páginas navegáveis do frontend do Ateliê Guadalupe. O inventário foi levantado a partir das rotas `app/**/page.tsx`; estados internos, modais e parâmetros de busca aparecem dentro da página que os contém, não como páginas separadas.

## Resumo

- 20 páginas no total.
- 13 páginas públicas ou da jornada do cliente.
- 7 páginas administrativas.
- Rotas sob `/perfil`, `/checkout` e `/admin` exigem autenticação, com exceção de `/checkout/manual/[uuid]` e `/checkout/success`.
- Rotas administrativas aceitam os papéis `ADMIN` e `SUBADMIN`.

## Loja e conta do cliente

| Rota | Página | Acesso | Objetivo e ação principal | Principal ponto para crítica | Implementação principal |
|---|---|---|---|---|---|
| `/` | Início | Público | Explicar a proposta do ateliê, gerar confiança e encaminhar para Beleza Natural, Artesanato ou diagnóstico personalizado. | Proposta de valor, confiança e hierarquia das três jornadas principais. | `app/page.tsx` |
| `/beleza-natural` | Catálogo de beleza natural | Público | Descobrir cosméticos por busca, linha e paginação; abrir um produto. | Encontrabilidade: filtros, busca, leitura dos cards e clareza do próximo passo. | `app/beleza-natural/page.tsx` + `components/collections/collection-catalog.tsx` |
| `/artesanato` | Catálogo de artesanato | Público | Descobrir peças artesanais por busca, linha e paginação; abrir um produto. | Diferenciação da coleção artesanal sem perder clareza de catálogo e compra. | `app/artesanato/page.tsx` + `components/collections/collection-catalog.tsx` |
| `/produto/[slug]` | Detalhe do produto | Público; slug dinâmico | Entender produto, preço e variações; adicionar ao carrinho ou buscar orientação. | Qualidade da decisão de compra: informação, confiança, seleção e ação primária. | `app/produto/[slug]/page.tsx` + `components/products/product-detail-client.tsx` |
| `/carrinho` | Carrinho | Público; recursos extras podem depender de sessão | Revisar itens e quantidades, calcular frete e avançar para checkout. | Confiança antes do checkout: resumo, frete, edição e CTA final. | `app/carrinho/page.tsx` + `components/cart/cart-page-client.tsx` |
| `/checkout` | Checkout | Autenticado | Confirmar dados, endereço e pedido; iniciar e acompanhar pagamento. | Sequenciamento, carga cognitiva e segurança percebida no momento de maior risco. | `app/checkout/page.tsx` + `components/checkout/checkout-page-client.tsx` |
| `/checkout/success` | Confirmação de pagamento | Público | Confirmar recebimento do pagamento e orientar próximos passos. | Reassurance final: confirmação inequívoca, expectativa de entrega e saída útil. | `app/checkout/success/page.tsx` + `components/checkout/checkout-success-content.tsx` |
| `/checkout/manual/[uuid]` | Cobrança por link | Público; UUID dinâmico | Consultar uma cobrança criada pelo admin e realizar ou acompanhar pagamento. | Legitimidade do link, clareza do valor/descrição/status e ação de pagamento. | `app/checkout/manual/[uuid]/page.tsx` + `components/checkout/manual-payment-link-client.tsx` |
| `/login` | Entrar | Público | Autenticar cliente ou administrador e retornar à rota originalmente solicitada. | Fricção de entrada, recuperação de conta e coerência entre marca e tarefa. | `app/login/page.tsx` + `components/auth/auth-screen.tsx` |
| `/cadastro` | Criar conta | Público | Criar conta e seguir para a jornada pretendida. | Clareza dos requisitos, esforço do formulário e confiança para fornecer dados. | `app/cadastro/page.tsx` + `components/auth/auth-screen.tsx` |
| `/recuperar-senha` | Recuperar senha | Público | Solicitar código por e-mail e definir nova senha em duas etapas. | Orientação entre etapas, prevenção de erro e recuperação quando código/senha falham. | `app/recuperar-senha/page.tsx` + `components/auth/password-reset-screen.tsx` |
| `/perfil` | Minha conta | Autenticado | Alternar entre dados pessoais e pedidos, editar perfil/endereço e sair. | Arquitetura entre dados e pedidos, edição segura e visibilidade de salvamento. | `app/perfil/page.tsx` + `components/profile/profile-page-client.tsx` |
| `/perfil/pedidos/[uuid]` | Detalhes do pedido | Autenticado; UUID dinâmico | Entender status, itens, endereço, pagamento e entrega de um pedido. | Transparência pós-compra: progresso, significado dos estados e próxima ação. | `app/perfil/pedidos/[uuid]/page.tsx` + `components/profile/order-details-client.tsx` |

## Administração

Todas as páginas abaixo usam o shell e a navegação administrativa definidos em `app/admin/layout.tsx` e `components/admin/admin-sidebar.tsx`.

| Rota | Página | Objetivo e ação principal | Principal ponto para crítica | Implementação principal |
|---|---|---|---|---|
| `/admin` | Painel | Acompanhar vendas, pedidos recentes e marketing; identificar o que requer atenção. | Utilidade decisória: métricas acionáveis, prioridades e acesso ao detalhe dos pedidos. | `app/admin/page.tsx` + `components/admin/admin-dashboard-client.tsx` |
| `/admin/produtos` | Produtos | Buscar, filtrar, revisar estoque e abrir ações de cadastro, edição ou exclusão. | Densidade operacional: varredura da lista, estado de estoque e segurança das ações. | `app/admin/produtos/page.tsx` + `components/admin/admin-products-client.tsx` |
| `/admin/produtos/novo` | Cadastrar produto | Preencher dados e publicar um novo produto com prévia. | Estrutura do formulário, prevenção de omissões e fidelidade da prévia. | `app/admin/produtos/novo/page.tsx` + `components/admin/admin-product-editor-client.tsx` |
| `/admin/produtos/[uuid]` | Editar produto | Localizar e alterar um produto existente com prévia. | Segurança da edição: contexto do item, mudanças, validação e confirmação. | `app/admin/produtos/[uuid]/page.tsx` + `components/admin/admin-product-editor-client.tsx` |
| `/admin/testemunhos` | Testemunhos | Criar, enviar, ativar, desativar e excluir depoimentos em texto ou vídeo. | Gestão de estados e mídia: upload, progresso, publicação e ações destrutivas. | `app/admin/testemunhos/page.tsx` + `components/admin/admin-testimonials-client.tsx` |
| `/admin/cobranca` | Vendas/Links | Criar link de cobrança, revisar prévia, copiar/compartilhar e consultar links recentes. | Fluxo criar–verificar–compartilhar, com prevenção de valor ou expiração incorretos. | `app/admin/cobranca/page.tsx` + `components/admin/admin-billing-client.tsx` |
| `/admin/usuarios` | Usuários | Pesquisar usuários e criar ou gerenciar contas e papéis administrativos. | Clareza e segurança na gestão de acesso, especialmente papéis e ações por usuário. | `app/admin/usuarios/page.tsx` + `components/admin/admin-users-client.tsx` |

## Estados que devem entrar nas críticas

Cada página deve ser avaliada, quando aplicável, nos estados de carregamento, vazio, erro, sucesso, indisponibilidade de API, sessão expirada e viewport móvel. Catálogos também incluem busca sem resultado, filtro ativo e paginação. Formulários incluem validação, envio pendente e retorno do backend. Páginas dinâmicas incluem identificador inválido ou recurso não encontrado.

## Fora do inventário de páginas

- `app/api/[...path]/route.ts` é proxy de API, não página.
- `loading.tsx` são estados de carregamento das páginas correspondentes.
- Diálogos de carrinho, usuário, diagnóstico, marketing e feedback são superfícies internas das páginas, não rotas próprias.
- E-mails em `templates/` não pertencem ao frontend navegável.
