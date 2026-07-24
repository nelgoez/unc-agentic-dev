# Tri-Force v2 — Re-plan (fixing the data pipeline)

## Root cause of the bug

**The data pipeline was built but never connected.**

`MoodleCourse.findPhantoms()` has a 3rd parameter `apiModuleData` that contains `isautomatic` flags. The code to skip auto-completion activities (completion=2) EXISTS at line 313-314. **But nothing ever calls it with data.**

```
validate-course.kata.ts:143
  course.findPhantoms(adminView, switchRoleStudentView)
                                    ^ passes 2 of 3 params
                                    ^ apiModuleData is always undefined

MoodleCourse.ts:313
  const modData = apiModuleData?.get(matchingActivity.name.toLowerCase())
                  ^ always undefined → modData?.isautomatic === true is ALWAYS false
                  → the continue at line 315 NEVER fires
                  → all 4 Bienvenida activities stay as CRITICAL
```

**Summary of what's broken:**

| Pieza                                | Estado       | Problema                                                      |
| ------------------------------------ | ------------ | ------------------------------------------------------------- |
| `findPhantoms()` apiModuleData param | ✅ Existe    | Nunca se pasa desde el test                                   |
| completion=2 skip logic              | ✅ Correcta  | Muerta — nunca recibe datos                                   |
| visibility phantom detection         | ✅ Correcta  | Funcionaría si ya hay datos de restriction text               |
| Switch role scan                     | ✅ Existe    | Se usa solo para visibility phantoms, no para findings        |
| Nelthor cross-reference              | ❌ No existe | Nunca se usan sus datos históricos para clasificar findings   |
| Report tier presentation             | ⚠️ Parcial   | Muestra 4 criticals falsos porque el JSON de entrada está mal |

---

## Plan de corrección

### Fix 1: Pasar apiModuleData desde el test (△ línea 143)

**Archivo:** `tests/e2e/validate-course.kata.ts`

Antes de llamar a `findPhantoms()`, construir el Map desde la API:

```typescript
// Construir apiModuleData desde la API
const contents = await api.getCourseContents(courseId)
const apiModuleData = new Map<string, { completion: number; isautomatic: boolean }>()
for (const section of contents) {
  for (const mod of section.modules) {
    if (mod.name) {
      apiModuleData.set(mod.name.toLowerCase(), {
        completion: mod.completion ?? 0,
        isautomatic: mod.completiondata?.isautomatic ?? false,
      })
    }
  }
}
const phantoms = course.findPhantoms(adminView, switchRoleStudentView, apiModuleData)
                                                   ahora pasa 3 argumentos →
```

**Efecto:** Las 4 actividades de Bienvenida (completion=2, `isautomatic=true`) → `continue` en línea 315 → no generan finding. Pasan de CRITICAL a SILENT.

### Fix 2: Agregar nelthor cross-reference a findPhantoms()

**Archivo:** `tests/components/ui/MoodleCourse.ts`

Nuevo 4to parámetro opcional:

```typescript
findPhantoms(
  admin: CourseStructure,
  student?: CourseStructure,
  apiModuleData?: Map<string, { completion: number; isautomatic: boolean }>,
  nelthorData?: Map<string, { state: number }>,
): AuditFinding[]
```

Lógica nueva al final de `findPhantoms()`, después de generar todos los findings:

```typescript
// Nelthor cross-reference: downgrade findings that nelthor completed
if (nelthorData) {
  for (const finding of findings) {
    const nameMatch = finding.message.match(/"([^"]+?)"/)
    if (!nameMatch) continue
    const nelthorState = nelthorData.get(nameMatch[1].toLowerCase())?.state
    if (nelthorState === 1 && finding.severity === 'critical') {
      // Nelthor completed this — downgrade to info with explanation
      finding.severity = 'info'
      finding.priority = 'low'
      finding.detail +=
        ' [Nota: Nelthor (estudiante real) completó esta actividad sin problemas antes de ser administrador. El problema puede estar en la configuración posterior del curso o ser un falso positivo.]'
    }
  }
}
```

**Efecto:** Si nelthor completó la actividad (state=1), el finding se degrada de CRITICAL a INFO con nota aclaratoria. La única que queda como CRITICAL es Funcion-Lambda, que nelthor NO pudo completar (o completó como admin, no como estudiante).

### Fix 3: Construir nelthorData en el test

**Archivo:** `tests/e2e/validate-course.kata.ts`

Después de construir `apiModuleData`, buscar a nelthor y obtener su completion status:

```typescript
// Construir nelthorData para cross-reference
const nelthorData = new Map<string, { state: number }>()
try {
  const nelthorUsers = await api.getUsersByField('username', ['nelthor'])
  if (nelthorUsers[0]) {
    const nelthorStatus = await api.getActivitiesCompletionStatus(courseId, nelthorUsers[0].id)
    for (const st of nelthorStatus) {
      const modName = contents
        .flatMap((s: { modules: Array<{ id: number; name: string }> }) => s.modules)
        .find((m: { id: number }) => m.id === st.cmid)?.name
      if (modName) {
        nelthorData.set(modName.toLowerCase(), { state: st.state })
      }
    }
  }
} catch (err) {
  console.warn('⚠️ Nelthor data fetch failed:', err)
}

const phantoms = course.findPhantoms(adminView, switchRoleStudentView, apiModuleData, nelthorData)
```

### Fix 4: Mejorar el reporte con nelthor cross-reference

**Archivo:** `scripts/generate-audit-report.ts`

En la sección de progresión (nelthor vs fresh student), agregar:

- Indicador visual: "De X hallazgos, Y fueron completados exitosamente por nelthor antes de ser admin."
- Lista de actividades que nelthor completó vs. las que no
- Destacar que el UNICO bloqueo real que persiste es Funcion-Lambda

Actualizar la sección de progresión actual (que ya existe pero no se cruza con findings) para que muestre:

```html
<div class="nelthor-summary">
  <strong>🧪 Verificación con nelthor:</strong>
  <p>
    Nelthor completó ${nelthorCompleted}/${totalActivities} actividades requeridas antes de ser
    promovido a administrador. Solo ${blockerCount} actividad(es) siguen siendo un problema real
    para estudiantes.
  </p>
  <ul>
    <li>✅ Actividades completadas por nelthor: ${completedNames.join(', ')}</li>
    <li>❌ Actividades que nelthor NO pudo completar: ${blockedNames.join(', ')}</li>
  </ul>
</div>
```

### Fix 5: Agregar nelthorData a audit-results.json

**Archivo:** `tests/e2e/validate-course.kata.ts`

En el paso de guardar resultados, incluir `nelthorData` (convertido a array/object para JSON) para que el report generator pueda usarlo.

---

## Archivos a modificar

| Archivo                               | Cambio                                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `tests/e2e/validate-course.kata.ts`   | Build `apiModuleData` from API + build `nelthorData` + pass both to `findPhantoms()` + save nelthorData to JSON |
| `tests/components/ui/MoodleCourse.ts` | Add 4th param `nelthorData` + downgrade findings nelthor completed                                              |
| `scripts/generate-audit-report.ts`    | Use nelthor cross-reference in report + show which activities nelthor completed vs blocked                      |

## Orden de implementación

1. Fix 1 + Fix 3: validate-course.kata.ts (apiModuleData + nelthorData)
2. Fix 2: MoodleCourse.ts (nelthor param + downgrade logic)
3. Fix 4 + Fix 5: generate-audit-report.ts (report rendering)
4. CI run + verify: should show 1 CRITICAL (Funcion-Lambda), 0 for Bienvenida activities
