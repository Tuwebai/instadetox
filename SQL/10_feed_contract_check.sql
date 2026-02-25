-- =====================================================
-- INSTADETOX - FEED CONTRACT CHECK (SSOT)
-- Fecha: 2026-02-25
-- Solo lectura. No modifica datos.
-- =====================================================

-- 1) Objetos minimos esperados para Feed
select table_name, table_type
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'posts',
    'post_likes',
    'post_comments',
    'saved_posts',
    'follows',
    'feed_posts'
  )
order by table_name;

-- 2) Columnas criticas usadas por el codigo del feed
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'feed_posts' and column_name in ('id','user_id','created_at','caption','likes_count','comments_count','username','full_name','avatar_url'))
    or (table_name = 'post_likes' and column_name in ('post_id','user_id','created_at'))
    or (table_name = 'post_comments' and column_name in ('id','post_id','user_id','content','created_at'))
    or (table_name = 'saved_posts' and column_name in ('user_id','post_id','created_at'))
    or (table_name = 'follows' and column_name in ('follower_id','following_id','created_at'))
    or (table_name = 'posts' and column_name in ('id','user_id','caption','likes_count','comments_count','created_at'))
  )
order by table_name, column_name;

-- 3) Estado de RLS en tablas clave
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles','posts','post_likes','post_comments','saved_posts','follows')
order by c.relname;

-- 4) Indices relevantes para feed/cursor
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('posts','post_likes','post_comments','saved_posts','follows')
order by tablename, indexname;
