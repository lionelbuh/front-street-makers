# Architecture: the illustrated street

An illustrated Old Town Temecula street, set up as a European-style artisan market, that visitors explore sideways. All stalls are clearly labeled demo content.

Files live in `src/assets/js/market/` (street, stalls, crowd, sponsors) and `src/assets/js/app/` (data, pages, rotation). Build with `npm run build`.

## Layers (back to front)

| Layer | File | Notes |
|---|---|---|
| Sky | `styles.css` (`.track` gradient) | Theme tokens: daytime in light mode, dusk in dark mode |
| Mountains, clouds, balloons | `js/street-scene.js` → `renderMountains` | Parallax at 0.72× |
| Vineyard hills and oaks | `renderHills` | Parallax at 0.45× |
| Architecture | `renderStreet` | Gateway perspective view, then the storefront elevation |
| Evening tint and lights | `renderStreet` (collected `LIGHTS`) | Visible only in dark mode |
| Arch foreground | `renderStreet` → `#layer-foreground` | Stays above the evening lights |
| **Stalls** | `js/stall.js` → `renderStall(business)` | One `<button>` per business, placed on a slot |
| Paper grain | `marketplace.js` | Tiny generated texture |

## Street and stalls are separate

- `entrance.js` draws the first view: the Temecula arch, centred, with a 3D lane of today's chalets. "Walk in" (or a click anywhere behind the arch) zooms through the arch and reveals the market square. Its unchanging background is a picture made with `node tools/render-entrance.mjs`; rerun it after changing the architecture.
- `street-scene.js` draws the market square and publishes `TH.STREET.slots`: 14 chalet positions in two staggered rows of seven. It never reads business data.
- `stall.js` draws each business as a chalet (`TH.renderChalet`): name board, goods in the window, the type on the counter and a hanging sign with the type's pictogram.
- `stall.js` draws a stall from one business record: awning or gable roof, stripe colors, signboard, illustrated goods, category tag and DEMO chip. It never reads the street.
- `marketplace.js` assigns today's businesses to slots in order. Unused slots show an "open stall". In Phase 2 the ordered list comes from the daily featured rotation.

Adding, removing, reordering or editing a business changes data only. The illustration is untouched.

## Business record (contract for Phase 2)

```js
{ id, name, category: 'home' | 'micro', type, display, roof: 'awning' | 'gable',
  colors: [stripeA, stripeB, cloth], chalk, summary, description, area,
  links: { website, instagram, facebook, email } }
```

`display` selects the illustrated goods (bakery, candles, jewelry, honey, ceramics, soap, plants, leather, textiles, art). Real product photos belong in the profile, never on the illustration.

## Interaction

- Desktop: mouse wheel scrolls sideways (the page scrolls normally once you reach either end), click-and-drag pans, ←/→ step buttons, a clickable street map and a "Now passing" label.
- Keyboard: the street is a focusable region. Arrow keys jump between stalls, Home and End go to either end, Tab reaches every stall, and focusing a stall scrolls it into view.
- Touch: native horizontal scrolling with momentum. Phones open with the arch centered.
- List alternative: "Prefer a list?" opens the same profiles without using the street.
- Reduced motion: no parallax, no smooth scrolling and no hover animation.

## Phase 2 additions

- `street.js` exposes `TH.mountStreet({ businesses, plan, onOpen, onOpenFree })`, and `crowd.js` exposes `TH.mountCrowd({ occupiedSlots })`. Pages pass in today's featured businesses.
- `rotation.js` chooses today's businesses (`featuredForDate`) and where they stand (`streetPlan`). The API worker uses the same file, so the website and the API always agree.
- `api.js` talks to the worker, or to a demo database in the browser when `config.js` has no `API_BASE`.
