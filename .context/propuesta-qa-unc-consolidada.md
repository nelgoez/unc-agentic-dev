# Propuesta de Servicios — Auditoría Automática de Cursos Moodle

**Para:** Dirección del Campus Virtual — Universidad Nacional de Córdoba (UNC)
**Atención:** Patricia Altamirano (Dirección), Ignacio Acuña y Fernando Acosta (Diseño Instruccional)
**Fecha:** Agosto 2026
**Proponente:** Nahuel Gómez — Desarrollo de Software & QA
**Contacto:** nagomez@mi.unc.edu.ar

---

## 1. Resumen Ejecutivo

La presente propuesta técnico-económica contempla la provisión, despliegue y consultoría de un **Sistema de Auditoría Automatizada de Cursos Moodle**, diseñado para validar de forma integral la consistencia entre el diseño instruccional documentado y la configuración real en producción.

La solución resuelve de manera preventiva fallas críticas de navegación —como el caso del curso 269 donde una actividad inexistente bloqueaba el módulo 3—, garantizando la continuidad pedagógica y mitigando la carga de soporte técnico sobre el Campus Virtual.

---

## 2. Evidencia de Factibilidad Técnica (Piloto)

Como prueba de concepto, se ejecutó una auditoría piloto sobre las aulas virtuales activas:

| Curso                | ID  | Hallazgos API                                   | Documentación          | Resultado                    |
| -------------------- | --- | ----------------------------------------------- | ---------------------- | ---------------------------- |
| Violencias Digitales | 304 | 9 secciones, 31 actividades, 6 gates, 0 errores | 33 actividades en docs | ✅ Sin errores estructurales |
| Python 1             | 269 | 5 secciones, 46 actividades                     | Sin docs disponibles   | ⚠️ Revisión parcial          |

Los reportes están disponibles públicamente y se actualizan en forma automática:
→ **https://nelgoez.github.io/unc-agentic-dev/audit/**

---

## 3. Principio Rector

> **La precisión de nuestros reportes refleja la claridad de los procesos del equipo.**
>
> Procesos documentados y estandarizados → reportes limpios, accionables, sin ruido.
> Procesos sin convenciones ni trazabilidad → reportes con advertencias que requieren interpretación.
>
> No vendemos una herramienta mágica. Vendemos un espejo honesto: lo que está bien documentado se audita con precisión quirúrgica. Lo que está disperso o inconsistente genera advertencias que el equipo interpreta. En ambos casos, la información es accionable.

---

## 4. Modelos de Implementación y Cuadro Económico

**Unidad de contratación: Módulo UNC (M)** — Valor vigente: **$48.696 ARS** (RESOL-2026-15-UNC-SGI#AGI, 20/03/2026).
Los montos se expresan en módulos como unidad primaria, con equivalencias en ARS y USD a tipo de cambio oficial estimado (~$1.200 ARS/USD).

### Opción A: Consultoría de Procesos + Staff Técnico

**Alcance:**

- Auditoría inicial del pipeline de diseño instruccional (pre-montaje → validación → autotesting → publicación)
- Definición de estándares: naming conventions, tipos de actividad, estructuras de gates, templates de documentación
- Implementación de trazabilidad completa de extremo a extremo
- Capacitación al equipo en las convenciones definidas
- Herramienta de QA integrada al nuevo flujo
- Soporte continuo: reuniones periódicas, ajustes según nuevos cursos

| Concepto          | Módulos UNC | ARS                   | ≈ USD         |
| ----------------- | ----------- | --------------------- | ------------- |
| Setup inicial     | 62–103      | $3.000.000–$5.000.000 | $2.500–$4.200 |
| Mantenimiento/mes | 16–31       | $800.000–$1.500.000   | $670–$1.250   |

**Resultado esperado (3-6 meses):** Proceso estandarizado donde cada curso nuevo pasa por validación automática antes de publicarse. Reportes precisos, accionables, sin interpretación manual.

### Opción B: Herramienta Dinámica Adaptativa ★ (recomendada)

**Alcance:**

- Plataforma de auditoría desplegada en la web (acceso vía URL, sin instalación)
- Parser inteligente con fuzzy matching que se adapta a formatos actuales (.md, .csv, .docx, .xlsx)
- Reportes con niveles de confianza visuales (verde = 100% API, naranja = depende de docs)
- Re-ejecución con 1 click desde el mismo reporte
- Historial automático de todas las ejecuciones
- Actualización semanal automática vía CI
- Soporte para carga de documentos vía web (formatos .docx/.xlsx/.csv/.md)
- Ajustes de parser según nuevos formatos que surjan

| Concepto          | Módulos UNC | ARS                   | ≈ USD         |
| ----------------- | ----------- | --------------------- | ------------- |
| Setup inicial     | 50–75       | $2.435.000–$3.652.000 | $2.000–$3.040 |
| Mantenimiento/mes | 8–16        | $400.000–$800.000     | $330–$670     |

**Resultado esperado (1-2 semanas):** Reportes activos, equipo accede vía URL, sin cambiar procesos. Precisión proporcional a la calidad de la documentación actual. Setup más accesible que la Opción A porque no incluye consultoría de procesos.

### Opción Express: Piloto Pago (una sola vez)

**Alcance:**

- Auditoría de hasta 5 cursos con documentación
- Mismos reportes que la Opción B (estructura, gates, completion, certificados, huérfanos, mapeo doc↔producción)
- Índice web con historial
- Acceso a la herramienta por 30 días (re-ejecuciones ilimitadas)
- Sin contrato de permanencia ni suscripción

| Concepto   | Módulos UNC | ARS                   | ≈ USD         |
| ---------- | ----------- | --------------------- | ------------- |
| Único pago | 25–35       | $1.217.000–$1.704.000 | $1.000–$1.420 |

**Ideal para:** validar la herramienta con datos reales antes de comprometer una suscripción. Si después quieren continuar, el 50% de este pago se descuenta del setup de la Opción B.

### Opción C: Herramienta Autónoma Estándar

**Alcance:**

- CLI + reporte web autónomo que procesa archivos en formato fijo
- Reportes con: estructura, gates, completion tracking, certificados, huérfanos, mapeo doc↔producción
- Despliegue en URL pública sin servidor
- Documentación de uso para el equipo

**No incluye:** adaptación a formatos no estándar, consultoría de procesos, capacitación más allá de la documentación escrita.

| Concepto          | Módulos UNC | ARS                   | ≈ USD         |
| ----------------- | ----------- | --------------------- | ------------- |
| Setup inicial     | 41–62       | $2.000.000–$3.000.000 | $1.700–$2.500 |
| Mantenimiento/mes | 4–8         | $200.000–$400.000     | $170–$330     |

**Resultado esperado (1 semana):** Reporte funcional. Requiere que el equipo adopte formatos estándar para los documentos.

---

## 5. Comparación Rápida

|                                 | A: Consultoría | B: Dinámico ★      | C: Estándar            |
| ------------------------------- | -------------- | ------------------ | ---------------------- |
| **Setup (módulos)**             | 62–103         | 50–75              | 41–62                  |
| **Mantenimiento (módulos/mes)** | 16–31          | 8–16               | 4–8                    |
| **Estandarización de procesos** | ✅ Completa    | ⚠️ Progresiva      | ❌ Depende del equipo  |
| **Precisión de reportes**       | 🔒 Alta        | 📄 Variable (docs) | 📄 Depende del formato |
| **Re-ejecución 1-click**        | ✅             | ✅                 | ✅                     |
| **Tiempo hasta valor**          | 2-3 meses      | 1-2 semanas        | 1 semana               |
| **Requiere cambio de procesos** | Sí (guiado)    | No (gradual)       | Sí (formato fijo)      |
| **Soporte .docx/.xlsx**         | ✅             | ✅                 | ❌ (solo .csv/.md)     |

---

## 6. Cronograma Estimado

| Semana | Actividad                                                                     |
| ------ | ----------------------------------------------------------------------------- |
| 1      | Setup inicial. Reportes de cursos piloto. Índice web.                         |
| 2-4    | Incorporación de nuevos cursos a pedido. Ajustes de parser para formatos UNC. |
| 4-12   | Ejecuciones semanales automáticas. Acumulación de métricas y patrones.        |
| 12     | Revisión: ¿los datos justifican avanzar a consultoría de procesos (Opción A)? |

---

## 7. Condiciones

- **Sin contrato de permanencia.** Facturación mensual. Cancelación en cualquier momento.
- **Sin costo de herramientas.** Todo el stack es open source / free tier. Solo se cobra el servicio profesional.
- **Propiedad de los datos.** Todos los reportes e históricos son de la UNC. Formatos abiertos (HTML + JSON).
- **Confidencialidad.** Los tokens de acceso a Moodle se manejan como secrets de CI, sin exposición.
- **Modalidad de contratación:** Servicios profesionales bajo normativa UNC vigente (OHCS 4/2025). Módulo UNC como unidad de contratación, liquidable vía SIU-Diaguita.
- **Ajuste por inflación:** Si el pago se demora más de 60 días, el monto en módulos se recalcula al valor del módulo vigente al momento del pago.
- **Validez de la propuesta:** 60 días desde la fecha de emisión.

---

## 8. Próximos Pasos

1. Revisión de esta propuesta por parte de Patricia y el equipo de Diseño Instruccional
2. Si hay interés, reunión de 30 min para resolver dudas y ajustar alcance (sugerimos incluir a Patricia, Ignacio y Fernando)
3. Definición de cursos a incorporar al piloto y acceso a documentación
4. Firma de acuerdo simple (1 página) para arrancar la Fase 1

---

**Contacto:** Nahuel Gómez · nagomez@mi.unc.edu.ar
**Reportes de evidencia:** https://nelgoez.github.io/unc-agentic-dev/audit/
**Propuesta interactiva:** https://unc-course-kit.netlify.app/propuesta-qa-focus.html

---

_Esta propuesta reemplaza y consolida documentos anteriores (propuesta-qa-unc.md, propuesta-formal-qa-unc.md). Los precios en módulos UNC se ajustan al valor del módulo vigente a la fecha de contratación. Equivalencias en ARS y USD calculadas a tipo de cambio oficial estimado. Verificar al momento de presentación._
