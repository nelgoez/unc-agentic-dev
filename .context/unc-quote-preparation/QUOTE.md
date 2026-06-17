# Propuesta de Servicios — Campus Virtual UNC

> Preparado para: Patricia Altamirano, Dirección de Campus Virtual
> Fecha: Junio 2026
> Moneda: Módulos UNC ($51.700 ARS c/u, valor 2026) · ARS · USD (referencia)

---

## Contexto

El Campus Virtual UNC enfrenta tres desafíos críticos de escala:

1. **Reenganche de estudiantes** — sin intervención automatizada, alumnos inactivos abandonan sin que nadie los rescate
2. **Visibilidad de datos** — sin dashboard, las decisiones sobre actividades se toman a ciegas
3. **Ciclo completo** — desde la inducción hasta la certificación, hay vacíos que generan fricción y abandono

Esta propuesta ofrece tres niveles de intervención incremental, para que la Universidad elija según prioridad y presupuesto.

---

## MVP 1 — Rescate Inmediato

### Alcance

Activación del plugin `mod_reengagement` en 3 cursos piloto del Campus Virtual con comunicaciones automatizadas de rescate y mantenimiento.

### Entregables

- **6 piezas de email HTML** (2 por curso: rescate Módulo 1 + mantenimiento Módulo 2)
- **Cursos cubiertos**: IA y Automatización, Python 1, Yoga y Mindfulness
- **Configuración del plugin** en entorno de producción (3 cursos)
- **Pruebas de disparo** en DEV con usuarios de testing
- **Activación controlada** del cron (sin envíos prematuros)
- **Setup de analítica**: eventos `email_sent` y `course_module_completion_updated`
- **KPIs instrumentados**: Tasa de Reactivación, Tiempo Medio de Respuesta, Clics vs Finalización

### Tiempo estimado

6–8 semanas desde firma de contrato.

### Pricing

| Concepto                                              | Módulos UNC | ARS           | ≈ USD         |
| ----------------------------------------------------- | ----------- | ------------- | ------------- |
| Desarrollo, diseño, configuración, testing, analítica | 110–155     | $5.7M – $8.0M | $4.7K – $6.6K |

---

## MVP 2 — Visibilidad

### Todo MVP 1, más:

### Entregables adicionales

- **Dashboard de Análisis de Actividades** sobre Moodle Configurable Reports
- Visualización de tasa de completitud **por actividad y por curso**
- **Alertas automáticas**: actividades con 0% de completitud (señal de bloqueo) o 100% (señal de anomalía)
- Reportes exportables para toma de decisiones de responsables académicos
- Cruce de datos entre emails de reenganche y progreso de actividades

### Tiempo estimado

10–14 semanas desde firma de contrato.

### Pricing

| Concepto                               | Módulos UNC | ARS            | ≈ USD          |
| -------------------------------------- | ----------- | -------------- | -------------- |
| MVP 1 + Dashboard + Alertas + Reportes | 190–270     | $9.8M – $14.0M | $8.1K – $11.6K |

---

## MVP 3 — Ciclo Completo

### Todo MVP 2, más:

### Entregables adicionales

**Inducción Estudiantil**:

- Tour de Automatriculación + Tour de Autoregistro
- Video de bienvenida institucional
- Mails de confirmación (Automatriculación y Autoregistro)
- Módulo 0 configurado en todos los cursos activos

**Estandarización de Cursos**:

- Exámenes auto-calificados con progresión encadenada
- Material obligatorio configurado por módulo
- Emisión de certificados automatizada

### Tiempo estimado

16–22 semanas desde firma de contrato.

### Pricing

| Concepto                            | Módulos UNC | ARS             | ≈ USD           |
| ----------------------------------- | ----------- | --------------- | --------------- |
| MVP 2 + Inducción + Estandarización | 320–460     | $16.5M – $23.8M | $13.6K – $19.6K |

---

## Tabla Comparativa

|                           | MVP 1 — Rescate | MVP 2 — Visibilidad | MVP 3 — Ciclo Completo |
| ------------------------- | --------------- | ------------------- | ---------------------- |
| Emails de reenganche      | ✓               | ✓                   | ✓                      |
| Analítica de reenganche   | ✓               | ✓                   | ✓                      |
| Dashboard de actividades  |                 | ✓                   | ✓                      |
| Alertas automáticas       |                 | ✓                   | ✓                      |
| Inducción estudiantil     |                 |                     | ✓                      |
| Estandarización de cursos |                 |                     | ✓                      |
| **Módulos UNC**           | 110–155         | 190–270             | 320–460                |
| **ARS**                   | $5.7M–$8.0M     | $9.8M–$14.0M        | $16.5M–$23.8M          |
| **≈ USD**                 | $4.7K–$6.6K     | $8.1K–$11.6K        | $13.6K–$19.6K          |
| **Semanas**               | 6–8             | 10–14               | 16–22                  |

---

## Términos de Pago

- **Modalidad**: Contratación de servicios profesionales informáticos bajo normativa UNC vigente
- **Unidad de contratación**: Módulo UNC (valor: $51.700 ARS según RR-2026-701-UNC-REC)
- **Ajuste por inflación**: Si el pago se demora más de 60 días corridos desde la fecha de factura, el monto en módulos se recalcula al valor del módulo vigente al momento del pago efectivo
- **Hitos de facturación**:
  - 40% al inicio del proyecto
  - 30% a la entrega intermedia (MVP 1: testing en DEV; MVP 2: dashboard funcional; MVP 3: inducción completa)
  - 30% a la entrega final y aceptación
- **Mantenimiento post-entrega**: 15% del valor del contrato por año (opcional, incluye actualizaciones de seguridad, correcciones y mejoras menores)

---

## Próximos Pasos

1. Revisión y ajuste de alcance por parte de Campus Virtual
2. Definición del tier seleccionado (MVP 1, 2 o 3)
3. Presentación formal a Prosecretaría de Informática (Ing. Alfredo M. Montes)
4. Firma de contrato e inicio de actividades

---

_Esta propuesta tiene validez por 60 días desde la fecha de emisión. Los precios en módulos UNC se ajustan al valor del módulo vigente a la fecha de contratación._
_Equivalencias en ARS y USD calculadas a tipo de cambio oficial estimado. Verificar al momento de presentación._
