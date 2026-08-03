import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { saveAuditIndex } from '../report/generateAuditIndex';

export interface ReportMeta {
  timestamp: string;
  courseId: number;
  courseName: string;
  sections: number;
  activities: number;
  critical: number;
  warnings: number;
  info: number;
}

const REPORTS_ROOT = join(process.cwd(), 'reports', 'audit');

export function saveReport(
  courseId: number,
  courseName: string,
  markdown: string,
  html: string,
  meta: Omit<ReportMeta, 'timestamp' | 'courseId' | 'courseName'>,
): { mdPath: string; htmlPath: string } {
  const courseDir = join(REPORTS_ROOT, String(courseId));
  mkdirSync(courseDir, { recursive: true });

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

  const fullMeta: ReportMeta = {
    timestamp: now.toISOString(),
    courseId,
    courseName,
    ...meta,
  };

  const header = `<!-- audit:curso meta\n${JSON.stringify(fullMeta, null, 2)}\n-->\n\n`;

  const mdPath = join(courseDir, `${ts}.md`);
  const htmlPath = join(courseDir, `${ts}.html`);

  writeFileSync(mdPath, header + markdown, 'utf-8');
  writeFileSync(htmlPath, html, 'utf-8');

  writeFileSync(join(courseDir, 'latest.md'), header + markdown, 'utf-8');
  writeFileSync(join(courseDir, 'latest.html'), html, 'utf-8');

  updateHistory(courseDir, fullMeta);
  saveAuditIndex();

  return { mdPath, htmlPath };
}

function updateHistory(courseDir: string, meta: ReportMeta): void {
  const historyPath = join(courseDir, 'history.json');
  let history: ReportMeta[] = [];
  if (existsSync(historyPath)) {
    try {
      history = JSON.parse(readFileSync(historyPath, 'utf-8'));
    }
    catch {
      history = [];
    }
  }
  history.push(meta);
  writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');
}
