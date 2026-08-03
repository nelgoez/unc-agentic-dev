import type { AuditData } from './buildAuditData';

const CONFIDENCE_LOCKED = '🔒 100%';
const CONFIDENCE_DOCS = '📄 depende de docs';

export function generateAuditMd(data: AuditData): string {
  const d = data;
  const lines: string[] = [];

  lines.push(`# QA Audit: ${d.courseName} (${d.courseId}) — ${d.timestamp}`);
  lines.push('');

  lines.push(
    `## Resumen — ${d.badge} · ${d.criticalCount} críticos · ${d.warningCount} warnings · ${d.infoCount} info | Confianza: ${d.docsConfidence}`,
  );
  lines.push('');

  lines.push(`| Métrica | Valor |`);
  lines.push(`|---|---|`);
  lines.push(`| Secciones | ${d.sections} |`);
  lines.push(`| Actividades | ${d.totalActivities} |`);
  lines.push(`| Actividades con restricciones | ${d.restrictedActivities} |`);
  lines.push(`| Completion auto | ${d.completionAuto} |`);
  lines.push(`| Completion manual | ${d.completionManual} |`);
  lines.push(`| Sin completion tracking | ${d.completionNone} |`);
  if (d.hasDocs) {
    lines.push(`| Doc actividades | ${d.docTotal} |`);
    lines.push(
      `| Doc mapeadas a prod | ${d.docMatched} (${d.docTotal > 0 ? Math.round((d.docMatched / d.docTotal) * 100) : 0}%) |`,
    );
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push(`## Estructura [${CONFIDENCE_LOCKED}]`);
  lines.push('');
  lines.push(`| # | Sección | Actividades |`);
  lines.push(`|---|---|---|`);
  for (const s of d.breakdown.sections) {
    lines.push(`| ${s.section} | ${s.name} | ${s.moduleCount} |`);
  }
  lines.push('');

  lines.push(`## Puertas / Gates [${CONFIDENCE_LOCKED}]`);
  lines.push('');
  if (d.gatesFound.length > 0) {
    lines.push(`| Actividad restringida | Requiere |`);
    lines.push(`|---|---|`);
    for (const g of d.gatesFound) {
      lines.push(`| ${g.module} | ${g.description} |`);
    }
  }
  else {
    lines.push('Sin puertas detectadas.');
  }
  lines.push('');

  lines.push(`## Completion Tracking [${CONFIDENCE_LOCKED}]`);
  lines.push('');
  lines.push(`| Estado | Cantidad |`);
  lines.push(`|---|---|`);
  lines.push(`| Automático (completion=2) | ${d.completionAuto} |`);
  lines.push(`| Manual (completion=1) | ${d.completionManual} |`);
  lines.push(`| Sin tracking (completion=0) | ${d.completionNone} |`);
  lines.push('');

  if (d.certModules.length > 0) {
    lines.push(`## Certificados y condiciones especiales [${CONFIDENCE_LOCKED}]`);
    lines.push('');
    for (const cert of d.certModules) {
      lines.push(`| **${cert.name}** | Requiere: ${cert.description} |`);
    }
    lines.push('');
  }

  if (d.orphans.length > 0) {
    lines.push(`## Huérfanos [${CONFIDENCE_LOCKED}]`);
    lines.push('');
    lines.push('| cmid | Sección | Actividad que lo referencia |');
    lines.push('|---|---|---|');
    for (const o of d.orphans) {
      lines.push(`| ${o.cmid} | ${o.sectionName} | ${o.moduleName || '-'} |`);
    }
    lines.push('');
    lines.push(
      '> 🔴 Actividades referenciadas como gate que no existen en el curso. Suelen ser actividades eliminadas cuya restricción persiste.',
    );
    lines.push('');
  }

  if (d.gatesWithE0orE3.length > 0) {
    lines.push(`## Advertencias — Gates con e=0 o e=3 [${CONFIDENCE_LOCKED}]`);
    lines.push('');
    for (const g of d.gatesWithE0orE3) {
      lines.push(`- ⚠️ ${g}`);
    }
    lines.push('');
    lines.push(
      '> e=0 = requiere que la actividad esté INCOMPLETA. e=3 = requiere que esté COMPLETA Y SUSPENSA. Verificar que sea intencional.',
    );
    lines.push('');
  }

  if (
    d.hasDocs
    && d.reconciliation.matched.length
    + d.reconciliation.docOnly.length
    + d.reconciliation.prodOnly.length
    > 0
  ) {
    lines.push(`## Doc vs Producción [${CONFIDENCE_DOCS}]`);
    lines.push('');
    if (d.reconciliation.matched.length > 0) {
      lines.push(`| Match | Doc | Producción (cmid) | Score |`);
      lines.push(`|---|---|---|---|`);
      for (const m of d.reconciliation.matched) {
        const scoreIcon = m.score >= 80 ? '✅' : m.score >= 60 ? '🟡' : '⚠️';
        lines.push(`| ${scoreIcon} | ${m.docName} | ${m.prodName} (${m.prodId}) | ${m.score}% |`);
      }
      lines.push('');
    }
    if (d.reconciliation.docOnly.length > 0) {
      lines.push(`<details><summary>Solo en docs (${d.reconciliation.docOnly.length})</summary>`);
      lines.push('');
      lines.push(d.reconciliation.docOnly.join(', '));
      lines.push('');
      lines.push(`</details>`);
      lines.push('');
    }
    if (d.reconciliation.prodOnly.length > 0) {
      lines.push(
        `**Solo en producción (${d.reconciliation.prodOnly.length}):** ${d.reconciliation.prodOnly.map(p => `${p.name} (${p.id})`).join(', ')}`,
      );
      lines.push('');
    }
    lines.push(
      '> 📄 Esta sección depende de la calidad de los documentos. Nombres ambiguos o faltantes reducen la precisión del mapeo.',
    );
    lines.push('');
  }

  lines.push(`## Limitaciones`);
  lines.push('');
  if (!d.hasDocs) {
    lines.push(
      '- Sin documentos de entrada: no se puede hacer mapeo doc↔producción. Solo se reporta lo visible desde la API.',
    );
  }
  else {
    lines.push(
      '- El mapeo doc↔producción usa fuzzy matching. Nombres muy distintos entre docs y Moodle pueden generar falsos negativos.',
    );
  }
  lines.push(
    '- Las condiciones de nota (grade conditions) requieren verificación manual de que el item de calificación exista.',
  );
  lines.push(
    '- Este reporte usa solo la API de Moodle. No incluye verificación visual (UI/Playwright).',
  );
  lines.push('');

  return lines.join('\n');
}
