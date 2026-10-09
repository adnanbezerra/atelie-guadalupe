# Contrato necessário: exclusão de linha de produto

A tela administrativa de Produtos/Linhas permite criar e editar linhas com os
preços de 70 g e 100 g. O contrato atual não documenta uma operação para excluir
linhas, portanto essa ação não é exibida no frontend.

## Endpoint necessário

`DELETE /products/lines/:uuid`

Autenticação obrigatória para `ADMIN` ou `SUBADMIN`.

### Sucesso

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "deleted": true
    }
}
```

### Linha vinculada a produtos

O backend não deve excluir uma linha ainda vinculada a qualquer produto, ativo
ou inativo. Resposta `409`:

```json
{
    "success": false,
    "error": {
        "code": "PRODUCT_LINE_IN_USE",
        "message": "Esta linha ainda está vinculada a produtos.",
        "details": []
    }
}
```

### Linha inexistente

Resposta `404` com código `RESOURCE_NOT_FOUND`.
