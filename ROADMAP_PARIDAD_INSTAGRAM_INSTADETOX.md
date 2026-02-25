# Roadmap de Paridad Instagram -> InstaDetox

Fecha: 25 febrero 2026

## Objetivo

Replicar la experiencia central de Instagram (flujo, interaccion, navegacion y performance), adaptandola a objetivos de bienestar digital sin perder familiaridad de uso.

## Fuentes usadas (oficiales + estado del repo)

Fuentes oficiales consultadas:
- https://about.fb.com/news/2025/08/new-instagram-features-help-you-connect/amp/
- https://about.fb.com/news/2024/11/new-ways-to-connect-through-dms/
- https://about.fb.com/news/2025/09/in-india-instagram-debuts-a-reels-first-experience-for-its-mobile-app/
- https://about.fb.com/news/2025/12/instagram-for-tv/
- https://about.fb.com/news/2025/10/discover-reels-around-world-meta-ai-translation/
- https://www.facebook.com/help/instagram/581066165581870
- https://www.facebook.com/help/477434105621119

Estado actual del proyecto:
- Frontend: `client/src/pages/*` (pantallas base, varias en placeholder)
- Backend: `server/*` (minimo, sin API social completa)
- Datos: `supabase-setup.sql` (schema amplio), `shared/schema.ts` (muy basico y desalineado)

Nota: varias URLs oficiales de help/developers devolvieron 429 al crawler; donde falto detalle documental se infirio desde comunicados oficiales y comportamiento publico conocido de producto.

## Principios de paridad

1. Paridad por comportamiento, no copia literal de marca.
2. Mobile-first y velocidad percibida igual o mejor.
3. Detox como capa transversal, no como friccion excesiva.
4. Instrumentacion desde el dia 1 (eventos de uso y bienestar).

## Matriz de paridad (Instagram -> InstaDetox)

1. Feed
- Objetivo IG: scroll infinito, like/comment/save/share, ranking.
- Estado actual: feed real con infinite scroll, likes, comentarios, guardados, compartir y ranking ("Para ti"/"Recientes").
- Gap: critico.
- Adaptacion detox: feed intencional (menos estimulo adictivo, mas contenido util).
- Prioridad: P0.
- Estado de avance: [✅]

2. Perfil
- Objetivo IG: grid posts, stats, bio, follow/unfollow.
- Estado actual: perfil real (propio/publico), stats, grid de posts y follow/unfollow.
- Gap: critico.
- Adaptacion detox: metricas de bienestar visibles (streak, tiempo recuperado).
- Prioridad: P0.
- Estado de avance: [🟡]

3. Crear publicacion
- Objetivo IG: foto/video/carrusel, caption, tags, ubicacion.
- Estado actual: create/edit/delete persistido en Supabase.
- Gap: critico.
- Adaptacion detox: plantillas de "reflexion/meta/logro", limite de posting impulsivo opcional.
- Prioridad: P0.
- Estado de avance: [🟡]

4. Comentarios / Likes / Guardados
- Objetivo IG: engagement completo.
- Estado actual: likes, comentarios y guardados persistidos en DB.
- Gap: critico.
- Adaptacion detox: destacar aportes utiles, filtrar ruido toxico.
- Prioridad: P0.
- Estado de avance: [✅]

5. Explorar / Busqueda
- Objetivo IG: discovery por intereses y tendencias.
- Estado actual: busqueda real de usuarios/publicaciones y follow desde explorar.
- Gap: alto.
- Adaptacion detox: "explorar por objetivo" (sueno, foco, habitos, estudio).
- Prioridad: P1.
- Estado de avance: [✅]

6. DMs
- Objetivo IG: inbox, conversaciones, multimedia, requests.
- Estado actual: inbox + conversaciones + envio/lectura basica en Supabase.
- Gap: alto.
- Adaptacion detox: nudges de pausa, horarios de silencio, resumenes.
- Prioridad: P1.
- Estado de avance: [🟡]

7. Notificaciones
- Objetivo IG: actividad social y sistema.
- Estado actual: listado real + marcar leidas; generacion automatica pendiente.
- Gap: alto.
- Adaptacion detox: agrupadas, prioridad util, reduccion de ruido.
- Prioridad: P1.
- Estado de avance: [🟡]

8. Reels / video corto
- Objetivo IG: consumo vertical de video y recomendaciones.
- Estado actual: inexistente.
- Gap: alto.
- Adaptacion detox: timebox por sesion + pausas conscientes.
- Prioridad: P2.
- Estado de avance: [⬜]

9. Stories
- Objetivo IG: contenido efimero 24h + highlights.
- Estado actual: inexistente.
- Gap: alto.
- Adaptacion detox: prompts de intencion antes de publicar/consumir.
- Prioridad: P2.
- Estado de avance: [⬜]

10. Moderacion / seguridad
- Objetivo IG: reportes, bloqueos, controles.
- Estado actual: base hardening activa (CORS, helmet, rate-limit, healthcheck), capa producto pendiente.
- Gap: alto.
- Adaptacion detox: proteccion reforzada en acoso y contenido sensible.
- Prioridad: P0.
- Estado de avance: [🟡]

## Arquitectura objetivo (MVP productivo)

1. Frontend (Cloudflare Pages)
- React + Vite actual, diseno social completo mobile-first.
- Cliente API tipado, estados de carga/error consistentes.

2. Backend (Render)
- Express con dominios claros: auth, feed, social graph, messaging, notifications.
- Rate limit + CORS + helmet + healthcheck (ya iniciado).

3. Base de datos (Supabase Postgres)
- Unificar `shared/schema.ts` con `supabase-setup.sql` (single source of truth).
- Indices para feed, follows, posts, comments, notifications.

4. Media
- Storage de imagenes/videos (Supabase Storage o R2), CDN, thumbnails.

5. Tiempo real
- Realtime para DMs/notificaciones (Supabase Realtime o WS propio).

## Plan por fases (12 semanas)

Fase 0 (Semana 1): Fundaciones
- Alinear schemas (Drizzle <-> SQL).
- Auth real (Supabase Auth) y eliminacion de auth local.
- Observabilidad minima (logs estructurados + errores frontend).

Fase 1 (Semanas 2-4): Nucleo social P0
- Feed real + post create + likes/comments/saves.
- Perfil con grid y contadores.
- Follow/unfollow.
- Notificaciones basicas server-side.

Fase 2 (Semanas 5-6): Discovery y calidad UX
- Explorar/busqueda real.
- Pulido de interacciones tipo Instagram (skeletons, optimistic UI).
- Performance movil (LCP/CLS/INP) y virtualizacion feed.

Fase 3 (Semanas 7-8): Mensajeria P1
- Inbox, lista de chats, chat 1:1, estado leido.
- Requests y bloqueos.
- Notificaciones push in-app.

Fase 4 (Semanas 9-10): Capa Detox diferencial
- Limites por modulo (feed/reels/dm).
- Pausas conscientes configurables.
- Dashboard de bienestar (tiempo, streak, metas).
- Modo foco (bloqueos temporales por objetivo).

Fase 5 (Semanas 11-12): Go-live MVP
- QA E2E (flujos criticos).
- Seguridad y permisos.
- Migraciones y rollback plan.
- Deploy final + smoke tests productivos.

## Backlog tecnico prioritario inmediato (proximos 10 dias)

1. Reescribir `shared/schema.ts` para reflejar tablas reales. [✅]
2. Implementar API de posts (`GET /feed`, `POST /posts`, `POST /posts/:id/like`, comments). [ ]
3. Sustituir `localStorage` de create/messages/auth por llamadas API. [🟡 Parcial]
4. Implementar `feed` en `Home` (cards, acciones, paginacion cursor). [✅]
5. Implementar `Profile` real (usuario, posts, contadores). [✅]
6. Activar notificaciones basicas de interaccion. [🟡 Parcial]
7. Implementar `Search/Explore` real (usuarios + publicaciones + seguir). [✅]

Estado actual (actualizacion incremental 2026-02-25):
- [✅] Auth real con Supabase en frontend (sin `localAuth`).
- [✅] Feed social conectado a Supabase con likes y comentarios.
- [✅] Crear contenido conectado a Supabase (crear/editar/eliminar).
- [✅] Mensajes y notificaciones consumiendo tablas reales en Supabase.
- [✅] Bloque "Amigos en detox" sin hardcode (usa `follows + profiles`).
- [✅] `shared/schema.ts` alineado al esquema SQL principal.
- [✅] Follow/unfollow en UI implementado en Feed, Perfil y Explorar.
- [✅] Search/Explore funcional con busqueda real de usuarios/publicaciones.
- [✅] Guardados (`saved_posts`) implementados en Feed (guardar/quitar guardado).
- [✅] Feed con infinite scroll y paginacion incremental operativa.
- [✅] Paginacion de feed migrada a cursor puro keyset (`created_at + id`).
- [✅] Feed con skeletons reales y recuperacion robusta de cursor (anti-duplicados/anti-loop).
- [✅] Feed refactorizado con componente reutilizable de card (`FeedPostCard`) y variante media (foto/video) estilo Instagram.
- [✅] Card media pulida IG-like (header compacto, ratio 4:5, acciones inferiores, fecha relativa corta, video autoplay muted con toggle de audio).
- [✅] Carrusel multimedia en card media (`photo/video`) con flechas, indicador de posicion y dots (soporta `media_url` simple o lista serializada).
- [✅] `Create` actualizado para `photo/video` con carga multi-media (lista), edicion compatible y previsualizacion imagen/video.
- [✅] `Create` migrado a subida real desde dispositivo via Supabase Storage (bucket `post-media`) con soporte multi-archivo.
- [✅] `Create` extendido con menciones/tags, ubicacion y portada editable para video; feed consume `mentions`, `location_text` y `video_cover_url`.
- [✅] `Create` ajustado al alcance actual sin ubicacion (UI + DB), menciones con autocomplete real de `profiles` (seleccion cerrada) y editor de portada por frame de video (timeline + captura).
- [✅] Menciones IG: `@usuario` clickeable en feed/perfil con navegacion a perfil, y validacion backend (trigger DB) para evitar usernames inexistentes.
- [✅] Rediseño de `Profile` en layout IG (header, stats inline, acciones, tabs y grid 3 columnas) con metricas detox visibles.
- [✅] Pestañas `saved` y `tagged` funcionales con datos reales (sin mocks) en perfil.
- [✅] Grid de perfil con hover stats reales (likes/comentarios) y modal de post al click (navegacion prev/sig).
- [✅] Perfil escalable: lazy loading + paginacion incremental en grid (`posts/saved/tagged`) con autoload por scroll.
- [✅] Perfil: prefetch inteligente de siguiente pagina por tab para reducir latencia percibida de scroll.
- [✅] Perfil: cambio/eliminacion de avatar estilo IG (tooltip + modal), persistido en Supabase Storage y `profiles.avatar_url` con actualizacion optimista inmediata.
- [✅] Perfil: visor de seguidores/seguidos (modal), con lista real desde `follows + profiles`, busqueda y acciones inline de follow/unfollow/eliminar.
- [✅] Perfil: modal de post estilo IG con hilo de comentarios real, input para comentar y likes en vivo (sin bloque de estadisticas/promocion).
- [✅] Perfil: realtime enterprise en vivo para `posts`, `post_likes`, `post_comments` y `follows` (sin refresh manual).

## Criterio de "MVP listo"

1. Usuario puede registrarse/login real, publicar, seguir, likear, comentar y mensajear.
2. Feed y perfil persisten en backend, sin dependencias de `localStorage`.
3. UX movil fluida y consistente.
4. Mecanismos detox activos y medibles.
5. Seguridad basica + monitoreo + runbook operativo.

## Riesgos y mitigacion

1. Riesgo: scope excesivo por querer "identico" en todo.
- Mitigacion: paridad por fases (P0 -> P1 -> P2).

2. Riesgo: deuda por doble esquema SQL/Drizzle.
- Mitigacion: consolidar contrato de datos en una sola capa fuente.

3. Riesgo: tiempo real complejo en DMs.
- Mitigacion: iniciar con polling corto + migrar a realtime.

4. Riesgo: sobre-friccion detox y caida de retencion.
- Mitigacion: controles opt-in y A/B testing de nudges.

## Decision recomendada

Implementar primero "Instagram core" (Feed + Perfil + Crear + Interacciones + Follow) con persistencia real, y encima montar la capa detox como diferenciador de producto.
