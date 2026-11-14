# Registro de equipos mineros

Aplicación para consultar equipos mineros, compuesta por un frontend React, una API NestJS y una base de datos PostgreSQL administrada con Prisma.

## Requisitos

- Node.js 24 y npm (versión recomendada para las herramientas generadas).
- Docker y Docker Compose, o una instancia PostgreSQL accesible.

## Desarrollo local

1. Crea o edita `backend/.env` y `frontend/.env` usando los respectivos archivos `.env.example`. Las credenciales de ejemplo son exclusivamente para desarrollo local. Prisma puede generar un `.env` inicial: revisa su contenido antes de reemplazarlo.
2. Inicia PostgreSQL con `docker compose up -d` desde la raíz. El volumen conserva los datos entre reinicios.
3. En `backend/`, ejecuta `npm ci`, `npx prisma migrate deploy` y `npm run start:dev`.
4. En `frontend/`, ejecuta `npm ci` y `npm run dev`.
5. Abre la URL indicada por Vite. La API escucha por defecto en `http://localhost:3000`.

La lista puede estar vacía. `GET /equipment` consulta los equipos almacenados y `GET /health` comprueba tanto la API como la conexión a PostgreSQL; responde con HTTP 503 si la base de datos no está disponible.

## Calidad y formato

En ambos proyectos, `npm run lint` revisa el código con Oxlint, `npm run format:check` comprueba el formato y `npm run format` lo aplica con Prettier. En el backend también ejecuta `npm test`, `npm run test:e2e` y `npm run build`; en el frontend ejecuta `npm run build`. Para formatear al guardar en VS Code, instala la extensión Prettier y selecciona Prettier como formateador predeterminado, activando **Format on Save**. La configuración de Prettier se encuentra en cada proyecto.

El backend utiliza Prisma 7 y un adaptador PostgreSQL. Su instalación y compilación requieren las dependencias de desarrollo, incluida la CLI de Prisma. Con npm 12 se autorizan únicamente las versiones indicadas en `allowScripts` del backend; al actualizar esas dependencias se deben revisar sus scripts de instalación.

El backend y el frontend se generaron con Nest CLI y `create-vite`, respectivamente. Tailwind se integra con el plugin oficial de Vite.

## Despliegue

El frontend y el backend se despliegan como servicios separados. Configura `VITE_API_URL` con la URL pública de la API al construir el frontend, y `DATABASE_URL`, `FRONTEND_URL` y `PORT` en el backend. Ejecuta `npx prisma migrate deploy` contra la base de datos de destino. La automatización del despliegue y la configuración de los proveedores están pendientes.

No publiques archivos `.env` ni credenciales. Las variables de `VITE_` se incluyen en el frontend y son públicas.

## Uso de IA

La base inicial se desarrolló con asistencia de OpenCode (GPT-6.1 Terra). El código y las decisiones deben ser revisados y comprendidos antes de la entrega.
