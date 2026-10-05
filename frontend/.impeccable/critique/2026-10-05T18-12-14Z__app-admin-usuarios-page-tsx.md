---
target: app/admin/usuarios/page.tsx
total_score: 13
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 4
timestamp: 2026-10-05T18-12-14Z
slug: app-admin-usuarios-page-tsx
---
# Usuários admin
Method: dual-agent (A: assessment_a · B: assessment_b)

## Design Health Score
**13/40 — Ruim.** Gestão de acesso legível, insegura e incompleta.

## Priority Issues
- **P0:** alinhar `document` ao contrato.
- **P1:** menor privilégio e revisão de `ADMIN`.
- **P1:** implementar busca/filtros/alteração/revogação.
- **P1:** distinguir 403/erro/vazio e usar convite seguro.

## Personas
Proprietária concede poder total; SUBADMIN interpreta 403 como vazio; atendimento mistura clientes/equipe.

## Detector
Exit 0, 0 achados; browser skipped.
