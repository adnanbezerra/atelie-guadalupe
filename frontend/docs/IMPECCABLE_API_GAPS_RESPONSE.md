# Resposta do backend às lacunas Impeccable

Data da revisão: 2026-10-06.

Este documento registra o que foi implementado no backend e o que deve ser ajustado no frontend
para o lançamento. O contrato efetivo está em `docs/API.md`; propostas não implementadas não devem
ser enviadas à API.

## Resumo

| Gap                                     | Decisão                         | Ação do frontend                                                                |
| --------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------- |
| GAP-01 — prévia de cobrança             | Implementado no backend         | Consumir `GET /payment-links/:uuid`; só chamar o `POST` ao confirmar pagamento  |
| GAP-02 — detalhes e venda por categoria | Não incluir no lançamento atual | Usar descrições e `priceOptions`; ocultar editores de `details` e `saleOptions` |
| GAP-03 — retirada local                 | Não incluir no lançamento atual | Ocultar retirada; manter endereço, cotação e confirmação de frete obrigatórios  |
| GAP-04 — remover imagem                 | Implementado no backend         | Enviar `removeImage=true`; nunca combinar com arquivo `image`                   |
| GAP-05 — inativos e reativação          | Implementado no backend         | Usar `status` na lista, token administrativo no detalhe e `isActive` no `PATCH` |
| GAP-06 — listas e dashboard             | Implementado no backend         | Consumir paginação e métricas da API; não calcular totais sobre a página atual  |

## GAP-01 — prévia pública de cobrança

Implementado conforme proposta. A leitura pública não chama provedor nem grava estado. Para links
`ACTIVE` ou `PENDING` cujo prazo passou, a resposta apresenta `EXPIRED` sem mutação. Dados do
criador, IDs do provedor, URL de checkout e dados de reembolso não são expostos.

Frontend deve habilitar o CTA somente para `ACTIVE` ou `PENDING` e chamar
`POST /payment-links/:uuid/payment` somente após ação explícita do cliente.

## GAP-02 — detalhes e opções de venda por categoria

Decisão: não fazer uma extensão parcial antes do lançamento.

O modelo atual usa preço por linha (`priceOptions`) e `productSize` em carrinho, pedido, estoque,
descontos e catálogo do provedor de pagamento. Introduzir `details`, `saleOptions` e
`saleOptionCode` exige migration, backfill dos produtos existentes e troca coordenada de snapshots
de carrinho/pedido. Também não existe uma fonte de dados aprovada para ingredientes, técnica,
material e dimensões. Criar campos vazios ou inferidos no frontend continuaria produzindo dados
falsos.

Para o lançamento atual, frontend deve:

- usar `shortDescription`, `longDescription` e `description` para conteúdo disponível;
- usar `priceOptions`, `size` e `productSize` exatamente como documentados;
- ocultar formulários e blocos de ingredientes, modo de uso, material, técnica e dimensões;
- não enviar `details`, `saleOptions` ou `saleOptionCode`.

Se venda unitária de artesanato for requisito obrigatório de lançamento, isso bloqueia o release e
deve virar uma entrega própria de backend + backfill + frontend. Não deve ser simulado no cliente.

## GAP-03 — retirada local

Decisão: não oferecer retirada no lançamento atual.

Retirada altera elegibilidade por item, cotação, criação do pedido, snapshot imutável do local,
pagamento e pós-compra. A plataforma possui endereço operacional, mas ainda não existe contrato de
local público, modo de entrega no pedido nem regra aprovada para carrinhos mistos. Acrescentar apenas
uma opção na resposta de frete criaria pedidos que os fluxos seguintes não conseguem representar.

Frontend deve ocultar “Retirar no local” e manter o fluxo atual: endereço obrigatório, cotação da
SuperFrete e confirmação do serviço antes do checkout. Se retirada for obrigatória, deve ser
implementada como feature completa e coordenada, não como fallback visual.

## GAP-04 — remoção persistente de imagem

Implementado. `PATCH /products/:uuid` aceita `removeImage=true`; a resposta pode retornar
`imageUrl: null`. `image` e `removeImage=true` são mutuamente exclusivos. Remover novamente um
produto já sem imagem é idempotente. Falha do storage retorna `503` sem limpar a referência no
Postgres.

Desativar produto não remove sua imagem, pois a mesma referência precisa permanecer disponível para
auditoria e reativação.

## GAP-05 — inativos e reativação

Implementado:

- `GET /products` aceita `status=ACTIVE|INACTIVE|ALL`;
- `INACTIVE` e `ALL` exigem `ADMIN` ou `SUBADMIN`;
- `GET /products/:uuid` continua público para ativos e aceita token administrativo para inativos;
- `PATCH /products/:uuid` aceita `isActive=true|false`;
- reativação valida textos obrigatórios, preços da linha e, para artesanato, estoque e peso;
- `DELETE /products/:uuid` continua sendo desativação compatível e idempotente.

Frontend público deve continuar tratando `404` como produto indisponível. Área administrativa deve
enviar o token também nos `GET`s de lista/detalhe quando operar inativos.

## GAP-06 — paginação, filtros e agregações

Implementado para `GET /orders`, `GET /users`, `GET /testimonials` e
`GET /admin/dashboard`. Filtros e valores de ordenação aceitos estão em `docs/API.md`; valores fora
da whitelist retornam `422`. Todas as listas devolvem paginação real, inclusive resultado vazio.

Definições fechadas nesta implementação:

- período do dashboard é obrigatório (`from` e `to`);
- receita e ticket usam somente pagamentos com status `PAID` e `paidAt` dentro do período;
- métricas operacionais e prioridades usam pedidos criados dentro do período;
- estoque baixo significa produto artesanal ativo com 1 a 5 unidades;
- sem estoque significa produto artesanal ativo com `stock <= 0`;
- `priorityOrders` retorna no máximo 10 itens;
- `GET /users` continua restrito a `ADMIN`. O frontend deve ocultar gestão de usuários para
  `SUBADMIN`; a revisão não amplia privilégio existente.

Frontend deve mostrar erro quando o dashboard falhar. Não substituir falha por zeros nem somar
somente os itens da página atual.
