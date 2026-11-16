# Registro de equipos mineros

Aplicación para administrar equipos mineros y sus mantenimientos, compuesta por un frontend React, una API NestJS y una base de datos PostgreSQL administrada con Prisma.

## Aplicación publicada

- Frontend: https://codea-uni.vercel.app/
- Backend: https://codea-uni-api.onrender.com/
- Estado de la API: https://codea-uni-api.onrender.com/health

## Requisitos

- Node.js 24 y npm (versión recomendada para las herramientas generadas).
- Docker y Docker Compose, o una instancia PostgreSQL accesible.

## Desarrollo local

1. Crea o edita `backend/.env` y `frontend/.env` usando los respectivos archivos `.env.example`. Las credenciales de ejemplo son exclusivamente para desarrollo local. Prisma puede generar un `.env` inicial: revisa su contenido antes de reemplazarlo.
2. Inicia PostgreSQL con `docker compose up -d` desde la raíz. El volumen conserva los datos entre reinicios.
3. En `backend/`, ejecuta `npm ci`, `npx prisma migrate deploy` y `npm run start:dev`.
4. En `frontend/`, ejecuta `npm ci` y `npm run dev`.
5. Abre la URL indicada por Vite. La API escucha por defecto en `http://localhost:3000`.

La aplicación permite crear, listar, editar y eliminar equipos, registrar mantenimientos y consultar su historial. `GET /health` comprueba la API y la conexión a PostgreSQL; responde con HTTP 503 si la base de datos no está disponible.

**Seguridad:** esta versión del reto no incluye autenticación ni autorización. Una vez publicada, cualquiera con acceso a la API puede modificar datos; utiliza únicamente datos de prueba y no la expongas como sistema de producción.

## Reglas de mantenimiento

- Intervalos definidos para el reto: camión **250 h**, excavadora **500 h** y perforadora **300 h**.
- El ciclo es el horómetro total actual menos la lectura del último mantenimiento, o cero si no hay historial. Al llegar o superar el intervalo, el equipo requiere mantenimiento.
- Registrar un mantenimiento guarda la fecha y lectura actuales y reinicia el ciclo sin borrar horas acumuladas. El horómetro no puede disminuir.
- Cambiar el tipo recalcula el estado con el intervalo del tipo nuevo, sin reiniciar el ciclo.
- Eliminar un equipo lo marca como eliminado y conserva su historial; no puede reactivarse ni modificarse. Su código puede reutilizarse en otro equipo, pero no puede haber dos equipos activos con el mismo código.
- Los equipos e historiales se consultan en páginas de 5 elementos por defecto. Los endpoints aceptan `page` y `limit` (máximo 100) y devuelven `data`, `page`, `limit`, `total` y `totalPages`.
- La fecha `performedAt` es la fecha automática en que se registró el mantenimiento.
- La unicidad de códigos activos se garantiza con el índice parcial PostgreSQL `Equipment_active_code_key` de la migración SQL. Revisa las migraciones futuras para no eliminarlo accidentalmente.

La paginación cambia el formato anterior de las respuestas de listado e historial: frontend y backend deben actualizarse juntos. Durante un despliegue secuencial puede haber una ventana breve de incompatibilidad.

## Pruebas de integración con PostgreSQL

Las pruebas reales de API usan una base **diferente** de la de desarrollo y comprueban que su URL sea exactamente la base local de pruebas. Desde la raíz:

```bash
docker compose --profile test up -d --wait test-db
cd backend
export DATABASE_URL='postgresql://mining_test:mining_test_local@localhost:55433/mining_test?schema=public'
npx prisma migrate deploy
npm run test:integration
```

Este `export` cambia `DATABASE_URL` para esa terminal; al terminar, ejecuta `unset DATABASE_URL` antes de iniciar el backend de desarrollo. Las pruebas limpian únicamente sus propios registros. No uses la base de Render para las pruebas. Para detener la base de pruebas, desde la raíz: `docker compose --profile test stop test-db`.

## Calidad y formato

En ambos proyectos, `npm run lint` revisa el código con Oxlint, `npm run format:check` comprueba el formato, `npm run format` lo aplica con Prettier, `npm test` ejecuta las pruebas unitarias y `npm run build` compila. En el backend también ejecuta `npm run test:e2e` y las pruebas de integración descritas arriba. Para formatear al guardar en VS Code, instala la extensión Prettier y selecciónala como formateador predeterminado, activando **Format on Save**.

El backend utiliza Prisma 7 y un adaptador PostgreSQL. Su instalación y compilación requieren las dependencias de desarrollo, incluida la CLI de Prisma. Con npm 12 se autorizan únicamente las versiones indicadas en `allowScripts` del backend; al actualizar esas dependencias se deben revisar sus scripts de instalación.

El backend y el frontend se generaron con Nest CLI y `create-vite`, respectivamente. Tailwind se integra con el plugin oficial de Vite.

## Despliegue

El frontend y el backend se despliegan como servicios separados mediante `./deploy.sh`:

1. Instala y autentica Render CLI y Vercel CLI, y vincula el repositorio al proyecto de Vercel.
2. Copia `deploy.env.example` a `deploy.env` y configura ahí `RENDER_SERVICE_ID`, `FRONTEND_URL`, `BACKEND_URL` y `DEPLOY_BRANCH`. El archivo local está ignorado por Git.
3. Confirma y sube los cambios a la rama configurada en GitHub. El repositorio local debe estar limpio y coincidir con esa rama remota.
4. Desde la raíz, ejecuta `./deploy.sh` y espera el resultado de ambos servicios y las comprobaciones finales.

Consulta los requisitos, la configuración inicial de las plataformas y la solución de problemas en [la guía de despliegue](docs/despliegue.md).

No publiques archivos `.env` ni credenciales. Las variables de `VITE_` se incluyen en el frontend y son públicas.

## Uso de IA

Se utilizó OpenCode (GPT-6.1 Terra) como asistencia para el desarrollo, las pruebas y la documentación. Las decisiones, la lógica principal, la revisión y las correcciones fueron realizadas y verificadas por el autor.
