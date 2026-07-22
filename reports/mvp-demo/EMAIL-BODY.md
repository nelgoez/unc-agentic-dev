---
subject: 'Auditoría curso 269 (Python 1) — Issue original resuelto, nuevos hallazgos con caveats'
to: Ignacio Acuña, Patricia Otaola
from: Equipo de Automatización — UNC Campus Virtual
date: 2026-07-22
---

## Asunto sugerido

**Auditoría Python 1: el "Notebook Funcion-Lambda" ya no es un problema, pero encontramos 4 actividades en Bienvenida que no pueden marcarse como completadas**

---

## Cuerpo del email

Hola Ignacio y equipo,

Completamos la auditoría del curso 269 (Python 1). Les comparto los resultados con total transparencia, incluyendo lo que pudimos y no pudimos verificar.

### ✅ Noticia buena: el problema del Módulo 3 está resuelto

El caso que reportó nelthur — el Módulo 3 bloqueado por una actividad llamada "Notebook Funcion-Lambda" que no existía como recurso visible — ya no aparece. La verificación del servidor confirma 0 dependencias rotas. Alguien del equipo de Campus Virtual restauró o recreó el recurso faltante. Gracias.

### 🔴 Lo que encontramos ahora (4 hallazgos)

Al recorrer el curso como un estudiante nuevo (creado exclusivamente para esta auditoría), detectamos que 4 actividades en la sección **Bienvenida** no pueden marcarse como completadas:

1. "Sobre los docentes"
2. "Sobre los objetivos"
3. "Encuesta de diagnóstico inicial"
4. "Presentaciones de bienvenida"

Estas actividades son requisito para desbloquear el Módulo 1. Si un estudiante nuevo no puede marcarlas como "completadas", el Módulo 1 nunca se desbloquea, y en cadena tampoco el 2, 3 ni el Cierre.

**Pero con un dato importante:** nelthur completó esas 4 actividades ANTES de ser promovido a administrador, cuando el seguimiento de finalización funcionaba. Su progreso histórico (26/28) muestra que el curso SÍ era transitable en ese momento. Alguien deshabilitó el seguimiento de finalización de esas actividades después. No sabemos si fue intencional o un efecto secundario de otro cambio.

Lo que SÍ podemos afirmar es que **un estudiante nuevo, recorriendo el curso hoy, no encuentra forma de marcar esas 4 actividades como completadas**. Si en la práctica los docentes las completan manualmente o hay otro mecanismo que no detectamos, este hallazgo es un falso positivo parcial — y nos gustaría saberlo para ajustar la detección.

### ⚠️ Lo que NO pudimos verificar

- Si un docente puede marcar actividades como completadas desde el libro de calificaciones
- Si hay cambios entre una auditoría y otra que afecten los resultados
- Otras formas de completar actividades que no pasen por la interfaz del curso (ej: integraciones externas)

### 📋 Resumen

| Aspecto | Estado |
|---------|--------|
| Phantom "Notebook Funcion-Lambda" | ✅ Resuelto |
| Actividades sin seguimiento de finalización | 🔴 Detectado (con caveats) |
| Módulos bloqueados en cascada | 🔴 Consecuencia del punto anterior |

### 📎 Acceso a los reportes

- **Reporte completo**: https://nelgoez.github.io/unc-agentic-dev/
- **Reporte técnico**: https://nelgoez.github.io/unc-agentic-dev/allure/
- **Ejecutar nueva auditoría**: https://github.com/nelgoez/unc-agentic-dev/actions/workflows/audit-ci.yml

### 💬 Feedback

Esta herramienta mejora con cada uso. Si algún hallazgo no coincide con la realidad del curso (falso positivo), o si encuentran issues que la herramienta NO detectó (falso negativo), avísenos. Así podemos ajustar la detección.

Saludos,
Equipo de Automatización
