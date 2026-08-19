# Propuesta de Servicios — Estrategia de Automatización del Campus Virtual

**Destinatario:** Dirección del Campus Virtual — Universidad Nacional de Córdoba (UNC)
**Atención:** Patricia Altamirano (Dirección) · Ignacio Acuña (coordinación) · Natalia (automatización)
**Proponente:** Nahuel Gómez — Arquitectura e Integración de Automatización
**Fecha:** Agosto 2026
**Contacto:** nagomez@mi.unc.edu.ar
**Presentación interactiva:** https://unc-course-kit.netlify.app/propuesta-automatizacion.html (usá las flechas ← → del teclado para navegar)

---

## 1. Resumen Ejecutivo

El Campus Virtual de la UNC publica cursos en Moodle cuyo ciclo de vida —diseño, producción,
publicación y operación— involucra múltiples equipos y pasos que hoy carecen de una validación
automática entre lo documentado y lo efectivamente publicado. Los errores resultantes (el caso del
curso 269, donde una actividad inexistente bloqueaba el avance de estudiantes, es el ejemplo
paradigmático) se detectan tardíamente, por lo general cuando un estudiante los reporta.

La presente propuesta se inscribe en la **Estrategia de Automatización del Campus Virtual** definida
por la Dirección, partiendo de los procesos y no de la herramienta. Propone, como primer paso
contratable, una **Fase 0 de diagnóstico y arquitectura** que ordene procesos, responsabilidades y
criterios de calidad, y que produzca la información necesaria para decidir con evidencia qué
automatizaciones implementar y con qué alcance.

El servicio se presta bajo modalidad de servicios profesionales, sin contrato de permanencia, con
tecnología de código abierto y sin costo de licencias.

---

## 2. Glosario

| Término                                                              | Definición                                                                                                                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **KPI** (_Key Performance Indicator_ — Indicador Clave de Desempeño) | Métrica concreta y medible para evaluar si un proceso u objetivo progresa correctamente (p. ej., tasa de reactivación, tiempo medio de respuesta, porcentaje de abandono).                              |
| **Mantenibilidad** (_maintainability_)                               | Facilidad y costo de mantener un sistema funcionando y actualizado en el tiempo. Distinta de la escalabilidad: un sistema puede escalar bien pero ser costoso de mantener. Se buscan ambas propiedades. |
| **Escalabilidad** (_scalability_)                                    | Capacidad de crecer —más cursos, estudiantes y procesos— sin rehacer lo construido, manteniendo acotados costo y tiempo.                                                                                |
| **ROI** (_Return On Investment_ — retorno de inversión)              | Relación entre el ahorro (trabajo, tiempo, errores) y el costo de la automatización.                                                                                                                    |
| **RACI**                                                             | Matriz de responsabilidades: quién **hace** (Responsible), quién **responde** (Accountable), a quién se **consulta** (Consulted) y a quién se **informa** (Informed).                                   |
| **DI (Diseño Instruccional)**                                        | Proceso de diseño de un curso: contenidos, secuencia, actividades y evaluación.                                                                                                                         |
| **Criterios de calidad**                                             | Conjunto de condiciones que debe cumplir un curso para considerarse finalizado.                                                                                                                         |
| **Control automático de finalización**                               | Verificación ejecutada por software que valida los criterios de calidad antes de dar por terminada una etapa.                                                                                           |
| **Gate / restricción de acceso**                                     | Requisito para avanzar en un curso (p. ej., "para acceder al Módulo 3, entregar el TP del Módulo 2").                                                                                                   |
| **Pipeline (flujo)**                                                 | Secuencia de etapas por la que transita un curso, desde la planificación hasta la publicación.                                                                                                          |
| **Instrumentación**                                                  | Incorporación de medición y monitoreo a un proceso (análogo al tablero de un vehículo) para observar su comportamiento en tiempo real.                                                                  |
| **Módulo UNC**                                                       | Unidad de contratación de la universidad (valor vigente $48.696).                                                                                                                                       |
| **OHCS 4/2025 / SIU-Diaguita**                                       | Normativa y sistema por los que la UNC contrata y liquida servicios profesionales.                                                                                                                      |

---

## 3. Contexto y Antecedentes

El Campus Virtual opera con una estructura acotada: el equipo de Diseño Instruccional (3-4
integrantes más coordinación y cocoordinación, con participación de Ignacio Acuña) y un equipo
audiovisual (3 integrantes, coordinado por el mismo). La Dirección ha identificado la necesidad de
ordenar **quién hace qué y dónde reside la responsabilidad por la calidad en cada etapa**, antes de
incorporar automatización.

La Dirección delineó cinco áreas de proceso prioritarias:

1. **Mesa de Ayuda** — clasificación y respuesta de consultas recurrentes.
2. **Asistencia con IA en el diseño** — detección de problemas e inconsistencias antes de producción.
3. **Producción audiovisual** — seguimiento del circuito completo de producción.
4. **Experiencia de les estudiantes** — detección de abandono y dificultades de navegación.
5. **Indicadores y monitoreo** — información para la toma de decisiones y la mejora continua.

El proponente ha desarrollado y demostrado una **auditoría automática de cursos Moodle** sobre los
cursos 304 y 269, que constituye la evidencia técnica de la capacidad de instrumentar controles de
calidad automáticos. Dicha auditoría se reencuadra en esta propuesta como un módulo de la
arquitectura, no como una iniciativa independiente.

---

## 4. Principio Rector

> **No se incorpora una capa de control adicional. Se desplaza la calidad al lugar donde ya tiene
> responsables.**
>
> La calidad debe constituirse en un **criterio de finalización** de cada etapa —una verificación
> automática que se ejecuta antes de dar por terminado un trabajo— y no en un rechequeo permanente
> sobre trabajo ya validado. La automatización se justifica cuando reduce trabajo, tiempos o errores
> de forma significativa y verificable.

---

## 5. Alcance — Mapeo sobre las Cinco Áreas

| Área                               | Contribución propuesta                                                                                                                                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Asistencia con IA en el diseño** | Criterios de calidad convertidos en verificaciones automáticas previas a producción (enlaces rotos, actividades inexistentes, restricciones mal configuradas, discrepancias entre documentación y Moodle). |
| **Mesa de Ayuda**                  | Clasificación automática de consultas recurrentes: respuesta automática de lo estandarizable y derivación a persona únicamente de lo que requiere intervención.                                            |
| **Producción audiovisual**         | Tablero unificado de seguimiento del circuito de producción: pendientes, demoras y tiempos por etapa.                                                                                                      |
| **Experiencia de les estudiantes** | Instrumentación de indicadores continuos (KPI) de abandono y bloqueo, en complemento de las encuestas de satisfacción actuales.                                                                            |
| **Indicadores y monitoreo**        | Capa de información consolidada para la toma de decisiones y la mejora continua.                                                                                                                           |

La totalidad se integra en una única arquitectura, con datos en un único repositorio.

---

## 6. Metodología

El trabajo se organiza en fases incrementales. Cada fase concluye con entregables verificables y
permite a la UNC decidir la continuidad con información en mano.

- **Relevamiento participativo:** sesiones de trabajo con los equipos y lectura de la documentación
  existente, complementadas con el recorrido de un curso real de punta a punta.
- **Documentación centralizada y enlazada:** los criterios y mapas de proceso se producen como
  documentos centrales, enlazados transversalmente a cada etapa y a cada curso, de modo que sean
  el punto de referencia único para el equipo y la base de la automatización.
- **Priorización por retorno (ROI):** cada iniciativa de automatización se evalúa según su capacidad
  de reducir trabajo, tiempo o errores, antes de comprometer recursos.
- **Herramientas evaluadas por efectividad, escalabilidad y mantenibilidad:** se privilegian
  soluciones de código abierto que la UNC pueda sostener sin dependencia de un único proveedor.

---

## 7. Fase 0 — Diagnóstico y Arquitectura

Primer hito contratable. Duración estimada: 2-3 semanas.

### 7.1 Alcance

1. **Mapa de procesos y responsabilidades (RACI — _Responsible, Accountable, Consulted, Informed_).**
   Quién hace qué en cada etapa, dónde reside la calidad, y qué controles existen hoy.
2. **Catálogo de criterios de calidad.** La lista formal de "esto debe cumplirse" por etapa y por
   tipo de curso, expresada de forma verificable. Incluye la revisión de los criterios en discusión
   actual y su consolidación en un documento centralizado y enlazado.
3. **Arquitectura de automatización objetivo.** El diseño de la capa técnica —priorizada por
   impacto— que instrumenta los criterios como controles automáticos de finalización, integrada a la
   propuesta de automatización en curso.

### 7.2 Cronograma

| Semana | Actividad                                                                                                   | Entregable parcial                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1      | Relevamiento: sesiones con DI, audiovisual y Mesa de Ayuda; lectura documental; recorrido de un curso real. | Nota de hallazgos y mapa preliminar del flujo actual.                        |
| 2      | Consolidación de mapa RACI y catálogo de criterios de calidad (centralizado y enlazado).                    | Mapa RACI · catálogo de criterios.                                           |
| 3      | Traducción a reglas verificables y diseño de arquitectura priorizada.                                       | Reglas verificables · arquitectura objetivo · recomendación de herramientas. |

### 7.3 Entregables de la Fase 0

- Documento de **mapa de procesos y responsabilidades (RACI)**.
- **Catálogo de criterios de calidad** centralizado y enlazado a etapas y cursos.
- **Arquitectura de automatización priorizada**, con recomendación de herramientas (efectividad,
  escalabilidad, mantenibilidad).
- **Recomendación de hoja de ruta** para las Fases 1 y 2, con estimación de impacto por iniciativa.

---

## 8. Fases 1 y 2 — Visión

- **Fase 1 — Automatizar lo que rinde.** Implementación de las 2-3 automatizaciones de mayor
  retorno, comenzando por los criterios de finalización del Diseño Instruccional. Se cotiza a partir
  de los resultados de la Fase 0.
- **Fase 2 — Extender.** Producción audiovisual y experiencia estudiantil, sobre la base operativa.

**Solo la Fase 0 se contrata en esta instancia.** Las fases siguientes se definen con los datos que
produzca la Fase 0, en función del retorno esperado.

---

## 9. Propuesta Económica

| Concepto                                                  | Valor                    |
| --------------------------------------------------------- | ------------------------ |
| Fase 0 — Diagnóstico y Arquitectura (entregables de §7.3) | **38–40 módulos UNC**    |
| Fases 1 y 2                                               | A cotizar tras la Fase 0 |

**Unidad de contratación:** Módulo UNC, valor vigente **$48.696** (RESOL-2026-15-UNC-SGI#AGI,
20/03/2026).

- **38–40 módulos** equivalen a **$1.850.000 – $1.950.000 ARS** por única vez.
- Sin suscripción. Sin permanencia. Sin costo de licencias (stack de código abierto).

---

## 10. Requisitos y Accesos Necesarios

Para la ejecución de la Fase 0, se requiere la colaboración y el acceso a lo siguiente:

1. **Propuesta de automatización en curso** (documento o documentos existentes, aun en borrador),
   incluyendo la relación con la colaboración en curso con Santex.
2. **Criterios de calidad** en su estado actual (formalizados o en discusión), con identificación de
   autoría y responsables.
3. **Mapa de roles y responsabilidades** de Diseño Instruccional y audiovisual, incluyendo la
   delimitación de las etapas en las que el proponente puede intervenir.
4. **Detalle del proceso de Diseño Instruccional**: herramientas utilizadas en cada paso (Drive,
   Sheets, Docs, Moodle u otras), flujo de pre-montaje a producción, y convenciones de archivos.
5. **Información de Mesa de Ayuda**: herramienta de seguimiento, volumen, categorías de consulta y
   métricas disponibles.
6. **Información de producción audiovisual**: tipo de contenido producido, método de seguimiento
   actual y puntos de integración con el resto del proceso.
7. **Presupuesto y camino de contratación** (responsable de la firma, rol de la Prosecretaría de
   Informática, plazos estimados).

La falta de alguno de estos elementos no impide el inicio de la Fase 0; en su defecto, su
relevamiento pasa a formar parte del alcance de la misma.

---

## 11. Condiciones Contractuales

- **Modalidad.** Servicios profesionales bajo normativa UNC vigente (OHCS 4/2025), liquidable vía
  SIU-Diaguita.
- **Sin permanencia.** Facturación por entrega; cancelación en cualquier momento.
- **Propiedad de los datos.** Todo reporte, catálogo e histórico es propiedad de la UNC, entregado en
  formatos abiertos (HTML + JSON).
- **Confidencialidad.** Las credenciales se administran como secretos, sin exposición ni persistencia
  en repositorios.
- **Sin costo de licencias.** La totalidad del stack tecnológico es de código abierto o de nivel
  gratuito; solo se factura el servicio profesional.
- **Ajuste por inflación.** Si el pago se demora más de 60 días, el monto en módulos se recalcula al
  valor vigente a la fecha de pago.
- **Validez de la oferta.** 60 días desde su emisión.

---

## 12. Próximos Pasos

1. Reunión de trabajo con el equipo de automatización para revisar la propuesta en curso.
2. Acceso a los criterios de calidad y a un curso completo de ejemplo (documentación → producción).
3. Firma de acuerdo simple para el inicio de la Fase 0.

---

**Contacto:** Nahuel Gómez · nagomez@mi.unc.edu.ar
**Reportes de evidencia:** https://nelgoez.github.io/unc-agentic-dev/audit/
**Presentación interactiva:** https://unc-course-kit.netlify.app/propuesta-automatizacion.html

---

_Los precios se expresan en módulos UNC. El valor del módulo se ajusta al vigente a la fecha de
contratación. Equivalencias en ARS estimadas a tipo de cambio oficial. Propuesta válida por 60 días._
