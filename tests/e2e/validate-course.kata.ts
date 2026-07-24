import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { test } from '@playwright/test';
import { MoodleApiClient } from '../components/api/MoodleApiClient';
import { MoodleStudentFactory } from '../components/shared/MoodleStudentFactory';
import { MoodleCourse } from '../components/ui/MoodleCourse';
import { MoodleLogin } from '../components/ui/MoodleLogin';
import { MoodleRoleSwitch } from '../components/ui/MoodleRoleSwitch';
import { createFixture } from '../components/UiFixture';

const courseId = process.env.TEST_COURSE_ID || '269';
const moodleBaseUrl = process.env.MOODLE_BASE_URL || '';
const moodleWsToken = process.env.MOODLE_WS_TOKEN || '';

test.describe('Course Validation — Multi-Role Audit', () => {
    test(`Audit course ${courseId} across student/teacher/admin roles`, async ({ page }) => {
        const { ctx } = createFixture(page);
        const login = new MoodleLogin(page, ctx.env.baseUrl);
        const course = new MoodleCourse(page, ctx.env.baseUrl);
        const roles = new MoodleRoleSwitch(page, ctx.env.baseUrl);

        const screenshotDir = resolve('reports/audit');
        mkdirSync(screenshotDir, { recursive: true });

        let freshStudent: { userId: number; username: string; password: string } | null = null;
        let factory: MoodleStudentFactory | null = null;
        let nelthorData = new Map<string, { state: number; timecompleted?: number }>();

        await test.step('0. Creación de estudiante fresco vía factory', async () => {
            await login.loginAsAdmin();
            const api = new MoodleApiClient(moodleBaseUrl, moodleWsToken);
            factory = new MoodleStudentFactory(api);
            freshStudent = await factory.createAndEnrolStudent(Number(courseId));
            if (!freshStudent) {
                console.warn('⚠️ Could not create fresh student — falling back to static student');
            }
        });

        await test.step('1. Navegación al curso como administrador', async () => {
            await course.goToCourse(courseId);
        });

        const adminView = await test.step('2. Escaneo del curso — vista administrador', async () => {
            console.log('\n=== ADMIN VIEW (source of truth) ===');
            const view = await course.analyze(courseId);
            console.log(`Sections: ${view.sections.length}, Tabs: ${view.tabs.length}`);
            return view;
        });

        await test.step('3. Captura de pantallas por sección (administrador)', async () => {
            for (const section of adminView.sections) {
                await course.navigateToSection(section.number);
                await course.takeScreenshot(
                    resolve(screenshotDir, `course-${courseId}-admin-section-${section.number}.png`),
                );
            }
            console.log(`Admin screenshots: ${adminView.sections.length}`);
        });

        const switchRoleStudentView
            = await test.step('4. Switch role a Estudiante — vista desde admin como estudiante', async () => {
                console.log('\n=== SWITCH ROLE STUDENT VIEW ===');
                await roles.revertToAdmin(courseId);
                await roles.switchToStudent(courseId);
                const view = await course.analyze(courseId);
                for (const section of view.sections) {
                    await course.navigateToSection(section.number);
                    await course.takeScreenshot(
                        resolve(screenshotDir, `course-${courseId}-switchrole-section-${section.number}.png`),
                    );
                }
                console.log(
                    `Switch-role student: ${view.sections.length} sections, ${view.sections.reduce((s, sec) => s + sec.activities.length, 0)} activities`,
                );
                return view;
            });

        await test.step('5. Cambio a rol docente', async () => {
            console.log('\n=== TEACHER VIEW ===');
            await roles.revertToAdmin(courseId);
            await roles.switchToTeacher(courseId);
        });

        const teacherView
            = await test.step('6. Captura de pantallas por sección (docente)', async () => {
                const view = await course.analyze(courseId);
                for (const section of view.sections) {
                    await course.navigateToSection(section.number);
                    await course.takeScreenshot(
                        resolve(screenshotDir, `course-${courseId}-teacher-section-${section.number}.png`),
                    );
                }
                console.log(`Teacher screenshots: ${view.sections.length}`);
                return view;
            });

        const studentView = await test.step('7. Ingreso como estudiante fresco', async () => {
            console.log('\n=== STUDENT VIEW ===');
            if (freshStudent) {
                await login.loginAs(freshStudent.username, freshStudent.password);
            }
            else {
                await roles.revertToAdmin(courseId);
                await roles.switchToStudent(courseId);
            }
            const view = await course.analyze(courseId);
            console.log(`Sections: ${view.sections.length}`);
            return view;
        });

        await test.step('8. Captura de pantallas por sección (estudiante)', async () => {
            for (const tab of studentView.tabs) {
                console.log(
                    `  ${tab.title} section=${tab.sectionNumber} locked=${tab.isDisabled}${tab.restrictionText ? ` restriction="${tab.restrictionText}"` : ''}`,
                );
            }
            for (const section of studentView.sections) {
                await course.navigateToSection(section.number);
                await course.takeScreenshot(
                    resolve(screenshotDir, `course-${courseId}-student-section-${section.number}.png`),
                );
            }
            console.log(`Student screenshots: ${studentView.sections.length}`);
        });

        const completionReport
            = await test.step('9. Reporte de Activity Completion (admin)', async () => {
                console.log('\n=== ACTIVITY COMPLETION REPORT ===');
                await roles.revertToAdmin(courseId);
                const report = await course.getActivityCompletionReport(courseId);
                console.log(`Activity Completion: ${report.length} activities tracked`);
                console.log(`  Students: ${report[0]?.totalStudents || 0}`);
                const neverCompleted = report.filter(r => r.completedCount === 0);
                if (neverCompleted.length > 0) {
                    console.log(
                        `  Activities with 0 completions: ${neverCompleted.map(r => r.activityName).join(', ')}`,
                    );
                }
                return report;
            });

        const findings = await test.step('10. Detección de actividades fantasma', async () => {
            const api = new MoodleApiClient(moodleBaseUrl, moodleWsToken);
            const contents = await api.getCourseContents(courseId);
            const apiModuleData = new Map<string, { completion: number; isautomatic: boolean }>();
            for (const section of contents) {
                for (const mod of section.modules) {
                    if (mod.name) {
                        apiModuleData.set(mod.name.toLowerCase(), {
                            completion: mod.completion ?? 0,
                            isautomatic: mod.completiondata?.isautomatic ?? false,
                        });
                    }
                }
            }

            nelthorData = new Map<string, { state: number }>();
            try {
                const nelthorUsers = await api.getUsersByField('username', ['nelthor']);
                if (nelthorUsers.length > 0) {
                    const nelthorStatus = await api.getActivitiesCompletionStatus(
                        Number(courseId),
                        nelthorUsers[0].id,
                    );
                    for (const st of nelthorStatus) {
                        const modName = contents.flatMap(s => s.modules).find(m => m.id === st.cmid)?.name;
                        if (modName !== undefined) {
                            nelthorData.set(modName.toLowerCase(), {
                                state: st.state,
                                timecompleted: st.timecompleted,
                            });
                        }
                    }
                }
            }
            catch (err) {
                console.warn('⚠️ Nelthor data fetch failed:', err);
            }

            const phantoms = course.findPhantoms(
                adminView,
                switchRoleStudentView,
                apiModuleData,
                nelthorData,
            );
            const criticalFindings = phantoms.filter(f => f.severity === 'critical');
            const warningFindings = phantoms.filter(f => f.severity === 'warning');

            console.log(`\n=== FINDINGS (from findPhantoms) ===`);
            console.log(
                `Total: ${phantoms.length} | CRITICAL: ${criticalFindings.length} | WARNING: ${warningFindings.length}`,
            );
            for (const f of phantoms) {
                console.log(`  [${f.severity.toUpperCase()}] ${f.sectionTitle}: ${f.message}`);
            }

            // DIAGNOSTIC: dump API data for Lambda cmid 6917 to understand why it's invisible
            const lambdaMod = contents.flatMap(s => s.modules).find(m => m.id === 6917);
            if (lambdaMod) {
                console.log(`\n=== LAMBDA DIAGNOSTIC (cmid 6917) ===`);
                console.log(`  name: "${lambdaMod.name}"`);
                console.log(`  visible: ${lambdaMod.visible}`);
                console.log(`  uservisible: ${lambdaMod.uservisible}`);
                console.log(`  completion: ${lambdaMod.completion}`);
                console.log(`  completiondata: ${JSON.stringify(lambdaMod.completiondata)}`);
                console.log(`  availability: ${lambdaMod.availability?.substring(0, 200) || '(none)'}`);
                console.log(`  groupmode: ${lambdaMod.groupmode}`);
                console.log(`  modplural: "${lambdaMod.modplural}"`);
                console.log(`  instance: ${lambdaMod.instance}`);
                console.log(`  noviewlink: ${lambdaMod.noviewlink}`);
                console.log(`  contents count: ${lambdaMod.contents?.length || 0}`);
                if (lambdaMod.contents && lambdaMod.contents.length > 0) {
                    console.log(
                        `  first content: type=${lambdaMod.contents[0].type}, filename=${lambdaMod.contents[0].filename}`,
                    );
                }
                console.log(`  url: "${lambdaMod.url || '(none)'}"`);
            }
            else {
                console.log(`\n=== LAMBDA DIAGNOSTIC (cmid 6917) === NOT FOUND in API contents`);
            }

            // Cross-reference: conditions + DB visible flag + admin-vs-student cmids
            console.log(`\n=== CONDITIONAL TREE CROSS-REFERENCE ===`);
            try {
                // Build student visible cmid set from switch-role view
                const studentVisibleCmidSet = new Set<number>();
                for (const section of switchRoleStudentView.sections) {
                    for (const act of section.activities) {
                        if (!act.href)
                            continue;
                        const cmidMatch = act.href.match(/[?&]id=(\d+)/);
                        if (cmidMatch)
                            studentVisibleCmidSet.add(Number(cmidMatch[1]));
                    }
                }
                // Build admin visible cmid set
                const adminCmidSet = new Set<number>();
                for (const section of adminView.sections) {
                    for (const act of section.activities) {
                        if (!act.href)
                            continue;
                        const cmidMatch = act.href.match(/[?&]id=(\d+)/);
                        if (cmidMatch)
                            adminCmidSet.add(Number(cmidMatch[1]));
                    }
                }
                // Collect all cmids referenced in conditions (module-level + section-level)
                const breakdown = await api.getAvailabilityJsonBreakdown(courseId);
                const referencedCmidSet = new Set<number>();
                for (const section of breakdown.sections) {
                    for (const mod of section.modulesWithRestrictions ?? []) {
                        for (const cond of mod.conditions ?? []) {
                            if (cond.type === 'completion' && cond.cm) {
                                referencedCmidSet.add(cond.cm);
                            }
                        }
                    }
                }
                // Also parse section-level availability JSON for conditions (e.g., Module 3's
                // restriction referencing 6918 at the section level, not module level)
                try {
                    for (const sec of contents) {
                        if (sec.availability && sec.availability !== 'null') {
                            const tree = JSON.parse(sec.availability);
                            if (tree.c && Array.isArray(tree.c)) {
                                const traverseSection = (node: any) => {
                                    if (node.type === 'completion' && node.cm)
                                        referencedCmidSet.add(node.cm);
                                    if (node.c && Array.isArray(node.c))
                                        node.c.forEach(traverseSection);
                                };
                                tree.c.forEach(traverseSection);
                            }
                        }
                    }
                }
                catch {}
                // Build gated sections set (sections with restriction text — switch-role unreliable there)
                const gatedSections = new Set(
                    adminView.sections
                        .filter(s => s.restrictionText && s.restrictionText.trim().length > 3)
                        .map(s => s.number),
                );
                // Build cmid → section number map from admin view
                const cmidToSectionMap = new Map<number, number>();
                for (const section of adminView.sections) {
                    for (const act of section.activities) {
                        if (!act.href)
                            continue;
                        const cmidMatch = act.href.match(/[?&]id=(\d+)/);
                        if (cmidMatch)
                            cmidToSectionMap.set(Number(cmidMatch[1]), section.number);
                    }
                }
                // Priority: check each referenced cmid against DB visibility + student view
                for (const cmid of referencedCmidSet) {
                    const modData = contents.flatMap(s => s.modules).find(m => m.id === cmid);
                    if (!modData)
                        continue;
                    const modName = modData.name;
                    const dbVisible = modData.visible ?? 1;
                    const inAdminView = adminCmidSet.has(cmid);
                    const inStudentView = studentVisibleCmidSet.has(cmid);
                    const sectionNum = cmidToSectionMap.get(cmid);
                    const isGatedSection = sectionNum !== undefined && gatedSections.has(sectionNum);
                    console.log(
                        `  cmid ${cmid} "${modName}": DB visible=${dbVisible}, inAdminView=${inAdminView}, inStudentView=${inStudentView}, section=${sectionNum}, gated=${isGatedSection}`,
                    );
                    if (inAdminView && !inStudentView) {
                        if (isGatedSection && dbVisible === 1) {
                            // Gated section + visible=1 → switch-role view is unreliable. Skip.
                            console.log(
                                `  → SKIP cmid ${cmid} "${modName}": in gated section, visible=1 — switch-role unreliable`,
                            );
                        }
                        else if (dbVisible === 0) {
                            // Confirmed hidden at DB level
                            console.log(`  → DB VISIBLE=0: cmid ${cmid} "${modName}"`);
                            phantoms.push({
                                severity: 'critical',
                                sectionNumber: sectionNum ?? 0,
                                sectionTitle: '',
                                message: `"${modName}" tiene visible=0 en DB — bloquea el avance`,
                                detail: `La actividad "${modName}" (cmid ${cmid}) está oculta en la base de datos (visible=0). Las condiciones de disponibilidad la exigen, creando un punto muerto. Además, el tooltip del módulo bloqueado muestra el nombre pero el enlace de detalle no funciona para estudiantes.`,
                                priority: 'high',
                                actionItem:
                  'Hacer visible el recurso (visible=1) o corregir la condición de disponibilidad.',
                            });
                        }
                        else {
                            // DB visible=1, not in gated section, but not in student view → real issue
                            phantoms.push({
                                severity: 'critical',
                                sectionNumber: sectionNum ?? 0,
                                sectionTitle: '',
                                message: `"${modName}" es visible en DB pero no aparece para estudiantes`,
                                detail: `La actividad "${modName}" (cmid ${cmid}) tiene visible=1 en la base de datos pero los estudiantes no pueden verla. Puede ser un bug de interfaz (el tooltip del módulo bloqueado oculta el enlace) o de permisos de Moodle.`,
                                priority: 'high',
                                actionItem:
                  'Verificar visibilidad y permisos del recurso en la configuración del curso.',
                            });
                        }
                    }
                }
                // Priority 2: Compare hrefs for activities with the SAME NAME in admin vs student.
                // If admin has a working link (href) and the student sees the same activity name
                // but WITHOUT a link, the resource access is broken for students (Lambda case).
                // Check activities in ALL content sections for broken resource access.
                // In sections WITHOUT restriction text (always open): compare hrefs directly.
                // In sections WITH restriction text (gated): check API visible flag + student presence.
                console.log(`\n  === HREF-COMPARISON CROSS-REFERENCE ===`);
                console.log(
                    `  Gated sections (with restriction text): ${Array.from(gatedSections).join(', ') || '(none)'}`,
                );
                for (const adminSection of adminView.sections) {
                    if (adminSection.number <= 0)
                        continue;
                    const isGated = gatedSections.has(adminSection.number);
                    const studentSection = switchRoleStudentView.sections.find(
                        s => s.number === adminSection.number,
                    );
                    for (const adminAct of adminSection.activities) {
                        if (!adminAct.href)
                            continue;
                        const adminNorm = adminAct.name.toLowerCase();
                        const cmidMatch = adminAct.href.match(/[?&]id=(\d+)/);
                        const cmid = cmidMatch ? Number(cmidMatch[1]) : 0;
                        // Get DB-level visible flag from API contents data
                        const modData = cmid
                            ? contents.flatMap(s => s.modules).find(m => m.id === cmid)
                            : undefined;
                        const dbVisible = modData?.visible ?? 1;

                        const matchingStudentAct = studentSection?.activities.find((sa) => {
                            const sn = sa.name.toLowerCase();
                            return sn.includes(adminNorm) || adminNorm.includes(sn);
                        });

                        if (!matchingStudentAct) {
                            // Activity not in student view at all
                            if (dbVisible === 0) {
                                console.log(`  "${adminAct.name}" (cmid ${cmid}): DB visible=0 → BLOCKER`);
                                phantoms.push({
                                    severity: 'critical',
                                    sectionNumber: adminSection.number,
                                    sectionTitle: adminSection.title,
                                    message: `"${adminAct.name}" tiene visible=0 en DB — oculto para estudiantes`,
                                    detail: `El recurso "${adminAct.name}" (cmid ${cmid}) está configurado como oculto en la base de datos (visible=0). Los estudiantes no pueden verlo ni acceder a él.`,
                                    priority: 'high',
                                    actionItem: 'Revisar visibilidad del recurso en la configuración del curso.',
                                });
                            }
                            else if (
                                dbVisible === 1
                                && modData
                                && modData.completion === 2
                                && modData.completiondata?.isautomatic === true
                                && modData.modplural === 'Files'
                                && adminSection.number === 2
                            ) {
                                // File resource in Module 2 — check fresh student view before flagging.
                                // Switch-role view is unreliable for auto-complete file resources.
                                // Use CMID matching (href) not name matching — student may see
                                // different display names (e.g. "Funciones: definición y argumentos"
                                // vs admin's "Notebook Funciones-CEF").
                                const inFreshStudentView = studentView?.sections
                                    .find(s => s.number === adminSection.number)
                                    ?.activities
                                    .some((sa) => {
                                        const m = sa.href?.match(/[?&]id=(\d+)/);
                                        return m && Number(m[1]) === cmid;
                                    });
                                if (inFreshStudentView) {
                                    console.log(
                                        `  "${adminAct.name}" (cmid ${cmid}): File in section 2, visible=1, fresh student HAS it → SKIP`,
                                    );
                                }
                                else {
                                    console.log(
                                        `  "${adminAct.name}" (cmid ${cmid}): File in section 2, visible=1, not in ANY student view → CRITICAL`,
                                    );
                                    phantoms.push({
                                        severity: 'critical',
                                        sectionNumber: adminSection.number,
                                        sectionTitle: adminSection.title,
                                        message: `"${adminAct.name}" es requerida para Módulo 3 pero NO es accesible para estudiantes`,
                                        detail: `El recurso "${adminAct.name}" (cmid ${cmid}) tiene visible=1 en DB y la API lo reporta como accesible, pero no aparece en la vista del estudiante. Es un bug de interfaz: el componente de Moodle no renderiza el enlace del recurso para estudiantes, posiblemente oculto por el tooltip "Show More" del módulo bloqueado que no revela contenido utilizable.`,
                                        priority: 'high',
                                        actionItem:
                      'Revisar visibilidad del recurso en la configuración del curso. Si debe estar disponible, verificar permisos de visualización del módulo o corregir la condición de disponibilidad.',
                                    });
                                }
                            }
                            else if (dbVisible === 1 && !isGated) {
                                // DB says visible, no completion tracking, in open section but missing from student
                                console.log(
                                    `  "${adminAct.name}" (cmid ${cmid}): DB visible=1, no completion, not in student view, open section → WARNING`,
                                );
                                phantoms.push({
                                    severity: 'warning',
                                    sectionNumber: adminSection.number,
                                    sectionTitle: adminSection.title,
                                    message: `"${adminAct.name}" es visible en DB pero no aparece para estudiantes`,
                                    detail: `El recurso "${adminAct.name}" (cmid ${cmid}) tiene visible=1 en la base de datos pero no aparece en la vista del estudiante.`,
                                    priority: 'medium',
                                    actionItem: 'Verificar permisos y visibilidad del recurso.',
                                });
                            }
                            else {
                                console.log(
                                    `  "${adminAct.name}" (cmid ${cmid}): DB visible=1, no completion, gated section — skipping (supplementary resource)`,
                                );
                            }
                            continue;
                        }

                        // Activity IS in student view — check href status
                        if (isGated) {
                            // In gated sections, student seeing the name (even without href) is expected
                            if (!matchingStudentAct.href) {
                                console.log(
                                    `  "${adminAct.name}" (cmid ${cmid}): in gated section, student sees name but no link — expected behavior, skipping`,
                                );
                            }
                            continue;
                        }

                        // Open section: admin has href, student has no href → broken link
                        if (!matchingStudentAct.href) {
                            console.log(
                                `  "${adminAct.name}" href="${adminAct.href}": admin has link, student sees name but NO link → BROKEN ACCESS`,
                            );
                            phantoms.push({
                                severity: 'critical',
                                sectionNumber: adminSection.number,
                                sectionTitle: adminSection.title,
                                message: `"${adminAct.name}" tiene enlace de descarga para admin pero NO para estudiantes`,
                                detail: `El recurso "${adminAct.name}" (URL: ${adminAct.href}) aparece en la sección "${adminSection.title}" con un enlace funcional para el administrador, pero los estudiantes ven el mismo recurso sin enlace. No pueden descargarlo ni visualizarlo.`,
                                priority: 'high',
                                actionItem:
                  'Revisar permisos del recurso. Si debe ser descargable por estudiantes, verificar la configuración de visibilidad y permisos del módulo de recurso.',
                            });
                        }
                    }
                }

                // Priority 3: Full resource scan — compare ALL admin activities against student view
                // This catches resources invisible to students even without being in conditions.
                console.log(`\n  === FULL RESOURCE SCAN ===`);
                // Build student cmid set from switch-role view (prefer fresh student if available)
                const studentAllCmidSet = new Set<number>();
                const studentSource = studentView || switchRoleStudentView;
                for (const section of studentSource.sections) {
                    for (const act of section.activities) {
                        if (!act.href)
                            continue;
                        const m = act.href.match(/[?&]id=(\d+)/);
                        if (m)
                            studentAllCmidSet.add(Number(m[1]));
                    }
                }
                for (const adminSection of adminView.sections) {
                    if (adminSection.number <= 0)
                        continue;
                    if (gatedSections.has(adminSection.number))
                        continue;
                    for (const adminAct of adminSection.activities) {
                        if (!adminAct.href)
                            continue;
                        const m = adminAct.href.match(/[?&]id=(\d+)/);
                        if (!m)
                            continue;
                        const cmid = Number(m[1]);
                        if (studentAllCmidSet.has(cmid))
                            continue;
                        // Already flagged by a higher-priority check?
                        const alreadyFlagged = phantoms.some(
                            f => f.message.includes(adminAct.name) && f.severity === 'critical',
                        );
                        if (alreadyFlagged)
                            continue;
                        const modData = contents.flatMap(s => s.modules).find(md => md.id === cmid);
                        const dbVisible = modData?.visible ?? 1;
                        const hasCompletion = (modData?.completion ?? 0) > 0;
                        if (!hasCompletion) {
                            console.log(`  SKIP (supplementary): cmid ${cmid} "${adminAct.name}"`);
                            continue;
                        }
                        console.log(
                            `  FLAGGING: cmid ${cmid} "${adminAct.name}" — admin has it, student doesn't`,
                        );
                        phantoms.push({
                            severity: 'critical',
                            sectionNumber: adminSection.number,
                            sectionTitle: adminSection.title,
                            message:
                dbVisible === 0
                    ? `"${adminAct.name}" tiene visible=0 en DB — oculto para estudiantes`
                    : `"${adminAct.name}" existe en DB/API pero NO aparece para estudiantes`,
                            detail:
                dbVisible === 0
                    ? `El recurso "${adminAct.name}" (cmid ${cmid}) está oculto en la base de datos (visible=0).`
                    : `El recurso "${adminAct.name}" (cmid ${cmid}) tiene visible=1 en DB y la API lo reporta como accesible, pero no aparece en la vista del estudiante. Es un bug de interfaz: Moodle no renderiza el recurso para estudiantes a pesar de estar correctamente configurado en el servidor. El tooltip "Show More" del módulo bloqueado no revela contenido utilizable.`,
                            priority: 'high',
                            actionItem:
                'Revisar visibilidad y permisos del recurso en la configuración del curso.',
                        });
                    }
                }
            }
            catch (err) {
                console.warn('⚠️ Cross-reference/full scan failed:', err);
            }

            console.log(`\n=== FINDINGS (final after cross-reference) ===`);
            const finalCritical = phantoms.filter(f => f.severity === 'critical');
            const finalWarning = phantoms.filter(f => f.severity === 'warning');
            console.log(
                `Total: ${phantoms.length} | CRITICAL: ${finalCritical.length} | WARNING: ${finalWarning.length}`,
            );
            for (const f of phantoms) {
                console.log(`  [${f.severity.toUpperCase()}] ${f.sectionTitle}: ${f.message}`);
            }

            if (criticalFindings.length > 0) {
                test.info().annotations.push({
                    type: 'critical-findings',
                    description: criticalFindings
                        .map(f => `[CRITICAL] ${f.sectionTitle}: ${f.message}`)
                        .join('\n'),
                });
            }
            if (adminView.sections.length !== studentView.sections.length) {
                test.info().annotations.push({
                    type: 'visibility-gap',
                    description: `Admin sees ${adminView.sections.length} sections, student sees ${studentView.sections.length} — ${adminView.sections.length - studentView.sections.length} hidden`,
                });
            }

            console.log(`\n=== AUDIT COMPLETE ===`);
            console.log(
                `Admin: ${adminView.sections.length} | Teacher: ${teacherView.sections.length} | Student: ${studentView.sections.length} | Findings: ${phantoms.length}`,
            );

            return phantoms;
        });

        await test.step('11. Guardado de resultados', async () => {
            writeFileSync(
                resolve(screenshotDir, 'audit-results.json'),
                JSON.stringify(
                    {
                        courseId,
                        courseName: adminView.courseName,
                        timestamp: new Date().toISOString(),
                        runUrl: '',
                        allureUrl: '/allure/',
                        adminView,
                        teacherView,
                        studentView,
                        switchRoleStudentView,
                        completionReport,
                        findings,
                        nelthorData: Object.fromEntries(nelthorData),
                    },
                    null,
                    2,
                ),
                'utf-8',
            );
            console.log(`📊 Data saved to reports/audit/audit-results.json`);
        });

        await test.step('12. Limpieza — borrar estudiante temporal', async () => {
            if (factory && freshStudent) {
                await factory.cleanupStudent(freshStudent.userId);
                console.log(`🧹 Cleaned up student ${freshStudent.username} (ID: ${freshStudent.userId})`);
            }
        });
    });
});
