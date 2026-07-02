/* eslint-disable ts/strict-boolean-expressions */
import type { Page } from '@playwright/test';
import type { CourseStructure, TabLink } from './StudentCoursePage';

/**
 * AdminCoursePage
 *
 * Stub: Admin view not yet available (no admin credentials).
 * When admin access is granted, this page will:
 * - Navigate the same course but with admin session
 * - Detect hidden/dimmed activities not visible to students
 * - Scan gradebook and completion reports
 * - Cross-reference student-enrolled view via "Log in as" or "View as student"
 *
 * For now, returns the student view data as-is (no phantom detection possible
 * without admin visibility into hidden modules/activities).
 */
export class AdminCoursePage {
    private page: Page;
    private baseURL: string;

    constructor(page: Page, baseURL: string) {
        this.page = page;
        this.baseURL = baseURL;
    }

    async loginAs(username: string, password: string): Promise<void> {
        await this.page.goto(`${this.baseURL}/login/index.php`);
        await this.page.waitForLoadState('networkidle');
        await this.page.locator('#username').fill(username);
        await this.page.locator('#password').fill(password);
        await this.page.locator('#loginbtn').click();
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);
    }

    async getAdminTabs(courseId: string): Promise<TabLink[]> {
        await this.page.goto(`${this.baseURL}/course/view.php?id=${courseId}`);
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);

        return this.page.evaluate(() => {
            const tabLinks = document.querySelectorAll<HTMLAnchorElement>('a.nav-link[href*="section="]');
            return Array.from(tabLinks)
                .map((a) => {
                    const href = a.getAttribute('href') || '';
                    const sectionMatch = href.match(/section=(\d+)/);
                    const sectionNumber = sectionMatch ? Number.parseInt(sectionMatch[1], 10) : -1;
                    const parentLi = a.closest('li');
                    const isDisabled
                        = parentLi?.classList.contains('disabled') || a.classList.contains('disabled');
                    const restrictionEl = parentLi?.querySelector(
                        '.availabilityinfo, .dimmed_text, .text-muted',
                    );
                    const restrictionText = restrictionEl?.textContent?.trim() || '';
                    const allText = parentLi?.textContent?.trim() || '';
                    const extraRestriction = allText.replace(a.textContent?.trim() || '', '').trim();
                    return {
                        title: a.textContent?.trim() || '',
                        sectionNumber,
                        isDisabled,
                        restrictionText: restrictionText || extraRestriction,
                    };
                })
                .filter(t => t.sectionNumber >= 0);
        });
    }

    async getAdminSectionActivities(
        sectionNumber: number,
    ): Promise<import('./StudentCoursePage').ActivityData[]> {
        return this.page.evaluate((secNum) => {
            const section = document.querySelector(`#section-${secNum}, li#section-${secNum}`);
            if (!section)
                return [];

            const activities = section.querySelectorAll('.activity');
            return Array.from(activities).map((act) => {
                const nameEl = act.querySelector('[data-activityname]');
                const linkEl = act.querySelector('a');
                const completionEl = act.querySelector('.activity-completion');
                const isDimmed = act.classList.contains('dimmed');
                const modType
                    = Array.from(act.classList)
                        .find(c => c.startsWith('modtype_'))
                        ?.replace('modtype_', '') || 'unknown';
                const hasCheckbox = !!completionEl?.querySelector('input[type="checkbox"]');
                const checkboxChecked
                    = hasCheckbox && !!completionEl?.querySelector('input[type="checkbox"]:checked');
                const autoComplete = completionEl?.classList.contains('completion-automatic');
                const name
                    = nameEl?.getAttribute('data-activityname')
                        || linkEl?.textContent?.trim()
                        || act.textContent?.trim().substring(0, 60)
                        || 'UNNAMED';

                return {
                    name,
                    type: modType,
                    href: linkEl?.getAttribute('href') || '',
                    isVisible: !isDimmed,
                    hasCompletionTracking: hasCheckbox || !!autoComplete,
                    isComplete: checkboxChecked || false,
                };
            });
        }, sectionNumber);
    }

    async takeScreenshot(filename: string): Promise<void> {
        await this.page.screenshot({ path: filename, fullPage: true });
    }

    async analyze(courseId: string): Promise<CourseStructure> {
        const tabs = await this.getAdminTabs(courseId);
        const sections: import('./StudentCoursePage').SectionData[] = [];

        for (const tab of tabs) {
            await this.page.goto(
                `${this.baseURL}/course/view.php?id=${courseId}&section=${tab.sectionNumber}`,
            );
            await this.page.waitForLoadState('networkidle');
            await this.page.waitForTimeout(1500);

            const title = await this.page.evaluate(() => {
                return document.querySelector('.sectionname')?.textContent?.trim() || '';
            });
            const activities = await this.getAdminSectionActivities(tab.sectionNumber);

            const allVisibleComplete = activities
                .filter(a => a.isVisible && a.hasCompletionTracking)
                .every(a => a.isComplete);

            sections.push({
                number: tab.sectionNumber,
                title: title || tab.title,
                isLocked: tab.isDisabled,
                restrictionText: tab.restrictionText,
                activities,
                allVisibleComplete:
          activities.filter(a => a.isVisible).length === 0 ? false : allVisibleComplete,
            });
        }

        return {
            courseName: await this.page.title(),
            courseUrl: this.page.url(),
            tabs,
            sections,
        };
    }
}
