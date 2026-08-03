import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';
import { marked } from 'marked';

test('generate proposal PDF from markdown', async ({ page }) => {
  const cwd = process.cwd();
  const mdPath = join(cwd, '.context', 'propuesta-qa-unc-consolidada.md');
  const outHtml = join(cwd, 'docs', 'pitch', 'propuesta-qa-unc.html');
  const outPdf = join(cwd, 'docs', 'pitch', 'propuesta-qa-unc.pdf');

  if (!existsSync(mdPath))
    throw new Error(`No se encontró ${mdPath}`);

  const md = readFileSync(mdPath, 'utf-8');
  const body = marked.parse(md, { breaks: true, gfm: true }) as string;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>UNC QA Audit — Propuesta de Servicios</title>
<style>
  @page { margin: 2cm 2.5cm; size: A4; }
  body {
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1e293b;
    max-width: 720px;
    margin: 40px auto;
    padding: 0 20px;
  }
  h1 { font-size: 1.5em; color: #0f172a; margin-top: 0; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
  h2 { font-size: 1.2em; color: #1e40af; margin-top: 28px; }
  h3 { font-size: 1.05em; color: #334155; margin-top: 20px; }
  h4 { font-size: 1em; color: #475569; margin-top: 16px; font-weight: 700; }
  p { margin: 8px 0; }
  strong { color: #0f172a; }
  a { color: #3b82f6; text-decoration: none; }
  blockquote {
    border-left: 3px solid #3b82f6;
    margin: 12px 0; padding: 8px 16px;
    background: #f8fafc;
    border-radius: 0 6px 6px 0;
    color: #475569; font-size: 0.95em;
  }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 0.9em; }
  th { background: #f1f5f9; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
  tr:last-child td { border-bottom: none; }
  code { background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 0.9em; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
  .footer-print { margin-top: 40px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 0.8em; color: #94a3b8; }
</style>
</head>
<body>
${body}
<div class="footer-print">
  <strong>Contacto:</strong> Nahuel Gómez · nagomez@mi.unc.edu.ar<br>
  <strong>Documento generado:</strong> ${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
</div>
</body>
</html>`;

  writeFileSync(outHtml, html, 'utf-8');
  console.log(`HTML: ${outHtml}`);

  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({
    path: outPdf,
    format: 'A4',
    margin: { top: '2cm', bottom: '2cm', left: '2.5cm', right: '2.5cm' },
    printBackground: true,
  });
  console.log(`PDF: ${outPdf}`);
});
