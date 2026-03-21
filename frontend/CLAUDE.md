# Ateliê Guadalupe Frontend

## Visão

- Frontend em Next.js App Router com foco em SSR para as páginas principais.
- Integração com backend baseada em `docs/API.md`.
- Layouts e conteúdo visual guiados pelas telas fornecidas via Stitch.

## Diretriz visual atual

- Para as rotas já refatoradas, o Stitch é a fonte de verdade visual.
- O escopo desta etapa foi estético: preservar integrações, hooks e contratos já existentes, trocando apenas casca visual, hierarquia, espaçamento, tipografia e composição.
- Quando houver dúvida entre “interpretar” e “copiar”, priorizar copiar o Stitch.
- Os HTMLs baixados do Stitch podem ser usados como referência local em `.stitch/` para checagem de fidelidade.

## Rotas

- `/`: página inicial
- `/carrinho`: meu carrinho
- `/beleza-natural`: catálogo de beleza natural
- `/artesanato`: catálogo de artesanato e artes sacras
- `/admin`: dashboard administrativo
- `/admin/produtos`: gestão de produtos
- `/admin/cobranca`: cobrança e customização
- `/admin/usuarios`: gestão de usuários

## Arquitetura

- Páginas entram como server components com `dynamic = "force-dynamic"` quando dependem de backend.
- Interações pontuais ficam em client components com hooks customizados.
- `lib/api.ts` centraliza chamadas server-side.
- `app/api/[...path]/route.ts` funciona como proxy para chamadas client-side, reduzindo acoplamento e ajudando com autenticação por cookie.

## Hooks

- `useProducts`: catálogo público com atualização por filtros.
- `useCart`: leitura e mutações do carrinho, além de criação de pedido.
- `useAdminProducts`: CRUD de produtos.
- `useAdminOrders`: atualização de status de pedidos.

## UI

- Componentes base seguem a linha do shadcn: `Button`, `Card`, `Input`, `Select`, `Textarea`, `Badge`, `Skeleton`.
- Skeletons existem em `loading.tsx` de rotas e também dentro dos catálogos client-side.
- Tipografia e ícones foram aproximados ao Stitch com `Noto Sans`, `Noto Serif`, `Public Sans` e `Material Symbols Outlined`.

## Estado atual das telas

- `/` segue a composição principal do Stitch, incluindo hero e bloco de creme personalizado, sem seção extra fora da referência.
- `/carrinho` usa header e footer próprios no estilo da tela Stitch, em vez de depender do shell público compartilhado.
- `/beleza-natural` e `/artesanato` renderizam layouts próprios dentro de `components/collections/collection-catalog.tsx`, com estrutura visual específica de cada tela.
- `/admin`, `/admin/produtos`, `/admin/cobranca` e `/admin/usuarios` usam molduras administrativas alinhadas ao Stitch; nas páginas de cobrança e usuários, o frame completo foi recriado no próprio client component.
- `components/admin/admin-shell.tsx` hoje funciona como pass-through, porque as telas administrativas relevantes carregam sua própria moldura visual.

## Lacunas do contrato atual

- `docs/API.md` não documenta `GET /users`, então `/admin/usuarios` não consegue listar administradores de forma real.
- `docs/API.md` também não documenta endpoint próprio para geração de links de cobrança ou fluxo de customização, então `/admin/cobranca` combina integração real de pedidos com controles operacionais locais.

## Observações operacionais

- O backend usa valores monetários em centavos.
- O frontend espera JWT em cookie com um dos nomes: `auth-token`, `token`, `jwt` ou `access_token`.
- O base URL do backend pode ser configurado com `ATELIE_API_URL` ou `NEXT_PUBLIC_API_URL`. Sem env, o fallback segue `http://localhost:3000`, como documentado em `docs/API.md`.
