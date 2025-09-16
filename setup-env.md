# Configuración de Variables de Entorno para InstaDetox

## 📋 Variables Requeridas

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# =====================================================
# CONFIGURACIÓN DE SUPABASE
# =====================================================
VITE_SUPABASE_URL=tu_url_de_supabase_aqui
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase_aqui

# =====================================================
# CONFIGURACIÓN DE GEMINI AI
# =====================================================
GEMINI_API_KEY=tu_api_key_de_gemini_aqui

# =====================================================
# CONFIGURACIÓN DEL SERVIDOR
# =====================================================
PORT=5000
NODE_ENV=development

# =====================================================
# CONFIGURACIÓN DE DESARROLLO
# =====================================================
# Usuario de desarrollo (opcional)
DEV_USER_EMAIL=tuwebai@gmail.com
DEV_USER_PASSWORD=hola123
```

## 🔧 Pasos para Configurar

### 1. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto
2. Ejecuta el script `supabase-setup.sql` en el SQL Editor de Supabase
3. Ve a Settings > API en tu proyecto de Supabase
4. Copia la URL y la Anon Key
5. Pega estos valores en tu archivo `.env`

### 2. Configurar Gemini AI

1. Ve a [Google AI Studio](https://aistudio.google.com/)
2. Crea una nueva API key
3. Copia la API key y pégala en tu archivo `.env`

### 3. Verificar Configuración

Después de configurar las variables, ejecuta:

```bash
npm run dev
```

## 🚀 Usuario de Desarrollo

La aplicación viene configurada con un usuario de desarrollo:

- **Email:** tuwebai@gmail.com
- **Contraseña:** hola123

Este usuario se crea automáticamente y no requiere registro.

## 📊 Estructura de Base de Datos

El script de Supabase crea las siguientes tablas:

- `users` - Información de usuarios
- `user_profiles` - Perfiles extendidos
- `messages` - Mensajes entre usuarios
- `posts` - Publicaciones/contenido
- `likes` - Likes en publicaciones
- `comments` - Comentarios
- `notifications` - Notificaciones
- `follows` - Seguimiento entre usuarios
- `detox_goals` - Metas de desintoxicación
- `usage_stats` - Estadísticas de uso
- `app_settings` - Configuraciones de la app

## 🔒 Seguridad

- Todas las tablas tienen Row Level Security (RLS) habilitado
- Las políticas de seguridad están configuradas para proteger los datos
- Los usuarios solo pueden acceder a sus propios datos

## 🐛 Solución de Problemas

### Error: "Usando modo de demostración"
- Verifica que `GEMINI_API_KEY` esté configurada correctamente
- Asegúrate de que no haya espacios extra en la variable
- Reinicia el servidor después de cambiar las variables

### Error de conexión a Supabase
- Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén correctas
- Asegúrate de que el proyecto de Supabase esté activo
- Verifica que las URLs permitidas incluyan tu dominio local

### Error de autenticación
- Verifica que el usuario de desarrollo esté creado en Supabase
- Asegúrate de que las políticas de RLS estén configuradas correctamente
