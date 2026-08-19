# Referencia Rápida — UNC Campus Virtual

> Para hacer X → usá Y. Sinvueltas.

---

## Trabajar con OpenCode

| Para hacer esto...                      | Usá esto...                  | Notas                            |
| --------------------------------------- | ---------------------------- | -------------------------------- |
| Iniciar sesión con variables de entorno | `bun run opencode`           | Carga `.env` automáticamente     |
| Retomar un trabajo anterior             | `/resume <nombre-de-sesion>` | Carga el estado donde lo dejaste |
| Trabajar en Reengagement                | `/reengagement`              | Carga el plan de implementación  |
| Trabajar en Dashboard                   | `/dashboard`                 | Carga requirements + progreso    |
| Ver propuesta actual (automatización)   | `/pitch`                     | Carga pivot + propuesta          |
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

| Para hacer esto...               | Usá esto...                        | Notas                                       |
| -------------------------------- | ---------------------------------- | ------------------------------------------- |
| Comprimir respuestas del agente  | `/caveman` o activar skill caveman | Corta ~65% tokens de salida                 |
| Consultar el codebase sin releer | `graphify` (graphify-out/ existe)  | Query del grafo en vez de grep/read sueltos |
| Comprimir conversación vieja     | DCP (Dynamic Context Pruning)      | Corre solo si está instalado                |

## Mantenimiento

| Para hacer esto...          | Usá esto...          | Notas                               |
| --------------------------- | -------------------- | ----------------------------------- |
| Correr todos los chequeos   | `bun run repo:check` | Antes de cada commit                |
| Corregir formato automático | `bun run repo:fix`   | Formatea todo                       |
| Setup inicial del proyecto  | `bun run setup`      | Doctor + install                    |
| Instalar dependencias       | `bun install`        | Corre desde cualquier subdirectorio |

---

_Generada automágicamente desde el proyecto. Si falta algo, agregalo._
