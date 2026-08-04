# Propuesta de Servicios — Auditoría Automática de Cursos Moodle

**Para:** Dirección del Campus Virtual — Universidad Nacional de Córdoba (UNC)
**Atención:** Patricia Altamirano (Dirección), Ignacio Acuña y Fernando Acosta (Diseño Instruccional)
**Fecha:** Agosto 2026
**Proponente:** Nahuel Gómez — Desarrollo de Software & QA
**Contacto:** nagomez@mi.unc.edu.ar

---

## 1. Resumen Ejecutivo

Esta propuesta presenta un **Sistema de Auditoría Automatizada de Cursos Moodle**. Su función es simple: verificar que lo que dice la documentación de cada curso coincida con lo que realmente está configurado en Moodle hoy.

Resuelve problemas como el del curso 269, donde un requisito de avance señalaba una actividad que no existía, bloqueando a todos los estudiantes sin que el equipo lo supiera hasta que alguien lo reportó.

---

## 2. Guía de Términos

Esta propuesta contiene algunos términos técnicos que conviene aclarar desde el inicio. Están explicados para que cualquier persona del equipo —sin importar su formación previa— pueda leer el documento completo sin perderse.

| Término                                         | Qué significa en este proyecto                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Flujo de trabajo** _(pipeline)_               | La secuencia de pasos por los que pasa un curso: desde que se planifica, pasando por controles automáticos, hasta que se publica en Moodle.                                                                                                                                                                                                                                                                                              |
| **Condición de acceso** _(restricción, gate)_   | Un requisito que el estudiante debe cumplir para avanzar. Por ejemplo: "para ver el Módulo 3, primero hay que entregar el TP del Módulo 2". Si la restricción apunta a una actividad que no existe o fue renombrada, el estudiante queda bloqueado sin saber por qué.                                                                                                                                                                    |
| **Verificación directa** _(🟢 verde)_           | El dato se obtuvo directamente de Moodle (vía API). Es un hecho objetivo: lo que Moodle tiene configurado, el reporte lo refleja. No depende de interpretación.                                                                                                                                                                                                                                                                          |
| **Verificación documental** _(🟠 naranja)_      | El dato se infiere de los documentos del equipo (planillas, Word, archivos de texto). Es la mejor interpretación posible, pero su precisión depende de qué tan completos y actualizados estén esos documentos.                                                                                                                                                                                                                           |
| **Integración Continua** _(CI)_                 | Proceso automático que ejecuta las auditorías sin intervención manual. Corre periódicamente (por ejemplo, cada semana) y publica los resultados en la web para que cualquiera del equipo los consulte.                                                                                                                                                                                                                                   |
| **Analizador sintáctico automático** _(parser)_ | Un programa que lee documentos en distintos formatos (Word, Excel, planillas .csv) y extrae información para compararla con Moodle. Funciona como un lector automático: entiende la estructura del documento sin ayuda humana.                                                                                                                                                                                                           |
| **Coincidencia aproximada** _(fuzzy matching)_  | Técnica que encuentra correspondencias aunque los nombres no sean idénticos. Ejemplo: si un documento dice "TP Funciones" y en Moodle la actividad se llama "Trabajo Práctico: Funciones", el sistema detecta que probablemente hablan de lo mismo. Es útil cuando los formatos varían entre cursos, pero introduce un margen de interpretación (🟠 naranja) y por lo tanto un riesgo de error que no existe en la verificación directa. |
| **Línea de comandos** _(CLI)_                   | Herramienta que se opera escribiendo comandos en una terminal de texto, no desde el navegador. Requiere cierta familiaridad técnica. Las opciones B y Express de esta propuesta no requieren línea de comandos: todo se maneja desde una página web.                                                                                                                                                                                     |
| **Reporte accionable**                          | Un reporte que no solo describe un problema sino que indica exactamente qué corregir. Ejemplo: no dice "hay inconsistencias", dice "la actividad X del Módulo 2 no existe en Moodle; renombrarla o quitarla de las condiciones de acceso".                                                                                                                                                                                               |

---

## 3. Evidencia de Factibilidad Técnica (Piloto)

Como prueba de concepto, se ejecutó una auditoría piloto sobre las aulas virtuales activas:

| Curso                | ID  | Hallazgos API                                                   | Documentación          | Resultado                    |
| -------------------- | --- | --------------------------------------------------------------- | ---------------------- | ---------------------------- |
| Violencias Digitales | 304 | 9 secciones, 31 actividades, 6 condiciones de acceso, 0 errores | 33 actividades en docs | ✅ Sin errores estructurales |
| Python 1             | 269 | 5 secciones, 46 actividades                                     | Sin docs disponibles   | ⚠️ Revisión parcial          |

Los reportes están disponibles públicamente y se actualizan en forma automática:
→ **https://nelgoez.github.io/unc-agentic-dev/audit/**

---

## 4. Principio Rector: El Espejo Honesto

> **La precisión de nuestros reportes refleja la claridad de los procesos del equipo.**
>
> Procesos documentados y estandarizados → reportes limpios, accionables, sin ruido.
> Procesos sin convenciones ni trazabilidad → reportes con advertencias que requieren interpretación.
>
> No vendemos una herramienta mágica. Vendemos un espejo honesto: lo que está bien documentado se audita con precisión quirúrgica. Lo que está disperso o inconsistente genera advertencias que el equipo interpreta. En ambos casos, la información es accionable.

### 4.1 ¿Qué significa 🟢 verde y 🟠 naranja?

Cada dato del reporte muestra de un vistazo de dónde salió la información:

| Color          | Fuente                                  | Ejemplo concreto                                                                                                                                                 |
| -------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢 **Verde**   | Leído directamente de Moodle vía API    | "El curso tiene 5 secciones" — es un hecho, Moodle devuelve ese número.                                                                                          |
| 🟠 **Naranja** | Inferido de la documentación del equipo | "Según la planilla, la actividad 3 debería llamarse 'TP Funciones'" — es la mejor interpretación, pero si la planilla está desactualizada el dato es incorrecto. |

Los reportes reales lo demuestran con claridad:

- **Curso 269 (sin documentación):** el reporte muestra ✅ OK en verde. La estructura, las condiciones de acceso, el seguimiento de avance y los certificados están 100% correctos según la API de Moodle. Pero el reporte está incompleto: sin documentos, **no puede detectar** si lo que el equipo diseñó coincide con lo publicado. Es un reporte verde, pero ciego a las discrepancias documentales.

- **Curso 304 (con documentación):** el reporte muestra ⚠️ ADVERTENCIAS en ámbar. Las mismas secciones de API están 100% verdes. Pero ahora **existe la sección doc↔producción**, y revela que solo el 17% de las actividades documentadas se corresponden con producción. Ese warning ámbar no es un error de la herramienta: es su valor. Detectó un problema que sin documentación habría sido invisible.

La paradoja es intencional: tener documentación **no garantiza** un reporte más verde; garantiza un reporte **más honesto**. Sin docs, todo parece funcionar porque no hay contra qué comparar. Con docs, el espejo refleja tanto lo que está bien como lo que no — y eso es exactamente lo que queremos.

### 4.2 ¿Por qué impacta en costo y riesgo?

La proporción entre verde y naranja no es solo un indicador visual: tiene consecuencias concretas sobre el proyecto.

|                            | 🟢 Mayoría verde _(procesos claros)_       | 🟠 Mayoría naranja _(documentación dispersa)_                                               |
| -------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Costo de setup**         | Requiere estandarización previa (Opción A) | Funciona sin cambiar nada (Opción B)                                                        |
| **Riesgo de error**        | Bajo — se verifica contra producción real  | Medio — la documentación puede estar desactualizada                                         |
| **Riesgo de omisión**      | Bajo — lo que Moodle tiene, se ve          | Alto — si un documento omite algo, el reporte también                                       |
| **Costo de mantenimiento** | Bajo — procesos claros = reportes estables | Variable — si cambian formatos sin aviso, el analizador sintáctico falla y requiere ajustes |
| **Curva de adopción**      | Lenta (requiere capacitación)              | Inmediata (cero configuración)                                                              |

Esta es la razón por la cual la Opción A cuesta más pero entrega reportes más confiables, y la Opción B es más accesible pero sus reportes heredan cualquier imprecisión de la documentación actual. No es que una sea mejor que la otra: son puntos de partida distintos según el momento del equipo.

---

## 5. Modelos de Implementación y Cuadro Económico

**Unidad de contratación: Módulo UNC (M)** — Valor vigente: **$48.696 ARS** (RESOL-2026-15-UNC-SGI#AGI, 20/03/2026).
Los montos se expresan en módulos como unidad primaria, con equivalencias en ARS y USD a tipo de cambio oficial estimado (~$1.200 ARS/USD).

### Opción A: Consultoría de Procesos + Staff Técnico

**Alcance:**

- Auditoría inicial del flujo de trabajo completo: desde que se planifica un curso, pasando por controles automáticos y pruebas, hasta su publicación en Moodle
- Definición de reglas compartidas para todo el equipo: cómo nombrar actividades, qué tipos usar en cada caso, cómo configurar condiciones de acceso, y qué plantillas utilizar para documentar cada curso
- Implementación de trazabilidad completa de extremo a extremo
- Capacitación al equipo en las convenciones definidas
- Herramienta de QA integrada al nuevo flujo
- Soporte continuo: reuniones periódicas, ajustes según nuevos cursos

| Concepto          | Módulos UNC | ARS                   | ≈ USD         |
| ----------------- | ----------- | --------------------- | ------------- |
| Setup inicial     | 62–103      | $3.000.000–$5.000.000 | $2.500–$4.200 |
| Mantenimiento/mes | 16–31       | $800.000–$1.500.000   | $670–$1.250   |

**Resultado esperado (3-6 meses):** Proceso estandarizado donde cada curso nuevo pasa por controles automáticos antes de publicarse. Reportes con predominancia 🟢 verde: la mayoría de los datos se verifican directo de Moodle. Sin necesidad de interpretación manual.

### Opción B: Herramienta Dinámica Adaptativa ★ (recomendada)

**Alcance:**

- Plataforma de auditoría desplegada en la web (acceso vía URL, sin instalación)
- Analizador sintáctico automático que lee documentos en los formatos que el equipo ya usa (.docx, .xlsx, .csv, .md). Detecta correspondencias aunque los nombres no coincidan exactamente entre la documentación y Moodle —por ejemplo, reconoce que "TP Funciones" y "Trabajo Práctico: Funciones" hablan de lo mismo—. Esto permite arrancar sin cambiar los procesos actuales, pero introduce un margen de interpretación
- Reportes que muestran de un vistazo la confianza de cada dato: 🟢 verde si se verificó directo contra Moodle, 🟠 naranja si se infirió de la documentación del equipo _(ver sección 4.1)_
- Re-ejecución con 1 click desde el mismo reporte
- Historial automático de todas las ejecuciones
- Actualización semanal automática: las auditorías se ejecutan solas y los resultados se publican sin intervención manual
- Soporte para carga de documentos vía web (formatos .docx/.xlsx/.csv/.md)
- Ajustes del analizador sintáctico automático según nuevos formatos que surjan

| Concepto          | Módulos UNC | ARS                   | ≈ USD         |
| ----------------- | ----------- | --------------------- | ------------- |
| Setup inicial     | 50–75       | $2.435.000–$3.652.000 | $2.000–$3.040 |
| Mantenimiento/mes | 8–16        | $400.000–$800.000     | $330–$670     |

**Resultado esperado (1-2 semanas):** Reportes activos. El equipo accede vía URL, sin cambiar procesos ni instalar nada. Predominancia 🟠 naranja al inicio: los datos dependen de la documentación existente. A medida que el equipo estandarice sus procesos, la proporción de 🟢 verde crece de forma natural. Setup más accesible que la Opción A porque no incluye consultoría de procesos.

### Opción Express: Piloto Pago (una sola vez)

**Alcance:**

- Auditoría de hasta 5 cursos con documentación
- Mismos reportes que la Opción B (estructura, condiciones de acceso, seguimiento de avance, certificados, huérfanos, mapeo doc↔producción)
- Índice web con historial
- Acceso a la herramienta por 30 días (re-ejecuciones ilimitadas)
- Sin contrato de permanencia ni suscripción

| Concepto   | Módulos UNC | ARS                   | ≈ USD         |
| ---------- | ----------- | --------------------- | ------------- |
| Único pago | 25–35       | $1.217.000–$1.704.000 | $1.000–$1.420 |

**Ideal para:** validar la herramienta con datos reales antes de comprometer una suscripción. Si después quieren continuar, el 50% de este pago se descuenta del setup de la Opción B.

### Opción C: Herramienta Autónoma Estándar

**Alcance:**

- Herramienta de línea de comandos + reporte web que procesa archivos en formato fijo (.csv o .md). Requiere que alguien del equipo opere desde una terminal de texto
- Reportes con: estructura, condiciones de acceso, seguimiento de avance, certificados, huérfanos, mapeo doc↔producción
- Despliegue en URL pública sin servidor
- Documentación de uso para el equipo

**No incluye:** adaptación a formatos no estándar, interfaz web, consultoría de procesos, capacitación más allá de la documentación escrita. **Barrera técnica:** requiere que alguien del equipo se sienta cómodo operando desde una terminal de comandos.

| Concepto          | Módulos UNC | ARS                   | ≈ USD         |
| ----------------- | ----------- | --------------------- | ------------- |
| Setup inicial     | 41–62       | $2.000.000–$3.000.000 | $1.700–$2.500 |
| Mantenimiento/mes | 4–8         | $200.000–$400.000     | $170–$330     |

**Resultado esperado (1 semana):** Reporte funcional. Requiere que el equipo adopte formatos estándar para los documentos.

---

## 6. Comparación Rápida

|                                    | A: Consultoría                          | B: Dinámico ★                                    | C: Estándar                                              |
| ---------------------------------- | --------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| **Setup (módulos)**                | 62–103                                  | 50–75                                            | 41–62                                                    |
| **Mantenimiento (módulos/mes)**    | 16–31                                   | 8–16                                             | 4–8                                                      |
| **Estandarización de procesos**    | ✅ Completa                             | ⚠️ Progresiva                                    | ❌ Depende del equipo                                    |
| **Precisión de reportes**          | 🔒 Alta                                 | 📄 Variable (docs)                               | 📄 Depende del formato                                   |
| **Re-ejecución 1-click**           | ✅                                      | ✅                                               | ✅                                                       |
| **Tiempo hasta valor**             | 2-3 meses                               | 1-2 semanas                                      | 1 semana                                                 |
| **Requiere cambio de procesos**    | Sí (guiado)                             | No (gradual)                                     | Sí (formato fijo)                                        |
| **Soporte .docx/.xlsx**            | ✅                                      | ✅                                               | ❌ (solo .csv/.md)                                       |
| **Confianza típica del reporte**   | 🟢 Mayoría verde — verificación directa | 🟠 Mayoría naranja — depende de la documentación | 🟠 Mayoría naranja — depende del formato de los archivos |
| **Barrera técnica para el equipo** | Media — requiere capacitación inicial   | Baja — todo se maneja desde el navegador         | Alta — requiere operar desde una terminal de comandos    |

---

## 7. Cronograma Estimado

| Semana | Actividad                                                                                     |
| ------ | --------------------------------------------------------------------------------------------- |
| 1      | Setup inicial. Reportes de cursos piloto. Índice web.                                         |
| 2-4    | Incorporación de nuevos cursos a pedido. Ajustes del analizador sintáctico para formatos UNC. |
| 4-12   | Ejecuciones semanales automáticas. Acumulación de métricas y patrones.                        |
| 12     | Revisión: ¿los datos justifican avanzar a consultoría de procesos (Opción A)?                 |

---

## 8. Condiciones

- **Sin contrato de permanencia.** Facturación mensual. Cancelación en cualquier momento.
- **Sin costo de herramientas.** Todo el stack es open source / free tier. Solo se cobra el servicio profesional.
- **Propiedad de los datos.** Todos los reportes e históricos son de la UNC. Formatos abiertos (HTML + JSON).
- **Confidencialidad.** Los tokens de acceso a Moodle se manejan como secrets de CI, sin exposición.
- **Modalidad de contratación:** Servicios profesionales bajo normativa UNC vigente (OHCS 4/2025). Módulo UNC como unidad de contratación, liquidable vía SIU-Diaguita.
- **Ajuste por inflación:** Si el pago se demora más de 60 días, el monto en módulos se recalcula al valor del módulo vigente al momento del pago.
- **Validez de la propuesta:** 60 días desde la fecha de emisión.

---

## 9. Próximos Pasos

1. Revisión de esta propuesta por parte de Patricia y el equipo de Diseño Instruccional
2. Si hay interés, reunión de 30 min para resolver dudas y ajustar alcance (sugerimos incluir a Patricia, Ignacio y Fernando)
3. Definición de cursos a incorporar al piloto y acceso a documentación
4. Firma de acuerdo simple (1 página) para arrancar la Fase 1

---

**Contacto:** Nahuel Gómez · nagomez@mi.unc.edu.ar
**Reportes de evidencia:** https://nelgoez.github.io/unc-agentic-dev/audit/
**Propuesta interactiva:** https://unc-course-kit.netlify.app/propuesta-qa-focus.html

---

_Los precios se expresan en módulos UNC. El valor del módulo se ajusta al vigente a la fecha de contratación. Equivalencias en ARS y USD a tipo de cambio oficial estimado. Propuesta válida por 60 días desde su emisión._
