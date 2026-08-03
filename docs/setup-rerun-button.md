# Activar el boton "Re-ejecutar auditoria"

## Arquitectura

```
GitHub Pages (nelgoez.github.io/unc-agentic-dev/)
  └── audit/     ← Los reportes se sirven aca (desplegados por CI)

Netlify (unc-course-kit.netlify.app)
  ├── index.html, propuesta-qa.html  ← Pitch + propuesta QA
  └── api/trigger-audit             ← Netlify Function (dispara el CI)
```

Dos servicios que conviven. El reporte llama a la funcion en Netlify,
la funcion dispara el CI en GitHub, el CI regenera y deploya a GitHub Pages.

---

## Paso 1: Linkear el sitio de Netlify al repo de GitHub

Esto reemplaza el Drop manual. La config ya esta en `netlify.toml` (en el repo).

1. Anda a https://app.netlify.com
2. Selecciona el sitio `unc-course-kit`
3. Ve a **Site settings > Build & deploy > Continuous Deployment**
4. Clickea **"Link site to Git"**
5. Elegi GitHub > autorizas > selecciona el repo `nelgoez/unc-agentic-dev`
6. Branch: `master`
7. **Build command:** (dejalo vacio)
8. **Publish directory:** `docs/pitch`
9. **Functions directory:** `netlify/functions`
10. Clickea **"Deploy site"**

> El `netlify.toml` ya tiene `publish = "docs/pitch"` y `functions = "netlify/functions"`,
> asi que Netlify lo lee y lo usa. Pero configuralo en UI tambien por si acaso.

---

## Paso 2: Agregar el GitHub PAT como variable de entorno en Netlify

(Ya lo hiciste — verificamos que este)

1. **Site settings > Environment variables**
2. Key: `GITHUB_PAT`
3. Value: el token con scope `workflow` que creaste en GitHub
4. Guardar

---

## Paso 3: Verificar el deploy

Despues del primer deploy linkeado, proba:

```bash
curl -X POST https://unc-course-kit.netlify.app/api/trigger-audit \
  -H "Content-Type: application/json" \
  -d '{"courseId":304}'
```

Debe responder: `{"ok":true,"message":"Auditoria disparada..."}`

Si responde 404, es porque:

- El deploy no termino. Anda a Deploys en Netlify y verifica.
- O la funcion tiene errores. Anda a Functions en Netlify y mira los logs.

---

## Paso 4: Probar el boton en el reporte

1. Abri https://nelgoez.github.io/unc-agentic-dev/audit/304/latest.html
2. Clickea **"Re-ejecutar auditoria"**
3. Debe aparecer "Auditoria disparada. Refresca en 2-3 min."
4. Anda a https://github.com/nelgoez/unc-agentic-dev/actions — debe haber un workflow corriendo
5. Cuando termine (~3 min), refresca el reporte — timestamp actualizado

---

## Paso 5 (opcional): Activar despliegue automatico semanal

El CI ya tiene un job `course-audit` que se ejecuta en cada push a master.
Para que corra automaticamente aunque no haya cambios, agrega esto al workflow:

```yaml
on:
  push:
    branches: [master]
  schedule:
    - cron: '0 6 * * 1' # Todos los lunes a las 06:00 UTC
```

Esto ya esta en el archivo `.github/workflows/audit-ci.yml`. Descomentalo.
