# Temecula Homegrown: Phase 1 visual prototype

An illustrated Old Town Temecula street, set up as a European-style artisan market, that visitors explore sideways. All stalls are clearly labeled demo content.

Open `index.html` in a browser, or share `dist/preview.html` (one self-contained file). After editing anything, run `node build.mjs` to regenerate both.

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

- `street-scene.js` draws the architecture and publishes `TH.STREET.slots`: 12 positions along the street. It never reads business data.
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
