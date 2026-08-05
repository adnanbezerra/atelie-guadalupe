# Contratos de backend para concluir o hardening

Este documento registra recursos necessários no frontend que ainda não existem em `docs/API.md`. A interface não deve simular sucesso enquanto estes contratos não estiverem disponíveis.

## Recuperação pública de senha

O endpoint atual `PATCH /users/password` exige a senha atual e, portanto, não atende a ação **Esqueci minha senha**.

### `POST /auth/password-recovery`

Uso:

- solicitar a recuperação sem revelar se o e-mail está cadastrado;
- enviar um link de uso único com expiração curta;
- aplicar limite de tentativas por e-mail e IP.

Request:

```json
{
    "email": "maria@email.com"
}
```

Resposta `202`, idêntica para e-mails existentes e inexistentes:

```json
{
    "success": true,
    "data": {
        "message": "Se o e-mail estiver cadastrado, você receberá as instruções de recuperação."
    }
}
```

### `POST /auth/password-recovery/confirm`

Uso:

- validar o token de uso único;
- substituir a senha;
- invalidar o token e sessões anteriores depois do sucesso.

Request:

```json
{
    "token": "<token-de-uso-unico>",
    "newPassword": "NovaSenha@123"
}
```

Resposta `200`:

```json
{
    "success": true,
    "data": {
        "message": "Senha alterada com sucesso."
    }
}
```

Erros esperados:

- `400` ou `410` para token inválido, utilizado ou expirado;
- `422` para e-mail ou nova senha inválidos;
- `429` para excesso de tentativas.

## Legendas de testemunhos em vídeo

O modelo atual de testemunho guarda apenas `videoUrl`. Para atender WCAG 1.2.2, testemunhos em vídeo precisam aceitar e retornar uma faixa de legenda WebVTT.

Mudanças necessárias:

- aceitar um arquivo `captions` (`text/vtt`) ao criar ou atualizar um testemunho `VIDEO`;
- retornar `captionsUrl: string | null` no modelo;
- exigir legenda antes de permitir `isActive: true` em testemunhos de vídeo;
- disponibilizar a URL para uso em `<track kind="captions" srclang="pt-BR">`.
