# CI/CD para el Pipeline de Cursos — Nota Técnica

> Estado: **Para definir.** Esto se ajusta cuando el equipo defina dónde tienen sus drafts antes de producción y qué herramientas usan actualmente.

## El concepto

El pipeline de cursos (Curso-as-Código) puede integrarse con CI/CD de la misma forma que el código:

```
[Prompter] edita curso.yaml
    ↓
git commit + push
    ↓
CI corre validate-deps.ts
    ├─ ❌ Fallo → bloquea el merge, notifica al prompter
    └─ ✅ Éxito → deploy automático a entorno de preview
                      ↓
              Equipo revisa visualmente (grafo)
                      ↓
              Aprobación manual → publish a Moodle
```

## Opciones según madurez del equipo

### Opción A: Mínima (pre-commit hook)

```
.git/hooks/pre-commit
  └─ bun validate-deps curso.yaml
```

- Sin servidor, sin cuenta
- El validador corre antes de cada commit
- No hay preview visual automático
- Ideal si el equipo no usa git como flujo principal

### Opción B: GitHub Actions (recomendada)

```yaml
# .github/workflows/validate-course.yml
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun validate-deps curso.yaml
      - name: Generate visual graph
        run: bun generate-graph
      - uses: netlify/actions/cli@v1
        with:
          args: deploy --dir=graphify-out --alias=preview
```

- Gratis para repos públicos
- Corre en cada PR
- Deployea preview visual a Netlify automáticamente
- El bloqueo del PR es el "gate" antes de publicar

### Opción C: Netlify-only (si ya usan Netlify)

- Netlify puede correr un build command: `bun validate-deps curso.yaml && bun generate-graph`
- Pero no es tan natural para pipelines lógicos como GitHub Actions
- Útil si Netlify ya es su plataforma y no quieren agregar otra

## Integración con Moodle

El paso de "publish a Moodle" puede ser:

- **Manual:** el prompter sube el contenido después de la aprobación (como hoy)
- **Semi-automático:** el CI genera el XML/JSON de configuración y el prompter lo importa
- **Automático (ideal):** el CI usa la API de Moodle (con token admin) para crear/actualizar actividades y condiciones de acceso

## Lo que necesitamos definir cuando arranque la implementación

- [ ] ¿Dónde tienen los drafts de cursos? (carpeta compartida, Moodle oculto, git?)
- [ ] ¿Quién tiene acceso admin a Moodle para la API?
- [ ] ¿Usan git hoy? ¿Estarían cómodos con PRs?
- [ ] ¿Queremos preview visual automático (Netlify) o alcanza con el reporte de validate-deps?
- [ ] ¿El publish a Moodle debe ser automático o siempre manual?

## Stack sugerido (costo $0)

| Componente             | Herramienta      | Costo          |
| ---------------------- | ---------------- | -------------- |
| Repositorio            | GitHub (público) | $0             |
| CI                     | GitHub Actions   | $0 (público)   |
| Validación             | validate-deps.ts | $0             |
| Preview visual         | Netlify          | $0 (free tier) |
| Presentación del pitch | Netlify          | ✅ Ya activo   |

---

_Documento técnico — se actualiza cuando el equipo defina su flujo actual de drafts y publicación._
