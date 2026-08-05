# Contrato necessário: recuperação de senha

O `docs/API.md` documenta apenas `PATCH /users/password`, que exige autenticação e a senha atual. Para reativar a ação pública “Esqueci minha senha”, o frontend precisa dos contratos abaixo.

## Solicitar recuperação

`POST /auth/password-recovery`

```json
{
    "email": "maria@email.com"
}
```

Por privacidade, a resposta deve ser a mesma exista ou não uma conta para o e-mail informado:

```json
{
    "success": true,
    "data": null
}
```

O backend envia um link de uso único e curta duração para o e-mail cadastrado.

## Redefinir senha

`POST /auth/password-recovery/confirm`

```json
{
    "token": "token-de-uso-unico",
    "newPassword": "NovaSenha@123"
}
```

Resposta de sucesso:

```json
{
    "success": true,
    "data": null
}
```

Erros esperados seguem o envelope padrão de `docs/API.md`:

- `422 VALIDATION_ERROR` para senha fora das regras;
- `401 INVALID_RECOVERY_TOKEN` para token inválido, expirado ou já utilizado;
- `429 TOO_MANY_REQUESTS` para excesso de solicitações.

Após a confirmação, o backend deve invalidar o token e as sessões existentes da conta.
