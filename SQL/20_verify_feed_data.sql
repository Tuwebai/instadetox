-- =====================================================
-- INSTADETOX - FEED VERIFY
-- Fecha: 2026-02-25
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1) Objetos esperados (tablas + vista)
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

-- 2) Conteos globales
select
  (select count(*) from public.profiles) as profiles_count,
  (select count(*) from public.posts) as posts_count,
  (select count(*) from public.post_likes) as likes_count,
  (select count(*) from public.post_comments) as comments_count,
  (select count(*) from public.saved_posts) as saved_count,
  (select count(*) from public.follows) as follows_count;

-- 3) Preview feed
select
  id,
  user_id,
  username,
  full_name,
  caption,
  likes_count,
  comments_count,
  created_at
from public.feed_posts
order by created_at desc, id desc
limit 20;

-- 4) Semilla demo (si se ejecuto 10_seed_feed_demo.sql)
-- 4) Conteos por entidad social (solo verificacion operativa)
select 'posts' as entity, count(*)::bigint as total from public.posts
union all
select 'post_likes' as entity, count(*)::bigint as total from public.post_likes
union all
select 'post_comments' as entity, count(*)::bigint as total from public.post_comments
union all
select 'saved_posts' as entity, count(*)::bigint as total from public.saved_posts
union all
select 'follows' as entity, count(*)::bigint as total from public.follows;
