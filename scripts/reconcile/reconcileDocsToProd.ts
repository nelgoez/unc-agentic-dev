import type { MoodleSection } from '../../tests/components/api/MoodleApiClient';
import type { PreMontajeModule } from '../parsers/parsePreMontaje';
import type { ValidacionModule } from '../parsers/parseValidacion';

export interface MatchedActivity {
  docName: string;
  prodId: number;
  prodName: string;
  prodType: string;
  score: number;
}

export interface Reconciliation {
  matched: MatchedActivity[];
  docOnly: string[];
  prodOnly: Array<{ id: number; name: string; type: string }>;
}

const COMPLETION_STATE_LABELS: Record<number, string> = {
  0: 'incompleta',
  1: 'completa',
  2: 'completa y aprobada',
  3: 'completa y suspensa',
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyScore(query: string, target: string): number {
  const q = normalize(query);
  const t = normalize(target);
  if (q === t)
    return 100;
  if (t.includes(q))
    return 80;
  if (q.includes(t))
    return 75;
  const qWords = q.split(' ');
  const tWords = t.split(' ');
  let matches = 0;
  for (const qw of qWords) {
    if (qw.length < 2)
      continue;
    if (tWords.includes(qw))
      matches += 1;
    else if (t.includes(qw))
      matches += 0.5;
  }
  const total = qWords.filter(w => w.length >= 2).length;
  if (total === 0)
    return 0;
  return (matches / total) * 60;
}

export function reconcileDocsToProd(
  sections: MoodleSection[],
  validacionModules: ValidacionModule[],
  preMontajeModules: PreMontajeModule[],
): Reconciliation {
  const allProdActivities = sections.flatMap(s =>
    s.modules.map(m => ({
      id: m.id,
      name: m.name,
      type: m.modplural,
    })),
  );

  const docNames = new Map<string, boolean>();
  for (const vm of validacionModules) {
    for (const a of vm.activities) {
      if (!docNames.has(a.name))
        docNames.set(a.name, true);
    }
  }
  for (const pm of preMontajeModules) {
    for (const a of pm.activities) {
      if (!docNames.has(a.name))
        docNames.set(a.name, true);
    }
  }

  const matched: MatchedActivity[] = [];
  const docOnly: string[] = [];
  const matchedProdIds = new Set<number>();

  for (const docName of docNames.keys()) {
    let bestScore = 0;
    let bestMatch: (typeof allProdActivities)[0] | null = null;

    for (const prod of allProdActivities) {
      if (matchedProdIds.has(prod.id))
        continue;
      const score = fuzzyScore(docName, prod.name);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = prod;
      }
    }

    if (bestMatch && bestScore > 40) {
      matched.push({
        docName,
        prodId: bestMatch.id,
        prodName: bestMatch.name,
        prodType: bestMatch.type,
        score: Math.round(bestScore),
      });
      matchedProdIds.add(bestMatch.id);
    }
    else {
      docOnly.push(docName);
    }
  }

  const prodOnly = allProdActivities.filter(p => !matchedProdIds.has(p.id));

  return { matched, docOnly, prodOnly };
}

export { COMPLETION_STATE_LABELS };
