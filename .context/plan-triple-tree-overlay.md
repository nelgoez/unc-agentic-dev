# Triple-Tree Overlay — Próxima evolución del Tri-Force

## El problema que resuelve

El Tri-Force v2 actual detecta issues comparando hallazgos puntuales entre capas:

- "Esta actividad existe en admin? ¿Existe en student?"
- "Este cmid existe en API? ¿Y en UI?"
- "Nelthor la completó? → downgrade"

Pero cada capa produce su hallazgo de forma **independiente**, y luego se cruzan. No hay un **modelo compartido** de cómo debería funcionar el curso. El overlay de árboles resuelve eso: cada capa genera un **árbol de dependencias completo**, y se comparan los árboles, no los hallazgos.

---

## Concepto: El árbol condicional

Un **árbol condicional** modela la estructura de un curso como un grafo dirigido:

```
Módulo 0: Bienvenida
  ├── Sobre los docentes (nodo, completion=2 auto)
  ├── Sobre los objetivos (nodo, completion=2 auto)
  ├── Encuesta diagnóstico (nodo, completion=2 auto)
  └── Presentaciones bienvenida (nodo, completion=2 auto)
       │
       ▼ [edge: "La actividad 'Sobre los docentes' está marcada como completada"]
Módulo 1: Introducción
  ├── Video introductorio (nodo, completion=1 manual)
  ├── Notebook Funcion-Lambda (nodo, completion=1 manual, visible=false)
  └── Cuestionario Módulo 1 (nodo, completion=1 manual)
       │
       ▼ [edge: grade condition]
Módulo 2: ...
```

### Propiedades del árbol

Cada **nodo** tiene:

- `id` — cmid único
- `name` — nombre visible
- `section` — sección a la que pertenece
- `type` — resource, quiz, assign, etc.
- `completion` — 0=ninguno, 1=manual, 2=automático
- `isautomatic` — si completion=2
- `visible` — 0=oculto, 1=visible
- `uservisible` — si el usuario actual lo ve
- `groupmode` — 0=sin grupos, 1=grupos separados, 2=grupos visibles

Cada **edge** (dependencia/condición) tiene:

- `from` — nodo bloqueado (el que tiene la restricción)
- `to` — nodo requerido (el que hay que completar)
- `type` — completion | grade | group | cohort | date
- `requiredValue` — el valor que debe cumplirse (state=1 para completion, min nota para grade)
- `rawCondition` — el JSON de availability original

---

## Las 3 capas producen 3 árboles

### Árbol UI: `@see MoodleCourse.analyze()`

**Fuente:** Navegación real del browser, scraping del DOM

```
CourseStructure.sections[].activities[]
├── name, type, href
├── isVisible (dimmed class)
├── hasCompletionTracking (checkbox || autoComplete class)
├── isComplete (checkbox checked)
├── availabilityInfo (texto parseado del DOM)
└── section.isLocked, restrictionText
```

**Nodes:** Los que el browser ve
**Edges:** Parseadas del `restrictionText` y `availabilityInfo`
**Limitación:** Solo ve lo que el HTML expone. No ve `visible=0` en DB (no aparecen en DOM).

### Árbol API (admin token): `@see MoodleApiClient.getAvailabilityJsonBreakdown()`

**Fuente:** REST calls `core_course_get_contents` con token admin

```
breakdown.sections[].modules[]
├── id, name, section
├── completion (0|1|2)
├── completiondata (state, timecompleted, overrideby, hascompletion, isautomatic, istrackeduser, uservisible)
├── groupmode, groupingid
└── modulesWithRestrictions[].conditions[]
    ├── type: 'completion' → cm, id
    ├── type: 'grade' → id, min, max
    └── type: 'group' | 'cohort' → id
```

**Nodes:** Todos los módulos registrados en el curso
**Edges:** Parseadas del JSON `availability` directamente (más preciso que el texto renderizado)
**Limitación:** `uservisible` siempre true (token admin) — no refleja la vista del estudiante

### Árbol API (student token): nuevo

**Fuente:** `core_course_get_contents` con token de estudiante creado en la corrida

**Nodes:** Mismos módulos, pero con `uservisible` real del estudiante
**Edges:** Availability JSON desde la perspectiva del estudiante

### Árbol DB: `@see visibilityMap en run-api-audit.ts`

**Nota:** No hay un job CI separado `db-audit`. Los probes DB son sub-job de `api-audit` (`run-api-audit.ts`), porque todos salen del mismo endpoint REST (`core_course_get_contents`) que expone datos de tablas Moodle.

```
api-audit (job CI)
├── API tree: course structure, availability JSON, orphaned cmids, progression
├── DB probes (sub-job, mismo script):
│   ├── course_modules.visible (0|1)
│   ├── course_modules.availability (JSON raw via availability breakdown)
│   ├── course_modules_completion (state, timemodified)
│   ├── user_enrolments (enrollment counts)
│   ├── grade_items (grade items count)
│   └── cohorts (cohort/searchCohorts)
```

**Nodes:** Los que están en la tabla `course_modules`
**Edges:** El JSON crudo de `availability`
**Limitación:** No hay DB directa. Todo es via REST. Si un endpoint no expone un campo, no podemos consultarlo.

---

## Decisiones de diseño (aprobadas)

| #   | Pregunta                   | Decisión                                                                                                                                                                           | Razón                                                                                                                                                      |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Resolución de matching** | Nombre + sección (no cmid). El cmid demostró ser impreciso (falsos criticals de Bienvenida). La UI del estudiante es la fuente de verdad para determinar si algo bloquea su flujo. | Si la UI del estudiante no muestra algo y eso lo bloquea, es un bug. El cmid es complementario, no fuente de verdad.                                       |
| 2   | **Token student para API** | Sí, crear token student por corrida. Costo computacional aceptable.                                                                                                                | El API tree con token student reemplaza `uservisible` con token admin como fuente de verdad para visibilidad.                                              |
| 3   | **Frecuencia del overlay** | Cada corrida de CI.                                                                                                                                                                | El overlay procesa la matriz completa en cada run y re-evalúa resultados contra ella.                                                                      |
| 4   | **Output del overlay**     | Reemplazar resultados actuales.                                                                                                                                                    | El overlay produce findings con scoring de confianza. Esos findings son los únicos que van al reporte.                                                     |
| 5   | **Tolerancia a error**     | Si hay discrepancia entre capas, es un hallazgo real.                                                                                                                              | La Lambda lo demuestra: DB(visible=0), API(token admin:uservisible=true), UI student(no visible). Es el único bug real bloqueando a estudiantes sin admin. |

---

## El overlay: Cómo se comparan

### Overlay UI vs API (student token)

```
UI Tree (student)                API Tree (student token)
├── Sobre los docentes           ├── Sobre los docentes (id=123, completion=2, isautomatic=true)
│   hasCompletionTracking=false  │   completiondata.isautomatic=true
└── → Flag: UI discrepancy       │   (no flag: API says auto, consistent)
```

### Overlay API (admin) vs API (student)

```
API Tree (admin token)           API Tree (student token)
├── Funcion-Lambda (id=6942)     ├── Funcion-Lambda (id=6942, visible=0)
│   uservisible=true             │   uservisible=false
│   (admin token → true)         │   (student token → real visibility)
└── → Flag: visibility mismatch  │
```

### Overlay all 3 (ideal)

```
DB Tree:       Funcion-Lambda, visible=0
API Stu Tree:  Funcion-Lambda, uservisible=false
UI Stu Tree:   Funcion-Lambda, no aparece en DOM

All 3 agree: hidden → CONFIDENCE HIGH
Finding: CRITICAL, Funcion-Lambda invisible to students
```

---

## Scoring de confianza

Cada hallazgo tiene un score basado en cuántas capas coinciden. Solo findings con ALTA/MUY ALTA confianza se reportan como BLOQUEA.

| Confianza   | Condición                                             | Significado                            | Acción     |
| ----------- | ----------------------------------------------------- | -------------------------------------- | ---------- |
| 🟢 MUY ALTA | 4/4 capas (DB + API admin + API student + UI student) | Confirmado por todas las fuentes       | BLOQUEA    |
| 🔴 ALTA     | 3/4 capas                                             | Mayoría de fuentes confirman           | BLOQUEA    |
| 🟡 MEDIA    | 2/4 capas                                             | Algunas fuentes lo confirman, otras no | PRECAUCIÓN |
| ⚪ BAJA     | 1/4 capas                                             | Solo una fuente lo detecta             | INFO       |

### Ejemplo: Lambda

- DB: visible=0 → coincide con bloqueo
- API student: uservisible=false → coincide con bloqueo
- UI student: no aparece → coincide con bloqueo
- API admin: visible=1 → NO coincide (admin lo ve)
- **Score:** 3/4 = 🔴 ALTA → BLOQUEA

### Ejemplo: Bienvenida sin completion tracking

- API admin: completion=2, isautomatic=true → NO debería ser bloqueo
- API student: completion=2, isautomatic=true → NO debería ser bloqueo
- UI student: checkbox no visible, pero actividad se completa al verla
- Nelthor: la completó sin problemas
- **Score:** No hay discrepancia real → NO ES HALLAZGO

---

## Implementación propuesta

### Fase 0: Token student factory (pre-requisito)

**Archivo:** `tests/components/shared/MoodleStudentTokenFactory.ts`

- Crear un usuario student via API (ya existe `MoodleStudentFactory`)
- Obtener token WS para ese usuario (`core_user_get_users` + login)
- Usar ese token para construir `MoodleApiClient` con perspectiva student
- Cleanup al final de la corrida

### Fase 1: Modelo de árbol compartido

**Archivo nuevo:** `tests/components/shared/CourseDependencyGraph.ts`

```typescript
interface GraphNode {
  cmid: number
  name: string
  sectionNumber: number
  sectionName: string
  type: string
  completion: number // 0|1|2
  isautomatic: boolean
  visible: number // 0|1
  uservisible: boolean
  groupmode: number
}

interface GraphEdge {
  fromCmid: number // el módulo BLOQUEADO
  toCmid: number // el módulo REQUERIDO
  type: 'completion' | 'grade' | 'group' | 'cohort' | 'date'
  requiredValue: number // state=1 para completion, min nota para grade
  rawCondition: Record<string, unknown>
}

class CourseDependencyGraph {
  nodes: Map<number, GraphNode> // key = cmid when available, else section+name hash
  edges: GraphEdge[]

  static fromAdminUI(view: CourseStructure): CourseDependencyGraph
  static fromStudentUI(view: CourseStructure): CourseDependencyGraph
  static fromApi(breakdown: ApiBreakdown): CourseDependencyGraph
  static fromDesignPattern(pattern: DesignPattern): CourseDependencyGraph // future

  overlay(other: CourseDependencyGraph): LayerDelta
}
```

### Fase 2: Overlay processor

**Archivo nuevo:** `tests/components/shared/TreeOverlayAnalyzer.ts`

```typescript
class TreeOverlayAnalyzer {
  static compare(
    adminGraph: CourseDependencyGraph,
    apiGraph: CourseDependencyGraph,
    studentApiGraph: CourseDependencyGraph,
    studentUiGraph: CourseDependencyGraph,
  ): OverlayResult
}

interface OverlayResult {
  comparisons: {
    adminUiVsApi: LayerDelta
    apiVsStudentApi: LayerDelta
    studentApiVsStudentUi: LayerDelta
    adminUiVsStudentUi: LayerDelta
  }
  combinedFindings: Array<{
    nodeName: string
    sectionName: string
    confidence: 'muy_alta' | 'alta' | 'media' | 'baja'
    agreementCount: number // 0-4
    discrepancies: string[] // qué capas difieren
    severity: 'critical' | 'warning' | 'info'
    actionItem: string
  }>
}
```

### Fase 3: Reemplazar `findPhantoms()` + pipeline

**Archivos:** `tests/e2e/validate-course.kata.ts`, `tests/components/ui/MoodleCourse.ts`

- Eliminar `findPhantoms()` de MoodleCourse
- En el test: construir los 4 árboles → overlay → findings
- Findings reemplazan la salida de `findPhantoms()` completamente

### Fase 4: Reporte overlay-aware

**Archivo:** `scripts/generate-audit-report.ts`

- Cada finding muestra su confidence score
- Sección "Matriz de acuerdos entre capas"
- Hallazgos ordenados por confianza (no por sección)

### Fase 5: Diseño instruccional (post-entrega de Ignacio)

- `CourseDependencyGraph.fromDesignPattern(pattern)`
- Overlay agrega un 5° árbol
- Findings de tipo "desviación del diseño"

---

## Comparativa: findPhantoms vs Tree Overlay

| Aspecto               | Hoy (findPhantoms)                      | Tree Overlay                                                  |
| --------------------- | --------------------------------------- | ------------------------------------------------------------- |
| Matching de nodos     | Nombre fuzzy                            | Nombre + sección, cmid secundario                             |
| Condiciones de acceso | Regex sobre restrictionText             | JSON availability parseado                                    |
| Visibilidad           | isVisible del DOM                       | visible DB + uservisible API (admin + student) + isVisible UI |
| Token student         | No existe                               | Creado por corrida                                            |
| Confianza             | No hay métrica                          | Score 1-4 basado en acuerdo entre capas                       |
| Falsos positivos      | Detectados post-facto (revisión manual) | Detectados por el overlay mismo                               |
| Extensibilidad        | Agregar parámetro a findPhantoms        | Agregar árbol al overlay                                      |
| Output                | Flat list de findings                   | Findings con scoring + matriz de acuerdos                     |

---

## Lo que NO cambia

- La estructura de 3 capas (UI + API + DB) se mantiene — se refina cómo se cruzan
- El flujo CI actual (ui-audit → api-audit → generate-report) se mantiene
- Los tests de integración existentes se mantienen (se agregan, no se reemplazan)
- El reporte de 3 capas (BLOQUEA/PRECAUCIÓN/INFO) se mantiene — se enriquece con scoring
