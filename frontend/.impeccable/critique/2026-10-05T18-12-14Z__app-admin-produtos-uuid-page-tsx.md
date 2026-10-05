---
target: app/admin/produtos/[uuid]/page.tsx
total_score: 16
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-10-05T18-12-14Z
slug: app-admin-produtos-uuid-page-tsx
---
# Editar produto
Method: dual-agent (A: assessment_a · B: assessment_b)

## Design Health Score
**16/40 — Ruim.** Edição sem consciência de mudança.

## Priority Issues
- **P0:** carregar diretamente por UUID.
- **P1:** remoção de imagem deve persistir.
- **P1:** revisar impactos estruturais.
- **P1:** dirty state, reset e confirmação modal.

## Personas
Proprietária perde URL; catálogo confia em remoção falsa; estoque muda sem revisão.

## Detector
Exit 0, 0 achados; browser skipped por proibição.
