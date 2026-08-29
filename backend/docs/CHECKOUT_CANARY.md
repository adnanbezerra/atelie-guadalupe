# Liberacao canario do checkout

Este procedimento controla somente criacao de novos checkouts. Nao substitui smoke real,
reconciliacao, alertas, paineis dos provedores nem aprovacao humana. Nenhuma etapa local comprova
GL-051 sem execucao no ambiente implantado.

## Controles de acesso

`CHECKOUT_ENABLED=false` e o bloqueio mestre e sempre prevalece. Para habilitar criacao, configure
`CHECKOUT_ENABLED=true` junto de um modo explicito:

- `CHECKOUT_ROLLOUT_MODE=ALLOWLIST`: somente pedido cujo dono autenticado esteja em
  `CHECKOUT_ALLOWED_USER_UUIDS` pode criar checkout novo. Lista aceita ate 100 UUIDs validos, sem
  repeticao. Link de pagamento publico nao cria checkout novo nesse modo;
- `CHECKOUT_ROLLOUT_MODE=PUBLIC`: preserva acesso publico normal e exige
  `CHECKOUT_ALLOWED_USER_UUIDS` ausente. Use somente na liberacao total.

Backend usa identidade autenticada e confirma que ela possui o pedido antes do gate; UUID enviado
na rota nao escolhe coorte. Link publico permanece fechado em `ALLOWLIST`, mesmo conhecendo UUID do
link. Checkout ja persistido continua acessivel e estado `CREATING` continua reconciliavel em todos
os modos; gate fica imediatamente antes da primeira persistencia/chamada de criacao.

Alteracao exige recarregar todas as replicas. Depois, prove que usuario fora da lista e link publico
recebem HTTP 503 sem chamada de criacao, enquanto usuario interno aprovado entra no fluxo. Se uma
replica divergir, retire-a do trafego e aplique `CHECKOUT_ENABLED=false` em todas.

## Politica aprovada antes da etapa

Responsaveis tecnico e operacional devem registrar, antes de iniciar cada etapa:

| Campo                       | Valor aprovado |
| --------------------------- | -------------- |
| Nome da etapa               |                |
| Usuarios permitidos         |                |
| Duracao minima em minutos   |                |
| Pedidos concluidos minimos  |                |
| Inicio/fim UTC              |                |
| Release                     |                |
| Dono tecnico                |                |
| Dono operacional/financeiro |                |

Nao existem thresholds embutidos no codigo. Duracao e numero minimo de pedidos precisam ser
aprovados explicitamente; ambas condicoes devem passar. Expanda `ALLOWLIST` para equipe interna e
depois grupo pequeno. Transicao para `PUBLIC` e liberacao total, nao etapa percentual invisivel.

## Evidencia e avaliador read-only

Colete contagens sanitizadas do agregador, reconciliacao financeira, painel Superfrete, suporte e
e-mail. Arquivo nao pode conter UUID, e-mail, documento, endereco, token, URL de checkout ou payload.
Ele deve seguir schema fechado aceito por `src/scripts/canary-release-safety.ts`, com:

- `policy`: `stage` fechado em `INTERNAL`, `SMALL_GROUP` ou `PUBLIC`, mais
  `minimumDurationMinutes` e `minimumCompletedOrders` aprovados;
- `evidence`: duracao/pedidos, alertas, observacoes descartadas, divergencias financeiras e
  logisticas, incidentes de suporte, e-mails falhos, pedidos pagos parados, webhooks parados,
  duplicidades/valores/perdas/etiquetas, status da reconciliacao, teste do kill switch, registro de
  evidencia e duas aprovacoes.

Template intencionalmente invalido ate politica ser aprovada: substitua os dois `null` por inteiros
positivos registrados antes da etapa. Atualize demais valores somente a partir das fontes
operacionais.

```json
{
    "policy": {
        "stage": "INTERNAL",
        "minimumDurationMinutes": null,
        "minimumCompletedOrders": null
    },
    "evidence": {
        "durationMinutes": 0,
        "completedOrders": 0,
        "openAlerts": 0,
        "droppedObservations": 0,
        "financialDivergences": 0,
        "logisticsDivergences": 0,
        "unresolvedSupportIncidents": 0,
        "failedEmails": 0,
        "stalePaidOrders": 0,
        "staleWebhooks": 0,
        "duplicateCharges": 0,
        "amountMismatches": 0,
        "lostPayments": 0,
        "duplicateLabels": 0,
        "reconciliationStatus": "UNAVAILABLE",
        "killSwitchVerified": false,
        "evidenceRecorded": false,
        "technicalApproval": false,
        "operationalApproval": false
    }
}
```

Execute sem credencial de banco ou provedor:

```sh
CHECKOUT_CANARY_EVIDENCE_FILE=/caminho/restrito/evidencia.json \
pnpm run canary:evaluate
```

Comando somente le arquivo e imprime contagens, politica, `reasonIds` e decisao. `HOLD` ou
`ROLLBACK` termina com codigo nao zero. Saida `ADVANCE` e recomendacao mecanica; nao altera ambiente
nem substitui aprovacao.

## Decisoes

`ROLLBACK`: aplique imediatamente `CHECKOUT_ENABLED=false`, recarregue todas replicas e siga
runbook quando existir cobranca duplicada, valor divergente, pagamento perdido, webhook parado,
etiqueta duplicada, divergencia financeira/logistica ou reconciliacao falhar/ficar indisponivel.

`HOLD`: nao expanda diante de janela/volume incompleto, alerta aberto, observacao descartada,
incidente de suporte, e-mail falho, pedido pago parado, kill switch nao testado, evidencia ausente
ou aprovacao pendente. Investigue; risco financeiro/logistico confirmado converte decisao para
`ROLLBACK`.

`ADVANCE`: permitido somente com thresholds aprovados cumpridos, zero condicao acima,
reconciliacao financeira e logistica `PASS`, evidencia registrada e aprovacao tecnica e operacional.
Registre decisao fora do repositorio sem dados pessoais ou segredos.
