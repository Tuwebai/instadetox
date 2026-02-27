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

3.1 `31_fix_dm_rls_recursion_cycle.sql`
- Hotfix idempotente para recursion RLS en mensajeria:
  - elimina ciclo de policies entre `conversation_participants` y `conversations`
  - reemplaza policy `FOR ALL` en participants por `UPDATE` y `DELETE` explicitas
  - evita error `42P17 infinite recursion detected in policy for relation "conversation_participants"`

3.2 `32_dm_seen_and_unread.sql`
- Read receipts y unread real por conversacion:
  - crea `conversation_reads (conversation_id, user_id, seen_at, updated_at)`
  - RLS para lectura/escritura del propio usuario participante
  - RPC `get_unread_counts(uuid[])` para contador de no leidos por conversacion

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

10. `110_feed_rpc_with_context.sql`
- Crea RPC `public.get_feed_posts_with_context(...)`:
  - keyset pagination server-side
  - agrega `feed_context` por post (`own`, `following`, `suggested`)
  - permite paridad de etiqueta "Sugerencia para ti" basada en DB

11. `130_follow_requests_private_accounts.sql`
- Agrega soporte enterprise para cuentas privadas:
  - tabla `follow_requests` + enum de estado (`pending/accepted/rejected/canceled`)
  - RLS y politicas para requester/target
  - RPC `respond_follow_request(...)` para aprobar/rechazar solicitud
  - RPC `get_profile_header_snapshot(...)` para header consistente con privacidad
  - helper `can_view_profile_content(...)` para visibilidad real
  - endurece `posts_select_published` y `follows_insert_self`
  - actualiza `get_feed_posts_with_context(...)` para ocultar privados no aprobados
  - agrega `follow_requests` y `notifications` a `supabase_realtime`

12. `140_general_notifications_like_comment_follow.sql`
- Agrega notificaciones generales automáticas tipo Instagram:
  - trigger en `post_likes` => inserta `notifications.type='like'`
  - trigger en `post_comments` => inserta `notifications.type='comment'`
  - trigger en `follows` => inserta `notifications.type='follow'` para follows directos
  - evita auto-notificaciones (acciones sobre contenido propio)

13. `141_follow_request_accept_copy.sql`
- Ajusta el copy de notificación cuando aceptan solicitud:
  - body: `acepto tu solicitud de seguimiento.`
  - mantiene actor como usuario que acepta
  - incluye backfill de notificaciones antiguas con copy legacy

## Uso recomendado (Supabase SQL Editor)

1. Ejecutar `10_feed_contract_check.sql`
2. Ejecutar `20_verify_feed_data.sql`
3. Si hay discrepancias, ejecutar `30_sync_db_with_code.sql`
3.1 Si persiste error 500/42P17 en DM (`conversation_participants`), ejecutar `31_fix_dm_rls_recursion_cycle.sql`
3.2 Para habilitar `seen_at` persistente y unread counters reales en DM, ejecutar `32_dm_seen_and_unread.sql`
4. Para upload desde dispositivo en `Create`, ejecutar `40_storage_posts_media.sql`
5. Para menciones/ubicacion/portada de video, ejecutar `50_posts_metadata_mentions_location_cover.sql`
6. Si deseas quitar ubicacion del producto y DB, ejecutar `60_drop_posts_location_text.sql`
7. Para validar menciones contra `profiles.username`, ejecutar `70_validate_post_mentions.sql`
8. Para habilitar cambio/eliminacion de avatar desde perfil, ejecutar `80_storage_profile_avatars.sql`
9. Para realtime de perfil (posts/likes/comments/follows), ejecutar `90_enable_realtime_profile_tables.sql`
10. Para feed con contexto de recomendacion desde DB, ejecutar `110_feed_rpc_with_context.sql`
11. Para follow privado con estado pendiente y aprobacion, ejecutar `130_follow_requests_private_accounts.sql`
12. Para notificaciones generales de likes/comentarios/follows directos, ejecutar `140_general_notifications_like_comment_follow.sql`
13. Para corregir copy de aceptacion de solicitud, ejecutar `141_follow_request_accept_copy.sql`
