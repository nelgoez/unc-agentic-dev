# Activar el boton "Re-ejecutar auditoria"

El boton que aparece en cada reporte llama a una Netlify Function que dispara el CI de GitHub.
Para que funcione, necesitas dos cosas configuradas:

---

## Paso 1: Crear un GitHub PAT (Personal Access Token)

1. Anda a https://github.com/settings/tokens
2. Clickea **"Generate new token"** → **"Fine-grained token"**
3. Completa:
   - **Token name:** `unc-qa-trigger`
   - **Resource owner:** `nelgoez`
   - **Repository access:** "Only select repositories" → `nelgoez/unc-agentic-dev`
   - **Permissions:**
     - **Actions:** Read and write
     - **Contents:** Read-only
4. Clickea **"Generate token"**
5. **Copia el token.** Solo se muestra una vez. Guardalo en algun lado seguro.

---

## Paso 2: Agregar el token a Netlify

1. Anda a https://app.netlify.com/ → elegi el sitio `unc-course-kit-pitch` (o el que uses para UNC)
2. Ve a **Site settings** → **Environment variables**
3. Agrega una variable:
   - **Key:** `GITHUB_PAT`
   - **Value:** (el token que copiaste en el paso 1)
4. Clickea **Save**

---

## Paso 3: Verificar que las Netlify Functions estan deployadas

Los archivos que necesitan estar en Netlify:

```
netlify.toml                        ← config de funciones y redirects
netlify/functions/trigger-audit.mjs ← la funcion serverless
```

Cuando hagas deploy a Netlify (automatico si ya esta linkeado a GitHub), la funcion
va a estar disponible en:

```
https://TU-SITIO.netlify.app/.netlify/functions/trigger-audit
```

---

## Paso 4: Testear

1. Abri el reporte de auditoria en GitHub Pages (o local)
2. Clickea **"Re-ejecutar auditoria"**
3. Deberia aparecer "Auditoria disparada. Refresca en 2-3 min."
4. Anda a https://github.com/nelgoez/unc-agentic-dev/actions → deberias ver un workflow corriendo
5. Cuando termine (~3 min), refresca el reporte → timestamp actualizado

---

## Troubleshooting

**"Error de conexion":** La Netlify function no esta deployada o el sitio no esta linkeado.
Verifica que `netlify.toml` y `netlify/functions/trigger-audit.mjs` esten en el repo.

**"GitHub API error" con status 404:** El workflow file name no coincide.
En la funcion, revisa que `workflowFile = 'audit-ci.yml'` sea correcto.

**"GitHub API error" con status 422:** El input `course_id` es invalido.
El workflow espera un string con el ID del curso.

**"GITHUB_PAT not configured":** La variable de entorno no esta seteada en Netlify.
Volve al Paso 2.
