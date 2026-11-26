# SEO: how Front Street Makers gets found

## Built into the site

- **One real page per business** at `frontstreetmakers.com/business/<name>/`. The build creates them from the approved businesses, every night and on every change. Each page has:
  - a title like “Valley Sourdough · Home bakery in Temecula, CA”
  - a description, a share image (the business's first photo) and its canonical address
  - structured data (`LocalBusiness`, with its area and links)
- **Pre-rendered directory**: the Marketplace page contains every business as plain links, so search engines see them without running scripts. It also carries an `ItemList` of all businesses.
- **Sitemap** at `/sitemap.xml`, rebuilt nightly, with every page and business. `robots.txt` points to it and keeps `/admin/` out.
- **Titles and descriptions** use what people actually search for: Temecula, Murrieta, home bakery, Cottage Food, local makers, business license.
- **Structured data on the home page**: `WebSite` with site search, and `Organization` serving Temecula and Murrieta.
- **Share previews**: a 1200×630 image (`/og-image.jpg`) and Open Graph and Twitter tags on every page.
- **Startup Corner** is long, sourced, local content. It is the kind of page that ranks for “cottage food Riverside County” or “Temecula business license home occupation”.

## Your part (once, about 30 minutes)

### 1. Google Search Console — most important

1. Go to <https://search.google.com/search-console> and click **Add property**, then choose **Domain** and enter `frontstreetmakers.com`.
2. Google shows a **TXT record**. In Spaceship → your domain → **DNS**, add it:
   - **Type**: TXT
   - **Host**: `@`
   - **Value**: the `google-site-verification=…` text Google gave you
3. Back in Search Console, click **Verify**. DNS can take a few minutes.
4. In the left menu, open **Sitemaps**, enter `sitemap.xml` and click **Submit**.
5. Optional, to speed things up: use **URL inspection**, paste `https://frontstreetmakers.com/`, then click **Request indexing**. Do the same for `/marketplace/` and `/startup-corner/`.

### 2. Bing Webmaster Tools (5 minutes, also covers DuckDuckGo and Yahoo)

Go to <https://www.bing.com/webmasters>, sign in, and choose **Import from Google Search Console**. That's it.

### 3. Instagram and Facebook

- Put `https://frontstreetmakers.com` in the bio and use the round emblem (`brand/front-street-makers-emblem-1080.png`) as the profile picture.
- Use “Front Street Makers · Temecula” as the display name.

## What brings real visitors (ongoing)

Links from local websites matter more than anything else. In rough order of value:

1. **Local press**: Valley News (myvalleynews.com) and Temecula Valley Spotlight. A short story such as “Temecula home-business owner launches free illustrated market for local makers” earns a link.
2. **Business support**: the Inland Empire SBDC / Entrepreneurial Resource Center in Temecula, SCORE Inland Empire, and the Temecula Valley and Murrieta chambers of commerce. Ask to be listed as a free resource for small businesses.
3. **Your makers**: invite each listed business to link to its own page (“Find us on Front Street Makers”) from its Instagram bio, website or Linktree.
4. **Community groups**: local Facebook groups for Temecula and Murrieta moms, small businesses and foodies, plus Nextdoor. Share new makers, not ads.
5. **Farmers market vendors**: a small card with a QR code to `/get-listed/`.

## A rhythm that helps

- **Every week**: approve new businesses quickly. Each one is a new page Google can find.
- **Every month**:
  - publish one Community story
  - check Search Console for the searches that bring people, and the pages with errors
  - review Startup Corner fees and links
- **Every quarter**: write one new Startup Corner guide on a question makers ask, for example “How to sell at the Temecula farmers market” or “Cottage Food Class A vs Class B in Riverside County”.

## Not applicable

A **Google Business Profile** requires a place where customers are served in person. An online directory isn't eligible, so don't create one for the site itself. Each maker can have their own profile.
