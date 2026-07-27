import type { CourseDependencyGraph } from './CourseDependencyGraph';

export interface FindingConfidence {
    level: 'muy_alta' | 'alta' | 'media' | 'baja';
    score: number;
    detail: string;
}

export interface OverlayFinding {
    severity: 'critical' | 'warning' | 'info';
    sectionNumber: number;
    sectionTitle: string;
    message: string;
    detail: string;
    actionItem?: string;
    priority?: 'high' | 'medium' | 'low';
    confidence: FindingConfidence;
    evidence: {
        inAdminUI: boolean;
        inAPI: boolean;
        inStudentAPI: boolean;
        inStudentUI: boolean;
    };
}

export class TreeOverlayAnalyzer {
    static compare(
        adminGraph: CourseDependencyGraph,
        apiGraph: CourseDependencyGraph,
        studentApiGraph: CourseDependencyGraph,
        studentUiGraph: CourseDependencyGraph,
        options?: {
            verbose?: boolean;
        },
    ): OverlayFinding[] {
        const findings: OverlayFinding[] = [];

        // 1. Admin UI vs Student API: activities in design that student API doesn't know about
        const adminVsStudentApi = adminGraph.overlay(studentApiGraph);
        for (const missing of adminVsStudentApi.missingNodes) {
            if (missing.cmid === 0)
                continue;

            const inAPI = apiGraph.nodes.has(missing.cmid);
            const inStudentUI = studentUiGraph.nodes.has(missing.cmid);
            const inAdminUI = true;
            const inStudentAPI = false;

            const agreementCount = [inAdminUI, inAPI, inStudentAPI, inStudentUI].filter(Boolean).length;
            const confidence = buildConfidence(
                agreementCount,
                'Admin UI y API confirman que existe, pero API del estudiante no lo reporta',
            );

            // Check if the API says it's auto-complete with visible=1 — these are
            // typically accessible under different display names in sidebar blocks
            const apiNode = apiGraph.nodes.get(missing.cmid);
            const isAutoCompleteFile
                = apiNode?.isautomatic === true && apiNode?.visible === 1 && apiNode?.metadata?.hasContent;

            if (isAutoCompleteFile && inAPI && !inStudentAPI) {
                if (!inStudentUI) {
                    const modName = apiNode?.name || missing.name;
                    const sectionName = missing.sectionName;

                    if (options?.verbose) {
                        console.log(
                            `[TreeOverlay] "${modName}" (cmid ${missing.cmid}): isautomatic file, API confirms student has no access → CRITICAL`,
                        );
                    }

                    findings.push({
                        severity: 'critical',
                        sectionNumber: missing.sectionNumber,
                        sectionTitle: sectionName,
                        message: `"${modName}" es requerida para continuar pero NO es accesible para estudiantes`,
                        detail:
              `El recurso "${modName}" (cmid ${missing.cmid}) es un archivo con finalización automática. `
              + 'La API del estudiante no lo reporta y no aparece en la vista del navegador. '
              + 'Las condiciones de disponibilidad lo exigen, creando un punto muerto. '
              + 'Además, el tooltip "Show More" del módulo bloqueado muestra el nombre '
              + 'pero el enlace de detalle no expande el contenido para estudiantes.',
                        priority: 'high',
                        actionItem:
              'Hacer visible el recurso (visible=1) o corregir la condición de disponibilidad.',
                        confidence,
                        evidence: { inAdminUI, inAPI, inStudentAPI, inStudentUI },
                    });
                }
            }
            else if (!inStudentAPI && !inStudentUI) {
                const modName = apiNode?.name || missing.name;
                const sectionName = missing.sectionName;

                if (options?.verbose) {
                    console.log(
                        `[TreeOverlay] "${modName}" (cmid ${missing.cmid}): missing in both student trees → CRITICAL`,
                    );
                }

                findings.push({
                    severity: 'critical',
                    sectionNumber: missing.sectionNumber,
                    sectionTitle: sectionName,
                    message: `"${modName}" existe en el curso pero estudiantes no pueden verlo`,
                    detail:
            `La actividad "${modName}" (cmid ${missing.cmid}) tiene visible=1 en DB y la API lo reporta, `
            + 'pero no aparece para estudiantes en ninguna fuente (API ni UI). '
            + 'Es un bug de interfaz o de permisos.',
                    priority: 'high',
                    actionItem: 'Verificar visibilidad y permisos del recurso en la configuración del curso.',
                    confidence,
                    evidence: { inAdminUI, inAPI, inStudentAPI, inStudentUI },
                });
            }
            else if (!inStudentAPI && !inStudentUI) {
                const modName = apiNode?.name || missing.name;
                if (options?.verbose) {
                    console.log(
                        `[TreeOverlay] "${modName}" (cmid ${missing.cmid}): not in student trees → WARNING`,
                    );
                }

                findings.push({
                    severity: 'warning',
                    sectionNumber: missing.sectionNumber,
                    sectionTitle: missing.sectionName,
                    message: `"${modName}" no se confirma como accesible para estudiantes`,
                    detail:
            `El recurso "${modName}" (cmid ${missing.cmid}) no aparece en API ni UI del estudiante. `
            + 'No se confirma que sea accesible.',
                    confidence,
                    actionItem: 'Verificar manualmente si el recurso es accesible.',
                    evidence: { inAdminUI, inAPI, inStudentAPI, inStudentUI },
                });
            }
            else if (!inStudentUI && inStudentAPI) {
                if (options?.verbose) {
                    console.log(
                        `[TreeOverlay] "${missing.name}" (cmid ${missing.cmid}): API student confirms access but not in UI → INFO`,
                    );
                }
                findings.push({
                    severity: 'info',
                    sectionNumber: missing.sectionNumber,
                    sectionTitle: missing.sectionName,
                    message: `"${missing.name}" es accesible vía API pero no se renderiza en UI de estudiante`,
                    detail:
            `El recurso "${missing.name}" (cmid ${missing.cmid}) aparece en la API del estudiante `
            + '(confirmando que es accesible), pero el DOM del estudiante no renderiza un enlace. '
            + 'Esto puede ser normal para ciertos tipos de recurso (auto-completado, recursos en bloques laterales).',
                    confidence,
                    actionItem: 'No requiere acción inmediata. Monitorear si estudiantes reportan problemas.',
                    evidence: { inAdminUI, inAPI, inStudentAPI, inStudentUI },
                });
            }
        }

        // 2. Admin UI vs Student UI: link mismatch (admin has href, student doesn't)
        const adminVsStudentUi = adminGraph.overlay(studentUiGraph);
        for (const mismatched of adminVsStudentUi.mismatchedNodes) {
            if (mismatched.field !== 'hasViewLink')
                continue;
            if (!mismatched.expected && mismatched.actual)
                continue;

            const cmid = mismatched.node.cmid;
            if (cmid === 0)
                continue;

            const apiNode = apiGraph.nodes.get(cmid);
            const studentApiNode = studentApiGraph.nodes.get(cmid);

            if (apiNode?.isautomatic === true && apiNode?.visible === 1) {
                if (!studentApiNode)
                    continue;
            }

            if (options?.verbose) {
                console.log(
                    `[TreeOverlay] "${mismatched.node.name}" (cmid ${cmid}): admin has link, student doesn't → WARNING`,
                );
            }

            findings.push({
                severity: 'warning',
                sectionNumber: mismatched.node.sectionNumber,
                sectionTitle: mismatched.node.sectionName,
                message: `"${mismatched.node.name}" tiene enlace para admin pero no para estudiantes`,
                detail:
          `El recurso "${mismatched.node.name}" (cmid ${cmid}) tiene un enlace funcional en la vista de administrador, `
          + 'pero los estudiantes no ven un enlace clickeable. '
          + 'Puede deberse a que el recurso se renderiza en un bloque lateral (Biblioteca) en lugar de la sección de contenido.',
                priority: 'medium',
                confidence: buildConfidence(
                    2,
                    'Admin UI y Student UI discrepan en el enlace, pero API estudiante confirma existencia',
                ),
                evidence: {
                    inAdminUI: true,
                    inAPI: apiGraph.nodes.has(cmid),
                    inStudentAPI: studentApiGraph.nodes.has(cmid),
                    inStudentUI: false,
                },
            });
        }

        // 3. Duplicate detection: same section, same type, similar names
        const duplicates = detectDuplicates(adminGraph, apiGraph);
        for (const dup of duplicates) {
            if (options?.verbose) {
                console.log(
                    `[TreeOverlay] Possible duplicate: "${dup.nameA}" (cmid ${dup.cmidA}) ≈ "${dup.nameB}" (cmid ${dup.cmidB})`,
                );
            }

            const bothInStudentAPI
                = studentApiGraph.nodes.has(dup.cmidA) && studentApiGraph.nodes.has(dup.cmidB);

            findings.push({
                severity: bothInStudentAPI ? 'info' : 'warning',
                sectionNumber: dup.sectionNumber,
                sectionTitle: dup.sectionName,
                message: `Posible duplicado: "${dup.nameA}" ≈ "${dup.nameB}"`,
                detail:
          `Se encontraron dos recursos similares en la misma sección:\n`
          + `- "${dup.nameA}" (cmid ${dup.cmidA}): "${dup.filenameA}"\n`
          + `- "${dup.nameB}" (cmid ${dup.cmidB}): "${dup.filenameB}"\n\n`
          + `${
              bothInStudentAPI
                  ? 'Ambos son accesibles para estudiantes — posible duplicado innecesario.'
                  : `Solo ${dup.cmidA} es accesible. ${dup.cmidB} no aparece para estudiantes. Se recomienda revisar si este duplicado es necesario.`
          }`,
                priority: bothInStudentAPI ? 'low' : 'medium',
                confidence: buildConfidence(3, 'Misma sección, mismo tipo, nombres y archivos similares'),
                evidence: {
                    inAdminUI: true,
                    inAPI: true,
                    inStudentAPI: studentApiGraph.nodes.has(dup.cmidB),
                    inStudentUI: studentUiGraph.nodes.has(dup.cmidB),
                },
            });
        }

        // Sort: critical first, then by confidence
        findings.sort((a, b) => {
            const sev = { critical: 0, warning: 1, info: 2 };
            const sevDiff = (sev[a.severity] ?? 3) - (sev[b.severity] ?? 3);
            if (sevDiff !== 0)
                return sevDiff;
            return b.confidence.score - a.confidence.score;
        });

        return findings;
    }
}

function buildConfidence(agreementCount: number, detail: string): FindingConfidence {
    if (agreementCount >= 3) {
        return { level: 'muy_alta', score: agreementCount, detail };
    }
    if (agreementCount === 2) {
        return { level: 'alta', score: agreementCount, detail };
    }
    if (agreementCount === 1) {
        return { level: 'media', score: agreementCount, detail };
    }
    return { level: 'baja', score: 0, detail };
}

interface DuplicateInfo {
    cmidA: number;
    cmidB: number;
    nameA: string;
    nameB: string;
    filenameA: string;
    filenameB: string;
    sectionNumber: number;
    sectionName: string;
}

function detectDuplicates(
    adminGraph: CourseDependencyGraph,
    apiGraph: CourseDependencyGraph,
): DuplicateInfo[] {
    const result: DuplicateInfo[] = [];
    const nodes = Array.from(apiGraph.nodes.values());

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            if (a.sectionNumber !== b.sectionNumber)
                continue;
            if (a.type !== b.type)
                continue;

            const sim = nameSimilarity(a.name, b.name);
            if (sim < 0.5)
                continue;

            const filenameA = String(a.metadata?.firstContentFilename ?? '');
            const filenameB = String(b.metadata?.firstContentFilename ?? '');

            result.push({
                cmidA: a.cmid,
                cmidB: b.cmid,
                nameA: a.name,
                nameB: b.name,
                filenameA,
                filenameB,
                sectionNumber: a.sectionNumber,
                sectionName: a.sectionName,
            });
        }
    }

    return result;
}

function nameSimilarity(a: string, b: string): number {
    const norm = (s: string) =>
        s
            .toLowerCase()
            .replace(/[_-]/g, ' ')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    const na = norm(a);
    const nb = norm(b);
    if (na === nb)
        return 1;
    const wordsA = new Set(na.split(' ').filter(Boolean));
    const wordsB = new Set(nb.split(' ').filter(Boolean));
    if (wordsA.size === 0 || wordsB.size === 0)
        return 0;
    const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.size / union.size;
}
