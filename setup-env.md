# Configuracion de Variables de Entorno para InstaDetox

## Variables Requeridas

Este proyecto usa variables separadas por servicio.

### `client/.env` (frontend)

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
VITE_API_URL=http://localhost:3000
```

### `server/.env` (backend)

PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200
```

## Pasos para Configurar

### 1. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ejecuta `supabase-setup.sql` en el SQL Editor.
3. En Settings > API, copia URL y Anon Key.
4. Carga URL y Anon Key en `client/.env`.
5. Configura backend en `server/.env`.

### 2. Verificar Configuracion

Ejecuta:

```bash
npm run dev
```

Levanta:
- Frontend en `http://localhost:5173`
- Backend en `http://localhost:3000`

## Estructura de Base de Datos

El script de Supabase crea las tablas:

- `users`
- `user_profiles`
- `messages`
- `posts`
- `likes`
- `comments`
- `notifications`
- `follows`
- `detox_goals`
- `usage_stats`
- `app_settings`

## Seguridad

- Todas las tablas tienen Row Level Security (RLS) habilitado.
- Las politicas de seguridad limitan acceso por usuario autenticado.

## Solucion de Problemas

### Error de conexion a Supabase

- Verifica `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Confirma que el proyecto de Supabase este activo.
- Revisa dominios permitidos en Supabase Auth.

### Error de autenticacion

- Verifica que Email/Password este habilitado en Supabase Auth.
- Valida las politicas RLS cargadas en la base.
