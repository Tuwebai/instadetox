-- =====================================================
-- INSTADETOX - REMOVE LOCATION FROM POSTS
-- Fecha: 2026-02-25
-- Objetivo: retirar ubicacion del alcance de paridad actual.
-- =====================================================

begin;

drop index if exists idx_posts_location_text;

drop view if exists public.feed_posts;

alter table public.posts
  drop column if exists location_text;

create view public.feed_posts as
select
  p.id,
  p.user_id,
  p.type,
  p.title,
  p.caption,
  p.media_url,
  p.likes_count,
  p.comments_count,
  p.created_at,
  pr.username,
  pr.full_name,
  pr.avatar_url,
  p.video_cover_url,
  p.mentions
from public.posts p
join public.profiles pr on pr.id = p.user_id
where p.is_published = true;

commit;

-- Verificacion minima
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'posts'
  and column_name = 'location_text';
