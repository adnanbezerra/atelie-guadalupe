# Auditoria tecnica de interface

Data da auditoria: 5 de agosto de 2026  
Escopo: storefront, catalogo, produto, carrinho, checkout, autenticacao e componentes administrativos compartilhados.

Ultima revisao: 5 de agosto de 2026, apos o polimento das rotas publicas.  
Metodo da revisao: comparacao do diagnostico original com o diff implementado, sem executar uma nova auditoria.

## Revisao apos o polimento das rotas publicas

O trabalho posterior alterou parte do diagnostico original. Dos 15 problemas registrados, 2 foram resolvidos integralmente, 5 foram corrigidos parcialmente e 8 permanecem sem alteracao relevante.

**Audit Health Score estimado apos o polimento: 11/20 — Acceptable; trabalho significativo ainda necessario.** A nota de Responsive Design sobe de 2/4 para 3/4 porque busca e navegacao de colecoes agora permanecem disponiveis no mobile. As demais dimensoes mantem a nota original ate uma nova auditoria completa.

| Item original                   | Estado atual           | Mudanca verificada                                                                                                                                                                   |
| ------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Controles sem nome acessivel | Parcialmente corrigido | As duas buscas publicas agora possuem `aria-label="Buscar produtos"`; os seletores administrativos listados continuam pendentes.                                                     |
| 4. Busca e categorias no mobile | Resolvido              | A busca deixou de ser ocultada e o cabecalho ganhou navegacao explicita para Beleza Natural e Artesanato abaixo de 768 px.                                                           |
| 9. Alvos de toque pequenos      | Parcialmente corrigido | Paginacao e acoes principais do cabecalho chegaram a 44 px; quantidade no popover do carrinho subiu de 28 para 36 px, ainda abaixo da meta, e o carrinho de pagina nao foi alterado. |
| 11. Movimento reduzido          | Parcialmente corrigido | Existe agora uma regra global para `prefers-reduced-motion`, mas ela usa supressao generica de duracoes; ainda falta verificar alternativas intencionais para feedback e estado.     |
| 12. Icones decorativos expostos | Parcialmente corrigido | Alguns icones do checkout receberam `aria-hidden`, mas o problema sistemico permanece nos demais componentes.                                                                        |
| 14. Recursos visuais externos   | Parcialmente corrigido | A imagem CSS remota do catalogo foi substituida por `/personalizado.webp`; o stylesheet externo de Material Symbols permanece.                                                       |
| 15. Destaque lateral            | Resolvido              | O `border-l-4` da historia da fundadora foi removido e a citacao passou a depender apenas da composicao tipografica.                                                                 |

Tambem foram corrigidos problemas que nao apareciam como itens independentes no relatorio original: a pagina de Beleza Natural passou a restaurar `?page=` no carregamento, catalogos ganharam estado vazio e produtos sem preco agora abrem o fluxo de consulta em vez de exibirem uma acao desabilitada.

## Resultado geral

**Audit Health Score original: 10/20 — Acceptable; trabalho significativo necessario.**

| Dimensao                 |      Nota | Principal achado                                  |
| ------------------------ | --------: | ------------------------------------------------- |
| Accessibility            |       2/4 | Campos sem nome acessivel, contraste e legendas   |
| Performance              |       2/4 | Imagens nao otimizadas e refetch duplicado        |
| Responsive Design        |       2/4 | Busca e navegacao desaparecem no mobile           |
| Theming                  |       2/4 | Tokens parciais e paleta paralela na autenticacao |
| Implementation Integrity |       2/4 | Feedback inconsistente e acao quebrada            |
| **Total**                | **10/20** | **Acceptable**                                    |

Foram identificados originalmente 15 problemas: 8 P1, 6 P2 e 1 P3. Nenhum P0. Apos o polimento, permanecem 13 problemas abertos: 7 P1 e 6 P2, dos quais 5 estao parcialmente corrigidos. O unico P3 foi resolvido.

## Implementation Integrity Verdict

A implementacao passa no criterio de possuir um sistema coerente e especifico para o produto. Conteudo, imagens, tipografia, cores e fluxos representam o Atelie Guadalupe e nao parecem intercambiaveis com um e-commerce generico.

Ainda existem desvios relevantes de acessibilidade, performance, theming e das regras internas de feedback. O desvio de navegacao movel registrado na auditoria original foi corrigido no polimento posterior.

### Resultados do detector

Falsos positivos verificados:

- As classes de grid decorativo em `app/globals.css` estao sem uso.
- Material Symbols e permitido pela orientacao de componentes do proprio `DESIGN.md`.
- O alerta `gray-on-color` do upload ocorre apenas no estado de hover.

Achado confirmado na auditoria original e corrigido no polimento:

- O `border-l-4` da historia da fundadora conflitava com a proibicao de side-stripe accents do design system; a classe foi removida.

## P1 — corrigir antes do release

### 1. Controles sem nome acessivel

**Status apos o polimento:** parcialmente corrigido.

**Locais:**

- `components/admin/admin-users-client.tsx:132`
- `components/admin/admin-products-client.tsx:72`

As buscas publicas em `components/header/search-query-input.tsx` e `components/header/index.tsx` agora possuem `aria-label="Buscar produtos"` e saem deste achado. Os dois controles administrativos acima continuam pendentes.

**Categoria:** Accessibility  
**Impacto:** leitores de tela e comandos por voz recebem apenas placeholders ou nomes imprecisos.  
**Padrao:** WCAG 1.3.1, 3.3.2 e 4.1.2.  
**Recomendacao:** adicionar `label`, `aria-label` ou `aria-labelledby`, conforme o contexto.  
**Comando sugerido:** `$impeccable harden`.

### 2. Contraste insuficiente no CTA do WhatsApp

**Local:** `components/home/personal-diagnosis-dialog.tsx:115`  
**Categoria:** Accessibility / Theming  
**Impacto:** texto branco sobre `#25D366` tem contraste de 1.98:1, abaixo do minimo de 4.5:1.  
**Padrao:** WCAG 1.4.3.  
**Recomendacao:** usar texto escuro ou um verde mais escuro, preservando a identificacao do WhatsApp.  
**Comando sugerido:** `$impeccable colorize`.

### 3. Depoimentos em video nao oferecem legendas

**Local:** `app/page.tsx:24`  
**Categoria:** Accessibility  
**Impacto:** conteudo falado fica indisponivel para pessoas surdas ou em ambientes sem audio.  
**Padrao:** WCAG 1.2.2.  
**Recomendacao:** exigir uma faixa de legenda ou fornecer transcricao associada ao depoimento.  
**Comando sugerido:** `$impeccable harden`.

### 4. Busca e categorias desaparecem no mobile

**Status apos o polimento:** resolvido.

**Locais:**

- `components/header/header-frame.tsx:40`
- `components/header/index.tsx:20`

**Categoria:** Responsive Design  
**Correcao verificada:** a busca agora e renderizada em telas pequenas e `HeaderFrame` oferece navegacao movel explicita para Beleza Natural e Artesanato, com `aria-current` na colecao ativa.  
Nenhuma acao adicional e necessaria para este item.

### 5. A acao "Esqueci minha senha" nao funciona

**Local:** `components/auth/auth-screen.tsx:187`  
**Categoria:** Implementation Integrity  
**Impacto:** o `href="#"` nao recupera a conta e apresenta uma funcionalidade inexistente ao usuario. O `docs/API.md` documenta apenas a troca autenticada de senha, nao um fluxo de recuperacao.  
**Recomendacao:** remover temporariamente a acao ou implementar um fluxo real, incluindo o contrato necessario no backend.  
**Comando sugerido:** `$impeccable harden`.

### 6. Imagens de produto sao carregadas sem otimizacao

**Locais:**

- `components/shared/product-image.tsx:27`
- `components/collections/catalog/product-card.tsx:30`

**Categoria:** Performance  
**Impacto:** ate 24 imagens podem ser carregadas sem `loading="lazy"`, dimensoes intrinsecas, `sizes` ou transformacao responsiva. Isso aumenta trafego, LCP e risco de layout shift.  
**Recomendacao:** usar `next/image` com uma politica segura para URLs remotas, preservando o fallback atual.  
**Comando sugerido:** `$impeccable optimize`.

### 7. Catalogo refaz a consulta depois da hidratacao

**Locais:**

- `components/collections/collection-catalog.tsx:72`
- `hooks/use-products.ts:149`

**Categoria:** Performance  
**Impacto:** os dados buscados no servidor sao solicitados novamente pelo cliente em cada entrada no catalogo.  
**Recomendacao:** usar `skipClientFetch` na carga inicial e buscar novamente apenas quando filtros ou pagina mudarem.  
**Comando sugerido:** `$impeccable optimize`.

### 8. Falhas e sucessos usam canais inconsistentes ou ficam silenciosos

**Locais:**

- Erro do catalogo calculado, mas nao apresentado: `components/collections/collection-catalog.tsx:72`
- Mensagem inline de autenticacao: `components/auth/auth-screen.tsx:228`
- Mensagem inline de perfil: `components/profile/profile-data-view.tsx:73`
- Mensagem inline de testemunhos: `components/admin/admin-testimonials-client.tsx:600`

**Categoria:** Accessibility / Implementation Integrity  
**Impacto:** uma falha de rede pode parecer um catalogo vazio; mensagens nao anunciadas podem passar despercebidas. O comportamento tambem viola a regra do projeto que exige modal para mensagens de sucesso e erro.  
**Padrao:** WCAG 4.1.3.  
**Recomendacao:** centralizar o feedback no modal existente e garantir anuncio acessivel.  
**Comando sugerido:** `$impeccable harden`.

## P2 — corrigir no passe seguinte

### 9. Alvos de toque pequenos

**Status apos o polimento:** parcialmente corrigido.

**Locais:**

- `components/header/cart-dialog-button.tsx:125`
- `components/cart/cart-page-client.tsx:214`
- `components/collections/catalog/catalog-pagination.tsx:69`

**Categoria:** Responsive Design / Accessibility  
**Impacto atual:** a paginacao e os botoes principais do cabecalho agora possuem 44 px. Os controles de quantidade do popover do carrinho passaram de 28 para 36 px, mas ainda nao atingem a meta; os controles de `components/cart/cart-page-client.tsx` permanecem inalterados.  
**Recomendacao:** concluir a migracao dos controles de quantidade restantes para 44 por 44 px.  
**Comando sugerido:** `$impeccable adapt`.

### 10. Linha do carrinho fica apertada em telas estreitas

**Local:** `components/cart/cart-page-client.tsx:192`  
**Categoria:** Responsive Design  
**Impacto:** imagem, descricao e seletor de quantidade ficam na mesma linha. Em 320 px sobra espaco insuficiente para nomes de produto.  
**Recomendacao:** empilhar ou reposicionar os controles no menor breakpoint.  
**Comando sugerido:** `$impeccable adapt`.

### 11. Preferencia de movimento nao e respeitada sistematicamente

**Status apos o polimento:** parcialmente corrigido.

**Locais:**

- `app/globals.css:42`
- Skeletons com `animate-pulse`
- Escalas em hover e rolagem programatica suave

**Categoria:** Accessibility  
**Impacto atual:** `app/globals.css` passou a responder a `prefers-reduced-motion`, removendo rolagem suave e encurtando animacoes. A regra ainda usa uma supressao global de `0.01ms`, portanto nao comprova que feedbacks importantes preservam estado e hierarquia.  
**Padrao:** `prefers-reduced-motion`; WCAG 2.3.3.  
**Recomendacao:** substituir a supressao generica por alternativas especificas que preservem estado, foco e feedback.  
**Comando sugerido:** `$impeccable animate`.

### 12. Icones decorativos ficam expostos a arvore acessivel

**Status apos o polimento:** parcialmente corrigido.

**Escopo atual:** alguns icones de etapas, retorno, endereco e resumo do checkout receberam `aria-hidden="true"`; o levantamento original de Material Symbols ainda precisa ser revisto nos demais componentes.  
**Categoria:** Accessibility  
**Impacto:** breadcrumbs e decoracoes podem ser pronunciados como `chevron_right`, `format_quote` e outros nomes internos.  
**Padrao:** WCAG 1.3.1 e 4.1.2.  
**Recomendacao:** adicionar `aria-hidden="true"` aos icones decorativos e manter nomes acessiveis nos controles acionaveis.  
**Comando sugerido:** `$impeccable harden`.

### 13. Sistema de tokens esta incompleto

**Escopo:** 111 ocorrencias de cores literais em 28 arquivos; a autenticacao concentra uma paleta paralela em `components/auth/auth-screen.tsx:156`.  
**Categoria:** Theming / Implementation Integrity  
**Impacto:** mudancas de tema e manutencao visual exigem alteracoes dispersas e podem gerar inconsistencias.  
**Recomendacao:** migrar valores recorrentes para tokens sem remover diferencas intencionais entre superficies.  
**Comando sugerido:** `$impeccable colorize`.

### 14. Recursos visuais dependem de fontes externas nao otimizadas

**Status apos o polimento:** parcialmente corrigido.

**Locais:**

- Stylesheet do Material Symbols: `app/layout.tsx:33`
- ~~Imagem remota usada como CSS em `components/collections/collection-catalog.tsx`~~ — substituida pelo asset local `/personalizado.webp`.

**Categoria:** Performance  
**Impacto atual:** a imagem do catalogo nao depende mais de host externo. Material Symbols ainda depende do Google Fonts e pode atrasar ou desaparecer quando o recurso externo estiver indisponivel.  
**Recomendacao:** hospedar localmente o recurso restante.  
**Comando sugerido:** `$impeccable optimize`.

## P3 — polish

### 15. Destaque lateral contradiz o design system

**Status apos o polimento:** resolvido.

**Local:** `app/page.tsx:284`  
**Categoria:** Implementation Integrity  
**Correcao verificada:** a classe `border-l-4` foi removida e a citacao agora usa apenas hierarquia tipografica. Nenhuma acao adicional e necessaria para este item.

## Pontos positivos a preservar

- Build de producao, TypeScript e ESLint passam sem erros.
- `lang="pt-BR"`, landmarks e hierarquia semantica basica estao presentes.
- Radix Dialog fornece foco, Escape e semantica modal robustos.
- Existe foco visivel global.
- Busca e navegacao de colecoes permanecem acessiveis no mobile.
- As buscas publicas possuem nome acessivel explicito.
- A paginacao usa alvos de toque de 44 px e indica a pagina atual com `aria-current`.
- Formularios de autenticacao, endereco e checkout possuem bons exemplos de labels explicitos.
- O catalogo chega com dados renderizados no servidor.
- A identidade visual e o conteudo sao claramente especificos da marca.

## Ordem recomendada de execucao

1. **P1 — `$impeccable harden`:** acessibilidade, recuperacao de senha e feedback por modal.
2. **P1 — `$impeccable optimize`:** imagens de produto, consulta duplicada e o recurso externo restante.
3. **P1 — `$impeccable colorize`:** contraste do WhatsApp e consolidacao de tokens.
4. **P2 — `$impeccable adapt`:** concluir os alvos de toque e o layout estreito do carrinho; navegacao e busca mobile ja foram corrigidas.
5. **P3 — `$impeccable polish`:** confirmacao visual final depois das correcoes; o desvio de faixa lateral ja foi removido.

As etapas podem ser executadas individualmente, todas de uma vez ou em outra ordem, desde que os itens P1 sejam tratados antes do release.

## Verificacao final obrigatoria

Depois de concluir as correcoes:

1. Executar lint, verificacao de tipos e build de producao.
2. Revisar as superficies em desktop e mobile.
3. Executar novamente **`$impeccable audit`** para medir a evolucao da nota e identificar regressões.

Nao considerar este backlog concluido antes do novo audit.

## Manutencao do contexto Impeccable

- A secao `Register` de `PRODUCT.md` esta obsoleta e foi ignorada nesta auditoria.
- O arquivo `PRODUCT.md` antecede o schema atual. A atualizacao pertence ao comando `$impeccable init` e deve ser feita separadamente deste backlog.
