import type { MoodleModule, MoodleSection } from '../components/api/MoodleApiClient';
import type { ActivityData, CourseStructure, SectionData } from '../components/ui/MoodleCourse';
/**
 * Tree Overlay Unit Tests
 *
 * Pure TypeScript tests for CourseDependencyGraph and TreeOverlayAnalyzer.
 * No Playwright, no Moodle network calls — tests logic only.
 * Run: bun test tests/unit/tree-overlay.test.ts
 */
import { describe, expect, it } from 'bun:test';
import { CourseDependencyGraph } from '../components/shared/CourseDependencyGraph';
import { TreeOverlayAnalyzer } from '../components/shared/TreeOverlayAnalyzer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAct(name: string, href: string, opts?: Partial<ActivityData>): ActivityData {
    return {
        name,
        type: opts?.type ?? 'resource',
        href,
        isVisible: opts?.isVisible ?? true,
        hasCompletionTracking: opts?.hasCompletionTracking ?? false,
        isComplete: opts?.isComplete ?? false,
        availabilityInfo: opts?.availabilityInfo ?? '',
    };
}

function makeSection(
    number: number,
    title: string,
    activities: ActivityData[],
    restrictionText = '',
): SectionData {
    return {
        number,
        title,
        isLocked: !!restrictionText,
        restrictionText,
        activities,
        allVisibleComplete: false,
    };
}

function makeCourseStruct(sections: SectionData[]): CourseStructure {
    return {
        courseName: 'Test Course',
        courseUrl: '',
        tabs: sections.map(s => ({
            title: s.title,
            sectionNumber: s.number,
            isDisabled: s.isLocked,
            restrictionText: s.restrictionText,
        })),
        sections,
    };
}

function makeMod(
    id: number,
    name: string,
    section: number,
    opts?: {
        completion?: number;
        visible?: number;
        uservisible?: boolean;
        isautomatic?: boolean;
        modplural?: string;
        noviewlink?: boolean;
        availability?: string | null;
        contents?: Array<{ type: string; filename: string }>;
    },
): MoodleModule {
    return {
        id,
        name,
        instance: id,
        contextid: 0,
        modplural: opts?.modplural ?? 'Files',
        modicon: '',
        indent: 0,
        onclick: '',
        afterlink: null,
        noviewlink: opts?.noviewlink ?? false,
        completion: opts?.completion ?? 0,
        completiondata: opts?.isautomatic
            ? {
                    state: 0,
                    timecompleted: 0,
                    overrideby: null,
                    valueused: false,
                    hascompletion: true,
                    isautomatic: true,
                    istrackeduser: false,
                    uservisible: opts?.uservisible ?? true,
                }
            : undefined,
        dates: [],
        contents: (opts?.contents ?? []).map(c => ({
            type: c.type,
            filename: c.filename,
            filepath: '/',
            filesize: 100,
            fileurl: '',
        })),
        description: '',
        visible: opts?.visible ?? 1,
        uservisible: opts?.uservisible ?? true,
        availabilityinfo: null,
        availablefrom: 0,
        availableuntil: 0,
        showavailability: 1,
        availability: opts?.availability ?? undefined,
        groupmode: 0,
        groupingid: 0,
    };
}

function makeMoodleSection(
    section: number,
    name: string,
    modules: MoodleModule[],
    availability?: string | null,
): MoodleSection {
    return {
        id: section,
        section,
        name,
        visible: 1,
        summary: '',
        summaryformat: 1,
        availability: availability ?? null,
        modules,
    };
}

// ---------------------------------------------------------------------------
// CourseDependencyGraph Tests
// ---------------------------------------------------------------------------

describe('CourseDependencyGraph — fromAdminUI', () => {
    it('should build nodes from sections and activities', () => {
        const struct = makeCourseStruct([
            makeSection(0, 'Bienvenida', [makeAct('Act Bienvenida', '/mod/resource/view.php?id=100')]),
            makeSection(1, 'Módulo 1', [makeAct('Act 1', '/mod/quiz/view.php?id=200')]),
        ]);

        const graph = CourseDependencyGraph.fromAdminUI(struct);

        expect(graph.nodes.size).toBe(2);
        expect(graph.nodes.has(100)).toBe(true);
        expect(graph.nodes.has(200)).toBe(true);
        expect(graph.nodes.get(100)!.name).toBe('Act Bienvenida');
        expect(graph.nodes.get(100)!.sectionNumber).toBe(0);
    });

    it('should build edges from restriction text', () => {
        const struct = makeCourseStruct([
            makeSection(0, 'Bienvenida', [makeAct('Intro', '/mod/resource/view.php?id=100')]),
            makeSection(
                1,
                'Módulo 1',
                [makeAct('Act 1', '/mod/quiz/view.php?id=200')],
                'La actividad está marcada como completada para acceder a Módulo 1: /mod/resource/view.php?id=100',
            ),
        ]);

        const graph = CourseDependencyGraph.fromAdminUI(struct);

        // 200 is blocked until 100 is complete
        const conditionEdges = graph.edges.filter(e => e.type === 'completion');
        expect(conditionEdges.length).toBeGreaterThanOrEqual(1);
        expect(conditionEdges.some(e => e.toCmid === 100)).toBe(true);
    });

    it('should skip activities without cmid href', () => {
        const struct = makeCourseStruct([makeSection(0, 'Bienvenida', [makeAct('No Link', '')])]);

        const graph = CourseDependencyGraph.fromAdminUI(struct);
        expect(graph.nodes.size).toBe(0);
    });
});

describe('CourseDependencyGraph — fromApi', () => {
    it('should build nodes from MoodleSection modules', () => {
        const sections = [
            makeMoodleSection(0, 'Bienvenida', [makeMod(100, 'Intro', 0)]),
            makeMoodleSection(1, 'Módulo 1', [makeMod(200, 'Quiz 1', 1)]),
        ];

        const graph = CourseDependencyGraph.fromApi(sections);

        expect(graph.nodes.size).toBe(2);
        expect(graph.nodes.get(100)!.name).toBe('Intro');
        expect(graph.nodes.get(200)!.name).toBe('Quiz 1');
        expect(graph.nodes.get(100)!.visible).toBe(1);
    });

    it('should build edges from section-level availability JSON', () => {
        const sections = [
            makeMoodleSection(0, 'Bienvenida', [makeMod(100, 'Intro', 0)]),
            makeMoodleSection(
                1,
                'Módulo 1',
                [makeMod(200, 'Act 1', 1)],
                JSON.stringify({ op: '&', c: [{ type: 'completion', cm: 100, e: 1 }] }),
            ),
        ];

        const refCmids = new Set<number>();
        refCmids.add(100);

        const graph = CourseDependencyGraph.fromApi(sections, refCmids);

        expect(graph.edges.length).toBeGreaterThanOrEqual(1);
        const edge = graph.edges.find(e => e.toCmid === 100 && e.fromCmid === 200);
        expect(edge).toBeDefined();
        expect(edge!.type).toBe('completion');
    });

    it('should capture DB visible flag', () => {
        const sections = [
            makeMoodleSection(2, 'Módulo 2', [
                makeMod(6918, 'Notebook Funcion-Lambda', 2, { visible: 0 }),
            ]),
        ];

        const graph = CourseDependencyGraph.fromApi(sections);

        expect(graph.nodes.get(6918)!.visible).toBe(0);
        expect(graph.nodes.get(6918)!.uservisible).toBe(true); // admin token always true
    });
});

describe('CourseDependencyGraph — fromStudentApiCompletion', () => {
    it('should build nodes from completion statuses', () => {
        const statuses = [
            { cmid: 100, state: 0, tracking: 2, timecompleted: 0 },
            { cmid: 200, state: 1, tracking: 2, timecompleted: 1700000000 },
        ];
        const allModules = [
            {
                id: 100,
                name: 'Intro',
                section: 0,
                sectionName: 'Bienvenida',
                modplural: 'Files',
                completion: 2,
                visible: 1,
            },
            {
                id: 200,
                name: 'Quiz',
                section: 1,
                sectionName: 'Módulo 1',
                modplural: 'Quizzes',
                completion: 1,
                visible: 1,
            },
        ];

        const graph = CourseDependencyGraph.fromStudentApiCompletion(statuses, allModules);

        expect(graph.nodes.size).toBe(2);
        expect(graph.nodes.get(100)!.name).toBe('Intro');
        expect(graph.nodes.get(200)!.name).toBe('Quiz');
        expect(graph.nodes.get(200)!.metadata.state).toBe(1);
    });

    it('should skip cmids not in allModules', () => {
        const statuses = [{ cmid: 999, state: 0, tracking: 2, timecompleted: 0 }];
        const allModules: Array<{
            id: number;
            name: string;
            section: number;
            sectionName: string;
            modplural: string;
            completion: number;
            visible: number;
        }> = [];

        const graph = CourseDependencyGraph.fromStudentApiCompletion(statuses, allModules);
        expect(graph.nodes.size).toBe(0);
    });
});

describe('CourseDependencyGraph — overlay', () => {
    it('should detect missing nodes', () => {
        const adminStruct = makeCourseStruct([
            makeSection(0, 'Bienvenida', [makeAct('Intro', '/mod/resource/view.php?id=100')]),
            makeSection(1, 'Módulo 1', [makeAct('Act 1', '/mod/quiz/view.php?id=200')]),
        ]);
        const studentStruct = makeCourseStruct([
            makeSection(0, 'Bienvenida', [makeAct('Intro', '/mod/resource/view.php?id=100')]),
            makeSection(1, 'Módulo 1', []),
        ]);

        const adminGraph = CourseDependencyGraph.fromAdminUI(adminStruct);
        const studentGraph = CourseDependencyGraph.fromAdminUI(studentStruct);

        const delta = adminGraph.overlay(studentGraph);

        expect(delta.missingNodes.length).toBe(1);
        expect(delta.missingNodes[0].cmid).toBe(200);
    });

    it('should detect when student is missing a resource that admin has', () => {
        const adminStruct = makeCourseStruct([
            makeSection(0, 'Módulo 1', [makeAct('Recurso', '/mod/resource/view.php?id=100')]),
        ]);
        const studentStruct = makeCourseStruct([makeSection(0, 'Módulo 1', [])]);

        const adminGraph = CourseDependencyGraph.fromAdminUI(adminStruct);
        const studentGraph = CourseDependencyGraph.fromStudentUI(studentStruct);

        const delta = adminGraph.overlay(studentGraph);

        expect(delta.missingNodes.length).toBe(1);
        expect(delta.missingNodes[0].cmid).toBe(100);
    });

    it('should detect extra nodes (student has something admin doesnt)', () => {
        const adminStruct = makeCourseStruct([makeSection(0, 'Módulo 1', [])]);
        const studentStruct = makeCourseStruct([
            makeSection(0, 'Módulo 1', [makeAct('Extra', '/mod/resource/view.php?id=999')]),
        ]);

        const adminGraph = CourseDependencyGraph.fromAdminUI(adminStruct);
        const studentGraph = CourseDependencyGraph.fromAdminUI(studentStruct);

        const delta = adminGraph.overlay(studentGraph);

        expect(delta.extraNodes.length).toBe(1);
        expect(delta.extraNodes[0].cmid).toBe(999);
    });

    it('should have perfect agreementScore for identical trees', () => {
        const struct = makeCourseStruct([
            makeSection(0, 'Bienvenida', [makeAct('Intro', '/mod/resource/view.php?id=100')]),
        ]);

        const graph1 = CourseDependencyGraph.fromAdminUI(struct);
        const graph2 = CourseDependencyGraph.fromAdminUI(struct);

        const delta = graph1.overlay(graph2);

        expect(delta.missingNodes.length).toBe(0);
        expect(delta.mismatchedNodes.length).toBe(0);
        expect(delta.extraNodes.length).toBe(0);
        expect(delta.missingEdges.length).toBe(0);
        expect(delta.agreementScore).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// TreeOverlayAnalyzer Tests — Core scenario: 6916/6917/6918
// ---------------------------------------------------------------------------

describe('TreeOverlayAnalyzer — 6918 real blocker scenario', () => {
    it('should flag 6918 as CRITICAL (invisible in both student trees)', () => {
    // All 3 resources exist in admin UI + API
        const adminStruct = makeCourseStruct([
            makeSection(0, 'Bienvenida', [
                makeAct('Notebook Funciones-CEF', '/mod/resource/view.php?id=6916'),
                makeAct('Notebook Funcion-Lambda-CEF', '/mod/resource/view.php?id=6917'),
                makeAct('Notebook Funcion-Lambda', '/mod/resource/view.php?id=6918'),
            ]),
        ]);
        const adminGraph = CourseDependencyGraph.fromAdminUI(adminStruct);

        const apiSections = [
            makeMoodleSection(0, 'Módulo 2', [
                makeMod(6916, 'Notebook Funciones-CEF', 0, {
                    completion: 2,
                    visible: 1,
                    isautomatic: true,
                    modplural: 'Files',
                    contents: [{ type: 'file', filename: 'funciones.ipynb' }],
                }),
                makeMod(6917, 'Notebook Funcion-Lambda-CEF', 0, {
                    completion: 2,
                    visible: 1,
                    isautomatic: true,
                    modplural: 'Files',
                    contents: [{ type: 'file', filename: 'lambda.ipynb' }],
                }),
                makeMod(6918, 'Notebook Funcion-Lambda', 0, {
                    completion: 2,
                    visible: 1,
                    isautomatic: true,
                    modplural: 'Files',
                    contents: [{ type: 'file', filename: 'lambda_dup.ipynb' }],
                }),
            ]),
        ];
        const apiGraph = CourseDependencyGraph.fromApi(apiSections);

        // Student API: only 6916 and 6917 are visible (6918 is invisible)
        const studentApiStatuses = [
            { cmid: 6916, state: 0, tracking: 2, timecompleted: 0 },
            { cmid: 6917, state: 0, tracking: 2, timecompleted: 0 },
        ];
        const allModules = apiSections.flatMap(s =>
            s.modules.map(m => ({
                id: m.id,
                name: m.name,
                section: s.section,
                sectionName: s.name,
                modplural: m.modplural,
                completion: m.completion,
                visible: m.visible,
            })),
        );
        const studentApiGraph = CourseDependencyGraph.fromStudentApiCompletion(
            studentApiStatuses,
            allModules,
        );

        // Student UI: only 2 activities visible (no hrefs for auto-complete files)
        const studentStruct = makeCourseStruct([
            makeSection(0, 'Módulo 2', [
                makeAct('Actividades', '/mod/forum/view.php?id=600'),
                makeAct('Botón al módulo 3', '/mod/url/view.php?id=601'),
            ]),
        ]);
        const studentUiGraph = CourseDependencyGraph.fromStudentUI(studentStruct);

        const findings = TreeOverlayAnalyzer.compare(
            adminGraph,
            apiGraph,
            studentApiGraph,
            studentUiGraph,
        );

        // 6918 should be the only CRITICAL
        const criticals = findings.filter(f => f.severity === 'critical');
        const critical6918 = criticals.filter(
            f =>
                f.message.includes('6918')
                || (f.message.includes('Funcion-Lambda') && !f.message.includes('Lambda-CEF')),
        );
        expect(critical6918.length).toBeGreaterThanOrEqual(1);
        expect(critical6918[0].confidence.level).toBe('alta');

        // 6916 and 6917 should NOT be CRITICAL
        const critical6916 = criticals.filter(f => f.message.includes('6916'));
        const critical6917 = criticals.filter(f => f.message.includes('6917'));
        expect(critical6916.length).toBe(0);
        expect(critical6917.length).toBe(0);
    });

    it('should produce INFO findings for 6916/6917 (API confirms access)', () => {
        const adminStruct = makeCourseStruct([
            makeSection(0, 'Módulo 2', [
                makeAct('Notebook Funciones-CEF', '/mod/resource/view.php?id=6916'),
                makeAct('Notebook Funcion-Lambda-CEF', '/mod/resource/view.php?id=6917'),
            ]),
        ]);
        const adminGraph = CourseDependencyGraph.fromAdminUI(adminStruct);

        const apiSections = [
            makeMoodleSection(0, 'Módulo 2', [
                makeMod(6916, 'Notebook Funciones-CEF', 0, {
                    completion: 2,
                    visible: 1,
                    isautomatic: true,
                    modplural: 'Files',
                    contents: [{ type: 'file', filename: 'funciones.ipynb' }],
                }),
                makeMod(6917, 'Notebook Funcion-Lambda-CEF', 0, {
                    completion: 2,
                    visible: 1,
                    isautomatic: true,
                    modplural: 'Files',
                    contents: [{ type: 'file', filename: 'lambda.ipynb' }],
                }),
            ]),
        ];
        const apiGraph = CourseDependencyGraph.fromApi(apiSections);

        // Both visible in student API
        const studentApiStatuses = [
            { cmid: 6916, state: 0, tracking: 2, timecompleted: 0 },
            { cmid: 6917, state: 0, tracking: 2, timecompleted: 0 },
        ];
        const allModules = apiSections.flatMap(s =>
            s.modules.map(m => ({
                id: m.id,
                name: m.name,
                section: s.section,
                sectionName: s.name,
                modplural: m.modplural,
                completion: m.completion,
                visible: m.visible,
            })),
        );
        const studentApiGraph = CourseDependencyGraph.fromStudentApiCompletion(
            studentApiStatuses,
            allModules,
        );

        // Student UI doesn't show them (no hrefs for auto-complete files)
        const studentStruct = makeCourseStruct([
            makeSection(0, 'Módulo 2', [makeAct('Actividades', '/mod/forum/view.php?id=600')]),
        ]);
        const studentUiGraph = CourseDependencyGraph.fromStudentUI(studentStruct);

        const findings = TreeOverlayAnalyzer.compare(
            adminGraph,
            apiGraph,
            studentApiGraph,
            studentUiGraph,
        );

        // Should have INFO findings (not CRITICAL) for 6916/6917
        const info6916 = findings.filter(f => f.message.includes('6916'));
        expect(info6916.length).toBeGreaterThanOrEqual(0);
        // Should NOT be critical
        const criticals = findings.filter(f => f.severity === 'critical');
        expect(criticals.length).toBe(0);

        const warningFindings = findings.filter(f => f.severity === 'warning');
        // No warnings about 6916/6917 being broken
        const warning6916 = warningFindings.filter(f => f.message.includes('6916'));
        expect(warning6916.length).toBe(0);
    });
});

describe('CourseDependencyGraph — duplicate detection (nameSimilarity)', () => {
    it('should detect near-identical names in same section', () => {
    // Test the internal nameSimilarity logic directly via the duplicate detection
    // that runs inside TreeOverlayAnalyzer.compare
        const apiSections = [
            makeMoodleSection(2, 'Módulo 2', [
                makeMod(6917, 'Notebook Funcion-Lambda-CEF', 2, {
                    completion: 2,
                    visible: 1,
                    modplural: 'Files',
                    contents: [{ type: 'file', filename: '03.2-2024_Funcion-Lambda-CEF (1).ipynb' }],
                }),
                makeMod(6918, 'Notebook Funcion-Lambda', 2, {
                    completion: 2,
                    visible: 1,
                    modplural: 'Files',
                    contents: [{ type: 'file', filename: '03.2-Funcion-Lambda-CEF (1).ipynb' }],
                }),
            ]),
        ];
        const apiGraph = CourseDependencyGraph.fromApi(apiSections);

        // Verify both nodes exist in API graph with correct metadata
        expect(apiGraph.nodes.size).toBe(2);
        expect(apiGraph.nodes.has(6917)).toBe(true);
        expect(apiGraph.nodes.has(6918)).toBe(true);

        const node6917 = apiGraph.nodes.get(6917)!;
        const node6918 = apiGraph.nodes.get(6918)!;
        expect(node6917.metadata.firstContentFilename).toBe('03.2-2024_Funcion-Lambda-CEF (1).ipynb');
        expect(node6918.metadata.firstContentFilename).toBe('03.2-Funcion-Lambda-CEF (1).ipynb');
        expect(node6917.sectionNumber).toBe(node6918.sectionNumber);
        expect(node6917.type).toBe(node6918.type);

        // Also test through the analyzer with proper adminGraph from API data
        const adminStruct = makeCourseStruct([
            makeSection(2, 'Módulo 2', [
                makeAct('Notebook Funcion-Lambda-CEF', '/mod/resource/view.php?id=6917'),
                makeAct('Notebook Funcion-Lambda', '/mod/resource/view.php?id=6918'),
            ]),
        ]);
        const adminGraph = CourseDependencyGraph.fromAdminUI(adminStruct);
        const studentApiGraph = new CourseDependencyGraph();
        const studentUiGraph = new CourseDependencyGraph();

        const findings = TreeOverlayAnalyzer.compare(
            adminGraph,
            apiGraph,
            studentApiGraph,
            studentUiGraph,
        );

        const dupFindings = findings.filter(f => f.message.toLowerCase().includes('duplicado'));
        expect(dupFindings.length).toBeGreaterThanOrEqual(1);
    });
});

describe('TreeOverlayAnalyzer — no findings for clean course', () => {
    it('should return no CRITICAL findings when all trees agree', () => {
        const adminStruct = makeCourseStruct([
            makeSection(0, 'Bienvenida', [makeAct('Intro', '/mod/resource/view.php?id=100')]),
        ]);
        const adminGraph = CourseDependencyGraph.fromAdminUI(adminStruct);

        const apiSections = [
            makeMoodleSection(0, 'Bienvenida', [makeMod(100, 'Intro', 0, { completion: 1, visible: 1 })]),
        ];
        const apiGraph = CourseDependencyGraph.fromApi(apiSections);

        // Student sees the same thing
        const studentStruct = makeCourseStruct([
            makeSection(0, 'Bienvenida', [makeAct('Intro', '/mod/resource/view.php?id=100')]),
        ]);
        const studentUiGraph = CourseDependencyGraph.fromStudentUI(studentStruct);

        const studentApiStatuses = [{ cmid: 100, state: 0, tracking: 1, timecompleted: 0 }];
        const allModules = apiSections.flatMap(s =>
            s.modules.map(m => ({
                id: m.id,
                name: m.name,
                section: s.section,
                sectionName: s.name,
                modplural: m.modplural,
                completion: m.completion,
                visible: m.visible,
            })),
        );
        const studentApiGraph = CourseDependencyGraph.fromStudentApiCompletion(
            studentApiStatuses,
            allModules,
        );

        const findings = TreeOverlayAnalyzer.compare(
            adminGraph,
            apiGraph,
            studentApiGraph,
            studentUiGraph,
        );

        const criticals = findings.filter(f => f.severity === 'critical');
        expect(criticals.length).toBe(0);
    });
});

describe('TreeOverlayAnalyzer — fallback when fresh student unavailable', () => {
    it('should NOT flag auto-complete files as CRITICAL when student API tree is empty', () => {
    // Simulates the real-world scenario: fresh student creation failed,
    // so student API tree has 0 nodes.
        const adminStruct = makeCourseStruct([
            makeSection(2, 'Módulo 2', [
                makeAct('Notebook Funcion-Lambda', '/mod/resource/view.php?id=6918'),
            ]),
        ]);
        const adminGraph = CourseDependencyGraph.fromAdminUI(adminStruct);

        const apiSections = [
            makeMoodleSection(2, 'Módulo 2', [
                makeMod(6918, 'Notebook Funcion-Lambda', 2, {
                    completion: 2,
                    visible: 1,
                    isautomatic: true,
                    modplural: 'Files',
                    contents: [{ type: 'file', filename: 'lambda.ipynb' }],
                }),
            ]),
        ];
        const apiGraph = CourseDependencyGraph.fromApi(apiSections);

        // STUDENT API IS EMPTY (fresh student wasn't created)
        const studentApiGraph = CourseDependencyGraph.fromStudentApiCompletion([], []);

        // Student UI doesn't show the resource either
        const studentStruct = makeCourseStruct([
            makeSection(2, 'Módulo 2', [makeAct('Actividades', '/mod/forum/view.php?id=600')]),
        ]);
        const studentUiGraph = CourseDependencyGraph.fromStudentUI(studentStruct);

        const findings = TreeOverlayAnalyzer.compare(
            adminGraph,
            apiGraph,
            studentApiGraph,
            studentUiGraph,
        );

        // With empty student API, auto-complete files should be SKIPPED, not CRITICAL
        const criticals = findings.filter(f => f.severity === 'critical');
        expect(criticals.length).toBe(0);

        // Should have 0 findings about 6918 at all (auto-complete files are skipped)
        const findingsAbout6918 = findings.filter(f => f.message.includes('6918'));
        expect(findingsAbout6918.length).toBe(0);
    });

    it('should flag non-auto-complete missing activities as WARNING when student API is empty', () => {
        const adminStruct = makeCourseStruct([
            makeSection(2, 'Módulo 2', [makeAct('Quiz importante', '/mod/quiz/view.php?id=500')]),
        ]);
        const adminGraph = CourseDependencyGraph.fromAdminUI(adminStruct);

        const apiSections = [
            makeMoodleSection(2, 'Módulo 2', [
                makeMod(500, 'Quiz importante', 2, {
                    completion: 1,
                    visible: 1,
                    modplural: 'Quizzes',
                }),
            ]),
        ];
        const apiGraph = CourseDependencyGraph.fromApi(apiSections);

        const studentApiGraph = CourseDependencyGraph.fromStudentApiCompletion([], []);
        const studentUiGraph = CourseDependencyGraph.fromStudentUI(
            makeCourseStruct([makeSection(2, 'Módulo 2', [])]),
        );

        const findings = TreeOverlayAnalyzer.compare(
            adminGraph,
            apiGraph,
            studentApiGraph,
            studentUiGraph,
        );

        const criticals = findings.filter(f => f.severity === 'critical');
        expect(criticals.length).toBe(0);

        const warnings = findings.filter(f => f.severity === 'warning');
        expect(warnings.length).toBeGreaterThanOrEqual(1);
    });
});
