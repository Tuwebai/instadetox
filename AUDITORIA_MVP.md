# Auditoria Tecnica MVP - InstaDetox

Fecha: 24 de febrero de 2026  
Auditoria realizada sobre el estado actual del repositorio local.

## Resumen Ejecutivo

El proyecto compila y genera build de frontend/backend, pero **no esta listo para MVP en produccion**.  
Se removio por completo el modulo de IA/AURA (frontend, backend, rutas, dependencias y referencias).

Estado general:
- Build TypeScript: OK
- Build produccion: OK
- Seguridad de dependencias: NO OK (vulnerabilidades altas)
- Seguridad de aplicacion: NO OK (auth local hardcodeada, sin hardening backend)
- Operacion en cloud: PARCIAL (faltan ajustes de binding/entorno)

## Alcance Revisado

- Arquitectura `client/`, `server/`, `shared/`
- Scripts de `package.json`
- Variables de entorno y SQL de setup
- Flujo de autenticacion
- Endpoints backend y postura minima de seguridad
- Riesgos de deploy para Cloudflare/Render

## Cambios Aplicados en Esta Iteracion

Se elimino todo lo relacionado a IA/AURA:
- Archivo eliminado: `client/src/pages/Aura.tsx`
- Archivo eliminado: `server/aura.ts`
- Ruta API eliminada: `/api/chat`
- Ruta frontend eliminada: `/aura`
- Item de navegacion eliminado: `AURA`
- Dependencia eliminada: `@google/generative-ai`
- Limpieza de referencias en docs y SQL de setup
- Eliminado asset residual `aurasvg.webp`

## Verificaciones Ejecutadas

1. `npm run check` -> OK
2. `npm run build` -> OK
3. `npm audit --omit=dev` -> 10 vulnerabilidades (5 high, 2 moderate, 3 low)
4. Barrido textual de referencias IA/AURA -> sin ocurrencias

## Hallazgos (Priorizados)

## Criticos (bloquean MVP productivo)

1. Autenticacion de desarrollo en cliente (hardcodeada).
- Credenciales en frontend y validacion local via `localStorage`.
- Riesgo: acceso trivial, suplantacion, cero control de sesiones reales.
- Archivos: `client/src/lib/localAuth.ts`, `client/src/pages/Login.tsx`.

2. Backend sin capa funcional de negocio para datos reales.
- `server/routes.ts` queda sin endpoints de producto.
- Riesgo: frontend mayormente en modo local/demo, sin persistencia server-side.

3. Binding de red no apto para PaaS.
- Servidor escucha en `host: "localhost"` y puerto fijo.
- En Render/containers debe usar `0.0.0.0` y `process.env.PORT`.
- Archivo: `server/index.ts`.

## Altos

1. Vulnerabilidades en dependencias de runtime.
- `npm audit --omit=dev`: incluye advisories high en `glob`, `minimatch`, `qs`.

2. Sin hardening basico de API.
- No hay `helmet`, rate limiting, ni politica explicita de CORS.
- Riesgo: abuse/DoS/cabeceras inseguras cuando se expone internet.

3. Datos sensibles de demo en codigo.
- Usuario/password de demo visibles en UI y codigo.
- Para MVP publico debe migrarse a auth real o feature-flag privada.

## Medios

1. Logging verboso en cliente (`console.log`) y mensajes internos.
2. Ausencia de tests automaticos (unit/integration/e2e).
3. Sin manifiestos de despliegue documentados (`render.yaml`, config Pages/Workers).
4. Archivos con problemas de encoding historico (texto mojibake en partes del proyecto).

## Recomendacion de Arquitectura para MVP

Para salir rapido:
- Frontend: Cloudflare Pages
- Backend Node/Express: Render
- Base de datos: Supabase (ya contemplado en el repo)

Todo en Cloudflare tambien es viable, pero requiere migracion de backend Express a Workers/Functions y no es la ruta corta para este estado.

## Requisitos Minimos para Considerar MVP "Produccion"

1. Backend deploy-ready:
- usar `PORT` y `0.0.0.0`
- healthcheck (`/health`)
- manejo de errores sin filtrar internals

2. Seguridad minima:
- `helmet`
- rate limiter
- CORS por allowlist
- rotacion/gestion de secrets por entorno

3. Auth real:
- eliminar login local hardcodeado para entorno publico
- integrar Supabase Auth (o JWT/session server)

4. Calidad:
- tests smoke (login, rutas principales, build)
- pipeline CI: `npm ci`, `npm run check`, `npm run build`

5. Dependencias:
- resolver vulnerabilidades de `npm audit` y fijar versiones seguras

## Go/No-Go Actual

**No-Go para MVP productivo publico.**  
**Go condicional para demo privada** (si se asume entorno controlado y acceso restringido).

## Plan Propuesto (orden recomendado)

1. Hardening deploy (`PORT`, host, CORS, helmet, rate limit).
2. Reemplazo de auth local por auth real.
3. Correccion de vulnerabilidades (`npm audit fix` + validacion de regresiones).
4. Smoke tests y CI.
5. Documentar runbook de deploy (Cloudflare Pages + Render).
