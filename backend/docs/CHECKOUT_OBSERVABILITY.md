# Observabilidade do checkout

## Arquitetura minima

O backend usa os logs JSON do Pino como interface de metricas e alertas. Nao ha SDK ou backend de
monitoramento acoplado ao codigo. A infraestrutura deve coletar esses logs e encaminhar todo evento
`metricType=checkout_alert`, em nivel `error`, para o canal operacional configurado.

O plugin `checkout-observability` executa uma varredura read-only no PostgreSQL a cada 60 segundos e
emite:

- `metricType=checkout_health`: tentativas dos endpoints por rota/status HTTP; criacoes reais
  tentadas em `POST /checkouts/create` por resultado; contagens de sucesso, erro e total por
  provedor; p95 calculado sobre todas as chamadas do provedor na janela movel de cinco minutos;
- `metricType=checkout_alert`: alerta com tipo, limiar, janela, acao imediata, canal, responsavel,
  consulta, runbook, quantidade e no maximo 20 UUIDs/IDs seguros de amostra.

Em alertas baseados no banco, `count` e contagem amostral limitada a 20, nao cardinalidade total.
Os limiares desses alertas detectam existencia (`>=1`); nao use esse campo para dimensionar backlog.

Metricas HTTP e de provedor sao locais ao processo. Em mais de uma replica, o agregador de logs deve
somar contagens por janela e tratar cada alerta repetido como a mesma condicao operacional. Alertas
de estado consultam o banco e podem aparecer em todas as replicas; deduplicar por `alertType`.
Buffers locais guardam no maximo 10 mil observacoes de cada classe. `droppedObservations` informa
o total cumulativo de sobrescritas desde o boot. Valor acima de zero indica janela potencialmente
parcial e exige investigar capacidade/coleta.

## Configuracao

```dotenv
CHECKOUT_OBSERVABILITY_ENABLED=true
CHECKOUT_OBSERVABILITY_INTERVAL_MS=60000
PAYMENT_PENDING_ALERT_MINUTES=30
CHECKOUT_ALERT_CHANNEL=operations-checkout
CHECKOUT_ALERT_OWNER=responsavel-tecnico
CHECKOUT_LOG_QUERY_URL=<URL HTTPS real da consulta de logs>
CHECKOUT_RUNBOOK_URL=<URL HTTPS publica deste runbook>
```

Em producao, observabilidade deve estar habilitada e canal, responsavel, consulta e runbook sao
obrigatorios. As duas URLs devem usar HTTPS, ser publicas, nao conter credenciais e nao usar
dominios reservados de exemplo. Nenhuma dessas variaveis deve conter token ou credencial.

## Catalogo de alertas

| `alertType`                      | Limiar e janela                                                        | Acao imediata                                                                         |
| -------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `checkout_http_errors`           | 3 respostas 5xx/5 min                                                  | Desativar novos checkouts e verificar erro dominante.                                 |
| `provider_errors`                | 3 erros do mesmo provedor/5 min                                        | Se a criacao ficou incerta, desativar checkout e consultar o provedor antes de retry. |
| `provider_latency`               | minimo 3 chamadas; p95 AbacatePay >2 s ou Superfrete >3 s/5 min        | Verificar degradacao antes de o timeout produzir estado incerto.                      |
| `payment_creating_stale`         | 1 pagamento ou link `CREATING` >2 min                                  | Reconciliar por `externalId`; nunca criar segunda cobranca.                           |
| `payment_pending_stale`          | 1 pagamento ou link `PENDING` acima de `PAYMENT_PENDING_ALERT_MINUTES` | Consultar checkout e confirmar prazo de pagamento.                                    |
| `webhook_processing_stale`       | 1 evento com erro ou sem `processedAt` >2 min                          | Preservar evento, corrigir causa e reprocessar com seguranca.                         |
| `paid_payment_invalid_order`     | 1 pagamento `PAID` com pedido fora dos estados validos                 | Interromper expansao e reconciliar estado financeiro.                                 |
| `paid_order_without_fulfillment` | 1 pedido `PAID` >2 min sem job                                         | Verificar worker e enfileirar fulfillment idempotente.                                |
| `fulfillment_retry_stale`        | 1 `RETRY_SCHEDULED` com >=2 tentativas ou idade >5 min                 | Consultar job e etiqueta no provedor antes de retry.                                  |
| `payment_amount_mismatch`        | 1 valor pago diferente do esperado                                     | Desativar checkout e iniciar reconciliacao financeira.                                |
| `cancelled_order_paid`           | 1 pedido cancelado com pagamento pago ou aguardando reembolso          | Executar procedimento de pagamento tardio/reembolso.                                  |
| `email_failed`                   | 1 `EmailJob.FAILED`                                                    | Verificar Resend; reenfileirar somente com chave idempotente.                         |
| `shipping_label_missing`         | 1 pedido `PAID`/`PROCESSING` >5 min sem etiqueta                       | Consultar Superfrete antes de reexecutar fulfillment.                                 |

Estados persistentes repetem alertas ate serem resolvidos. O agregador deve agrupar por `alertType`,
manter alerta aberto enquanto houver ocorrencias e fechar somente depois de uma varredura sem a
condicao.

## Consultas de logs

Filtros minimos independentes do fornecedor:

```text
metricType="checkout_health"
metricType="checkout_alert"
metricType="checkout_alert" AND alertType="payment_amount_mismatch"
```

Os eventos nao incluem e-mail, documento, endereco, corpo de webhook nem payload de provedor.
Somente UUIDs internos e nome do provedor aparecem diretamente. IDs de evento de webhook aparecem
apenas como hash SHA-256 truncado. Retry de fulfillment inclui UUID, tentativas e idade em segundos.

## Teste controlado

O teste `test/services/observability/checkout-observability-service.test.ts` injeta todas as
anomalias sem rede ou escrita no banco e prova que cada alerta chega ao sink Pino com metadados
acionaveis e sem campos sensiveis. Antes do go-live ainda e obrigatorio, em ambiente implantado:

1. criar uma condicao controlada e reversivel;
2. confirmar chegada no canal `CHECKOUT_ALERT_CHANNEL` em ate dois intervalos;
3. abrir `CHECKOUT_LOG_QUERY_URL` pelo alerta;
4. confirmar acionamento do responsavel e executar a acao do runbook;
5. remover a condicao e confirmar encerramento do alerta.

Sem coletor de logs e roteamento para um canal humano, a implementacao local nao satisfaz o gate
operacional de GL-030.
