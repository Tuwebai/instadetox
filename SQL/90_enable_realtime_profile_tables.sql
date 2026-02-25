-- =====================================================
-- INSTADETOX - ENABLE REALTIME FOR PROFILE TABLES
-- Fecha: 2026-02-26
-- Objetivo: asegurar eventos realtime para perfil sin refresh.
-- =====================================================

begin;

-- Replica identity completa para updates/deletes con payload robusto.
alter table if exists public.profiles replica identity full;
alter table if exists public.posts replica identity full;
alter table if exists public.post_likes replica identity full;
alter table if exists public.post_comments replica identity full;
alter table if exists public.follows replica identity full;

-- Publicacion realtime de Supabase
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.post_likes;
alter publication supabase_realtime add table public.post_comments;
alter publication supabase_realtime add table public.follows;

commit;

-- Verificacion minima
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in ('profiles', 'posts', 'post_likes', 'post_comments', 'follows')
order by tablename;
