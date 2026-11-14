# Despliegue en Vercel y Render

El repositorio contiene React en `frontend/` y NestJS con Prisma en `backend/`. Vercel publica el frontend; Render ejecuta la API y PostgreSQL. El primer aprovisionamiento es manual. Los siguientes despliegues se coordinan con `./deploy.sh`.

## Requisitos locales

- Bash, Git, Node.js 24, npm, curl, tar y acceso a GitHub.
- [Render CLI](https://render.com/docs/cli) y acceso al workspace correspondiente.
- Vercel CLI accesible con `npx --no-install vercel --version`. Si no está disponible, ejecútala previamente con `npx vercel --version` y acepta su instalación; alternativamente instala la CLI de Vercel. La caché de npx puede desaparecer y requerir repetir este paso.
- Un repositorio limpio con el commit que se publicará ya subido a la rama configurada en `origin`.

Autentícate y vincula los proyectos una sola vez, repitiendo el login cuando caduque la sesión:

```bash
render login
render services
npx vercel login
npx vercel link
```

Ejecuta `npx vercel link` desde la raíz del repositorio y selecciona el proyecto existente. En Render selecciona el workspace correcto y anota el ID del **servicio web**, que empieza por `srv-`, no el ID de PostgreSQL. No compartas tokens, credenciales ni el contenido de `.env.local` o `.vercel/`.

## Configuración inicial de Render

1. Crea PostgreSQL en la misma región que el Web Service. El plan gratuito tiene restricciones, incluidas expiración a los 30 días y ausencia de backups; consulta [los límites actuales](https://render.com/docs/free).
2. Crea un Web Service conectado al repositorio y a la rama de despliegue, con Root Directory `backend`, runtime Node, plan elegido y Auto-Deploy **Off**.
3. Configura Build Command `npm ci && npm run build` y Start Command `npx prisma migrate deploy && npm run start:prod`. Usa `/health` como Health Check Path.
4. Configura en Render `DATABASE_URL` con la URL interna de PostgreSQL, `FRONTEND_URL` con el origen público de Vercel y `NODE_VERSION=24`. Render proporciona `PORT`. No subas `DATABASE_URL` a Git.
5. Completa el primer despliegue y comprueba `https://TU-BACKEND/health`.

El Start Command revisa migraciones antes de cada arranque, incluidos reinicios y despertares del servicio gratuito. `prisma migrate deploy` aplica migraciones pendientes; no hace rollback de migraciones ya aplicadas si falla un paso posterior. Las migraciones incompatibles requieren una estrategia propia. El plan gratuito no ofrece el campo Pre-Deploy Command.

## Configuración inicial de Vercel

1. Importa el repositorio como proyecto Vercel, con Root Directory `frontend` y framework Vite. Selecciona un commit que contenga ese directorio.
2. Configura `VITE_API_URL` en Production con el origen HTTPS público del backend, sin `/health`. Las variables `VITE_` son públicas. Si la cambias, vuelve a construir y desplegar el frontend.
3. `frontend/vercel.json` desactiva despliegues automáticos por Git. Comprueba que está presente en la rama usada. En Render confirma que Auto-Deploy sigue en Off.
4. Completa un primer despliegue y comprueba la URL de producción. Asegúrate de que `FRONTEND_URL` en Render coincida exactamente con el origen público de Vercel.

## Ejecutar el despliegue

Define las variables en tu terminal usando `deploy.env.example` como referencia. No copies estos valores al repositorio si contienen información sensible:

```bash
export RENDER_SERVICE_ID='srv-id-del-servicio'
export FRONTEND_URL='https://tu-frontend.vercel.app'
export BACKEND_URL='https://tu-backend.onrender.com'
export DEPLOY_BRANCH='main'
```

Después de revisar los cambios, crea el commit y súbelo a la rama configurada. Desde la raíz:

```bash
git push origin main
./deploy.sh
```

El script comprueba el árbol de trabajo, la rama y el SHA remoto; verifica acceso a las plataformas; crea un directorio temporal con `git archive`; despliega el mismo SHA en Render y su contenido versionado en Vercel; espera los resultados y comprueba las URL. Render ejecuta las migraciones como parte del arranque. El script elimina únicamente su directorio temporal al finalizar.

Una respuesta HTTP exitosa del frontend comprueba disponibilidad, no que todas las funciones de React operen correctamente. Revisa también la aplicación desde un navegador. El despliegue no es transaccional: si Vercel falla después de Render, podría haber versiones diferentes. No existe rollback automático.

## Resolución de problemas

- **GitHub no se puede consultar:** comprueba acceso a `origin` y credenciales en la terminal. No se despliega si no se puede verificar el SHA remoto.
- **Rama o commit no coinciden:** confirma que estás en `DEPLOY_BRANCH`, revisa cambios y sube el commit antes de reintentar.
- **CLI sin sesión o sin acceso:** repite `render login` o `npx vercel login`, verifica el workspace y vuelve a vincular el proyecto con `npx vercel link` si es necesario.
- **Render tarda o `/health` falla:** revisa los logs del despliegue, variables, migraciones y disponibilidad de PostgreSQL. El plan gratuito duerme por inactividad.
- **Frontend no conecta:** revisa `VITE_API_URL` en Vercel, `FRONTEND_URL` en Render, CORS y vuelve a desplegar si cambiaste variables.
- **Migración falla:** consulta los logs y el estado de migraciones; no borres la base de datos como solución automática.
