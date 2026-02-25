# SQL Scripts (InstaDetox)

Este directorio centraliza scripts SQL del proyecto.

## Archivos

1. `10_feed_contract_check.sql`
- Auditoria de contrato Feed vs DB real (SSOT):
  - objetos esperados
  - columnas criticas que usa el codigo
  - estado RLS
  - indices relevantes

2. `20_verify_feed_data.sql`
- Verifica objetos y conteos operativos de feed/social (solo lectura).

3. `30_sync_db_with_code.sql`
- Script de sincronizacion idempotente DB-codigo:
  - asegura contrato de `feed_posts`
  - agrega indice para paginacion keyset (`created_at desc, id desc`)
  - corrige recursion RLS en `conversation_participants` / `messages`

4. `40_storage_posts_media.sql`
- Habilita Supabase Storage para publicaciones multimedia:
  - crea/actualiza bucket `post-media` (publico, 50MB, mime types imagen/video)
  - policies RLS por carpeta de usuario (`<auth.uid()>/archivo`)
  - lectura publica de objetos del bucket

5. `50_posts_metadata_mentions_location_cover.sql`
- Extiende `posts` y `feed_posts` para paridad de creacion:
  - `mentions` (`text[]`)
  - `video_cover_url`

6. `60_drop_posts_location_text.sql`
- Elimina `location_text` de `posts` y actualiza la vista `feed_posts`.

7. `70_validate_post_mentions.sql`
- Valida en backend (DB trigger) que `posts.mentions` solo contenga usernames existentes.

8. `80_storage_profile_avatars.sql`
- Habilita Supabase Storage para cambio de avatar de perfil:
  - crea/actualiza bucket `profile-avatars` (publico, 5MB, solo imagen)
  - policies RLS por carpeta de usuario (`<auth.uid()>/archivo`)
  - lectura publica de objetos del bucket

9. `90_enable_realtime_profile_tables.sql`
- Activa realtime para tablas core del perfil:
  - `profiles`, `posts`, `post_likes`, `post_comments`, `follows`
  - `replica identity full` para payload consistente en updates/deletes

## Uso recomendado (Supabase SQL Editor)

1. Ejecutar `10_feed_contract_check.sql`
2. Ejecutar `20_verify_feed_data.sql`
3. Si hay discrepancias, ejecutar `30_sync_db_with_code.sql`
4. Para upload desde dispositivo en `Create`, ejecutar `40_storage_posts_media.sql`
5. Para menciones/ubicacion/portada de video, ejecutar `50_posts_metadata_mentions_location_cover.sql`
6. Si deseas quitar ubicacion del producto y DB, ejecutar `60_drop_posts_location_text.sql`
7. Para validar menciones contra `profiles.username`, ejecutar `70_validate_post_mentions.sql`
8. Para habilitar cambio/eliminacion de avatar desde perfil, ejecutar `80_storage_profile_avatars.sql`
9. Para realtime de perfil (posts/likes/comments/follows), ejecutar `90_enable_realtime_profile_tables.sql`
