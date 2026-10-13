# Contrato de imagens de produtos

## Problema observado

Em 9 de outubro de 2026, o `GET /products` do backend local retornou URLs
legadas para 14 produtos:

```json
{
    "slug": "hidrapele-rn",
    "imageUrl": "/media/products/hidrapele-rn.webp"
}
```

O backend não oferece `GET /media/products/:filename`; por isso essas URLs
respondem `404`.

## Contrato necessário

As respostas de produtos devem seguir `docs/API.md`:

- `GET /products`
- `GET /products/:uuid`
- `GET /products/slug/:slug`
- respostas de criação e atualização de produto

Para produtos com imagem, `imageUrl` deve conter a URL absoluta devolvida pelo
backend para o arquivo salvo no GridFS:

```text
https://<backend>/media/images/<id-do-gridfs>
```

Produtos sem imagem devem retornar `imageUrl: null`.

O backend não deve retornar caminhos `/media/products/*.webp`, porque esse
endpoint não existe no contrato atual.

## Correção esperada no backend

1. Garantir que cada imagem legada esteja armazenada no GridFS.
2. Atualizar o `imageUrl` dos registros legados com a URL de
   `GET /media/images/:id` correspondente.
3. Manter criação e atualização de produtos salvando somente a URL gerada após
   o upload bem-sucedido.
4. Não criar uma rota paralela `/media/products/:filename`; o endpoint existente
   `/media/images/:id` já é o contrato oficial.

## Critérios de aceite

- Nenhum item de `GET /products` retorna `imageUrl` iniciado por
  `/media/products/`.
- Toda URL não nula de imagem responde `200` com `Content-Type: image/*`.
- Listagem, detalhe, carrinho e administração exibem a mesma imagem usando o
  valor de `imageUrl` sem transformação no frontend.
- Vídeos de testemunhos continuam usando `videoUrl` sem alteração.
