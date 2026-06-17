# Propuesta: UNC Course Kit

## Curso-as-Código: Pipeline de validación y publicación para Campus Virtual UNC

---

## 1. El Problema

### Caso real: Curso 269 — "Aprendiendo a caminar en Python - Certificación 1"

El 16 de junio de 2026 se detectó un error crítico en el curso 269:

- **El Módulo 3 estaba completamente bloqueado** para todos los estudiantes
- **El Cierre estaba bloqueado en cascada** (requería 6 actividades del Módulo 3)
- **Causa raíz:** una condición de acceso referenciaba "Notebook Funcion-Lambda", una actividad que **nunca existió** en el curso
- **Detección:** por un estudiante que reportó no poder avanzar
- **Tiempo perdido:** debugging, comunicación con el equipo, corrección urgente en producción

Este no es un caso aislado. Cuando los cursos se construyen manualmente en Moodle, las dependencias entre actividades se configuran una por una, sin validación cruzada. Un error tipográfico, una actividad renombrada, o un recurso (PDF, label) usado como gate sin completion tracking — cualquiera de estos produce bloqueos que solo se detectan cuando un estudiante los reporta.

### Impacto

| Dimensión                      | Efecto                                             |
| ------------------------------ | -------------------------------------------------- |
| **Experiencia del estudiante** | Frustración, abandono, soporte al campus           |
| **Carga del equipo**           | Debugging reactivo, correcciones urgentes          |
| **Tiempo**                     | Horas perdidas en diagnóstico en lugar de creación |
| **Reputación**                 | Percepción de poca calidad en los cursos           |

---

## 2. La Solución: UNC Course Kit

`unc-course-kit` es un **generador de blueprint + pipeline de validación** que transforma la creación de cursos en un proceso estructurado con controles en cada etapa.

### Cómo funciona

```
bun run create:curso "Python Certificación 1"
  ↓
Preguntas interactivas:
  ─ ¿Cuántas secciones?
  ─ ¿Qué actividades tiene cada una?
  ─ ¿Cuáles son obligatorias?
  ─ ¿Cuáles desbloquean la siguiente sección?
  ─ ¿Hay rescue/maintenance triggers?
  ↓
Genera curso.yaml + 6 fases + QA checklist
  ↓
validate-deps: CORRE AUTOMÁTICO
  ─ ¿Gates rotos? → BLOQUEA hasta corregir
  ─ ¿Deadlocks en cadena? → LOS MUESTRA
  ─ ¿Gates sobre recursos sin completion? → ADVIERTE
  ↓
¡Blueprint listo para revisión y publicación!
```

### Output generado

```
Python-Certificacion-1/
├── curso.yaml                   ← Blueprint machine-readable
├── .gemini/settings.json        ← Config para Gemini CLI
├── opencode.jsonc               ← (opcional) para OpenCode
├── context/
│   ├── curso-overview.md        ← Resumen ejecutivo del curso
│   └── fases/
│       ├── 01-fundacion.md      ← Objetivos y narrativa
│       ├── 02-scaffold.md       ← Estructura en Moodle
│       ├── 03-contenido.md      ← Generar HTML con Gemini
│       ├── 04-revision.md       ← QA + validación + peer review
│       ├── 05-publicacion.md    ← Subir a Moodle
│       └── 06-mantenimiento.md  ← Monitoreo post-publish
└── qa/
    └── checklist-left-right.md  ← Pruebas de flujo
```

### Gemini CLI: la herramienta que el equipo ya conoce

El equipo ya usa Gemini en el browser para generar contenido. Gemini CLI es **el mismo modelo, pero integrado al terminal**:

| Hoy (browser)                    | Gemini CLI                                                  |
| -------------------------------- | ----------------------------------------------------------- |
| Copiar/pegar prompts manualmente | Gemini lee archivos del proyecto directamente               |
| Subir archivos uno por uno       | Acceso directo al file system local                         |
| Sin herramientas externas        | Ejecuta comandos, usa MCP servers                           |
| Sin configuración de proyecto    | Configurable via `settings.json` (generado automáticamente) |
| **Gratis**                       | **Gratis + open source**                                    |

**Para el equipo no hay cambio de paradigma:** siguen usando Gemini, pero ahora Gemini también puede leer `curso.yaml`, revisar archivos, y ejecutar validaciones. Todo desde el mismo terminal donde hoy ya trabajan.

### Diagrama de flujo

```
┌─────────────┐    ┌──────────────┐    ┌──────────────────┐
│   CREAR     │ →  │  VALIDAR     │ →  │  GENERAR KIT     │
│  curso.yaml │    │ validate-deps│    │  fases + QA      │
└─────────────┘    └──────────────┘    └──────────────────┘
                           │                    │
                      ┌────┘                    ▼
                      │              ┌──────────────────┐
                      ▼              │  REVISIÓN (Fase 4)│
              ╔══════════════╗       │  peer review + QA │
              ║ GATE ROTO    ║       └──────────────────┘
              ║ → corregir   ║                 │
              ╚══════════════╝                 ▼
                                      ┌──────────────────┐
                                      │  PUBLICAR (Fase 5)│
                                      └──────────────────┘
                                                │
                                                ▼
                                      ┌──────────────────┐
                                      │  MONITOR (Fase 6) │
                                      │  KPIs + alertas   │
                                      └──────────────────┘
```

---

## 3. Las 3 Etapas del Pipeline

### Etapa 1: Pre-build (al generar el curso)

| Qué                                 | Automático                                                                      | Manual                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `validate-deps.ts` corre al generar | ✅ Detecta gates a actividades inexistentes, deadlocks, recursos sin completion | —                                                              |
| Revisión del blueprint              | —                                                                               | ✅ El equipo revisa curso.yaml, verifica nombres, orden, tipos |
| Corrección de errores               | ✅ Sugiere correcciones                                                         | ✅ O edita curso.yaml manualmente                              |

### Etapa 2: Pre-publish (antes de activar en Moodle)

| Qué                              | Automático                                         | Manual                                                      |
| -------------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| validade-deps contra Moodle real | ✅ Compara blueprint vs Moodle vía API (con admin) | —                                                           |
| Generación de grafo visual       | ✅ Graphify o Mermaid (opt-in)                     | ✅ Abrir graph.html, buscar nodos aislados                  |
| Peer review                      | —                                                  | ✅ Checklist firmado por otro miembro del equipo            |
| Prueba como estudiante           | —                                                  | ✅ Verificar que completar actividad X desbloquea sección Y |

### Etapa 3: Post-publish (curso en producción)

| Qué                                | Automático                                                        | Manual                   |
| ---------------------------------- | ----------------------------------------------------------------- | ------------------------ |
| Dashboard de KPIs (ya existente)   | ✅ Tasa de reactivación, abandono por módulo                      | ✅ Revisión semanal      |
| Alertas de anomalías               | ✅ Si un módulo tiene 0 completados en 7 días → posible gate roto | ✅ Investigar y corregir |
| Moodle activitymap (plugin opt-in) | ✅ Grafo de dependencias visible en el curso                      | —                        |

---

## 4. Peer Review como PR (Pull Request)

El proceso de revisión de cursos puede funcionar **exactamente como un code review**:

```
1. El prompter crea/modifica curso.yaml
2. git add curso.yaml && git commit -m "feat: modulo 3 python"
3. Otro miembro del equipo revisa:
     git diff curso.yaml
     validate-deps curso.yaml
4. Si pasa → mergea
5. Si no → corrige y repite
```

### ¿Qué se ve en un diff de curso.yaml?

```diff
  sections:
    - name: "Módulo 3"
      unlock_requires:
-       - item: "Notebook Funcion-Lambda"   ← ¡esto NO existe!
+       - item: "Funciones Lambda"          ← corregido
```

El revisor ve **exactamente qué cambió** y puede aprobar o rechazar. Esto es CI/CD para cursos.

### Beneficios del modelo PR

| Beneficio           | Explicación                                                  |
| ------------------- | ------------------------------------------------------------ |
| **Visibilidad**     | Todo cambio queda registrado en git                          |
| **Responsabilidad** | Nadie publica solo — siempre hay un revisor                  |
| **Trazabilidad**    | Cada error tiene un commit asociado                          |
| **Aprendizaje**     | Los reviews cruzan conocimiento entre el equipo              |
| **Calidad**         | validate-deps es el "test automático" que el revisor ejecuta |

---

## 5. Opciones de Validación Visual

| Herramienta               | Tipo                       | Setup                                     | Ideal para                                            |
| ------------------------- | -------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| **`validate-deps.ts`**    | Script standalone (Bun/TS) | 0 setup                                   | Validación obligatoria al generar                     |
| **Mermaid CLI**           | Genera SVG/PNG desde texto | `npx @mermaid-js/mermaid-cli`             | Diagrama estático en README/docs                      |
| **Graphify**              | Pipeline Python completo   | `pip install graphifyy[gemini]` + API key | Grafo interactivo, queries, MCP                       |
| **Moodle activitymap**    | Plugin Moodle nativo       | Instalación en servidor                   | Grafo visible para estudiantes + equipo en producción |
| **Moodle block_availdep** | Bloque Moodle              | Instalación en servidor                   | Resumen rápido en sidebar del curso                   |

**No es "uno u otro".** La combinación recomendada:

```
validate-deps.ts        ← Pre-build: SIEMPRE
Mermaid / Graphify      ← Pre-publish: opt-in para revisión visual
Moodle activitymap      ← Post-publish: en producción
```

---

## 6. Puntos de Control Manual

Cada fase del kit tiene un checklist que **alguien debe firmar** antes de avanzar:

| Fase             | Control                                           | Responsable       |
| ---------------- | ------------------------------------------------- | ----------------- |
| 01-Fundación     | Objetivos definidos, narrativa trazada            | Content lead      |
| 02-Scaffold      | Estructura creada en Moodle, gates configurados   | Dev lead          |
| 03-Contenido     | HTML generado, quizzes creados, links verificados | Prompter          |
| **04-Revisión**  | **QA + validate-deps + peer review + firma**      | **Peer reviewer** |
| 05-Publicación   | Subido a Moodle, verificado como estudiante       | Publisher         |
| 06-Mantenimiento | KPIs revisados semanalmente                       | Coordinator       |

**La Fase 04 es el punto de corte crítico:** nada se publica sin:

1. ✅ validate-deps pasado
2. ✅ checklist de QA completo
3. ✅ Peer review aprobado
4. ✅ Firma del revisor

---

## 7. Stack Tecnológico y Costos

| Componente                 | Tecnología                 | Costo                                                  |
| -------------------------- | -------------------------- | ------------------------------------------------------ |
| CLI generador              | TypeScript + Bun           | **0 — Open source**                                    |
| Validación de dependencias | TypeScript + Bun           | **0 — Se desarrolla internamente**                     |
| Config para el agente      | Gemini CLI (settings.json) | **0 — Gratis**                                         |
| LLM para contenido         | Gemini API (Free Tier)     | **0 — Sin tarjeta, sin billing**                       |
| Upgrade de agente          | OpenCode                   | **0 — Open source**                                    |
| Grafo visual (opt-in)      | Graphify + Gemini API      | **0 — Open source + Free Tier key compartida en .env** |
| Grafo en Moodle (opt-in)   | moodle-mod_activitymap     | **0 — Plugin open source**                             |
| Diagrama estático          | Mermaid CLI                | **0 — Open source**                                    |

**Total: $0.** Todo el stack es open source o free tier. La única inversión es el tiempo de implementación inicial.

### API Key compartida

El proyecto ya usa `.env` para claves compartidas. Graphify lee `GEMINI_API_KEY` del entorno — se agrega una vez en el `.env` del repo y todo el equipo la hereda sin necesidad de gestionar claves individuales.

---

## 8. Roadmap de Implementación

| Fase                 | Duración  | Qué incluye                                                                                                    |
| -------------------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| **Fase 1 — Core**    | Semana 1  | Schema generalizado (sections[] + items[] + unlock_requires[]), validate-deps.ts, integración con el generador |
| **Fase 2 — QA**      | Semana 2  | Checklist de peer review, template de revisión por fases, validación contra Moodle real (con admin)            |
| **Fase 3 — Visual**  | Semana 3  | Integración opt-in con Graphify (grafo interactivo), Mermaid CLI para diagramas estáticos                      |
| **Fase 4 — Piloto**  | Semana 4  | Prueba con 1 curso real existente. Ajustes basados en feedback del equipo                                      |
| **Fase 5 — Rollout** | Semana 5+ | Extender a todos los cursos, capacitar al equipo, publicar documentación                                       |

### Criterios de éxito

1. **Zero bugs de dependencias** en cursos nuevos después de implementado
2. **validate-deps bloquea** cualquier gate roto antes de publicar
3. **Peer review** se hace sistemáticamente (firma registrada)
4. **El equipo reporta** que el proceso es claro y no agrega fricción innecesaria

---

## 9. Por qué ahora

1. **Ya tenemos evidencia concreta** — el curso 269 es un caso documentado con screenshots y audit
2. **El equipo ya usa Gemini** — el salto a Gemini CLI es mínimo (misma interfaz, más herramientas)
3. **El costo es cero** — no hay aprobación presupuestaria necesaria
4. **Escala** — funciona para 3 cursos o para 300
5. **El equipo prompters** gana estructura sin perder flexibilidad

---

## 10. Próximos Pasos

1. ✅ Esta propuesta está lista para revisión
2. ⬜ **Decisión:** ¿Seguimos con la implementación?
3. ⬜ **Si sí:** Semana 1 — schema generalizado + validate-deps.ts
4. ⬜ **Semana 4:** Piloto con 1 curso real
5. ⬜ **Feedback + ajustes + rollout**

---

_Documento generado como parte de la propuesta UNC Course Kit — Junio 2026_
