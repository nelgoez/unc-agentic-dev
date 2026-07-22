### Task 1: Refactor validate-course.kata.ts with captioned steps

Refactor the existing `tests/e2e/validate-course.kata.ts` to wrap each logical action in a `test.step()` with a Spanish caption.

Current structure (one big test):

1. Login as admin
2. Scan as admin + screenshots
3. Switch to teacher + screenshots
4. Switch to student + screenshots
5. Phantom detection
6. Save results

Expected new structure (one test, multiple captioned steps):

```
test.step('1. Inicio de sesión como administrador', ...)
test.step('2. Escaneo del curso — vista administrador', ...)
test.step('3. Captura de pantallas por sección (admin)', ...)
test.step('4. Cambio a rol docente', ...)
test.step('5. Captura de pantallas por sección (docente)', ...)
test.step('6. Cambio a rol estudiante', ...)
test.step('7. Captura de pantallas por sección (estudiante)', ...)
test.step('8. Detección de actividades fantasma', ...)
test.step('9. Guardado de resultados', ...)
```

Each step caption should be clear enough that Ignacio or Patricia can follow along in the Allure report.

The `test.step()` output appears in:

- Allure report (as nested steps)
- Playwright trace viewer
- Console output (with indentation)

See Playwright docs: https://playwright.dev/docs/api/class-test#test-step

No logic changes — only wrapping existing code in captioned steps.

