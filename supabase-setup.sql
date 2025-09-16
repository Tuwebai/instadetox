-- =====================================================
-- SCRIPT COMPLETO PARA CONFIGURAR INSTADETOX EN SUPABASE
-- =====================================================
-- Ejecutar este script en el SQL Editor de Supabase
-- para crear toda la estructura de base de datos necesaria

-- =====================================================
-- 1. HABILITAR EXTENSIONES NECESARIAS
-- =====================================================

-- Habilitar UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habilitar RLS (Row Level Security)
-- (Ya está habilitado por defecto en Supabase)

-- =====================================================
-- 2. CREAR TABLAS PRINCIPALES
-- =====================================================

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    online BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);

-- Tabla de perfiles de usuario (información adicional)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    bio TEXT,
    website TEXT,
    location VARCHAR(100),
    detox_goal TEXT,
    daily_screen_time INTEGER DEFAULT 0, -- en minutos
    preferred_theme VARCHAR(20) DEFAULT 'dark',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- text, image, file, etc.
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de publicaciones/contenido
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    content TEXT NOT NULL,
    post_type VARCHAR(20) DEFAULT 'text', -- text, image, video, quote, etc.
    media_url TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de likes
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- Tabla de comentarios
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE, -- para respuestas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- like, comment, message, follow, etc.
    title VARCHAR(200) NOT NULL,
    content TEXT,
    is_read BOOLEAN DEFAULT false,
    related_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    related_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de seguimiento (follows)
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Tabla de metas de desintoxicación
CREATE TABLE IF NOT EXISTS public.detox_goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) NOT NULL, -- screen_time, app_usage, meditation, etc.
    target_value INTEGER, -- valor objetivo (minutos, días, etc.)
    current_value INTEGER DEFAULT 0, -- valor actual
    unit VARCHAR(20), -- minutos, días, veces, etc.
    is_completed BOOLEAN DEFAULT false,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de estadísticas de uso
CREATE TABLE IF NOT EXISTS public.usage_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    screen_time_minutes INTEGER DEFAULT 0,
    apps_used INTEGER DEFAULT 0,
    notifications_received INTEGER DEFAULT 0,
    posts_created INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Tabla de configuraciones de la app
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, setting_key)
);

-- =====================================================
-- 3. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_online ON public.users(online);

-- Índices para mensajes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(sender_id, receiver_id, created_at);

-- Índices para posts
CREATE INDEX IF NOT EXISTS idx_posts_user ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_published ON public.posts(is_published, created_at);

-- Índices para likes
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post ON public.likes(post_id);

-- Índices para comentarios
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id);

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Índices para follows
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- Índices para metas de desintoxicación
CREATE INDEX IF NOT EXISTS idx_detox_goals_user ON public.detox_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_detox_goals_completed ON public.detox_goals(is_completed);

-- Índices para estadísticas
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_date ON public.usage_stats(user_id, date);

-- =====================================================
-- 4. CONFIGURAR ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detox_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios
CREATE POLICY "Users can view all profiles" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para perfiles de usuario
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para mensajes
CREATE POLICY "Users can view own messages" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own messages" ON public.messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- Políticas para posts
CREATE POLICY "Users can view all published posts" ON public.posts
    FOR SELECT USING (is_published = true);

CREATE POLICY "Users can create posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para likes
CREATE POLICY "Users can view all likes" ON public.likes
    FOR SELECT USING (true);

CREATE POLICY "Users can create likes" ON public.likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON public.likes
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para comentarios
CREATE POLICY "Users can view all comments" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para notificaciones
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para follows
CREATE POLICY "Users can view all follows" ON public.follows
    FOR SELECT USING (true);

CREATE POLICY "Users can create follows" ON public.follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows" ON public.follows
    FOR DELETE USING (auth.uid() = follower_id);

-- Políticas para metas de desintoxicación
CREATE POLICY "Users can view own goals" ON public.detox_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create goals" ON public.detox_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON public.detox_goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON public.detox_goals
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para estadísticas
CREATE POLICY "Users can view own stats" ON public.usage_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create stats" ON public.usage_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON public.usage_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para configuraciones
CREATE POLICY "Users can view own settings" ON public.app_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create settings" ON public.app_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.app_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 5. CREAR FUNCIONES ÚTILES
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_detox_goals_updated_at BEFORE UPDATE ON public.detox_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar contadores de likes
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger para actualizar contadores de likes
CREATE TRIGGER update_likes_count_trigger
    AFTER INSERT OR DELETE ON public.likes
    FOR EACH ROW EXECUTE FUNCTION update_likes_count();

-- Función para actualizar contadores de comentarios
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger para actualizar contadores de comentarios
CREATE TRIGGER update_comments_count_trigger
    AFTER INSERT OR DELETE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_comments_count();

-- =====================================================
-- 6. INSERTAR DATOS DE PRUEBA
-- =====================================================

-- Insertar usuario de desarrollo
INSERT INTO public.users (id, email, username, full_name, avatar_url, online, is_active)
VALUES (
    'tuwebai-user-001',
    'tuwebai@gmail.com',
    'tuwebai',
    'TuWebAI Developer',
    'https://i.pravatar.cc/150?img=1',
    true,
    true
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    online = EXCLUDED.online,
    is_active = EXCLUDED.is_active;

-- Insertar perfil del usuario
INSERT INTO public.user_profiles (user_id, bio, detox_goal, daily_screen_time, preferred_theme)
VALUES (
    'tuwebai-user-001',
    'Desarrollador de InstaDetox - Aplicación para el bienestar digital',
    'Reducir el tiempo en redes sociales y aumentar la productividad',
    120, -- 2 horas
    'dark'
) ON CONFLICT (user_id) DO UPDATE SET
    bio = EXCLUDED.bio,
    detox_goal = EXCLUDED.detox_goal,
    daily_screen_time = EXCLUDED.daily_screen_time,
    preferred_theme = EXCLUDED.preferred_theme;

-- Insertar algunas metas de desintoxicación de ejemplo
INSERT INTO public.detox_goals (user_id, title, description, goal_type, target_value, current_value, unit, start_date, end_date)
VALUES 
    (
        'tuwebai-user-001',
        'Reducir tiempo en Instagram',
        'Limitar el uso de Instagram a 30 minutos por día',
        'app_usage',
        30,
        15,
        'minutos',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days'
    ),
    (
        'tuwebai-user-001',
        'Meditación diaria',
        'Practicar meditación 10 minutos cada día',
        'meditation',
        10,
        5,
        'minutos',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days'
    ),
    (
        'tuwebai-user-001',
        'Tiempo de pantalla total',
        'Mantener el tiempo total de pantalla bajo 4 horas por día',
        'screen_time',
        240,
        180,
        'minutos',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days'
    );

-- Insertar algunas publicaciones de ejemplo
INSERT INTO public.posts (user_id, title, content, post_type, likes_count, comments_count)
VALUES 
    (
        'tuwebai-user-001',
        'Mi primer día de desintoxicación digital',
        'Hoy comencé mi viaje hacia un uso más consciente de la tecnología. Me siento motivado y listo para el cambio! 🌱',
        'text',
        0,
        0
    ),
    (
        'tuwebai-user-001',
        'Consejo del día',
        'Desactiva las notificaciones de redes sociales durante las horas de trabajo. Tu productividad te lo agradecerá! 💡',
        'text',
        0,
        0
    );

-- =====================================================
-- 7. CONFIGURAR WEBHOOKS (OPCIONAL)
-- =====================================================

-- Nota: Los webhooks se configuran desde el dashboard de Supabase
-- Para notificaciones en tiempo real, usar Supabase Realtime

-- =====================================================
-- 8. VERIFICAR CONFIGURACIÓN
-- =====================================================

-- Verificar que las tablas se crearon correctamente
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'user_profiles', 'messages', 'posts', 'likes', 'comments', 'notifications', 'follows', 'detox_goals', 'usage_stats', 'app_settings')
ORDER BY table_name;

-- Verificar que el usuario de prueba se insertó
SELECT id, email, username, full_name, online 
FROM public.users 
WHERE email = 'tuwebai@gmail.com';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- IMPORTANTE: Después de ejecutar este script:
-- 1. Ve a Authentication > Settings en el dashboard de Supabase
-- 2. Configura las URLs permitidas para tu aplicación
-- 3. Configura las variables de entorno en tu .env:
--    - VITE_SUPABASE_URL=tu_url_de_supabase
--    - VITE_SUPABASE_ANON_KEY=tu_anon_key
-- 4. Configura la autenticación por email si es necesario
-- 5. Prueba la conexión desde tu aplicación
