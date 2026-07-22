Subject: 🚀 Auditoría Python 1: el phantom fue reparado, encontramos 4 actividades sin seguimiento de finalización

Hola Ignacio y equipo,

Completamos la auditoría del curso 269 (Python 1) con nuestra nueva metodología. Les comparto resultados y limitaciones con total transparencia.


✅ Problema anterior resuelto

El "Notebook Funcion-Lambda" que bloqueaba el Módulo 3 — reportado por nelthor — ya no es un problema. La verificación del servidor confirma 0 dependencias rotas. Alguien del equipo de Campus Virtual restauró el recurso faltante. Gracias.


🔴 Hallazgos actuales (4 críticos)

Al recorrer el curso como un estudiante nuevo (creado exclusivamente para esta auditoría), detectamos que 4 actividades en la sección Bienvenida no tienen forma de marcarse como completadas:

1. "Sobre los docentes"
2. "Sobre los objetivos"
3. "Encuesta de diagnóstico inicial"
4. "Presentaciones de bienvenida"

Estas actividades son requisito para desbloquear el Módulo 1. Sin poder completarlas, Módulos 1, 2, 3 y Cierre quedan bloqueados en cadena para cualquier estudiante nuevo.

Dato clave: nelthur completó estas 4 actividades ANTES de ser promovido a administrador, cuando el seguimiento de finalización funcionaba. Su progreso (26/28 actividades) confirma que el curso SÍ era transitable en ese momento. Alguien deshabilitó el tracking después. No sabemos si fue intencional o un efecto secundario de otro cambio.


⚠️ Lo que NO pudimos verificar

- Si un docente puede marcar actividades como completadas manualmente desde el libro de calificaciones.
- Si hay otras formas de completar actividades que no pasen por la interfaz del curso (aprobación directa, grupos, integraciones externas).
- Si el tracking se deshabilitó por accidente o adrede.

Si en la práctica los docentes completan estas actividades manualmente, estos hallazgos serían falsos positivos parciales — y nos gustaría saberlo para ajustar la detección.


📊 Resumen rápido

  Phantom "Notebook Funcion-Lambda" ................. ✅ Resuelto
  4 actividades sin completar en Bienvenida ......... 🔴 Detectado (con caveats)
  Módulos en cascada bloqueados .................... 🔴 Consecuencia del punto anterior
  Cohorts ......................................... ✅ Verificado (0 grupos en este curso)


📎 Links

  🔍 Reporte completo: https://nelgoez.github.io/unc-agentic-dev/
  🔬 Reporte técnico (Allure): https://nelgoez.github.io/unc-agentic-dev/allure/
  🔄 Ejecutar nueva auditoría: https://github.com/nelgoez/unc-agentic-dev/actions/workflows/audit-ci.yml
    (elegís el ID del curso y en ~3 minutos tenés el reporte)
  📋 Propuesta Course Kit: https://unc-course-kit.netlify.app/#/11


💬 Feedback

Esta herramienta mejora con cada uso. Si encuentran:
- Un hallazgo que no coincide con la realidad (falso positivo)
- Un error que la herramienta NO detectó (falso negativo)
- Cursos nuevos que deberíamos auditar

Avísenos y ajustamos la detección. El objetivo es que el reporte refleje fielmente lo que un estudiante nuevo encuentra al inscribirse.

Saludos,
Nahuel Gomez
QA Engineer — UNC Campus Virtual
https://nelthor.com.ar
