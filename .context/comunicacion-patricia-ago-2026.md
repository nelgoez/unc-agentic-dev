# Email — Seguimiento y Propuesta de Integración (Estrategia de Automatización)

> Para: Patricia Altamirano, Natalia, Ignacio (Nacho), Fernando, Victoria
> Asunto: Estrategia de Automatización del Campus Virtual — cómo nos integramos y qué necesitamos

---

Hola a todos,

Gracias, Patricia, por tu respuesta. Coincidimos con el orden: primero procesos y responsabilidades,
después qué vale automatizar, recién entonces tecnología. Esta nota propone **cómo nos integramos a
ese proceso** y — tan importante como el qué — **qué información concreta necesitamos de ustedes**
para dejar de especular y empezar a ser precisos.

---

## 1. Nuestro lugar

No venimos a sumar una capa de control. Aportamos dos capacidades al plan que ya llevan Nacho y Natalia:

- **Ordenar el "quién hace qué"** (mapa de responsabilidades RACI) para que la calidad viva donde
  corresponde — dentro del Diseño Instruccional.
- **Convertir los criterios de calidad en controles automáticos de finalización**: que la lista de
  chequeo corra sola _antes_ de dar un curso por terminado, no que una IA lo revise al final.

La auditoría de Moodle (cursos 304 y 269) es la **evidencia** de que ese control ya funciona. Queda
como un módulo más de la arquitectura, no como el centro.

---

## 2. Qué ofrecemos, sobre las 5 áreas

| Área                               | Nuestro aporte                                                                                                                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Asistencia con IA en el diseño** | Criterios de calidad convertidos en chequeos automáticos que corren **antes** de producción (enlaces rotos, actividades inexistentes, restricciones mal configuradas). Punto de entrada ya probado. |
| **Mesa de Ayuda**                  | Clasificación automática de consultas recurrentes: se responde lo estandarizable y se deriva a una persona solo lo que lo necesita.                                                                 |
| **Producción audiovisual**         | Tablero único del circuito completo: pendientes, demoras, tiempos por etapa.                                                                                                                        |
| **Experiencia de les estudiantes** | Detección de abandono y configuraciones que bloquean el avance (lo que ya detectamos en 269).                                                                                                       |
| **Indicadores y monitoreo**        | Información para decidir y mejorar, no solo para controlar.                                                                                                                                         |

---

## 3. Plan en 3 fases — y el "cómo" de la Fase 0

### Fase 0 — Ordenar (2-3 semanas)

Esto es lo que vos, Patricia, marcaste como primer paso. Concretamente, así lo haríamos:

- **Semana 1 — Relevamiento.** Sesiones de trabajo con Diseño Instruccional, audiovisual y Mesa de
  Ayuda, más la lectura de la documentación existente. Recorremos **un curso real de punta a punta**
  (de la planificación a la publicación) para ver el flujo tal como es hoy, no como está documentado.
- **Semana 2 — Mapa y criterios.** Producimos el mapa de procesos y responsabilidades (RACI), y el
  **catálogo de criterios de calidad**, enlazado a cada etapa del proceso y a cada curso.
- **Semana 3 — Reglas y arquitectura.** Traducimos los criterios a **reglas verificables por
  software** y armamos la **arquitectura objetivo**, priorizada por impacto (qué se automatiza
  primero y por qué).

**Entregables:** mapa RACI · catálogo de criterios de calidad (documento centralizado y enlazado) ·
arquitectura priorizada · recomendación de herramientas (efectivas, escalables y mantenibles).

**Solo la Fase 0 se contrata ahora.** Es acotada y su entregable es justamente la evidencia para
decidir Fase 1. Precio: **38–40 módulos UNC** (~$1.850.000–$1.950.000 ARS, único pago).

### Fase 1 — Automatizar lo que rinde

Las 2-3 automatizaciones de mayor retorno, empezando por los criterios de finalización del DI.

### Fase 2 — Extender

Producción audiovisual y experiencia estudiantil, sobre la base ya funcionando.

---

## 4. Lo que necesitamos de ustedes

Para que la Fase 0 no sea especulativa, necesitamos precisar varias cosas que hoy no tenemos claras.
Algunas apuntan a un punto de fondo: **hay varios hilos de trabajo en paralelo** (la propuesta de
Nacho y Natalia, la colaboración con Santex, los criterios de calidad en discusión) y necesitamos
verlos consolidados para no superponernos ni duplicar esfuerzo. Ser explícitos acá es justamente lo
que nos va a permitir aportar sin fricción.

1. **La propuesta de automatización en curso — ¿cuál es, y cuántas hay?**
   Sabemos que Nacho y Natalia llevan una propuesta, y que hay una colaboración con Santex. ¿Son la
   misma cosa? ¿Hay una tercera iniciativa? Necesitamos el o los documentos que existan, aunque estén
   en borrador, para alinearnos a la arquitectura que ya tienen (o ayudarlos a definirla si aún no
   está cerrada).

2. **Criterios de calidad — ¿están estandarizados hoy?**
   ¿Existe una lista formal de criterios de calidad, o se maneja de forma implícita por cada equipo?
   Si existe: ¿cuáles son, quién los mantiene y en qué estado están? Nos sirve muchísimo un
   **documento compartido**, y ojalá **centralizado y enlazado de forma transversal** a cada etapa y
   cada curso (es decir: que desde el plan de un curso se pueda llegar al criterio de calidad que le
   aplica). Sobre eso podemos ser específicos en _cómo_ mejorarlos y automatizarlos, y _con qué_
   herramientas — las más efectivas, más fáciles de escalar y, no menos importante, **mantenibles**
   (ver glosario).

3. **Articulación entre Diseño Instruccional y desarrollo — paso a paso y herramienta a herramienta.**
   Necesitamos saber exactamente cómo implementan un diseño hoy: ¿promptean a Gemini y guardan
   archivos HTML en carpetas? ¿Qué arquitectura o instrucciones le dan a la IA? ¿Cómo se articula
   cada paso con el siguiente y con qué herramientas (Drive, Sheets, Docs, Moodle, otra)? Con eso
   definimos qué es realmente automatizable, cómo, y qué conviene reemplazar. Sin este detalle, todo
   lo demás es adivinanza.

4. **Mesa de Ayuda — ¿cómo le dan seguimiento hoy?**
   ¿Qué herramienta usan (correo, planilla, sistema de tickets)? ¿Pueden medir volumen, categorías
   de consulta, nivel de impacto o costo por consulta? Si no hay medición, es un primer problema que
   podemos resolver en la Fase 0.

5. **Experiencia de les estudiantes — hoy solo llega por dos vías.**
   Por lo que conversamos, lo que hoy reciben es: consultas de Mesa de Ayuda + encuestas de
   satisfacción al final (los cursos 269 y 304 tienen un módulo con eso). Eso es feedback _reactivo_.
   Nuestro aporte es pasar a **seguimiento continuo con KPI** (ver glosario): detectar abandono y
   bloqueos _cuando ocurren_, no después. Es un punto que creemos importante que vean: cambia la
   forma de medir la experiencia de "reaccionar a quejas" a "anticipar problemas".

6. **Producción audiovisual — qué se produce y cómo se integra.**
   Entendemos que es el contenido audiovisual de los cursos (clases grabadas, videos, imágenes).
   Necesitamos saber no solo _dónde_ se guarda o cómo se trackea, sino **cómo se integra con cada paso
   del proceso**: ¿en qué momento entra la producción audiovisual, quién la pide, cómo llega el
   material al curso, dónde se producen las demoras?

7. **Presupuesto y camino de contratación.** Quién firma, rol de la Prosecretaría de Informática,
   plazos estimados.

---

## 5. Reunión de trabajo propuesta

Para avanzar rápido, proponemos una **reunión de 30-45 minutos con Nacho y Natalia esta semana**,
para que nos compartan la propuesta en curso y ajustemos juntos el alcance de la Fase 0. Fernando y
Victoria, bienvenidos a sumarse. Patricia, nos encantaría que participes al menos del cierre para
validar la dirección.

---

## 6. Sobre Santex

Complementario, no excluyente: ellos aportan formación colectiva en IA; nosotros, arquitectura e
integración técnica al proceso real. Sugerimos coordinar la capacitación **después** de la Fase 0,
para aplicarla sobre una base ordenada.

---

## 7. Condiciones generales

- Sin contrato de permanencia. Facturación por entrega. Cancelación en cualquier momento.
- Sin costo de herramientas: stack open source / free tier. Solo se cobra el servicio profesional.
- Propiedad de los datos: reportes e histórico son de la UNC, en formatos abiertos (HTML + JSON).
- Confidencialidad: credenciales como secrets, sin exposición.
- Modalidad: servicios profesionales bajo normativa UNC (OHCS 4/2025), liquidable vía SIU-Diaguita.
- Ajuste por inflación: si el pago se demora más de 60 días, el monto en módulos se recalcula al
  valor vigente al pago.

---

## 8. Guía de términos

| Término                                                              | Qué significa, en simple                                                                                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **KPI** (_Key Performance Indicator_ — Indicador Clave de Desempeño) | Una métrica concreta y medible para saber si un proceso u objetivo va bien (ej: tasa de reactivación, tiempo medio de respuesta, % de abandono).                                          |
| **Mantenibilidad** (_maintainability_)                               | Qué tan fácil y económico es mantener un sistema funcionando y actualizado en el tiempo. Distinta de la escalabilidad: algo puede escalar bien pero ser caro de mantener. Buscamos ambas. |
| **Escalabilidad** (_scalability_)                                    | Capacidad de crecer sin rehacer (más cursos, más estudiantes, más procesos) manteniendo costo y tiempo acotados.                                                                          |
| **ROI** (_Return On Investment_ — retorno de inversión)              | Cuánto trabajo, tiempo o errores se ahorran en relación con lo que cuesta automatizar.                                                                                                    |
| **RACI**                                                             | Mapa de responsabilidades: quién **hace** cada tarea, quién **responde**, a quién se **consulta**, a quién se **informa**.                                                                |
| **DI (Diseño Instruccional)**                                        | El proceso de diseñar un curso: contenidos, orden, actividades y evaluaciones.                                                                                                            |
| **Criterios de calidad**                                             | La lista de "esto tiene que cumplirse" para dar un curso por terminado.                                                                                                                   |
| **Control automático de finalización**                               | Esa lista de chequeo ejecutada por software: corre sola y avisa qué falta.                                                                                                                |
| **Gate / restricción de acceso**                                     | Requisito para avanzar (ej: "para ver el Módulo 3, entregá el TP del Módulo 2").                                                                                                          |
| **Pipeline (flujo)**                                                 | La secuencia de pasos por la que pasa un curso, de la planificación a la publicación.                                                                                                     |
| **Instrumentación**                                                  | Agregar medición y monitoreo a un proceso (como el tablero de un auto), para ver qué ocurre en tiempo real.                                                                               |
| **Módulo UNC**                                                       | Unidad de contratación de la universidad (hoy $48.696).                                                                                                                                   |
| **OHCS 4/2025 / SIU-Diaguita**                                       | La normativa y el sistema por los que la UNC contrata y liquida servicios profesionales.                                                                                                  |

---

Quedamos a disposición para coordinar la reunión y arrancar la Fase 0.

Saludos,

Nahuel Gómez
nagomez@mi.unc.edu.ar

_Reportes de evidencia: https://nelgoez.github.io/unc-agentic-dev/audit/_
