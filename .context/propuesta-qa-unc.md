# Propuesta UNC — QA de Cursos Moodle

> Para: Patricia (Dirección Campus Virtual) vía Ignacio y Fernando (Diseño Instruccional)
> Fecha: Agosto 2026
> Contexto: Auditoría piloto cursos 269 y 304 completada. Herramienta funcional.

---

## Lo que ya saben (evidencia concreta)

Ejecutamos auditoría automatizada sobre los cursos 269 (Python) y 304 (Violencias Digitales):

| Curso | Hallazgos API (100% confiable)                                    | Docs                        | Resultado                    |
| ----- | ----------------------------------------------------------------- | --------------------------- | ---------------------------- |
| 304   | 9 secciones, 31 actividades, 6 gates OK, 2 certificados correctos | 33 actividades documentadas | ✅ Sin errores estructurales |
| 269   | 5 secciones, 46 actividades                                       | Sin docs disponibles        | ⚠️ Revisión parcial          |

El reporte está disponible en una URL pública que se actualiza automáticamente:
→ `https://nelgoez.github.io/unc-agentic-dev/audit/`

---

## Principio fundamental

> **La precisión de nuestros reportes refleja la claridad de sus procesos.**
>
> Procesos documentados y estandarizados → reportes limpios, accionables, sin ruido.
> Procesos sin convenciones ni trazabilidad → reportes con advertencias que requieren interpretación manual.

Esto no es una limitación técnica. Es una realidad de cualquier sistema de QA: la calidad del output depende de la calidad del input. Lo importante es que elegimos ser honestos al respecto.

---

## Tres caminos posibles

### Opción A: Consultoría de procesos + staff técnico

**Qué incluye:**

- Auditoría inicial de todo el pipeline de diseño instruccional (pre-montaje → validación → autotesting → publicación)
- Definición de estándares: naming conventions, tipos de actividad, estructuras de gates, templates de documentación
- Implementación de trazabilidad completa (cada actividad trazable desde el diseño hasta la publicación)
- Capacitación al equipo en las convenciones definidas
- Herramienta de QA integrada al nuevo flujo
- Soporte continuo: reuniones semanales/quincenales, ajustes según nuevos cursos

**Resultado esperado:**
En 3-6 meses, el departamento tiene un proceso estandarizado donde cada curso nuevo pasa por validación automática antes de publicarse. Los reportes son precisos, accionables, y no requieren interpretación manual.

**Rango de inversión:**

- Setup inicial (2-3 meses intensivos): USD 3.000 - 5.000
- Mantenimiento mensual (soporte + ajustes): USD 800 - 1.500/mes
  _Incluye: herramientas, consultoría, capacitación, reportes_

**Ideal para:** Equipos que quieren resolver el problema de raíz y están dispuestos a invertir en orden y trazabilidad. El costo se justifica en la reducción de errores en producción y el ahorro de tiempo del equipo de diseño.

---

### Opción B: Herramienta dinámica (flexible, se adapta a sus docs)

**Qué incluye:**

- Plataforma de auditoría desplegada en la web (acceso vía URL, sin instalación)
- Parser inteligente que se adapta a sus formatos de documentos actuales (CSV, MD, XLSX)
- Reportes con niveles de confianza visuales (verde = 100% API, naranja = depende de docs)
- Re-ejecución con un click desde el mismo reporte
- Historial automático de todas las ejecuciones (comparar antes/después)
- Actualizaciones semanales automáticas

**Flexibilidad real:**
La herramienta usa fuzzy matching para mapear sus docs contra lo publicado en Moodle. Cuanto más estandarizados estén los nombres y formatos, más preciso es el mapeo. Si los docs son inconsistentes, el reporte lo indica explícitamente con baja confianza en esas secciones.

**Rango de inversión:**

- Desarrollo + deploy inicial: USD 3.500 - 5.000
- Mantenimiento mensual (hosting, ajustes de parser, soporte): USD 400 - 800/mes

**Ideal para:** Equipos que quieren empezar ya con lo que tienen, sin cambiar sus procesos de inmediato, pero aceptan que la precisión será proporcional a la claridad de su documentación actual.

---

### Opción C: Herramienta lista (producto empaquetado)

**Qué incluye:**

- CLI + reporte web autónomo que recibe:
  1. ID del curso en Moodle (o nombre si está estandarizado)
  2. Archivo de pre-montaje (.md)
  3. Archivo de validación (.csv o .xlsx)
  4. Planilla de autotesting (opcional, .csv)
- Reporte HTML autónomo con:
  - Estructura del curso (secciones, actividades, tipos)
  - Gates y dependencias (qué actividad bloquea qué)
  - Completion tracking (automático, manual, sin tracking)
  - Certificados y condiciones de aprobación
  - Huérfanos (gates que referencian actividades eliminadas)
  - Mapeo doc vs producción con niveles de confianza
- Despliegue en GitHub Pages (URL pública, sin servidor)
- Documentación de uso para el equipo

**Lo que NO incluye:**

- Adaptación a formatos no estándar (si sus docs no siguen el formato esperado, el parser no los lee)
- Consultoría de procesos
- Capacitación más allá de la documentación escrita

**Rango de inversión:**

- Setup + deploy: USD 2.000 - 3.000
- Mantenimiento opcional (actualizaciones, nuevos parsers): USD 200 - 400/mes

**Ideal para:** Equipos que ya tienen (o están dispuestos a adoptar) un formato estándar para sus documentos y solo necesitan la herramienta de validación.

---

## Comparación rápida

|                                 | A: Consultoría    | B: Herramienta dinámica | C: Herramienta lista   |
| ------------------------------- | ----------------- | ----------------------- | ---------------------- |
| **Setup inicial**               | USD 3.000-5.000   | USD 3.500-5.000         | USD 2.000-3.000        |
| **Mantenimiento**               | USD 800-1.500/mes | USD 400-800/mes         | USD 200-400/mes        |
| **Estandarización de procesos** | ✅ Completa       | ⚠️ Progresiva           | ❌ Depende de uds      |
| **Precisión de reportes**       | 🔒 Alta           | 📄 Variable (docs)      | 📄 Depende del formato |
| **Auto-servicio (re-ejecutar)** | ✅ 1 click        | ✅ 1 click              | ✅ 1 click             |
| **Tiempo hasta valor**          | 2-3 meses         | 1-2 semanas             | 1 semana               |
| **Requiere cambio de procesos** | Sí (guiado)       | No (gradual)            | Sí (formato fijo)      |

---

## Recomendación

Si el objetivo es **resultados inmediatos con mínimo cambio organizacional** → Opción C con posible upgrade a B.

Si el objetivo es **resolver el problema de fondo y escalar** → Opción A, posiblemente empezando con B como piloto para mostrar valor rápido a Patricia mientras se planifica la estandarización.

Si el objetivo es **empezar ya, medir el valor, y decidir después** → Opción B. Ya tenemos el piloto funcionando con 304. El próximo paso natural es sumar más cursos y refinar el parser.

---

## Próximo paso

Definir cuál de estos caminos presentarle a Patricia. Si necesita un deck visual para acompañar la propuesta, puedo generarlo.
