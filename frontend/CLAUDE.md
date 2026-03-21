# Ateliê Guadalupe Frontend

## Visão

- Frontend em Next.js App Router com foco em SSR para as páginas principais.
- Integração com backend baseada em `docs/API.md`.
- Layouts e conteúdo visual inspirados nas telas fornecidas via Stitch.

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

## Lacunas do contrato atual

- `docs/API.md` não documenta `GET /users`, então `/admin/usuarios` não consegue listar administradores de forma real.
- `docs/API.md` também não documenta endpoint próprio para geração de links de cobrança ou fluxo de customização, então `/admin/cobranca` combina integração real de pedidos com controles operacionais locais.

## Observações operacionais

- O backend usa valores monetários em centavos.
- O frontend espera JWT em cookie com um dos nomes: `auth-token`, `token`, `jwt` ou `access_token`.
- O base URL do backend pode ser configurado com `ATELIE_API_URL` ou `NEXT_PUBLIC_API_URL`. Sem env, o fallback segue `http://localhost:3000`, como documentado em `docs/API.md`.
