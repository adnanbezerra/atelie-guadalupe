# Contrato necessário para persistir um CEP sem endereço completo

## Contexto

Na tela do carrinho, o cliente pode optar por guardar o CEP consultado para
usá-lo depois no cadastro do endereço. Hoje `PATCH /users/me` só permite criar
um endereço novo quando também recebe rua, número, bairro, cidade, estado e
país. Por isso, o frontend mantém o CEP como rascunho da sessão até o endereço
completo ser salvo no checkout.

## Contrato solicitado

Adicionar ao usuário autenticado um campo opcional `addressZipCodeDraft`, sem
criar um endereço incompleto.

### `PATCH /users/me`

Request:

```json
{
    "addressZipCodeDraft": "01001000"
}
```

Regras:

- aceitar exatamente 8 dígitos;
- permitir `null` para limpar o rascunho;
- não criar nem alterar `address`;
- devolver o usuário atualizado no formato padrão da rota.

### `GET /users/me`

Incluir no objeto `user`:

```json
{
    "addressZipCodeDraft": "01001000"
}
```

Quando um endereço completo for criado com sucesso, o backend deve limpar
`addressZipCodeDraft` automaticamente.
