# Referencia Rápida — UNC Campus Virtual

> Para hacer X → usá Y. Sinvueltas.

---

## Creación de cursos

| Para hacer esto...         | Usá esto...                               | Notas                                  |
| -------------------------- | ----------------------------------------- | -------------------------------------- |
| Generar un curso nuevo     | `bun run create:curso "Nombre del Curso"` | Valida dependencias automáticamente    |
| Ver la estructura generada | `curso.yaml` en la carpeta del curso      | Ahí están módulos, actividades, gates  |
| Validar dependencias       | Se corre **solo** al generar              | Si hay gates rotos, avisa y bloquea    |
| Arrancar Gemini CLI        | `gemini` desde la carpeta del curso       | Carga automática el contexto del curso |
| Abrir en OpenCode          | `opencode` desde la carpeta del curso     | Alternativa a Gemini CLI               |

## Trabajar con OpenCode

| Para hacer esto...                      | Usá esto...                  | Notas                            |
| --------------------------------------- | ---------------------------- | -------------------------------- |
| Iniciar sesión con variables de entorno | `bun run opencode`           | Carga `.env` automáticamente     |
| Retomar un trabajo anterior             | `/resume <nombre-de-sesion>` | Carga el estado donde lo dejaste |
| Trabajar en Reengagement                | `/reengagement`              | Carga el plan de implementación  |
| Trabajar en Dashboard                   | `/dashboard`                 | Carga requirements + progreso    |
| Ver propuesta del Course Kit            | `/pitch`                     | Carga el doc completo            |
| Ejecutar control de calidad             | `bun run repo:check`         | Formato + lint + tipos + vars    |

## Skills para el agente

| Para hacer esto...                  | Cargá este skill...   | Notas                                |
| ----------------------------------- | --------------------- | ------------------------------------ |
| Pensar un diseño antes de arrancar  | `brainstorming`       | Obligatorio antes de features nuevas |
| Hacer una presentación              | `html-ppt`            | Varios templates y estilos           |
| Crear o modificar un skill          | `skill-creator`       | Con evaluaciones y benchmarks        |
| Consultar GitHub Actions            | `github-actions-docs` | Docs oficiales de GitHub             |
| Trabajar con Bun                    | `Bun`                 | Build, test, bundle                  |
| Encontrar un skill que necesito     | `find-skills`         | Busca entre skills disponibles       |
| Explorar la arquitectura del código | `graphify`            | Grafo de conocimiento del proyecto   |

## Ahorrar tokens (context window)

El paper **"Context Is What You Need" (2509.21361)** muestra que los LLM degradan rápido cuando el contexto crece. El MECW (Maximum Effective Context Window) es hasta **99% menor** que el reportado.

| Para hacer esto...                 | Usá esto...                         | Notas                                 |
| ---------------------------------- | ----------------------------------- | ------------------------------------- |
| Comprimir respuestas del agente    | `/caveman` o activar skill caveman  | Corta ~65% tokens de salida           |
| Comprimir conversación vieja       | DCP (Dynamic Context Pruning)       | Corre solo si está instalado          |
| Saber si un prompt está muy grande | El Course Kit avisa solo            | `contextBudget()` warn si >800 tokens |
| Elegir modelo según el curso       | Usar gemini-2.5-pro para >4 módulos | Los modelos grandes tienen mejor MECW |

## Mantenimiento

| Para hacer esto...          | Usá esto...          | Notas                               |
| --------------------------- | -------------------- | ----------------------------------- |
| Correr todos los chequeos   | `bun run repo:check` | Antes de cada commit                |
| Corregir formato automático | `bun run repo:fix`   | Formatea todo                       |
| Setup inicial del proyecto  | `bun run setup`      | Doctor + install                    |
| Instalar dependencias       | `bun install`        | Corre desde cualquier subdirectorio |

## FLujo completo: crear y publicar un curso

```
1. bun run opencode                          ← Arrancar OpenCode
2. /pitch                                    ← (opcional) revisar el plan
3. bun run create:curso "Python 1"           ← Generar blueprint + validar
4. cd Python-1/
5. gemini                                    ← Arrancar Gemini CLI
6.   @context/curso-overview.md              ← Cargar overview (fase 1)
7.   @context/fases/02-scaffold.md           ← Cargar scaffold módulo x módulo
8.   @context/fases/03-contenido.md          ← Generar contenido por actividad
9.   @context/fases/04-revision.md           ← Revisar módulo por módulo
10.  @context/fases/05-publicacion.md         ← Publicar
11. bun run repo:check                       ← Verificar que todo está limpio
```

---

_Generada automágicamente desde el proyecto. Si falta algo, agregalo._
