-- =====================================================
-- INSTADETOX - STORAGE PARA POSTS MEDIA (SSOT)
-- Fecha: 2026-02-25
-- Objetivo: habilitar subida de imagen/video desde dispositivo
-- para publicaciones del feed.
-- =====================================================

begin;

-- 1) Bucket publico para media de publicaciones
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  52428800, -- 50MB
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) Policies: path por usuario => "<auth.uid()>/<archivo>"
drop policy if exists "post_media_public_read" on storage.objects;
create policy "post_media_public_read" on storage.objects
for select to public
using (bucket_id = 'post-media');

drop policy if exists "post_media_insert_own_folder" on storage.objects;
create policy "post_media_insert_own_folder" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "post_media_update_own_folder" on storage.objects;
create policy "post_media_update_own_folder" on storage.objects
for update to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "post_media_delete_own_folder" on storage.objects;
create policy "post_media_delete_own_folder" on storage.objects
for delete to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;

-- Verificacion minima
select id, name, public, file_size_limit
from storage.buckets
where id = 'post-media';
