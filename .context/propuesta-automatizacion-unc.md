# Propuesta de Servicios — Estrategia de Automatización del Campus Virtual

**Para:** Dirección del Campus Virtual — Universidad Nacional de Córdoba (UNC)
**Atención:** Patricia Altamirano (Dirección), Ignacio Acuña, Fernando Acosta, Natalia (equipo de automatización)
**Fecha:** Agosto 2026
**Proponente:** Nahuel Gómez — Arquitectura e Integración de Automatización
**Contacto:** nagomez@mi.unc.edu.ar

---

## 1. Resumen Ejecutivo

Esta propuesta reencuadra nuestro trabajo previo de auditoría de cursos Moodle dentro de una
**Estrategia de Automatización del Campus Virtual** que parte de los problemas y procesos, no de la
herramienta.

Aportamos dos capacidades concretas al proceso que ya está en marcha:

1. **Ordenar el "quién hace qué"** — un mapa de responsabilidades (RACI) para que la calidad viva
   donde corresponde: dentro del Diseño Instruccional.
2. **Convertir los criterios de calidad en controles automáticos de finalización** — una lista de
   chequeo que corre sola antes de que una propuesta se considere terminada, en lugar de una capa de
   rechequeo permanente.

La auditoría de Moodle (cursos 304 y 269) es la **evidencia** de que ese control automático ya
funciona. No es el centro de la propuesta: es un módulo más de la arquitectura.

---

## 2. Contexto

El Campus Virtual publica cursos en Moodle cuyo diseño involucra múltiples pasos (pre-montaje,
validación, producción). Hoy no existe validación automática entre lo documentado y lo publicado; los
errores —como el caso del curso 269, donde una actividad inexistente bloqueaba el avance— se detectan
cuando un estudiante los reporta.

La Dirección definió un orden claro: primero ordenar procesos, responsabilidades y criterios de
calidad; después identificar qué vale la pena automatizar; recién entonces elegir tecnología y
recursos. Esta propuesta se integra a esa secuencia.

---

## 3. Principio Rector

> **No construimos una capa de control nueva. Movemos la calidad al lugar donde ya tiene dueños.**
>
> Si una tarea corresponde a un área, la calidad debe ser un criterio de finalización de esa área —
> una lista de chequeo automática — y no una IA que vuelve a controlar lo que alguien ya debía
> controlar. La automatización se justifica cuando reduce trabajo, tiempos o errores de forma real.

---

## 4. Nuestra Propuesta: las 5 áreas de proceso

| Área                               | Nuestro aporte                                                                                                                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Asistencia con IA en el diseño** | Criterios de calidad convertidos en chequeos automáticos que corren **antes** de producción (enlaces rotos, actividades inexistentes, restricciones mal configuradas). Punto de entrada ya probado. |
| **Mesa de Ayuda**                  | Clasificación automática de consultas recurrentes: responder lo estandarizable y derivar a una persona solo lo que lo necesita.                                                                     |
| **Producción audiovisual**         | Un tablero único que sigue el circuito completo: pendientes, demoras, tiempos por etapa.                                                                                                            |
| **Experiencia de les estudiantes** | Detección de puntos de abandono y configuraciones que bloquean el avance (lo que ya detectamos en el curso 269).                                                                                    |
| **Indicadores y monitoreo**        | Información consolidada para decidir y mejorar, no para controlar.                                                                                                                                  |

Todo en una sola arquitectura, con datos en un único lugar.

---

## 5. Plan de Integración

### Fase 0 — Ordenar (inmediata, 2-3 semanas)

El primer paso, acotado y contratable:

- **Mapa de procesos y responsabilidades (RACI):** quién hace qué, dónde reside la calidad.
- **Criterios de calidad como reglas verificables:** la lista de "esto tiene que cumplirse" en términos
  que un software pueda chequear.
- **Arquitectura de automatización priorizada:** qué automatizar primero, por impacto.

### Fase 1 — Automatizar lo que rinde (a definir tras la Fase 0)

Ejecutar las 2-3 automatizaciones de mayor retorno, empezando por los criterios de finalización del
Diseño Instruccional.

### Fase 2 — Extender

Producción audiovisual y experiencia estudiantil, sobre la base ya funcionando.

**Solo la Fase 0 se contrata ahora.** Es acotada, no compromete el resto, y su entregable es la
información que habilita decidir la Fase 1 con evidencia.

---

## 6. Fase 0 — Entregable y Precio

| Concepto                                    | Valor                 |
| ------------------------------------------- | --------------------- |
| Mapa de procesos + responsabilidades (RACI) | incluido              |
| Criterios de calidad verificables           | incluido              |
| Arquitectura de automatización priorizada   | incluido              |
| **Precio total (único pago)**               | **38–40 módulos UNC** |

**Unidad de contratación:** Módulo UNC, valor vigente **$48.696** (RESOL-2026-15-UNC-SGI#AGI,
20/03/2026).

- **38–40 módulos** ≈ **$1.850.000 – $1.950.000 ARS** por única vez.
- Sin suscripción. Sin permanencia.

---

## 7. Información que necesitamos

1. La propuesta de automatización en curso (Ignacio + Natalia).
2. El borrador de criterios de calidad (autor, estado, acceso).
3. El mapa de "quién hace qué": Diseño Instruccional (3-4 integrantes + coordinación + cocoordinación)
   y audiovisual (3, coordinado por Ignacio). En qué pasos podemos intervenir y en cuáles no.
4. Articulación del proceso de Diseño Instruccional con el desarrollo: pre-montaje → validación →
   producción; herramientas (Drive/Sheets/Docs) y convenciones de archivos.
5. Mesa de Ayuda: herramienta, volumen, categorías recurrentes.
6. Presupuesto y camino de contratación (quién firma, rol de la Prosecretaría de Informática, plazos).
7. Experiencia estudiantil: cómo detectan hoy abandono o dificultades de navegación.
8. Producción audiovisual: método de seguimiento actual.

---

## 8. Colaboración con Santex

Si el equipo avanza con las capacitaciones de Santex, lo vemos como complementario: ellos aportan
formación colectiva en IA; nosotros aportamos la arquitectura y la integración técnica al proceso real.
Sugerimos coordinar la capacitación **después** de la Fase 0, para aplicarla sobre una base ordenada.

---

## 9. Condiciones

- **Sin contrato de permanencia.** Facturación por entrega. Cancelación en cualquier momento.
- **Sin costo de herramientas.** Todo el stack es open source / free tier. Solo se cobra el servicio profesional.
- **Propiedad de los datos.** Todo reporte e histórico es de la UNC, en formatos abiertos (HTML + JSON).
- **Confidencialidad.** Las credenciales se manejan como secrets, sin exposición.
- **Modalidad.** Servicios profesionales bajo normativa UNC vigente (OHCS 4/2025), liquidable vía SIU-Diaguita.
- **Ajuste por inflación.** Si el pago se demora más de 60 días, el monto en módulos se recalcula al
  valor vigente al momento del pago.
- **Validez.** 60 días desde la fecha de emisión.

---

## 10. Guía de Términos

| Término                                | Qué significa, en simple                                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **RACI**                               | Mapa de responsabilidades: quién **hace** cada tarea, quién **responde**, a quién se **consulta**, a quién se **informa**. |
| **DI (Diseño Instruccional)**          | El proceso de diseñar un curso: contenidos, orden, actividades y evaluaciones.                                             |
| **Criterios de calidad**               | La lista de "esto tiene que cumplirse" para dar un curso por terminado.                                                    |
| **Control automático de finalización** | Esa lista de chequeo ejecutada por software: corre sola y avisa qué falta.                                                 |
| **Gate / restricción de acceso**       | Requisito para avanzar (ej: "para ver el Módulo 3, entregá el TP del Módulo 2").                                           |
| **Pipeline (flujo)**                   | La secuencia de pasos por la que pasa un curso, de la planificación a la publicación.                                      |
| **Módulo UNC**                         | Unidad de contratación de la universidad (hoy $48.696).                                                                    |
| **ROI**                                | Cuánto trabajo, tiempo o errores se ahorran en relación con el costo de automatizar.                                       |
| **OHCS 4/2025 / SIU-Diaguita**         | La normativa y el sistema por los que la UNC contrata y liquida servicios profesionales.                                   |

---

## 11. Próximos Pasos

1. Reunión de trabajo (30-45 min) con Ignacio y Natalia para revisar la propuesta en curso.
2. Acceso a los criterios de calidad y a un curso completo de ejemplo (documentación → producción).
3. Firma de acuerdo simple (1 página) para arrancar la Fase 0.

---

**Contacto:** Nahuel Gómez · nagomez@mi.unc.edu.ar
**Reportes de evidencia:** https://nelgoez.github.io/unc-agentic-dev/audit/
**Presentación interactiva:** https://unc-course-kit.netlify.app/propuesta-automatizacion.html

---

_Los precios se expresan en módulos UNC. El valor del módulo se ajusta al vigente a la fecha de
contratación. Equivalencias en ARS a tipo de cambio oficial estimado. Propuesta válida por 60 días._
