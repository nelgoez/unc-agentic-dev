# Propuesta de Servicios — Auditoría Automática de Cursos Moodle

**Para:** Campus Virtual UNC — Dirección y Área de Diseño Instruccional
**Contacto:** Ignacio Acuña, Fernando Acosta
**Fecha:** Agosto 2026
**Proponente:** Nahuel Gómez — Desarrollo de Software & QA

---

## 1. Contexto

El Campus Virtual de la UNC publica cursos en Moodle cuyo diseño instruccional involucra
múltiples documentos (pre-montaje, validación, planillas de autotesting) que definen la
estructura esperada de cada curso. Actualmente **no existe validación automática** entre lo
documentado y lo efectivamente publicado. Los errores —como el caso del curso 269 donde
una actividad inexistente bloqueaba el módulo 3— se detectan cuando un estudiante reporta
el problema.

Ejecutamos una auditoría piloto sobre los cursos 304 (Violencias Digitales) y 269 (Python)
con resultados concretos accesibles en:
https://nelgoez.github.io/unc-agentic-dev/audit/

---

## 2. Principio rector

> **La precisión de nuestros reportes refleja la claridad de los procesos del equipo.**
>
> No vendemos una herramienta mágica. Vendemos un espejo honesto: lo que está bien
> documentado se audita con precisión quirúrgica. Lo que está disperso o inconsistente
> genera advertencias que el equipo interpreta. En ambos casos, la información es accionable.

---

## 3. Propuesta

### Fase 1 — Herramienta de Auditoría (inmediato)

**Sin cambiar procesos. Sin instalar nada. Resultados en 1 semana.**

| Componente           | Descripción                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Auditoría API        | Estructura, gates, completion tracking, certificados, huérfanos — 100% automático desde Moodle |
| Mapeo doc↔producción | Cruza documentos de diseño (pre-montaje, validación) contra lo publicado                       |
| Reportes web         | HTML autónomo, accesible vía URL, con niveles de confianza visuales                            |
| Re-ejecución         | 1 click desde el mismo reporte                                                                 |
| Actualización        | Semanal automática vía CI                                                                      |
| Historial            | Cada ejecución queda registrada para comparar evolución                                        |

**Inversión:**

- Setup inicial: USD 3.500 — 5.000
- Mantenimiento mensual: USD 500 — 800

**Entregables semana 1:**

- Reporte completo del curso 304 (ya disponible)
- Reporte completo del curso 269
- Panel de índice con acceso a todos los reportes
- Documentación de uso para el equipo

---

### Fase 2 — Datos para decidir (2-3 meses, sin costo adicional)

Cada reporte acumula métricas. Después de 2-3 meses de ejecuciones sobre los cursos
activos, tendremos evidencia concreta para responder:

- ¿Qué porcentaje de actividades documentadas no matchean con producción?
- ¿Cuántos cursos tienen gates sin documentar?
- ¿Qué patrones de errores se repiten?
- ¿Vale la pena estandarizar los procesos de diseño instruccional?

Con estos datos, **ustedes deciden** si avanzan a la Fase 3 o se quedan con la herramienta
tal cual. Sin presión. Sin compromiso.

---

### Fase 3 — Estandarización de procesos (opcional, solo si los datos lo justifican)

Si la Fase 2 muestra que la falta de estándares genera ruido significativo en los reportes,
ofrecemos una consultoría guiada para:

- Definir convenciones de nombres (actividades, módulos, recursos)
- Estandarizar templates de documentación
- Documentar patrones de gates y completion tracking
- Implementar trazabilidad completa (diseño → validación → Moodle → reporte)
- Capacitar al equipo en las convenciones definidas

**Inversión:** A cotizar según alcance. El setup de la Fase 1 se descuenta del total.

---

## 4. Cronograma estimado

| Semana | Actividad                                                   |
| ------ | ----------------------------------------------------------- |
| 1      | Setup inicial. Reportes de 269 y 304. Índice web.           |
| 2-4    | Incorporación de nuevos cursos a pedido. Ajustes de parser. |
| 4-12   | Ejecuciones semanales automáticas. Acumulación de métricas. |
| 12     | Revisión: ¿los datos justifican Fase 3?                     |

---

## 5. Condiciones

- **Sin contrato de permanencia.** La Fase 1 se factura por mes. Se puede cancelar en cualquier momento.
- **Sin costo de herramientas.** Todo el stack es open source / free tier. Solo se cobra el servicio y mantenimiento.
- **Propiedad de los datos.** Todos los reportes e históricos son de la UNC. Se entregan en formato abierto (HTML + JSON).
- **Confidencialidad.** Los tokens de acceso a Moodle se manejan como secrets de CI, sin exposición en los reportes.

---

## 6. Próximo paso

1. Revisión de esta propuesta por parte de Patricia y el equipo
2. Si hay interés, reunión de 30 min para resolver dudas y ajustar alcance
3. Firma de acuerdo simple (1 página) para arrancar la Fase 1

---

**Contacto:** Nahuel Gómez · nagomez@mi.unc.edu.ar
**Reporte de evidencia:** https://nelgoez.github.io/unc-agentic-dev/audit/304/latest.html
