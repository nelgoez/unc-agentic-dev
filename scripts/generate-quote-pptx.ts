import PptxGenJS from 'pptxgenjs'

const pptx = new PptxGenJS()
pptx.layout = 'LAYOUT_WIDE'
pptx.author = 'Campus Virtual UNC'
pptx.title = 'Propuesta de Servicios — Campus Virtual UNC'
pptx.subject = 'Propuesta de servicios de desarrollo para reenganche, dashboard y estandarización'

// ── Colors ──
const NAVY = '1A3A8A'
const BLUE = '3466D0'
const LIGHT_BLUE = '5B8DEF'
const WHITE = 'FFFFFF'
const DARK = '0A1628'
const GRAY = '44556D'
const LIGHT_GRAY = 'F0F3F8'
const BORDER = 'DDE2ED'
const CHECK_GREEN = '0D8040'

// ── Helpers ──
function addFooter(slide: PptxGenJS.Slide, pageNum: number) {
  slide.addText(`Confidencial · Campus Virtual UNC · Junio 2026`, {
    x: 0.5,
    y: 6.9,
    w: 8,
    h: 0.3,
    fontSize: 8,
    color: '888888',
  })
  slide.addText(String(pageNum), {
    x: 12,
    y: 6.9,
    w: 0.5,
    h: 0.3,
    fontSize: 8,
    color: '888888',
    align: 'right',
  })
}

function addTopBar(slide: PptxGenJS.Slide, label: string) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.06, fill: { color: NAVY } })
  slide.addText(label, {
    x: 0.5,
    y: 0.2,
    w: 5,
    h: 0.4,
    fontSize: 9,
    color: NAVY,
    bold: true,
    fontFace: 'Calibri',
  })
}

// ═══════════════════════════════════════════
// SLIDE 1 — Portada
// ═══════════════════════════════════════════
{
  const s = pptx.addSlide()
  s.background = { fill: NAVY }
  s.addShape(pptx.ShapeType.ellipse, {
    x: 7,
    y: -1.5,
    w: 6,
    h: 6,
    fill: { color: BLUE },
    rotate: -15,
  })
  s.addText('CAMPUS VIRTUAL UNC', {
    x: 0.8,
    y: 1.2,
    w: 8,
    h: 0.5,
    fontSize: 11,
    color: 'AABBCC',
    fontFace: 'Calibri',
    bold: true,
    charSpacing: 6,
  })
  s.addText('Propuesta de\nServicios Profesionales', {
    x: 0.8,
    y: 1.8,
    w: 10,
    h: 2,
    fontSize: 42,
    color: WHITE,
    fontFace: 'Calibri Light',
    bold: true,
    lineSpacingMultiple: 0.95,
  })
  s.addText(
    'Reenganche automatizado · Dashboard de actividades · Inducción estudiantil · Estandarización de cursos',
    {
      x: 0.8,
      y: 4.0,
      w: 8,
      h: 0.8,
      fontSize: 14,
      color: 'AABBCC',
      fontFace: 'Calibri',
    },
  )
  s.addText(
    'Preparado para Patricia Altamirano, Dirección de Campus Virtual\nJunio 2026 · Confidencial',
    {
      x: 0.8,
      y: 5.2,
      w: 6,
      h: 0.6,
      fontSize: 11,
      color: '8899BB',
      fontFace: 'Calibri',
    },
  )
  addFooter(s, 1)
}

// ═══════════════════════════════════════════
// SLIDE 2 — Contexto
// ═══════════════════════════════════════════
{
  const s = pptx.addSlide()
  s.background = { fill: WHITE }
  addTopBar(s, 'CONTEXTO')

  s.addText('Tres desafíos que escalan\ncon cada cohorte.', {
    x: 0.5,
    y: 0.8,
    w: 10,
    h: 1.2,
    fontSize: 28,
    color: NAVY,
    fontFace: 'Calibri Light',
    bold: true,
  })

  const challenges = [
    {
      title: 'Abandono silencioso',
      desc: 'Estudiantes inactivos en Módulo 1 sin intervención automatizada. Sin rescate, se pierden.',
    },
    {
      title: 'Decisiones a ciegas',
      desc: 'Sin dashboard de actividades, los responsables no saben qué curso tiene 0% o 100% de completitud.',
    },
    {
      title: 'Fricción de punta a punta',
      desc: 'Sin inducción estandarizada ni progresión encadenada, cada curso reinventa la rueda.',
    },
  ]

  challenges.forEach((c, i) => {
    const yPos = 2.2 + i * 1.5
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.5,
      y: yPos,
      w: 12,
      h: 1.2,
      fill: { color: i === 0 ? LIGHT_GRAY : 'F8F9FC' },
      rectRadius: 0.1,
    })
    s.addText(c.title, {
      x: 0.8,
      y: yPos + 0.1,
      w: 4,
      h: 0.4,
      fontSize: 16,
      color: NAVY,
      fontFace: 'Calibri',
      bold: true,
    })
    s.addText(c.desc, {
      x: 0.8,
      y: yPos + 0.55,
      w: 11,
      h: 0.5,
      fontSize: 12,
      color: GRAY,
      fontFace: 'Calibri',
    })
  })

  s.addText(
    'Esta propuesta ofrece tres niveles de intervención incremental. Cada nivel suma capacidades sobre el anterior.',
    {
      x: 0.5,
      y: 6.1,
      w: 11,
      h: 0.5,
      fontSize: 11,
      color: GRAY,
      fontFace: 'Calibri',
      italic: true,
    },
  )
  addFooter(s, 2)
}

// ═══════════════════════════════════════════
// SLIDE 3 — MVP 1 Rescate
// ═══════════════════════════════════════════
{
  const s = pptx.addSlide()
  s.background = { fill: WHITE }
  addTopBar(s, 'MVP 1 — RESCATE INMEDIATO')

  s.addText('MVP 1 — Rescate Inmediato', {
    x: 0.5,
    y: 0.8,
    w: 8,
    h: 0.5,
    fontSize: 26,
    color: NAVY,
    fontFace: 'Calibri Light',
    bold: true,
  })
  s.addText('6–8 semanas desde firma de contrato', {
    x: 0.5,
    y: 1.3,
    w: 5,
    h: 0.3,
    fontSize: 12,
    color: BLUE,
    fontFace: 'Calibri',
  })

  const items = [
    '6 piezas de email HTML — 2 por curso (rescate M1 + mantenimiento M2)',
    '3 cursos cubiertos: IA y Automatización, Python 1, Yoga y Mindfulness',
    'Configuración del plugin en entorno de producción',
    'Pruebas de disparo en DEV con usuarios testing',
    'Activación controlada del cron (sin envíos prematuros)',
    'Setup de analítica: KPIs de Reactivación, Tiempo de Respuesta, Clics vs Finalización',
  ]

  items.forEach((item, i) => {
    s.addText(`→  ${item}`, {
      x: 0.7,
      y: 1.9 + i * 0.45,
      w: 11.5,
      h: 0.4,
      fontSize: 12,
      color: DARK,
      fontFace: 'Calibri',
    })
  })

  // Price box
  s.addShape(pptx.ShapeType.roundRect, {
    x: 7.2,
    y: 4.6,
    w: 5.5,
    h: 2.0,
    fill: { color: NAVY },
    rectRadius: 0.15,
  })
  s.addText('110–155 módulos', {
    x: 7.4,
    y: 4.75,
    w: 5,
    h: 0.5,
    fontSize: 24,
    color: WHITE,
    fontFace: 'Calibri',
    bold: true,
  })
  s.addText('$5.700.000 – $8.000.000 ARS\n≈ USD 4.700 – 6.600', {
    x: 7.4,
    y: 5.3,
    w: 5,
    h: 0.6,
    fontSize: 11,
    color: '99AACC',
    fontFace: 'Calibri',
  })

  s.addText('Entregables', {
    x: 0.5,
    y: 1.6,
    w: 3,
    h: 0.3,
    fontSize: 10,
    color: NAVY,
    fontFace: 'Calibri',
    bold: true,
    charSpacing: 4,
  })
  addFooter(s, 3)
}

// ═══════════════════════════════════════════
// SLIDE 4 — MVP 2 Visibilidad
// ═══════════════════════════════════════════
{
  const s = pptx.addSlide()
  s.background = { fill: WHITE }
  addTopBar(s, 'MVP 2 — VISIBILIDAD')

  s.addText('MVP 2 — Visibilidad', {
    x: 0.5,
    y: 0.8,
    w: 8,
    h: 0.5,
    fontSize: 26,
    color: NAVY,
    fontFace: 'Calibri Light',
    bold: true,
  })
  s.addText('Todo MVP 1, más dashboard · 10–14 semanas', {
    x: 0.5,
    y: 1.3,
    w: 7,
    h: 0.3,
    fontSize: 12,
    color: BLUE,
    fontFace: 'Calibri',
  })

  const items = [
    'Dashboard de Análisis de Actividades sobre Moodle Configurable Reports',
    'Tasa de completitud por actividad y por curso',
    'Alertas automáticas: 0% (bloqueo) y 100% (anomalía)',
    'Reportes exportables para responsables académicos',
    'Cruce de datos: emails de reenganche vs progreso de actividades',
  ]

  items.forEach((item, i) => {
    s.addText(`→  ${item}`, {
      x: 0.7,
      y: 1.9 + i * 0.5,
      w: 11.5,
      h: 0.45,
      fontSize: 12,
      color: DARK,
      fontFace: 'Calibri',
    })
  })

  s.addShape(pptx.ShapeType.roundRect, {
    x: 7.2,
    y: 4.6,
    w: 5.5,
    h: 2.0,
    fill: { color: BLUE },
    rectRadius: 0.15,
  })
  s.addText('190–270 módulos', {
    x: 7.4,
    y: 4.75,
    w: 5,
    h: 0.5,
    fontSize: 24,
    color: WHITE,
    fontFace: 'Calibri',
    bold: true,
  })
  s.addText('$9.800.000 – $14.000.000 ARS\n≈ USD 8.100 – 11.600', {
    x: 7.4,
    y: 5.3,
    w: 5,
    h: 0.6,
    fontSize: 11,
    color: '99AACC',
    fontFace: 'Calibri',
  })

  s.addText('Entregables adicionales', {
    x: 0.5,
    y: 1.6,
    w: 3,
    h: 0.3,
    fontSize: 10,
    color: NAVY,
    fontFace: 'Calibri',
    bold: true,
    charSpacing: 4,
  })
  addFooter(s, 4)
}

// ═══════════════════════════════════════════
// SLIDE 5 — MVP 3 Ciclo Completo
// ═══════════════════════════════════════════
{
  const s = pptx.addSlide()
  s.background = { fill: WHITE }
  addTopBar(s, 'MVP 3 — CICLO COMPLETO')

  s.addText('MVP 3 — Ciclo Completo', {
    x: 0.5,
    y: 0.8,
    w: 8,
    h: 0.5,
    fontSize: 26,
    color: NAVY,
    fontFace: 'Calibri Light',
    bold: true,
  })
  s.addText('Todo MVP 2, más inducción + estandarización · 16–22 semanas', {
    x: 0.5,
    y: 1.3,
    w: 8,
    h: 0.3,
    fontSize: 12,
    color: BLUE,
    fontFace: 'Calibri',
  })

  // Two columns
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.5,
    y: 1.9,
    w: 5.8,
    h: 2.6,
    fill: { color: LIGHT_GRAY },
    rectRadius: 0.1,
  })
  s.addText('Inducción Estudiantil', {
    x: 0.8,
    y: 2.0,
    w: 5,
    h: 0.35,
    fontSize: 13,
    color: NAVY,
    fontFace: 'Calibri',
    bold: true,
  })
  const indItems = [
    'Tour de Automatriculación',
    'Tour de Autoregistro',
    'Video de bienvenida institucional',
    'Mails de confirmación (2 variantes)',
    'Módulo 0 en todos los cursos activos',
  ]
  indItems.forEach((item, i) => {
    s.addText(`→  ${item}`, {
      x: 0.8,
      y: 2.45 + i * 0.4,
      w: 5,
      h: 0.35,
      fontSize: 11,
      color: DARK,
      fontFace: 'Calibri',
    })
  })

  s.addShape(pptx.ShapeType.roundRect, {
    x: 6.7,
    y: 1.9,
    w: 6.0,
    h: 2.6,
    fill: { color: LIGHT_GRAY },
    rectRadius: 0.1,
  })
  s.addText('Estandarización de Cursos', {
    x: 7.0,
    y: 2.0,
    w: 5,
    h: 0.35,
    fontSize: 13,
    color: NAVY,
    fontFace: 'Calibri',
    bold: true,
  })
  const estItems = [
    'Exámenes auto-calificados',
    'Progresión encadenada por módulo',
    'Material obligatorio configurado',
    'Emisión de certificados automatizada',
  ]
  estItems.forEach((item, i) => {
    s.addText(`→  ${item}`, {
      x: 7.0,
      y: 2.45 + i * 0.4,
      w: 5.2,
      h: 0.35,
      fontSize: 11,
      color: DARK,
      fontFace: 'Calibri',
    })
  })

  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.5,
    y: 4.8,
    w: 12,
    h: 1.8,
    fill: { color: NAVY },
    rectRadius: 0.15,
  })
  s.addText('320–460 módulos  |  $16.500.000 – $23.800.000 ARS  |  ≈ USD 13.600 – 19.600', {
    x: 0.8,
    y: 4.95,
    w: 11,
    h: 0.5,
    fontSize: 16,
    color: WHITE,
    fontFace: 'Calibri',
    bold: true,
  })
  s.addText(
    'Todo MVP 1 + MVP 2, más inducción y estandarización. El paquete completo para el ciclo de vida del estudiante.',
    {
      x: 0.8,
      y: 5.5,
      w: 11,
      h: 0.8,
      fontSize: 12,
      color: '99AACC',
      fontFace: 'Calibri',
    },
  )
  addFooter(s, 5)
}

// ═══════════════════════════════════════════
// SLIDE 6 — Tabla Comparativa
// ═══════════════════════════════════════════
{
  const s = pptx.addSlide()
  s.background = { fill: WHITE }
  addTopBar(s, 'TABLA COMPARATIVA')

  s.addText('Tabla Comparativa', {
    x: 0.5,
    y: 0.8,
    w: 8,
    h: 0.5,
    fontSize: 26,
    color: NAVY,
    fontFace: 'Calibri Light',
    bold: true,
  })

  const rows: { text: string; options: Record<string, unknown> }[][] = [
    [
      {
        text: 'Capacidad',
        options: {
          bold: true,
          color: WHITE,
          fontSize: 11,
          fill: { color: NAVY },
          fontFace: 'Calibri',
        },
      },
      {
        text: 'MVP 1\nRescate',
        options: {
          bold: true,
          color: WHITE,
          fontSize: 11,
          fill: { color: NAVY },
          fontFace: 'Calibri',
          align: 'center',
        },
      },
      {
        text: 'MVP 2\nVisibilidad',
        options: {
          bold: true,
          color: WHITE,
          fontSize: 11,
          fill: { color: NAVY },
          fontFace: 'Calibri',
          align: 'center',
        },
      },
      {
        text: 'MVP 3\nCiclo Completo',
        options: {
          bold: true,
          color: WHITE,
          fontSize: 11,
          fill: { color: NAVY },
          fontFace: 'Calibri',
          align: 'center',
        },
      },
    ],
    [
      { text: 'Emails de reenganche', options: { fontSize: 11 } },
      { text: '✓', options: { color: CHECK_GREEN, bold: true, align: 'center', fontSize: 11 } },
      { text: '✓', options: { color: CHECK_GREEN, bold: true, align: 'center', fontSize: 11 } },
      { text: '✓', options: { color: CHECK_GREEN, bold: true, align: 'center', fontSize: 11 } },
    ],
    [
      { text: 'Analítica de reenganche', options: { fontSize: 11 } },
      { text: '✓', options: { color: CHECK_GREEN, bold: true, align: 'center', fontSize: 11 } },
      { text: '✓', options: { color: CHECK_GREEN, bold: true, align: 'center', fontSize: 11 } },
      { text: '✓', options: { color: CHECK_GREEN, bold: true, align: 'center', fontSize: 11 } },
    ],
    [
      { text: 'Dashboard de actividades', options: { fontSize: 11 } },
      { text: '—', options: { color: 'BBBBBB', align: 'center', fontSize: 11 } },
      { text: '✓', options: { color: CHECK_GREEN, bold: true, align: 'center', fontSize: 11 } },
      { text: '✓', options: { color: CHECK_GREEN, bold: true, align: 'center', fontSize: 11 } },
    ],
    [
      { text: 'Alertas automáticas', options: { fontSize: 11 } },
      { text: '—', options: { color: 'BBBBBB', align: 'center', fontSize: 11 } },
      { text: '✓', options: { color: CHECK_GREEN, bold: true, align: 'center', fontSize: 11 } },
      { text: '✓', options: { color: CHECK_GREEN, bold: true, align: 'center', fontSize: 11 } },
    ],
    [
      { text: 'Inducción estudiantil', options: { fontSize: 11 } },
      { text: '—', options: { color: 'BBBBBB', align: 'center', fontSize: 11 } },
      { text: '—', options: { color: 'BBBBBB', align: 'center', fontSize: 11 } },
      { text: '✓', options: { color: CHECK_GREEN, bold: true, align: 'center', fontSize: 11 } },
    ],
    [
      { text: 'Estandarización de cursos', options: { fontSize: 11 } },
      { text: '—', options: { color: 'BBBBBB', align: 'center', fontSize: 11 } },
      { text: '—', options: { color: 'BBBBBB', align: 'center', fontSize: 11 } },
      { text: '✓', options: { color: CHECK_GREEN, bold: true, align: 'center', fontSize: 11 } },
    ],
  ]

  const pricingRows: { text: string; options: Record<string, unknown> }[][] = [
    [
      {
        text: 'Módulos UNC',
        options: { bold: true, fontSize: 12, fill: { color: 'F0F3F8' }, fontFace: 'Calibri' },
      },
      {
        text: '110–155',
        options: {
          bold: true,
          fontSize: 12,
          fill: { color: 'F0F3F8' },
          fontFace: 'Calibri',
          align: 'center',
        },
      },
      {
        text: '190–270',
        options: {
          bold: true,
          fontSize: 12,
          fill: { color: 'F0F3F8' },
          fontFace: 'Calibri',
          align: 'center',
        },
      },
      {
        text: '320–460',
        options: {
          bold: true,
          fontSize: 12,
          fill: { color: 'F0F3F8' },
          fontFace: 'Calibri',
          align: 'center',
        },
      },
    ],
    [
      { text: 'Pesos (ARS)', options: { bold: true, fontSize: 12, fontFace: 'Calibri' } },
      {
        text: '$5.7M–$8.0M',
        options: { bold: true, fontSize: 12, fontFace: 'Calibri', align: 'center' },
      },
      {
        text: '$9.8M–$14.0M',
        options: { bold: true, fontSize: 12, fontFace: 'Calibri', align: 'center' },
      },
      {
        text: '$16.5M–$23.8M',
        options: { bold: true, fontSize: 12, fontFace: 'Calibri', align: 'center' },
      },
    ],
    [
      { text: 'USD (referencia)', options: { bold: true, fontSize: 12, fontFace: 'Calibri' } },
      {
        text: '$4.7K–$6.6K',
        options: { bold: true, fontSize: 12, fontFace: 'Calibri', align: 'center' },
      },
      {
        text: '$8.1K–$11.6K',
        options: { bold: true, fontSize: 12, fontFace: 'Calibri', align: 'center' },
      },
      {
        text: '$13.6K–$19.6K',
        options: { bold: true, fontSize: 12, fontFace: 'Calibri', align: 'center' },
      },
    ],
    [
      {
        text: 'Semanas',
        options: { bold: true, fontSize: 12, fill: { color: 'F0F3F8' }, fontFace: 'Calibri' },
      },
      {
        text: '6–8',
        options: {
          bold: true,
          fontSize: 12,
          fill: { color: 'F0F3F8' },
          fontFace: 'Calibri',
          align: 'center',
        },
      },
      {
        text: '10–14',
        options: {
          bold: true,
          fontSize: 12,
          fill: { color: 'F0F3F8' },
          fontFace: 'Calibri',
          align: 'center',
        },
      },
      {
        text: '16–22',
        options: {
          bold: true,
          fontSize: 12,
          fill: { color: 'F0F3F8' },
          fontFace: 'Calibri',
          align: 'center',
        },
      },
    ],
  ]

  s.addTable(rows, {
    x: 0.5,
    y: 1.5,
    w: 12,
    colW: [4.5, 2.5, 2.5, 2.5],
    rowH: 0.42,
    border: { type: 'solid', color: BORDER },
    fontSize: 11,
    fontFace: 'Calibri',
    color: DARK,
    margin: [4, 6, 4, 6],
  })

  s.addTable(pricingRows, {
    x: 0.5,
    y: 4.65,
    w: 12,
    colW: [4.5, 2.5, 2.5, 2.5],
    rowH: 0.42,
    border: { type: 'solid', color: BORDER },
    margin: [4, 6, 4, 6],
  })

  addFooter(s, 6)
}

// ═══════════════════════════════════════════
// SLIDE 7 — Términos y Próximos Pasos
// ═══════════════════════════════════════════
{
  const s = pptx.addSlide()
  s.background = { fill: NAVY }

  s.addText('Próximos Pasos', {
    x: 0.8,
    y: 1.0,
    w: 10,
    h: 0.6,
    fontSize: 30,
    color: WHITE,
    fontFace: 'Calibri Light',
    bold: true,
  })

  const steps = [
    'Revisión y ajuste de alcance por parte de Campus Virtual',
    'Definición del nivel seleccionado (MVP 1, 2 o 3)',
    'Presentación formal a Prosecretaría de Informática (Ing. Alfredo M. Montes)',
    'Firma de contrato e inicio de actividades',
  ]

  steps.forEach((step, i) => {
    s.addShape(pptx.ShapeType.ellipse, {
      x: 0.8,
      y: 2.0 + i * 0.95,
      w: 0.38,
      h: 0.38,
      fill: { color: WHITE },
    })
    s.addText(String(i + 1), {
      x: 0.8,
      y: 2.0 + i * 0.95,
      w: 0.38,
      h: 0.38,
      fontSize: 14,
      color: NAVY,
      fontFace: 'Calibri',
      bold: true,
      align: 'center',
      valign: 'middle',
    })
    s.addText(step, {
      x: 1.4,
      y: 1.95 + i * 0.95,
      w: 8,
      h: 0.5,
      fontSize: 15,
      color: WHITE,
      fontFace: 'Calibri',
    })
  })

  // Terms box
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 5.5,
    w: 11,
    h: 1.2,
    fill: { color: '0D1F4A' },
    rectRadius: 0.1,
  })
  s.addText(
    'Modalidad: Contratación bajo normativa UNC · Unidad: Módulo UNC ($51.700 ARS)\nAjuste por inflación si pago demorado >60 días · Mantenimiento: 15% anual (opcional)\nPropuesta válida por 60 días. ARS y USD a tipo de cambio oficial estimado.',
    {
      x: 1.0,
      y: 5.65,
      w: 10.5,
      h: 0.9,
      fontSize: 10,
      color: '99AACC',
      fontFace: 'Calibri',
    },
  )

  addFooter(s, 7)
}

// ── Write ──
import path from 'node:path'

const outPath = path.resolve(
  process.cwd(),
  '.context',
  'unc-quote-preparation',
  'Propuesta-Campus-Virtual-UNC.pptx',
)

await pptx.writeFile({ fileName: outPath })
console.log(`PPTX saved to: ${outPath}`)
