# Plan de Implementación — Plugin Reengagement

## Fases

### Fase 1: Desarrollo de Contenidos y Maquetación (DEV)
- [ ] Redacción de copys por curso (IA, Python, Yoga)
  - Acción de Rescate (Módulo 1): puente para estudiantes inactivos
  - Mantenimiento de Ritmo (Módulo 2): impulso para continuar
- [ ] Diseño HTML: 6 piezas (2 por curso) con banner, placeholders Moodle, deep linking
- [ ] Pruebas de disparo en entorno DEV con usuarios testing

### Fase 2: Configuración en Producción (11-15 mayo)
- [ ] Seteo de parámetros en 3 cursos de producción
- [ ] Coordinación con IT: instalación/verificación del plugin
- [ ] Cron desactivado inicialmente (evitar envíos prematuros)

### Fase 3: Lanzamiento y Activación (18 mayo)
- [ ] Checklist final de IDs de actividades
- [ ] Notificar a Sistemas para activar cron
- [ ] Monitoreo inicial de cola de envío

### Fase 4: Analítica e Impacto (25-26 mayo)
- [ ] Briefing para Ingeniería — especificaciones de eventos
- [ ] KPIs:
  - Tasa de Reactivación (%)
  - Tiempo Medio de Respuesta
  - Tiempo promedio resolución Módulo 2 vs cohortes anteriores
  - Clics vs finalización
- [ ] Query: cruzar `email_sent` con `course_module_completion_updated`

## Estructura por Curso
Ver `.context/cursos-activos.md`
