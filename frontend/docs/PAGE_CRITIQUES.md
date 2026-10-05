# Críticas de UX por página

Auditoria Impeccable baseada em dois pareceres independentes por alvo: Assessment A (revisão de design sem acesso ao detector) e Assessment B (fonte + detector). Por determinação do projeto, nenhum servidor foi iniciado; inspeção em browser e overlay foram omitidos, e nenhum teste ou build foi executado durante esta etapa.

## 1. Home — `app/page.tsx`

**Método:** dual-agent (A: `assessment_a` · B: `assessment_b`)  
**Design Health:** **17/32 — Aceitável** (heurísticas 7 e 10 n/a)  
**Maior oportunidade:** transformar as três jornadas — comprar beleza natural, receber orientação e conhecer o artesanato — em um modelo mental claro, com confiança antes do convite à ação.

### Problemas prioritários

1. **P0 — Busca sem resultado:** na home, a busca atualiza `/?search=...`, mas a superfície não renderiza resultados nem feedback. Direcionar a uma busca real ou retirar o controle até existir destino.
2. **P1 — Jornadas concorrentes:** Beleza e Artesanato aparecem juntas no hero, enquanto a orientação personalizada fica abaixo da dobra. Nomear destinatário, resultado e próximo passo de cada rota.
3. **P1 — Proposta abstrata e alegacões sem prova:** o H1 devocional precede a explicação concreta; “diagnóstico”, “especialistas”, “100% puro” e “terapêutico” exigem credenciais, ingredientes e limites visíveis.
4. **P2 — Prova social frágil:** depoimentos carecem de autoria/contexto; falha de API parece estado vazio e a CTA da seção envia apenas para Artesanato.

### Evidência do detector

`detect.mjs --json app/page.tsx` retornou exit 0 e **0 achados**. Isso indica ausência de padrões mecânicos cobertos, não valida hierarquia ou confiança. A fonte confirma H1 abstrato (`app/page.tsx:111`), orientação abaixo do hero (`:161`) e fundadora apenas no fim (`:249`).

### Personas

- **Jordan (primeira visita):** não entende em cinco segundos o que comprar, qual rota escolher ou se “diagnóstico” é clínico; a busca aparentemente quebrada destrói confiança.
- **Riley (criteriosa):** questiona alegações absolutas, credenciais ausentes e depoimentos anônimos; percebe falha técnica mascarada como vazio.
- **Casey (móvel/distraída):** encontra muitos alvos na primeira dobra, perde o contexto visual do artesanato no mobile e precisa rolar para ver a fundadora.

### Ações recomendadas

1. `$impeccable harden`: corrigir busca e diferenciar falha de depoimentos de estado vazio.
2. `$impeccable shape`: definir a hierarquia e a promessa das três jornadas.
3. `$impeccable clarify`: tornar proposta, linguagem de orientação e alegações verificáveis.
4. `$impeccable polish`: consolidar semântica, mídia e encerramento com CTA.

### Run notes

Slug `app-page-tsx`; ignore list ausente; assessments isolados e sequenciais; detector executado uma vez; browser visibility e overlay skipped por proibição de iniciar servidor; live server não iniciado; fallback fonte + detector; sem arquivos temporários pendentes.

## 2. Beleza Natural — `app/beleza-natural/page.tsx`

**Método:** dual-agent (A: `assessment_a` · B: `assessment_b`) · **Score:** **23/40 — Aceitável**  
**Maior oportunidade:** reorganizar a descoberta pela necessidade da cliente e levar produtos para cima no mobile.

- **P1:** falha inicial vira catálogo vazio; preservar erro e oferecer retry no modal.
- **P1:** promoção e filtros enterram o primeiro produto no mobile; compactar em ajuda + drawer.
- **P1:** “linhas” refletem taxonomia interna; explicar por benefício/uso.
- **P1:** “Comprar” abre tamanho e sucesso fecha silenciosamente; alinhar rótulo e modal de próximo passo.

Detector: exit 0, 0 achados; o wrapper não inclui componentes importados. Fonte ainda mostra contagem apenas da página atual. Personas: Jordan não entende linhas; Casey rola demais e perde feedback; Riley detecta vazio falso/alegações sem prova. Ações: `$impeccable adapt`, `$impeccable shape`, `$impeccable harden`, `$impeccable polish`.

## 3. Artesanato — `app/artesanato/page.tsx`

**Método:** dual-agent · **Score:** **20/40 — Aceitável**  
**Maior oportunidade:** tornar o modelo de dados e compra tão artesanal quanto a identidade visual.

- **P1:** `ARTISANAL` mistura regra operacional e coleção sacra; separar categoria comercial.
- **P1:** seleção em gramas contradiz peças; modelar unidade, dimensão ou encomenda.
- **P1:** cards não provam autoria; mostrar material, técnica, dimensão e disponibilidade.
- **P1:** falha de linhas parece ausência de cadastro; distinguir erro/vazio.

Detector: exit 0, 0 achados; fonte confirma CTA pequena, salto de heading e contagem parcial. Personas: Jordan encontra semântica contraditória; Riley não consegue verificar autoria/estoque; Casey precisa abrir detalhes para comparar. Ações: `$impeccable shape`, `$impeccable clarify`, `$impeccable harden`, `$impeccable colorize`.

## 4. Produto — `app/produto/[slug]/page.tsx`

**Método:** dual-agent · **Score:** **22/40 — Aceitável**  
**Maior oportunidade:** oferecer informação de decisão específica para cosmético e artesanato.

- **P1:** faltam ingredientes/uso ou material/dimensão, além de entrega e troca.
- **P1:** mesmo seletor em gramas atende produtos incompatíveis.
- **P1:** sucesso/erro por toast viola o modal e não oferece próximo passo.
- **P1:** falha de API vira 404; separar indisponibilidade de inexistência.

Detector: exit 0, 0 achados; fonte confirma `sm:grid-cols-2` sem `grid` e breadcrumb pouco semântico. Personas: Jordan compra subinformada; Riley encontra 404 falso; Casey perde CTA abaixo da imagem. Ações: `$impeccable shape`, `$impeccable harden`, `$impeccable polish`.

## 5. Carrinho — `app/carrinho/page.tsx`

**Método:** dual-agent · **Score:** **22/40 — Aceitável**  
**Maior oportunidade:** devolver controle antes do checkout e eliminar bloqueios artificiais.

- **P1:** sem remoção individual; limpar tudo é imediato e sem confirmação.
- **P1:** retirada exige CEP; revelar escolha entrega/retirada antes do formulário.
- **P1:** `isAvailable` é ignorado; bloquear e orientar itens indisponíveis.
- **P1:** erros de CEP/frete são inline e busca do header não funciona.

Detector: exit 0, 0 achados. Fonte confirma bom resumo/cotação e empty state enviesado para Beleza. Personas: Jordan não consegue remover; Casey pode perder tudo; Riley encontra itens inativos e link pseudo-desabilitado. Ações: `$impeccable harden`, `$impeccable clarify`, `$impeccable polish`.

## 6. Checkout — `app/checkout/page.tsx`

**Método:** dual-agent · **Score:** **19/40 — Ruim**  
**Maior oportunidade:** corrigir integridade financeira/estado e fazer etapas refletirem o fluxo real.

- **P0:** pedido `AWAITING_PAYMENT` pode ocultar o único CTA que cria/abre pagamento.
- **P0:** total visível não subtrai descontos.
- **P1:** stepper Entrega–Conferência–Pagamento não corresponde ao conteúdo simultâneo.
- **P1:** endereço confirmado não pode ser alterado localmente.

Detector: exit 0, 0 achados; fonte confirma até CPF + oito campos + telefone + revisão visíveis. Personas: Jordan encontra “Tudo certo” com pendências; Casey enfrenta formulários longos; Riley encontra total/estado incoerentes. Ações: `$impeccable harden`, `$impeccable clarify`, `$impeccable distill`.

## 7. Sucesso do checkout — `app/checkout/success/page.tsx`

**Método:** dual-agent · **Score:** **13/40 — Ruim**  
**Maior oportunidade:** transformar retorno do provedor em confirmação verificada, recibo e expectativa concreta.

- **P0:** qualquer acesso afirma “Pagamento recebido” sem consultar pedido/pagamento.
- **P1:** não há recibo com pedido, valor, itens ou modalidade.
- **P1:** entrega/retirada e contato são vagos.
- **P1:** pendência/recusa/sessão perdida não têm recuperação.

Detector: exit 0, 0 achados; fonte confirma rota sem validação e CTA dependente de hidratação. Personas: Jordan acredita na confirmação falsa; Casey fecha cedo; Riley abre rota direta. Ações: `$impeccable harden`, `$impeccable clarify`, `$impeccable distill`.

## 8. Cobrança manual — `app/checkout/manual/[uuid]/page.tsx`

**Método:** dual-agent · **Score:** **15/40 — Ruim**  
**Maior oportunidade:** provar legitimidade com valor, descrição, referência, validade e estado antes do redirecionamento.

- **P1:** valor e descrição não aparecem antes do pagamento.
- **P1:** estados só surgem como erro achatado depois do clique.
- **P1:** cadeado/marca não substituem dados reconhecíveis da cobrança.
- **P1:** erro oferece apenas “Entendi”, sem retry, novo link ou suporte.

Detector: exit 0, 0 achados; fonte mostra que o POST devolve dados que a UI descarta e não há GET público de prévia. Personas: Jordan não reconhece a cobrança; Casey alterna com WhatsApp para lembrar; Riley testa estados sem diferenciação. Ações: `$impeccable shape`, `$impeccable harden`, `$impeccable clarify`, `$impeccable distill`.

## 9. Login — `app/login/page.tsx`

**Método:** dual-agent · **Score:** **25/40 — Aceitável**  
**Maior oportunidade:** fazer sessão, recuperação e contexto prometido corresponderem ao comportamento real.

- **P1:** “Lembrar de mim” não altera a cookie de 30 dias.
- **P1:** falta voltar à loja.
- **P1:** copy ignora se login veio de checkout, perfil ou admin.
- **P2:** falta mostrar senha e erros acionáveis.

Detector: exit 0, 0 achados; fonte confirma checkbox inerte, copyright 2024 e estado “Aguarde”. Personas: Jordan não confia na continuidade; Sam precisa de toggle/`aria-busy`; Casey recebe marca reduzida no mobile. Ações: `$impeccable harden`, `$impeccable clarify`, `$impeccable polish`.

## 10. Cadastro — `app/cadastro/page.tsx`

**Método:** dual-agent · **Score:** **19/40 — Ruim**  
**Maior oportunidade:** adiar dados sensíveis e tornar requisitos/privacidade explícitos.

- **P1:** documento opcional no backend é obrigatório na UI e ambíguo.
- **P1:** regras complexas de senha ficam escondidas até o erro.
- **P1:** não há contexto de privacidade/finalidade.
- **P1:** erros não apontam campo ou correção.

Detector: exit 0, 0 achados; fonte confirma campo sem máscara/inputMode e benefício vago. Personas: Jordan não entende documento; Sam perde associação/requisitos; Casey erra CPF/senha no mobile. Ações: `$impeccable distill`, `$impeccable harden`, `$impeccable clarify`.

## 11. Recuperar senha — `app/recuperar-senha/page.tsx`

**Método:** dual-agent · **Score:** **33/40 — Bom**  
**Maior oportunidade:** reforçar legitimidade no mobile e transformar modais em recuperação direta.

- **P1:** mobile oculta toda identificação clara do Ateliê.
- **P2:** modais explicam a ação, mas terminam apenas em “Entendi”.
- **P2:** falta orientar remetente/spam.
- **P2:** cooldown local se perde em refresh/navegação.

Detector: exit 0, 0 achados; fonte confirma sequenciamento, proteção anti-enumeração e validação fortes. Personas: Jordan perde identidade/CTA; Casey perde estado; Sam precisa `aria-busy`/foco. Ações: `$impeccable clarify`, `$impeccable harden`, `$impeccable delight`.

## 12. Perfil — `app/perfil/page.tsx`

**Método:** dual-agent · **Score:** **24/40 — Aceitável**  
**Maior oportunidade:** tornar edição reversível/visível e histórico completo sem duplicar detalhes.

- **P1:** “Cancelar” é inerte e não há dirty state.
- **P1:** só dez pedidos aparecem como histórico completo.
- **P1:** editor CPF pode truncar documento de 14 dígitos.
- **P2:** cards duplicam detalhe e labels não estão associados.

Detector: exit 0, 0 achados; fonte confirma hash `#pagamento` capaz de gerar vazio e data fictícia como placeholder. Personas: Jordan confia no cancelar falso; Riley perde pedidos antigos; Sam sofre com labels/calendário. Ações: `$impeccable harden`, `$impeccable shape`, `$impeccable distill`, `$impeccable audit`.

## 13. Detalhe do pedido — `app/perfil/pedidos/[uuid]/page.tsx`

**Método:** dual-agent · **Score:** **26/40 — Aceitável**  
**Maior oportunidade:** unificar pedido/pagamento/envio em uma narrativa com próxima ação.

- **P1:** timeline deriva só de `order.status` e pode contradizer pagamento/fulfillment.
- **P1:** estados acionáveis não oferecem retomar pagamento ou suporte.
- **P1:** status fica obsoleto após um fetch.
- **P2:** linguagem de `PROCESSING` é inconsistente; erro fechado deixa vazio.

Detector: exit 0, 0 achados; fonte confirma estados desconhecidos degradando ao primeiro passo e `checkoutUrl` ignorada. Personas: Jordan interpreta timeline como concluída; Riley não sabe atualização; Sam fica sem ação em exceção. Ações: `$impeccable harden`, `$impeccable shape`, `$impeccable clarify`.

## 14. Dashboard admin — `app/admin/page.tsx`

**Método:** dual-agent · **Score:** **16/40 — Ruim**  
**Maior oportunidade:** trocar resumo decorativo por métricas confiáveis e fila de trabalho.

- **P0:** vendas/ticket incluem pedidos não pagos ou cancelados.
- **P1:** pedidos não abrem detalhe; busca/“Ver todos” são inertes.
- **P1:** não há prioridades de pagamento, preparação, envio ou falha.
- **P1:** falha de dados aparece como zero real.

Detector: exit 0, 0 achados; fonte confirma seletor de período falso e cliente genérico. Personas: proprietária decide com receita inflada; expedição não vê fila; atendimento não abre contexto. Ações: `$impeccable harden`, `$impeccable shape`, `$impeccable clarify`, `$impeccable distill`.

## 15. Produtos admin — `app/admin/produtos/page.tsx`

**Método:** dual-agent · **Score:** **17/40 — Ruim**  
**Maior oportunidade:** tornar paginação, filtros, estoque e desativação operacionalmente verdadeiros.

- **P0:** indicadores contam apenas os primeiros 40 produtos.
- **P1:** estoque zero, baixo e sem controle são representados incorretamente.
- **P1:** categorias são inertes e “Ordenar” na verdade filtra linha.
- **P1:** lixeira sugere excluir, mas soft delete pede desativar/reativar com modal.

Detector: exit 0, 0 achados; fonte confirma preço sem contexto e falha convertida em vazio. Personas: proprietária crê em total parcial; produção prioriza estoque errado; admin teme exclusão definitiva. Ações: `$impeccable harden`, `$impeccable clarify`, `$impeccable distill`.

## 16. Novo produto — `app/admin/produtos/novo/page.tsx`

**Método:** dual-agent · **Score:** **20/40 — Aceitável**  
**Maior oportunidade:** prevenir publicação incompleta com estado real, validação e prévia fiel.

- **P1:** switch “Ativo” é falso e esconde publicação imediata.
- **P1:** prévia mostra só imagem, não o card/vitrine.
- **P1:** espaços/`NaN` e falha de linhas escapam da prevenção.
- **P1:** toast/erro inline violam modal e CTA permite duplo clique.

Detector: exit 0, 0 achados; fonte confirma toolbar inerte e cancelar sem aviso. Personas: proprietária publica sem perceber; catálogo confia em controles falsos; expedição pode informar peso errado. Ações: `$impeccable clarify`, `$impeccable shape`, `$impeccable harden`, `$impeccable distill`.

### Run notes comuns das páginas 2–16

Ignore list ausente; Assessment A e B isolados e sequenciais; detector executado exatamente uma vez por alvo; browser visibility e overlay skipped por proibição explícita de iniciar servidor; live server não iniciado; fallback fonte + detector CLI; sem testes/build ou alteração de UI.

## 17. Editar produto — `app/admin/produtos/[uuid]/page.tsx`

**Método:** dual-agent · **Score:** **16/40 — Ruim**  
**Maior oportunidade:** tornar contexto, mudanças e efeitos persistidos visíveis e confiáveis.

- **P0:** produto é procurado nos primeiros 100 em vez de `GET /products/:uuid`; pode sumir após salvar.
- **P1:** “Remover imagem” altera só a prévia, não persiste remoção.
- **P1:** categoria, linha e slug mudam sem resumo de impacto/confirmar.
- **P1:** não há dirty state, reset ou alerta de saída; toast/inline violam o modal.

Detector: exit 0, 0 achados; fonte confirma status decorativo e validação que aceita espaços/`NaN`. Personas: proprietária altera URL sem saber; catálogo remove imagem sem efeito; estoque muda categoria/preço sem revisão. Ações: `$impeccable harden`, `$impeccable clarify`, `$impeccable polish`.

## 18. Testemunhos admin — `app/admin/testemunhos/page.tsx`

**Método:** dual-agent · **Score:** **23/40 — Aceitável**  
**Maior oportunidade:** completar o ciclo editorial e proteger upload/publicação/exclusão.

- **P0:** exclusão permanente do registro e vídeo acontece em um clique.
- **P1:** falha inicial aparece como vazio.
- **P1:** desativar não oferece editar/reativar/pré-visualizar.
- **P1:** modal pode fechar durante upload sem cancelar nem manter progresso.

Detector: exit 0, 0 achados; fonte confirma upload acessível, mas sem prévia e publicação ativa por padrão. Personas: proprietária apaga definitivamente; conteúdo não republica; conexão lenta perde acompanhamento. Ações: `$impeccable harden`, `$impeccable shape`, `$impeccable clarify`.

## 19. Cobrança admin — `app/admin/cobranca/page.tsx`

**Método:** dual-agent · **Score:** **27/40 — Aceitável**  
**Maior oportunidade:** explicitar a jornada criar–verificar–compartilhar e impedir cobrança irrecuperável errada.

- **P1:** cria recurso externo sem confirmação final de valor/descrição/expiração.
- **P1:** diálogo final omite descrição/validade e não abre como cliente.
- **P1:** fechar o diálogo elimina a única forma de copiar/abrir o link.
- **P1:** significado/alcance da expiração é ambíguo; valor não tem teto/alerta.

Detector: exit 0, 0 achados; fonte confirma status `CREATING` podendo receber “pronta” e histórico sem validade/ações. Personas: proprietária erra um zero; atendimento perde link; financeiro não audita vencimentos. Ações: `$impeccable harden`, `$impeccable shape`, `$impeccable clarify`.

## 20. Usuários admin — `app/admin/usuarios/page.tsx`

**Método:** dual-agent · **Score:** **13/40 — Ruim**  
**Maior oportunidade:** separar clientes/equipe e aplicar menor privilégio, contrato e recuperação real.

- **P0:** formulário omite `document` exigido pelo contrato documentado.
- **P1:** `ADMIN` é concedido sem explicar escopo/revisão; default muda silenciosamente para `SUBADMIN`.
- **P1:** busca/filtros/menu são inertes; não dá para alterar ou revogar acesso.
- **P1:** falha/403/vazio são indistinguíveis e senha temporária é insegura.

Detector: exit 0, 0 achados; fonte confirma enum técnico, inativo como “Pendente” e nenhuma proteção contra auto-bloqueio. Personas: proprietária concede privilégio total sem contexto; SUBADMIN vê vazio; atendimento mistura cliente/equipe. Ações: `$impeccable harden`, `$impeccable clarify`, `$impeccable shape`.

### Run notes finais

Slugs derivados por `critique-storage`; ignore list ausente; dois assessments isolados por cada uma das 20 páginas; detector CLI executado uma vez por alvo e retornou 0 achados em todos os wrappers (com limitação declarada: imports não percorridos). Browser visibility e overlay skipped por proibição explícita de iniciar servidor; live server nunca iniciado; fallback fonte + detector; snapshots persistidos, trends lidos e arquivos temporários removidos. Nenhum teste/build ou alteração de UI nesta etapa.
