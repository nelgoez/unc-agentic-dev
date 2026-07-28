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
        inNelthorCompleted?: boolean;
    };
}

export interface OverlayOptions {
    verbose?: boolean;
    nelthorData?: Map<string, { state: number; timecompleted?: number }>;
    conditionReferencedCmids?: Set<number>;
}

export class TreeOverlayAnalyzer {
    static compare(
        adminGraph: CourseDependencyGraph,
        apiGraph: CourseDependencyGraph,
        studentApiGraph: CourseDependencyGraph,
        studentUiGraph: CourseDependencyGraph,
        options?: OverlayOptions,
    ): OverlayFinding[] {
        const findings: OverlayFinding[] = [];

        const studentApiAvailable = studentApiGraph.nodes.size > 0;

        if (!studentApiAvailable && options?.verbose) {
            console.log(
                '[TreeOverlay] Student API tree is empty — cannot use API absence as evidence of invisibility. Falling back to admin-vs-UI comparison.',
            );
        }

        // 1. Admin UI vs Student API: activities in design that student API doesn't know about
        //    BUT only if student API has data. Empty tree = no evidence.
        //    Only condition-referenced cmids produce CRITICAL/WARNING — non-condition items
        //    (navigation, decorative, supplementary) are INFO at most.
        if (studentApiAvailable) {
            // First pass: nodes in admin but NOT in student API (truly invisible to API)
            const adminVsStudentApi = adminGraph.overlay(studentApiGraph);
            for (const missing of adminVsStudentApi.missingNodes) {
                if (missing.cmid === 0)
                    continue;

                const isConditionReferenced = options?.conditionReferencedCmids
                    ? options.conditionReferencedCmids.has(missing.cmid)
                    : true;

                // Non-condition items are supplementary — skip severity entirely
                if (!isConditionReferenced) {
                    if (options?.verbose) {
                        console.log(
                            `[TreeOverlay] "${missing.name}" (cmid ${missing.cmid}): not in conditions — SKIP (supplementary)`,
                        );
                    }
                    continue;
                }

                const inAPI = apiGraph.nodes.has(missing.cmid);
                const inStudentUI = studentUiGraph.nodes.has(missing.cmid);
                const inAdminUI = true;
                const inStudentAPI = false;

                const agreementCount = [inAdminUI, inAPI, inStudentAPI, inStudentUI].filter(Boolean).length;
                const confidence = buildConfidence(
                    agreementCount,
                    'Admin UI y API confirman que existe, pero API del estudiante no lo reporta',
                );

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
                        actionItem:
              'Verificar visibilidad y permisos del recurso en la configuración del curso.',
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
                        actionItem:
              'No requiere acción inmediata. Monitorear si estudiantes reportan problemas.',
                        evidence: { inAdminUI, inAPI, inStudentAPI, inStudentUI },
                    });
                }
            }
            // Second pass: nodes in student API tree but NOT in student UI tree.
            // The API confirms the student can access them, but the UI doesn't render them.
            // For condition-referenced auto-complete files this is a WARNING (e.g., 6918).
            for (const [cmid, adminNode] of adminGraph.nodes) {
                if (cmid === 0)
                    continue;
                if (!studentApiGraph.nodes.has(cmid))
                    continue;
                if (studentUiGraph.nodes.has(cmid))
                    continue;

                const isConditionReferenced = options?.conditionReferencedCmids
                    ? options.conditionReferencedCmids.has(cmid)
                    : true;
                if (!isConditionReferenced)
                    continue;

                const apiNode = apiGraph.nodes.get(cmid);
                const isAutoCompleteFile
                    = apiNode?.isautomatic === true && apiNode?.visible === 1 && apiNode?.metadata?.hasContent;

                if (isAutoCompleteFile) {
                    if (options?.verbose) {
                        console.log(
                            `[TreeOverlay] "${adminNode.name}" (cmid ${cmid}): API confirms access but NOT in student UI → WARNING (UI rendering issue)`,
                        );
                    }
                    findings.push({
                        severity: 'warning',
                        sectionNumber: adminNode.sectionNumber,
                        sectionTitle: adminNode.sectionName,
                        message: `"${adminNode.name}" es accesible via API pero no se renderiza en la interfaz del estudiante`,
                        detail:
              `El recurso "${adminNode.name}" (cmid ${cmid}) tiene visible=1 y finalización automática. `
              + 'La API del estudiante confirma que es accesible (está en su estado de progreso), '
              + 'pero no aparece en la interfaz gráfica del estudiante. '
              + 'Esto puede deberse a que el recurso está oculto detrás del tooltip "Show More" del módulo bloqueado, '
              + 'o porque está en un bloque lateral (Biblioteca) en lugar de la sección de contenido. '
              + 'Si está referenciado en condiciones de disponibilidad, esto bloquea el avance del estudiante.',
                        priority: 'medium',
                        actionItem:
              'Verificar que el recurso sea visible en la interfaz del estudiante. '
              + 'Si es un duplicado, eliminar la copia innecesaria. '
              + 'Si el "Show More" no expande, reportar bug del formato de curso.',
                        confidence: buildConfidence(3, 'Admin UI, API y API estudiante confirman existencia'),
                        evidence: {
                            inAdminUI: true,
                            inAPI: true,
                            inStudentAPI: true,
                            inStudentUI: false,
                        },
                    });
                }
            }
        }
        else {
            // Student API not available — fallback: compare admin vs student UI only,
            // using nelthor's privileged access data as additional evidence.
            // Auto-complete File resources are known to not render hrefs in student DOM,
            // so we skip them when we can't verify via API.
            const adminVsStudentUi = adminGraph.overlay(studentUiGraph);
            for (const missing of adminVsStudentUi.missingNodes) {
                if (missing.cmid === 0)
                    continue;

                const isConditionReferenced = options?.conditionReferencedCmids
                    ? options.conditionReferencedCmids.has(missing.cmid)
                    : true;

                // Non-condition items (navigation, decorative, supplementary) are skipped
                if (!isConditionReferenced) {
                    if (options?.verbose) {
                        console.log(
                            `[TreeOverlay] "${missing.name}" (cmid ${missing.cmid}): not in conditions — SKIP (supplementary)`,
                        );
                    }
                    continue;
                }

                const apiNode = apiGraph.nodes.get(missing.cmid);
                const isAutoCompleteFile
                    = apiNode?.isautomatic === true && apiNode?.visible === 1 && apiNode?.metadata?.hasContent;

                // Check nelthor's completion data as privileged evidence
                const nelthorEntry = options?.nelthorData?.get(missing.name.toLowerCase());
                const nelthorCompleted = nelthorEntry?.state === 1;
                const nelthorEvidence = nelthorEntry !== undefined;

                if (isAutoCompleteFile) {
                    if (nelthorCompleted) {
                        // nelthor confirmed this is accessible via switch-role → skip
                        if (options?.verbose) {
                            console.log(
                                `[TreeOverlay] "${apiNode?.name || missing.name}" (cmid ${missing.cmid}): isautomatic file, nelthor completed it → SKIP (accessible)`,
                            );
                        }
                        continue;
                    }
                    if (options?.verbose) {
                        console.log(
                            `[TreeOverlay] "${apiNode?.name || missing.name}" (cmid ${missing.cmid}): isautomatic file, no student API data — SKIP (unreliable DOM)`,
                        );
                    }
                    continue;
                }

                if (nelthorCompleted) {
                    // nelthor confirmed access via switch-role → downgrade to INFO
                    if (options?.verbose) {
                        console.log(
                            `[TreeOverlay] "${missing.name}" (cmid ${missing.cmid}): nelthor completed it → INFO (accessible via switch-role)`,
                        );
                    }
                    findings.push({
                        severity: 'info',
                        sectionNumber: missing.sectionNumber,
                        sectionTitle: missing.sectionName,
                        message: `"${missing.name}" es accesible (confirmado por nelthor) pero no visible en vista estudiante estándar`,
                        detail:
              `El recurso "${missing.name}" (cmid ${missing.cmid}) tiene visible=1 en DB. `
              + 'nelthor (administrador con cambio de rol) pudo completarlo, confirmando que es accesible. '
              + 'No aparece en la UI de estudiante estándar, pero el acceso está disponible.',
                        priority: 'low',
                        actionItem: 'Monitorear si estudiantes reportan problemas de acceso.',
                        confidence: buildConfidence(
                            3,
                            'Admin UI y API confirman, y nelthor completó la actividad',
                        ),
                        evidence: {
                            inAdminUI: true,
                            inAPI: apiGraph.nodes.has(missing.cmid),
                            inStudentAPI: false,
                            inStudentUI: false,
                            inNelthorCompleted: true,
                        },
                    });
                    continue;
                }

                if (nelthorEvidence) {
                    // nelthor has data but state is 0 (couldn't complete) → real blocker
                    if (options?.verbose) {
                        console.log(
                            `[TreeOverlay] "${missing.name}" (cmid ${missing.cmid}): nelthor FAILED to complete → CRITICAL`,
                        );
                    }
                    findings.push({
                        severity: 'critical',
                        sectionNumber: missing.sectionNumber,
                        sectionTitle: missing.sectionName,
                        message: `"${missing.name}" no es accesible incluso para nelthor (admin con switch-role)`,
                        detail:
              `El recurso "${missing.name}" (cmid ${missing.cmid}) tiene visible=1 en DB. `
              + 'Nelthor (administrador con cambio de rol a estudiante) NO pudo completarlo. '
              + 'Esto indica que es un bloqueador real: ni estudiantes ni admins con switch-role pueden acceder.',
                        priority: 'high',
                        actionItem:
              'Revisar visibilidad, permisos y condiciones de disponibilidad del recurso.',
                        confidence: buildConfidence(
                            3,
                            'Admin UI y API confirman, y nelthor no pudo completarlo',
                        ),
                        evidence: {
                            inAdminUI: true,
                            inAPI: apiGraph.nodes.has(missing.cmid),
                            inStudentAPI: false,
                            inStudentUI: false,
                            inNelthorCompleted: false,
                        },
                    });
                    continue;
                }

                // No nelthor data, no student API — limited evidence
                if (options?.verbose) {
                    console.log(
                        `[TreeOverlay] "${missing.name}" (cmid ${missing.cmid}): not in student UI, no student API — WARNING`,
                    );
                }

                findings.push({
                    severity: 'warning',
                    sectionNumber: missing.sectionNumber,
                    sectionTitle: missing.sectionName,
                    message: `"${missing.name}" no se confirma como accesible para estudiantes`,
                    detail:
            `El recurso "${missing.name}" (cmid ${missing.cmid}) tiene visible=1 en DB pero no aparece en la vista del estudiante. `
            + 'No hay datos de API del estudiante ni de nelthor para confirmar. '
            + 'Se recomienda verificación manual.',
                    priority: 'medium',
                    actionItem: 'Verificar manualmente si el recurso es accesible para estudiantes.',
                    confidence: buildConfidence(2, 'Solo Admin UI y API confirman existencia'),
                    evidence: {
                        inAdminUI: true,
                        inAPI: apiGraph.nodes.has(missing.cmid),
                        inStudentAPI: false,
                        inStudentUI: false,
                    },
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
        const duplicates = detectDuplicates(adminGraph, apiGraph, studentUiGraph);
        for (const dup of duplicates) {
            if (options?.verbose) {
                console.log(
                    `[TreeOverlay] Possible duplicate: "${dup.nameA}" (cmid ${dup.cmidA}) ≈ "${dup.nameB}" (cmid ${dup.cmidB})`,
                );
            }

            const bothInStudentUI
                = studentUiGraph.nodes.has(dup.cmidA) && studentUiGraph.nodes.has(dup.cmidB);

            const detailText = bothInStudentUI
                ? 'Ambos son accesibles para estudiantes — posible duplicado innecesario.'
                : `Solo ${dup.cmidA} es accesible. ${dup.cmidB} no está en la interfaz del estudiante. Se recomienda revisar si este duplicado es necesario.`;

            findings.push({
                severity: bothInStudentUI ? 'info' : 'warning',
                sectionNumber: dup.sectionNumber,
                sectionTitle: dup.sectionName,
                message: `Posible duplicado: "${dup.nameA}" ≈ "${dup.nameB}"`,
                detail:
          `Se encontraron dos recursos similares en la misma sección:\n`
          + `- "${dup.nameA}" (cmid ${dup.cmidA}): "${dup.filenameA}"\n`
          + `- "${dup.nameB}" (cmid ${dup.cmidB}): "${dup.filenameB}"\n\n`
          + `${detailText}`,
                priority: bothInStudentUI ? 'low' : 'medium',
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
    _studentUiGraph: CourseDependencyGraph,
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
            const filenameA = String(a.metadata?.firstContentFilename ?? '');
            const filenameB = String(b.metadata?.firstContentFilename ?? '');
            const bothHaveFiles = filenameA !== '' && filenameB !== '';
            const fileSim = bothHaveFiles ? nameSimilarity(filenameA, filenameB) : 0;

            // Skip generic filenames like 'index.html' — they're Moodle defaults, not evidence
            const genericFiles = ['index.html', 'index.htm', 'index.php', 'default.html', ''];
            if (genericFiles.includes(filenameA) || genericFiles.includes(filenameB))
                continue;

            // Both name AND file must be similar for duplicates with uploaded files
            if (bothHaveFiles && fileSim < 0.5)
                continue;

            // Name similarity must be >= 0.7, or file similarity >= 0.8
            if (sim < 0.7 && fileSim < 0.8)
                continue;

            // Skip short generic names (<3 meaningful words, no files)
            const wordsA = new Set(
                a.name
                    .toLowerCase()
                    .replace(/[_-]/g, ' ')
                    .replace(/[^a-z0-9\s]/g, '')
                    .split(/\s+/)
                    .filter(Boolean),
            );
            const wordsB = new Set(
                b.name
                    .toLowerCase()
                    .replace(/[_-]/g, ' ')
                    .replace(/[^a-z0-9\s]/g, '')
                    .split(/\s+/)
                    .filter(Boolean),
            );
            const meaningfulWords = Math.max(wordsA.size, wordsB.size);
            if (meaningfulWords < 3 && !bothHaveFiles)
                continue;
            if (meaningfulWords < 2 && bothHaveFiles)
                continue;

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
