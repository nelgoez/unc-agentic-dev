# UNC Course Kit — Propuesta Comercial

> Estado: **En espera de decisión.** Material de venta listo para presentar al equipo prompters y su management.

## Documentos de propuesta

- **`docs/pitch/PROPUESTA-unc-course-kit.md`** — Documento completo de propuesta de negocio
- **`docs/pitch/index.html`** — Presentación interactiva de 14 slides (abrir en browser)
- **`docs/pitch/README.md`** — Estado actual del proyecto

## Resumen de la propuesta

**Curso-as-Código:** Pipeline de validación, revisión y publicación para cursos Moodle.

1. `bun run create:curso` genera un blueprint (`curso.yaml`) con toda la estructura del curso
2. `validate-deps.ts` detecta automáticamente gates rotos, deadlocks y dependencias inválidas
3. Peer review obligatorio antes de publicar (modelo PR de GitHub)
4. Monitoreo post-publish con alertas de anomalías

## Evidencia clave

El caso del **curso 269** (`reports/audit/audit-course-269.html`) motivó esta propuesta:

- Módulo 3 bloqueado por una actividad inexistente ("Notebook Funcion-Lambda")
- Cierre bloqueado en cascada
- Detectado solo cuando un estudiante lo reportó

## Stack técnico

Todo el stack es open source / free tier (costo $0):
Gemini CLI → validate-deps.ts → Graphify/Mermaid (opt-in) → Moodle activitymap (opt-in)

## Próximo paso

Decisión del equipo prompters. Si es positiva, se requiere:

1. Acceso admin a Moodle
2. Curso piloto para validación
3. Implementación de schema generalizado + validate-deps.ts (~3 semanas)

## Contacto en el repo

- Código pre-implementación: `packages/unc-course-kit/`
- Propuesta: `docs/pitch/`
- Auditoría: `reports/audit/audit-course-269.html`
- Evidencia: `reports/evidence/`
