import process from 'node:process';
import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Campus Virtual Course Progress Validation', () => {
    const baseURL: string = (process.env.MOODLE_BASE_URL ?? 'https://campus.aulavirtual.unc.edu.ar');
    const username: string = (process.env.STUDENT_USERNAME ?? 'nelthor');
    const password: string = (process.env.STUDENT_PASSWORD ?? 'entroPIA01');
    const courseId: string = (process.env.TEST_COURSE_ID ?? '269');
    if (!username || !password) {
        throw new Error('STUDENT_USERNAME and STUDENT_PASSWORD must be set in .env');
    };
    test('Validate course progress', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.login(username || '', password || '');
        await page.goto(`${baseURL}/course/view.php?id=${courseId}`);
    });
});
