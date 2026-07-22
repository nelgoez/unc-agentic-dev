# Multi-Agent Sprint Workflow

> Dinámica establecida durante el desarrollo del pipeline tri-fuerza (julio 2026).
> Aplica para fases, sprints o tareas que requieran diseño, implementación y validación con múltiples perspectivas.

---

## Ciclo Completo

```
┌─────────────────────────────────────────────────────────┐
│  1. Plan & Debate                                       │
│     Agentes paralelos investigan opciones,               │
│     presentan al humano → humano aprueba o refina       │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────┐
│  2. Implementation Sprint                                 │
│     Implementer → QA Auditor → Hot-Fixer → EM Reviewer   │
│     (secuencial por tarea, paralelo entre tareas)         │
└──────────────────────┬───────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────┐
│  3. Present & Refine                                      │
│     Resultado al humano → feedback → re-run si necesario │
└──────────────────────────────────────────────────────────┘
```

---

## Fase 1 — Plan & Debate

### Cuándo usarlo

- Problemas con múltiples enfoques válidos
- Decisiones arquitectónicas con trade-offs claros
- Cuando el humano quiere explorar opciones antes de comprometerse

### Cómo se ejecuta

1. **Humano plantea el problema** con contexto y restricciones
2. **Orquestador define 2-3 opciones** (A, B, C) con personalidades:
   - **A — Pragmático:** velocidad, simplicidad, ROI inmediato
   - **B — Arquitecto:** escalabilidad, corrección, future-proofing
   - **C — Estratega:** punto medio, valor/esfuerzo óptimo
3. **Agentes investigan en paralelo** usando:
   - Tavily / webfetch — búsqueda web, artículos, casos reales
   - Context7 — documentación técnica de librerías y APIs
4. **Cada agente defiende su opción** con fuentes (≤350 palabras)
5. **Orquestador sintetiza** en tabla comparativa + recomendación
6. **Humano aprueba o pide refinamiento** → si refina, se re-ejecuta desde paso 2

### Output

- Tabla comparativa (esfuerzo, riesgo, data clave)
- Recomendación del orquestador
- Decisión del humano documentada

---

## Fase 2 — Implementation Sprint

### Cuándo usarlo

- Tareas de implementación con especificación clara
- Features medianas (varios archivos, lógica nueva)
- Correcciones derivadas de auditoría

### Roles

| Rol             | Agente          | Qué hace                                                |
| --------------- | --------------- | ------------------------------------------------------- |
| **Implementer** | General-purpose | Escribe código, tests, y reporta resultados             |
| **QA Auditor**  | General-purpose | Revisa spec compliance + code quality, emite hallazgos  |
| **Hot-Fixer**   | General-purpose | Corrige hallazgos del QA Auditor (Critical + Important) |
| **EM Reviewer** | General-purpose | Validación final: Go/No-Go, chequeo de riesgos          |

### Flujo por tarea

```
1. Orquestador crea task brief (scripts/task-brief plan N)
2. Dispatch Implementer → escribe código + tests
   └─ Si pregunta, orquestador responde
   └─ Reporta DONE / DONE_WITH_CONCERNS / BLOCKED
3. Orquestador genera review-package (diff)
4. Dispatch QA Auditor → spec + quality
   └─ Si ❌ Spec o Issues Critical/Important:
      a. Dispatch Hot-Fixer con lista de hallazgos
      b. Re-dispatch QA Auditor
      c. Loop hasta approve
   └─ Si ✅ → avanza
5. Dispatch EM Reviewer → Go/No-Go final
   └─ No-Go → fix + re-review
   └─ Go → tarea completa
6. Orquestador marca tarea en ledger
```

### Reglas

- **Nunca** dispatch múltiples implementers en paralelo (conflictos de merge)
- **Siempre** generar review-package entre implementer y QA Auditor
- **Siempre** incluir `if: always()` en artefactos CI (lección aprendida)
- Hallazgos Minor se registran en ledger, no bloquean

### Output por tarea

- Código implementado + tests pasando
- Reporte de implementación
- Reporte de QA (hallazgos)
- Reporte de fixes aplicados
- Validación EM (Go/No-Go)
- Ledger actualizado

---

## Fase 3 — Present & Refine

### Cuándo usarlo

- Al completar una fase o sprint completo
- Antes de mergear a rama principal
- Cuando el humano necesita ver el resultado

### Cómo se ejecuta

1. **Orquestador presenta resumen** de lo implementado (commits, archivos, lo que cambió)
2. **Humano revisa** y da feedback
3. Si hay cambios: **re-run Fase 2** para los cambios solicitados
4. Si está OK: **merge + deploy**

---

## Artefactos del Workflow

| Artefacto          | Ruta                                          | Propósito                        |
| ------------------ | --------------------------------------------- | -------------------------------- |
| Plan               | `docs/plans/<nombre>.md`                      | Documento de planificación       |
| Task brief         | `.superpowers/sdd/task-N-brief.md`            | Extracción de una tarea del plan |
| Implementer report | `.superpowers/sdd/task-N-report.md`           | Lo que implementó el agente      |
| Review package     | `.superpowers/sdd/review-<base>..<head>.diff` | Diff para el revisor             |
| Fix report         | `.superpowers/sdd/fix-report.md`              | Lo que arregló el hot-fixer      |
| Progress ledger    | `.superpowers/sdd/progress.md`                | Estado de cada tarea             |

---

## Checklist Post-Sprint

- [ ] Types check pasan (`bun run types:check`)
- [ ] Format check pasa (`bun run format:check`)
- [ ] Todos los reportes/sdd están commiteados
- [ ] Ledger actualizado con todas las tareas
- [ ] Repo clean (`git status`)
- [ ] Branch pusheado a origin
- [ ] PR creado (si aplica)
