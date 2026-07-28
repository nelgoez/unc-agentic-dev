# Task 2: Fix Report Wording (6 Text Changes)

## Problem

The report text is factually wrong in several places:

1. Shows "OK — Sin problemas detectados" when students are blocked
2. "En investigación" says `visible=0` (wrong — it's `visible=1`)
3. Duplicate text says "Ambos son accesibles para estudiantes" (wrong — only 6917 is)
4. nelthor section says "completó todo sin problemas" (wrong — he was admin after promotion)
5. No dedicated Show More section
6. nelthor "ninguna" text is misleading

## Required Changes

### 1. TreeOverlayAnalyzer.ts — Fix duplicate detection (lines ~436-461)

The duplicate detection uses `studentApiGraph` to check if both cmids are accessible:

```
const bothInStudentAPI = studentApiGraph.nodes.has(dup.cmidA) && studentApiGraph.nodes.has(dup.cmidB)
```

This is WRONG. Moodle's `core_completion_get_activities_completion_status` returns ALL modules including hidden ones. Change to use `studentUiGraph` instead, which reflects what students actually see:

```
const bothInStudentUI = studentUiGraph.nodes.has(dup.cmidA) && studentUiGraph.nodes.has(dup.cmidB)
```

Update severity and text:

- `bothInStudentUI` → severity = 'info', text = "Ambos son accesibles para estudiantes"
- NOT `bothInStudentUI` → severity = 'warning', text = detail saying which cmid is inaccessible

The `studentUiGraph` is already available as a parameter to the enclosing `detectDuplicates` function — pass it through or access it from the `compare` method scope.

### 2. generate-audit-report.ts — "En investigación" text (lines ~296-299)

Current (WRONG):

```
La actividad "Notebook Funcion-Lambda" existe en el curso pero es invisible para los estudiantes (visible=0). El recurso fue restaurado pero sigue sin ser accesible desde la vista de estudiante.
```

Replace with:

```
La actividad "Notebook Funcion-Lambda" (6918) tiene visible=1 en la base de datos pero los estudiantes no pueden verla. Es un duplicado de 6917 "Notebook Funcion-Lambda-CEF" — solo 6917 tiene un enlace accesible en la interfaz. El tooltip "Show More" del módulo bloqueado no expande su contenido para estudiantes, lo que agrava el problema al no mostrar los requisitos pendientes.
```

### 3. generate-audit-report.ts — Overall status safeguard (lines ~275-293)

Add a check after warning count:

```typescript
const hasUnresolvedInfo = filteredFindings.some(
  (f) => f.severity === 'info' && f.message.toLowerCase().includes('duplicado'),
)
```

Modify the else branch:

```typescript
} else if (hasUnresolvedInfo) {
  statusClass = 'warn'
  statusIcon = '🟡'
  statusLabel = 'REVISAR'
  statusDetail = 'Hallazgos pendientes de revisión'
} else {
  // existing OK code
}
```

### 4. generate-audit-report.ts — nelthor section admin-promotion caveat (lines ~324-345)

Change:

- "Actividades que nelthor completó sin problemas" → "Actividades que nelthor completó desde admin (switch-role)"
- "(ninguna — nelthor completó todo sin ayuda)" → "(como estudiante real quedó bloqueado en Módulo 2)"
- The explanatory text at line ~342: replace the "💡" paragraph with admin-promotion caveat

### 5. generate-audit-report.ts — Add Show More HTML block

After the nelthor summary section (around line 771 in the template, near `bienvenidaNote`), add a new block:

```typescript
let showMoreHTML = ''
const showMoreFindings = filteredFindings.filter(
  (f) =>
    f.message.toLowerCase().includes('show more') ||
    f.message.toLowerCase().includes('mostrar más'),
)
if (showMoreFindings.length > 0) {
  showMoreHTML = `<div style="...">...</div>`
}
```

Then include `${showMoreHTML}` in the template after `${bienvenidaNote}`.

### 6. generate-audit-report.ts — Verify dev note about nelthor (line ~564)

The existing text is already accurate ("Nelthor fue promovido a administrador..."). Just verify it hasn't changed.

## Files to Change

- `tests/components/shared/TreeOverlayAnalyzer.ts` — fix duplicate detection
- `scripts/generate-audit-report.ts` — all text fixes

## Acceptance Criteria

- Report does NOT say "OK" when unresolved duplicate blockers exist
- "En investigación" does NOT say "visible=0"
- Duplicate text says something like "Solo 6917 es accesible" when one is missing from student UI
- nelthor section includes "después de ser promovido a admin" or similar
- Show More section appears if findings exist
- All 27 unit tests pass
- TypeScript compiles cleanly
