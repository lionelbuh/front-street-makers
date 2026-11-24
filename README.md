# Front Street Makers

Small businesses. Big dreams. Local roots.

An independent, free local marketplace for home-based businesses and independent micro-businesses in Temecula, Murrieta and nearby communities. It is built around an illustrated Old Town Temecula street where each stall is a local business.

## What's inside

| Page | Purpose |
|---|---|
| Home | Today's stalls on the illustrated street, with how it works |
| Marketplace | The street plus the searchable directory (category, what they offer, city) |
| Business pages | Shareable profile for each approved business |
| Get Listed | Free application: categories, licensing-status questions, photos |
| Community | Entrepreneur stories (moderated), local initiatives, practical ideas |
| Startup Corner | Sourced guidance: city licenses, home occupation, Cottage Food, seller's permit and more |
| Admin | Review applications, private notes, publish, stall look, photos, daily rotation, stories |

- **Data:** a Cloudflare Worker with a D1 database and R2 photo storage (`worker/`). Only approved businesses are public, and contact details, licensing answers and notes never leave the admin.
- **Fair visibility:** a shared, tested rotation module (`src/assets/js/app/rotation.js`). Pins come first, new businesses get a boost, and everyone else takes turns with no repeats within a cycle.

## Commands

```bash
npm run serve      # build and preview at http://localhost:4173 (demo mode)
npm test           # unit + API tests
npm run test:e2e   # browser test of every page and the apply → approve flow
```

## Going live

See **[docs/SETUP.md](docs/SETUP.md)**: GitHub Pages for the site, Cloudflare for the API, about 30 minutes in total. Until then, the site runs in demo mode.

The street, stalls and crowd are explained in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
