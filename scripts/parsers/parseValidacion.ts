import { readFileSync } from 'node:fs';

export interface ValidacionActivity {
  name: string;
  type: string;
  link: string;
  status: string;
  observations: string;
}

export interface ValidacionModule {
  name: string;
  activities: ValidacionActivity[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      }
      else {
        inQuotes = !inQuotes;
      }
    }
    else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    }
    else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseValidacion(filePath: string): ValidacionModule[] {
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());

  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i].includes('Módulos/Ejes')
      && lines[i].includes('Recurso')
      && lines[i].includes('Tipo')
    ) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    console.warn('Validacion CSV header not found, trying line 0');
    headerIndex = 0;
  }

  const dataLines = lines.slice(headerIndex + 1);
  const modules: ValidacionModule[] = [];
  let currentModule: ValidacionModule | null = null;

  for (const line of dataLines) {
    const cols = parseCSVLine(line);
    if (cols.length < 2)
      continue;

    const [moduleOrName, resource, type, link, status, observations] = cols;

    if (moduleOrName && isModuleHeader(moduleOrName)) {
      if (currentModule && currentModule.activities.length > 0) {
        modules.push(currentModule);
      }
      currentModule = { name: normalizeModuleName(moduleOrName), activities: [] };
      continue;
    }

    const name = resource?.trim() || moduleOrName?.trim();
    if (!name || name === 'Recurso')
      continue;

    if (!currentModule) {
      currentModule = { name: 'Sin módulo', activities: [] };
    }

    currentModule.activities.push({
      name,
      type: (type || '').trim(),
      link: (link || '').trim(),
      status: (status || '').trim(),
      observations: (observations || '').trim(),
    });
  }

  if (currentModule && currentModule.activities.length > 0) {
    modules.push(currentModule);
  }

  return modules;
}

function isModuleHeader(text: string): boolean {
  const upper = text.toUpperCase();
  return upper.includes('MÓDULO') || upper.includes('MODULO');
}

function normalizeModuleName(name: string): string {
  return name.replace(/^M[oó]dulo\s*/i, '').trim();
}

export function flattenActivities(modules: ValidacionModule[]): ValidacionActivity[] {
  return modules.flatMap(m => m.activities);
}
