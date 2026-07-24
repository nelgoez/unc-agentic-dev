# Diagnostic: Lambda false negative — Plan de corrección

## Síntoma

Último CI run: 0 criticals, Status OK. El Lambda sigue bloqueando estudiantes pero no se detecta.

## Hipótesis más probable

El módulo Lambda NO tiene `visible=0` en DB. Tiene **availability condition** (restricción de acceso basada en completar otra actividad). Esto significa:

- Sale visible en el DOM del estudiante como **dimmed/grisado** (visible pero bloqueado)
- `isVisible=true` en el switch-role view (es visible, solo que no se puede clickear)
- La visibilidad phantom check (línea 380) NO lo detecta porque `existsInStudent = true`
- El skip de `isautomatic=true` lo elimina del loop principal
- netlhorData no aplica porque no hay finding que degradar

**Resultado:** 0 findings para Lambda → falso negativo.

El bug real no es de visibilidad — es de **permisos de recurso**: el link de descarga existe para admin pero no se renderiza para estudiantes.

---

## Fase 0: Diagnostic run (confirmar hipótesis)

### Paso 0.1: Agregar logging detallado en findPhantoms()

En `tests/components/ui/MoodleCourse.ts`, antes del primer `for (const required of activityNames)` (línea 290), agregar:

```typescript
console.log('\n=== PHANTOM DIAGNOSTIC ===')
console.log(`Restriction text: "${firstRestricted.restrictionText}"`)
console.log(
  `Activity names parsed: ${Array.from(activityNames)
    .map((n) => '"' + n + '"')
    .join(', ')}`,
)
console.log(
  `Admin activities: ${admin.sections.flatMap((s) => s.activities.map((a) => `"${a.name}"(visible=${a.isVisible}, completion=${a.hasCompletionTracking})`)).join(', ')}`,
)
```

Luego, adentro del loop (después de línea 297 donde se encuentra matchingActivity):

```typescript
console.log(`Required: "${required}" → matched: "${matchingActivity?.name ?? '(none)'}"`)
console.log(`  hasCompletionTracking: ${matchingActivity?.hasCompletionTracking}`)
```

Y en el check de apiModuleData (después de línea 314):

```typescript
console.log(
  `  apiModuleData for "${matchingActivity.name.toLowerCase()}": ${JSON.stringify(modData ?? '(none)')}`,
)
if (modData?.isautomatic === true) console.log(`  → SKIPPED (isautomatic=true)`)
```

Y en el visibility phantom loop (después de línea 384):

```typescript
console.log(
  `Visibility check: "${required}" → existsInAdmin=${existsInAdmin}, existsInStudent=${existsInStudent}`,
)
if (!existsInStudent) {
  console.log(`  → VISIBILITY PHANTOM FIRED`)
}
```

### Paso 0.2: Diagnostic output

El CI run después de agregar logging mostrará exactamente:

- Qué texto de restricción se parsea
- Qué nombres de actividad se extraen
- Con qué actividad de admin matchea
- Qué `apiModuleData` tiene para el Lambda
- Por qué `isautomatic=true` (si es el caso) skipea
- Por qué la visibilidad phantom NO se dispara

---

## Fase 1: Arreglo inmediato (una vez confirmada la hipótesis)

### El fix: Agregar un nuevo tipo de hallazgo: "Activity access blocked"

Actualmente findPhantoms() tiene 3 caminos:

| Camino | Condición                                     | Resultado                                     |
| ------ | --------------------------------------------- | --------------------------------------------- |
| A      | Actividad NO encontrada en admin              | Critical: "no encontrada"                     |
| B      | Actividad encontrada, sin completion tracking | Critical/Warning/Continue según apiModuleData |
| C      | Actividad encontrada, CON completion tracking | No findings (todo ok)                         |

El Lambda cae en Camino B (sin completion tracking) pero con `isautomatic=true` → continue.

**Fix:** Antes del `continue` de `isautomatic=true` (línea 315), agregar un check:

```typescript
if (modData?.isautomatic === true) {
  // Auto-complete: actividad se completa al visualizarla
  // Pero: ¿el estudiante PUEDE visualizarla?
  if (student) {
    const visibleInStudent = student.sections
      .flatMap((s) => s.activities)
      .some(
        (a) =>
          a.name.toLowerCase().includes(normalized) || normalized.includes(a.name.toLowerCase()),
      )
    if (!visibleInStudent) {
      // Existe en admin, es auto-complete, pero el estudiante no puede verla → BLOQUEO
      findings.push({
        severity: 'critical',
        sectionNumber: actSection?.number ?? firstRestricted.number,
        sectionTitle: actSection?.title ?? firstRestricted.title,
        message: `"${required}" existe pero el estudiante no puede acceder para visualizarla`,
        detail: `El recurso "${required}" tiene finalización automática (al visualizarse se completa), pero los estudiantes no pueden acceder a la URL del recurso. El enlace de descarga no se renderiza para estudiantes aunque exista en el curso. Esto impide el avance a módulos siguientes.`,
        priority: 'high',
        actionItem:
          'Revisar visibilidad y permisos del recurso. Si debe estar disponible, cambiar visible=1 en los ajustes del módulo y verificar que el tipo de recurso permita acceso a estudiantes.',
      })
    }
  }
  continue
}
```

Este check reemplaza "es auto-complete, no hay problema" por "es auto-complete PERO el estudiante no puede verlo → ES UN BLOQUEO".

### Test de regresión

- Lambda: `visibleInStudent=false` → critical finding → ✅ DETECTADO
- Bienvenida: `visibleInStudent=true` (aparece en DOM, solo que sin checkbox) → skip → ✅ NO FALSO POSITIVO

---

## Fase 2: Mejora estructural (corto plazo)

### 2.1: Agregar completionReport como anchor de nombres

En `validate-course.kata.ts`, pasar `completionReport` a `findPhantoms()` como 5to parámetro opcional:

```typescript
findPhantoms(
  admin: CourseStructure,
  student?: CourseStructure,
  apiModuleData?: Map<string, { completion: number; isautomatic: boolean }>,
  nelthorData?: Map<string, { state: number }>,
  completionReport?: Array<{ activityName: string; sectionName: string }>,
)
```

Usar los nombres de `completionReport` como "canonical names" para el fuzzy matching. El Activity Completion report tiene la liga directa `mod/resource/view.php?id=6917` que es la única referencia confiable para el Lambda.

### 2.2: Nuevo tipo de hallazgo "recurso inaccesible"

Además de "visibility phantom" (existe pero no se ve), agregar "recurso inaccesible" (se ve pero no se puede interactuar):

```typescript
interface AccessCheck {
  name: string
  cmid: number
  isVisibleInDOM: boolean // aparece en el DOM
  hasClickableLink: boolean // el link es clickeable
  isDownloadable: boolean // archivo descargable
  forRole: 'admin' | 'student' | 'switchrole'
}
```

El switch-role scan actual ya navega cada sección y toma screenshots. Podemos agregar un check de links clickeables: si el admin ve un link `<a href="...">` y en switch-role student ese link no existe o está deshabilitado, es un hallazgo.

---

## Fase 3: Integración con Triple-Tree Overlay (mediano plazo)

Ver `.context/plan-triple-tree-overlay.md`. El overlay de árboles resuelve esto estructuralmente:

- **Árbol UI admin**: Lambda node con `type=resource`, `href=...mod/resource/view.php?id=6917`, `isClickable=true`
- **Árbol UI student**: Lambda node con `isVisible=true` pero `isClickable=false` o sin href
- **Overlay mismatch**: Admin tiene recurso clickeable, student no → hallazgo de "recurso inaccesible"

---

## Resumen de archivos a modificar

| Archivo                               | Cambio                                                                                             | Prioridad     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------- |
| `tests/components/ui/MoodleCourse.ts` | Fase 0: agregar logging diagnóstico. Fase 1: agregar `visibleInStudent` check antes del `continue` | **INMEDIATO** |
| `tests/e2e/validate-course.kata.ts`   | Fase 2.1: pasar completionReport a findPhantoms()                                                  | Corto plazo   |
| Ninguno (plan)                        | Fase 3: Triple-Tree overlay                                                                        | Mediano plazo |

---

## Timeline sugerido

1. **Diagnostic run**: agregar logging → commit → push → CI run → revisar output
2. **Fix**: aplicar Fase 1 → commit → push → CI run → verificar Lambda aparece como critical
3. **Refinamiento**: Fase 2.1 (completionReport anchor) → CI run → verificar robustez
4. **Triple-Tree**: cuando arranque la implementación del overlay
