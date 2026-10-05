---
target: app/checkout/manual/[uuid]/page.tsx
total_score: 15
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-10-05T16-23-07Z
slug: app-checkout-manual-uuid-page-tsx
---
# Cobrança manual
Method: dual-agent (A: assessment_a · B: assessment_b)

## Design Health Score
**15/40 — Ruim.** Ação simples exige confiança cega.

## Priority Issues
- **P1:** mostrar valor/descrição/validade antes de pagar.
- **P1:** diferenciar estados antes do clique.
- **P1:** usar dados reconhecíveis como prova de legitimidade.
- **P1:** oferecer retry/novo link/suporte.

## Personas
Jordan não reconhece cobrança; Casey depende do WhatsApp; Riley testa estados achatados.

## Detector
Exit 0, 0 achados; fonte confirma POST rico descartado e GET público ausente; browser skipped.
