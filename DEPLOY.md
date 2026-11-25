# Despliegue — frontend en Vercel/Netlify + API externa

## Arquitectura

```
Navegador ──(HTTPS)──> Vercel / Netlify  [SPA estática, sin build de framework]
                              │
                              │ fetch(API_URL + '/api/...')
                              ▼
                     API Express en Vercel Function ──> TiDB Cloud (MySQL)
                              │
                              └── Vercel Cron 03:00 UTC
```

El frontend es HTML/CSS/JS vanilla: **no necesita Next.js ni frameworks**. La API es el Express de `../academia-baile-api`, desplegado como Vercel Function y conectado a una base MySQL compatible en TiDB Cloud Starter (plan gratuito).

---

## 1. Backend (hacerlo primero)

Seguir la guía completa en [`../academia-baile-api/DEPLOY.md`](../academia-baile-api/DEPLOY.md). En resumen:

1. Instalar la integración **TiDB Cloud** desde el Marketplace de Vercel (o crear el cluster a mano) y cargar `database/schema.sql`. La API detecta las variables `TIDB_*`/`DATABASE_URL` que inyecta la integración.
2. Importar `academia-baile-api` en Vercel y configurar `JWT_SECRET`, `CORS_ORIGIN` y `CRON_SECRET`. Las variables de DB ya vienen de la integración; si configurás la base a mano, usá `DB_*`.
3. Crear el admin con `npm run admin -- "Nombre" email clave`.
4. Verificar que `curl -i https://TU-API.vercel.app/api/dashboard` devuelve **401**, no 404.

Anotá la URL pública de la API, por ejemplo `https://academia-api.vercel.app`. **No incluyas `/api` ni barra final** en `API_URL`.

---

## 2. Frontend en Vercel

1. Importar el repositorio `academia-baile-web` en Vercel.
   - Si importás el workspace completo, configurá **Root Directory** = `repos/academia-baile-web`.
2. Vercel detecta `vercel.json`: `buildCommand = npm run build`, `outputDirectory = dist`, `framework = Other`.
3. En **Project Settings → Environment Variables** agregar:
   - `API_URL` = `https://TU-API.com` (Production y Preview).
4. Deploy. El output publicado es `dist/`.

## 3. Frontend en Netlify

1. **Add new site → Import an existing project** y elegí el repo `academia-baile-web`.
   - Si el repo está dentro de un workspace, indicá el **Base directory** = `repos/academia-baile-web`.
2. `netlify.toml` ya define `command = "npm run build"` y `publish = "dist"`.
3. En **Site configuration → Environment variables** agregar:
   - `API_URL` = `https://TU-API.com`.
4. Deploy.

> `scripts/build.js` copia `index.html`, `css/` y `js/` a `dist/` y genera `dist/js/api-config.js` con el valor de `API_URL`. No hay dependencias npm que instalar.

---

## 4. Verificación después del deploy

1. Abrir la URL de Vercel/Netlify y hacer login.
2. DevTools → Network: las llamadas deben apuntar a `https://TU-API.com/api/...` y devolver 200.
3. Probar una acción de escritura (alta de alumno) y recargar: el dato debe persistir.
4. Si el login responde **CORS error**, revisar `CORS_ORIGIN` en el backend (debe incluir el dominio exacto, con `https://`).

---

## 5. Cron (cuotas y estados)

En Vercel, `vercel.json` de la API registra `GET /api/jobs/estados` a las 03:00 UTC con `Authorization: Bearer <CRON_SECRET>`. Localmente, con `npm start`, lo hace `node-cron`. Ver detalles en [`../academia-baile-api/DEPLOY.md`](../academia-baile-api/DEPLOY.md).

---

## 6. Problemas frecuentes

| Síntoma | Causa probable |
| :--- | :--- |
| `/api/...` devuelve 404 en el dominio de Vercel/Netlify | `API_URL` no configurada en el build o apunta mal. |
| Error de CORS en la consola | Falta el dominio exacto en `CORS_ORIGIN`. |
| Login bloqueado con 429 para todos | Falta `app.set('trust proxy', 1)` (ya incluido) o el host no envía `X-Forwarded-For`. |
| "Sesión vencida" al cambiar de dominio | El token vive en `localStorage`: volver a iniciar sesión. |
| Contenido mixto bloqueado | La API debe servirse por HTTPS. |

> Netlify Drop (arrastrar carpetas) no sirve para esta arquitectura: publica estáticos, pero no ejecuta la API ni el cron. Usalo solo para maquetas sin datos.
