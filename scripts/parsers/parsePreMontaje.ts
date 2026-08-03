import { readFileSync } from 'node:fs';

export interface PreMontajeActivity {
  name: string;
  type: 'video' | 'reading' | 'quiz' | 'activity' | 'unknown';
}

export interface PreMontajeModule {
  name: string;
  activities: PreMontajeActivity[];
}

const BUTTON_PATTERN = /[Bb]ot[oó]n(?:\s+de)?\s*:\s*(.+)/;
const VIDEO_WATCHWORD = /[Vv]ideo|[Vv]isualiz|[Mm]ir[aá]/;
const QUESTIONNAIRE_WATCHWORD = /[Cc]uestionario/;
const READING_WATCHWORD = /[Bb]ibliograf[ií]a|[Ll]ectura|[Pp]rograma/;

function cleanName(raw: string): string {
  return raw
    .replace(/[*_[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsePreMontaje(filePath: string): PreMontajeModule[] {
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/);

  const modules: PreMontajeModule[] = [];
  let currentModule: PreMontajeModule | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed)
      continue;

    const h1Match = trimmed.match(/^#\s+(.+)/);
    if (h1Match) {
      const heading = h1Match[1].trim();
      if (!heading.startsWith('Pestaña')) {
        if (currentModule && currentModule.activities.length > 0) {
          modules.push(currentModule);
        }
        currentModule = { name: cleanName(heading), activities: [] };
        continue;
      }
    }

    const buttonMatch = trimmed.match(BUTTON_PATTERN);
    if (buttonMatch && currentModule) {
      const name = cleanName(buttonMatch[1]);
      if (name.length > 2 && !/^https?:/i.test(name)) {
        currentModule.activities.push({
          name,
          type: VIDEO_WATCHWORD.test(name)
            ? 'video'
            : QUESTIONNAIRE_WATCHWORD.test(name)
              ? 'quiz'
              : READING_WATCHWORD.test(name)
                ? 'reading'
                : 'activity',
        });
        continue;
      }
    }

    if (currentModule && trimmed.match(/^\d+\.\s+(.+)/)) {
      const name = cleanName(trimmed.replace(/^\d+\.\s+/, ''));
      if (name.length > 3) {
        currentModule.activities.push({ name, type: 'unknown' });
        continue;
      }
    }
  }

  if (currentModule && currentModule.activities.length > 0) {
    modules.push(currentModule);
  }

  return modules;
}

export function flattenPreMontajeActivities(modules: PreMontajeModule[]): PreMontajeActivity[] {
  return modules.flatMap(m => m.activities);
}
