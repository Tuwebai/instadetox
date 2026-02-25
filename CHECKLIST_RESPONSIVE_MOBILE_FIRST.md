# CHECKLIST_RESPONSIVE_MOBILE_FIRST.md

Fecha: 2026-02-25
Scope: App client (mobile-first), breakpoints 320 / 375 / 768 / 1024 / 1440.

## Criterios de cierre
- [x] Sin overflow horizontal en layout principal.
- [x] Navegacion usable en mobile/tablet/desktop.
- [x] Sidebar desktop solo en escritorio (lg+).
- [x] Home mantiene RightPanel solo en Home.
- [x] Pags internas sin RightPanel (layout unico y centrado).
- [x] Typecheck client+server en verde.

## Cambios aplicados
- [x] `Sidebar` pasa de `md` a `lg` para evitar compresion en tablet.
- [x] `MobileNav` visible hasta `< lg` (mobile + tablet).
- [x] `App` ajusta paddings por breakpoint (`px-3 sm:px-4 md:px-6 lg:px-8`, `pt-16 lg:pt-0`).
- [x] `Footer` responsive con wrap de links y offset solo en `lg`.
- [x] `Home` con `max-w-7xl`, gap entre columnas y acciones de post con `flex-wrap`.
- [x] Fecha del post pasa a linea propia en mobile (`w-full`) y vuelve inline desde `sm`.
- [x] `RightPanel` removido de Search/Profile/Messages/Create/Notifications/More.
- [x] Pags internas con contenedor `max-w-5xl mx-auto`.

## Checklist cerrada por pantalla

### Home
- [x] 320: feed legible, acciones wrap, sin overflow.
- [x] 375: feed + comentarios + acciones estables.
- [x] 768: nav movil/tablet activa, layout en 2 columnas usable.
- [x] 1024: layout amplio con panel lateral correcto.
- [x] 1440: layout centrado y escalado sin estirar contenido.

### Search
- [x] 320/375: input + tabs + cards sin desborde.
- [x] 768/1024/1440: contenedor centrado y lectura estable.

### Profile
- [x] 320/375: header, stats y grid sin overflow.
- [x] 768/1024/1440: composicion centrada y consistente.

### Messages
- [x] 320/375: lista + chat en bloque unico sin panel lateral.
- [x] 768/1024/1440: split interno estable, sin desborde horizontal.

### Create
- [x] 320/375: formulario y selector de imagen en una columna usable.
- [x] 768/1024/1440: layout centrado, botones y previsualizaciones correctas.

### Notifications
- [x] 320/375: tarjetas y timestamps legibles.
- [x] 768/1024/1440: lista estable y escalable.

### More
- [x] 320/375: cards informativas apiladas correctamente.
- [x] 768/1024/1440: grillas adaptativas y centradas.

### Login
- [x] 320/375: formulario completo visible y accionable.
- [x] 768/1024/1440: card centrada con ancho controlado.

## Validacion tecnica
- [x] `npm run check` OK (client + server).
