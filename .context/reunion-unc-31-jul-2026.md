# Reunión UNC — 31 de Julio 2026

> Preguntas para definir la integración de inputs (pre-montaje + procesamiento) al pipeline de QA.

---

## Audit demostrativo: Violencias Digitales (304)

**Corrimos el audit contra producción** vía API de Moodle. Resultados:

| Aspecto               | Documentación (pre-montaje + validación)                          | Producción (Moodle 304)                                                                                          |
| --------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Estructura            | Módulo 0 + S1, S2, S3 + Módulo Final                              | 9 secciones: General + Inicio + S1 + "Lograste S1" + S2 + "Lograste S2" + S3 + "Lograste S3" + Felicitaciones    |
| Actividades           | ~32 recursos (videos, infografías, PDFs, cuestionarios, podcasts) | 31 actividades con cmids, completion tracking y availability                                                     |
| Completion tracking   | No documentado                                                    | 25 de 31 actividades tienen completion=2 (automático)                                                            |
| Gates / dependencias  | No documentado                                                    | Cada "Siguiente Situación" requiere completar cuestionario + material + infografía + podcast del módulo anterior |
| Certificados          | No documentado                                                    | Certificado de Aprobación y Asistencia con condiciones de acceso                                                 |
| Recursos sin producir | S2.3, S3.4, S3.7 = "Sin recurso / En proceso"                     | No aparecen en producción                                                                                        |
| Recursos extra en doc | S2.1.1, S2.6, S2.12-16 (links complementarios)                    | No trackeados como actividades separadas en Moodle                                                               |

**Hallazgo detectado:** Certificado de Aprobación (cmid 7567) tiene availability con `e=2` (debe estar INCOMPLETO) en lugar de `e=1` (debe estar COMPLETO). Parece un error de configuración.

---

## Preguntas para el equipo UNC

### 1. Formato y entrega de documentación

| Pregunta                                                                                                                                                                                  | Para decidir                                            | Si dice sí...                                                                        | Si dice no...                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| ¿Siempre van a compartir 1 Google Doc (pre-montaje) + 1 Google Sheet (procesamiento) por curso?                                                                                           | Pipeline deterministico vs con lógica de descubrimiento | El pipeline busca exactamente 1 doc + 1 sheet                                        | Necesitamos lógica para detectar qué archivos son qué                  |
| **¿Podemos usar una carpeta compartida de Drive con estructura fija?** (📁 CursoX/ ├── Pre-Montaje.docx └── Procesamiento.xlsx)                                                           | Source of truth único, sin búsqueda                     | Elimina el paso de "encontrar archivos". El pipeline es `--drive <folder-id>`        | Seguimos con archivos sueltos, el pipeline tiene que buscar y adivinar |
| Los archivos que descargamos tienen nombres variables (`[Violencia Digital] Pre-Montaje .md`, `5. [Guzmán] DOCUMENTO DE VALIDACIÓN - Hoja 1.csv`). **¿Podemos estandarizar los nombres?** | Parseo confiable vs fuzzy matching                      | Nombres fijos = parseo exacto. Sugerencia: `PRE-MONTAJE.docx` + `PROCESAMIENTO.xlsx` | El parser necesita fuzzy matching + confirmación manual                |

### 2. Acceso y autenticación

| Pregunta                                                                                                           | Para decidir                   | Si dice sí...                                                | Si dice no...                                            |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------- |
| **¿El WS token que tenemos (aulavirtual) funciona también para campusvirtual?**                                    | Dónde está cada curso          | Podemos auditar cualquier curso desde la misma herramienta   | Necesitamos un token por instancia                       |
| **Cuando un estudiante reporta un problema, ¿nos pueden pasar su email o username?**                               | Debug de issues reales         | Podemos leer su completion status sin que compartan password | Solo podemos debuggear con admin token (vista genérica)  |
| **¿Pueden crear un user de servicio (robot@unc.edu.ar) con token WS de solo lectura y acceso a todos los cursos?** | Automatización del pipeline CI | El pipeline corre sin depender de un token personal          | El token de nagomez@mi.unc.edu.ar es el único disponible |

### 3. Metadata de cursos

| Pregunta                                                                                                                               | Para decidir                | Si dice sí...                           | Si dice no...                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| **¿Hay metadata adicional por curso?** (tiempos estimados, actividades obligatorias, criterios de finalización, responsables, versión) | Completitud del blueprint   | El QA report puede ser más rico         | Los valores se infieren por default (ej: todo quiz = obligatorio) |
| **¿Quién define qué actividades son gate (desbloquean el siguiente módulo)?**                                                          | Mapeo a reengagement config | Nos dan la metadata                     | Lo inferimos: cuestionario al final de módulo = probable gate     |
| **¿El estado "Validado" en el sheet = listo para producción?**                                                                         | Filtro de recursos listos   | El QA report usa Validado como aprobado | Necesitamos aclarar el workflow de estados                        |

### 4. Workflow y prioridades

| Pregunta                                                 | Para decidir                | Si dice sí...                                                         | Si dice no...                   |
| -------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------- | ------------------------------- |
| **Violencias Digitales (304) es el piloto?**             | Prioridad de implementación | Arrancamos con 304, validamos pipeline, escalamos                     | Elegimos otro curso como piloto |
| **¿Cómo nos notifican nuevos cursos o actualizaciones?** | Pull vs push                | Drive notification = pull automático. Email = manual. Slack = webhook | Depende de lo que usen          |

---

## Próximo paso (post-reunión)

Dependiendo de las respuestas:

```
Si carpeta Drive + nombres fijos + robot token:
  └─ Semana 1: import:curso --drive <folder-id> (auto-download + parse + QA report)

Si solo archivos locales + token actual:
  └─ Semana 1: import:curso ../ViolenciasDigitales (local files → parse → QA report)

Si todo es manual:
  └─ Semana 1: parse-pre-montaje + parse-validacion sobre archivos descargados
```
