-- =====================================================
-- INSTADETOX - POSTS METADATA (mentions/location/cover)
-- Fecha: 2026-02-25
-- Objetivo: paridad de creacion IG por bloques.
-- =====================================================

begin;

alter table public.posts
  add column if not exists video_cover_url text,
  add column if not exists mentions text[] not null default '{}'::text[];

create index if not exists idx_posts_mentions_gin on public.posts using gin (mentions);

drop view if exists public.feed_posts;

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
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'posts'
  and column_name in ('video_cover_url', 'mentions')
order by column_name;
