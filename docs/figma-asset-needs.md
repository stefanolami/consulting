# Figma asset needs

Status: open log, started 2026-09-28 (Phase 6)

Working rule: Figma assets are **not exported** from the working file. The
frontend uses brand assets that already exist in the repository or the legacy
site. Where the design needs an asset we do not have, the code renders a
visible placeholder and the asset is listed here so it can be looked up in the
shared drive. Every handoff states which placeholders were added.

When an asset is supplied, add it under `public/brand/`, replace the
placeholder at the listed callsite, and move its row to "Resolved".

## Open

| Asset (placeholder name) | Where in Figma | Used by | Placeholder now | Notes |
| --- | --- | --- | --- | --- |
| Homepage hero line illustration — doors (`hero-homepage-doors`) | `5412:865` in desktop homepage `5408:616`; `5651:669` in mobile homepage `5651:631` | `src/components/home/home-page.tsx` → `PageHero` | Dashed box with the asset name | White line art on transparent, full-bleed; about 1440 × 497 in Figma. Prefer SVG or a wide transparent PNG. The legacy world-map hero (`old-consulting/public/hero/hero.png`) is a different drawing. |
| Who We Are hero line illustration — the team (`hero-who-we-are-team`) | `5416:1026` in desktop Who We Are `5408:15` (mobile `5651:258` shows no illustration) | `src/app/[locale]/who-we-are/page.tsx` → `PageHero` | Dashed box with the asset name | White continuous-line drawing of people around a table on transparent, full-bleed; about 1440 × 397 in Figma. `hero-about-us.png` (hourglass) is a different drawing. |
| Time&Place Snapshot PDF | Footer `6393:44` ("Time&Place Snapshot / Download PDF"); Who We Are snapshot band `5550:192` | `src/components/shell/navigation.ts` (`SNAPSHOT_PDF_HREF`), used by the footer and `src/components/shell/snapshot-cta.tsx` | Link to `/downloads/time-and-place-snapshot.pdf`, which does not exist yet (404) | Add the file at `public/downloads/time-and-place-snapshot.pdf`, or decide that it becomes admin-managed (control tower §23, open decision 2). |
| Snapshot download icon ("Download me") | `6393:70` (desktop footer), `5651:763` (mobile footer), `5550:212` (Who We Are band, 133 px) | `src/components/shell/download-snapshot-link.tsx`, `src/components/shell/snapshot-cta.tsx` | Lucide `FileDown` in a white circle | White round icon with a document and download arrow. |
| Sectors hero line illustration — industrial skyline (`hero-sectors-industry`) | `5458:157` ("Artboard 20 copy 3") in desktop Sectors `5408:187`; mobile `5651:406` | `src/components/catalogue/catalogue-pages.tsx` → `PageHero` | Dashed box with the asset name (aspect 1440 / 480) | White continuous-line drawing of a factory/refinery skyline on transparent, full-bleed; about 1440 × 810 in Figma including overlap with the heading. |
| Service line icons, 12 (`service-icon-<slug>`) | Service tiles `6393:13` … `6397:120` ("Sercices Icon-13 … 24") on `6393:6`; detail heroes, e.g. `5488:914` ("Sercices Icon-01", 613 px) on `5488:464` | CMS media: each service's `icon_media_id`, rendered by `src/components/catalogue/catalogue-tile.tsx` and the detail `PageHero` emblem | Dashed outline in the tile; labelled dashed square in the detail hero | Not code assets: upload through the admin media library and assign per service. One icon serves both the faint tile background (25 % opacity) and the large hero emblem, so white line art on transparent works best. None of the six seeded services has an icon, and the repository and legacy site have none. |
| Sector line icons, 20 (`sector-icon-<slug>`) | Sector tiles `5457:59` … `5457:78` ("Artboard N copy") on `5408:187`; detail heroes on `5408:267` … `5480:1294` | CMS media: each sector's `icon_media_id` (same callsites as services) | As for services | Upload through the admin. The legacy `public/sectors/*.png` icons (now used by five seeded sectors) are blue square tiles with a ringed white icon, a different drawing from the Figma line art: acceptable on tiles, boxy as the detail emblem. Legacy covers 14 of the 20 Figma sectors (energy as `environment-energy.png`, defence as `defense.png`); AI, Innovation, Machine Learning & 6G, Open Source, Quantum & Cybersecurity and Space have none. |
| Publications hero line illustration — stacked papers (`hero-publications-papers`) | `5417:1166` ("T&P Consulting - Hero (Publications) 1") in desktop Publications `5408:334`; mobile `5651:90` | `src/components/newsroom/newsroom-pages.tsx` → `PageHero` | Dashed box with the asset name (aspect 1440 / 480) | White continuous-line drawing of a stack of papers/newsletters on transparent, full-bleed; about 1440 × 812 in Figma including the heading area. The legacy site has no newsroom hero. |
| Newsroom kind icons ("Newletter Icons-01 … -11") | `5534:220` (event), `5534:223` (article), `5534:225` (newsletter), `5534:227` / `5534:239` (video/podcast), `5534:228` (book), `5534:230` / `5534:237` (announcement) on `5408:334`; mobile `5651:90` adds a media/share icon | `src/components/newsroom/article-kind.tsx` (`KIND_ICONS`), used by the listing cards and the article header | Lucide `PenTool`, `Newspaper`, `Megaphone`, `CalendarDays`, `Video`, `BookOpen`, `Share2` (`data-placeholder-asset="newsroom-kind-icon-<kind>"`) | Solid navy/white pictograms, about 48–70 px. One per kind key; prefer single-colour SVG so they inherit the card colour (white on navy cards, navy on white). |
| Newsroom filter-bar icons: magnifying glass, calendar, categories | `5466:125`, `5466:126`, `5537:27` on `5408:334` | `src/components/newsroom/newsroom-toolbar.tsx` | Lucide `Search`, `CalendarDays`, `LayoutGrid` in the round navy buttons | White pictograms in 55 px navy circles. |
| Homepage partner and client logos, 21 (CMS partners) | `5527:46` ("T&P Consulting - Hero - Homepage Sponsors 1") in desktop homepage `5408:616`; `5651:680` in mobile `5651:631` | CMS partners, rendered by `src/components/partners/partners-section.tsx` | No placeholder: the band shows the partners published in the locale and is omitted when there are none (today only EFFA, in English) | Not code assets, and not exported from the flat Figma image: author each partner in the admin with its logo (public media with localized alt text), website and a published translation per locale. The 20 legacy logos in `old-consulting/public/partners/` (listed in `old-consulting/src/data/data.js`) cover most of the Figma band; compare them with the Figma image before uploading. Prefer transparent PNG or SVG, because logos sit directly on the grey band. |
| Why Us hero line illustration — laptop, notebook and coffee cup (`hero-why-us-laptop`) | `5459:208` ("Artboard 20 copy 5 1") in desktop Why Us `5408:311`; `5651:459` in mobile `5651:450` | `src/components/why-us/why-us-page.tsx` → `PageHero` | Dashed box with the asset name (aspect 1440 / 480) | White continuous-line drawing on transparent, full-bleed; about 1440 × 811 in Figma including the heading area. The legacy `hero-why-us.png` (certificate, blue on white) is a different drawing. |
| Pages-menu icons: who we are, our outreach, services, sectors, why us, publications, contact | `5774:334` / `5774:444` (mobile "DROP-DOWN MENU: pages") — layers `group`, `map`, `repairing-service`, `pie-chart`, `faq`, `assignment`, `phone-call` | `src/components/shell/mobile-menu.tsx` | Lucide `Users`, `Map`, `Cog`, `ChartPie`, `MessageCircleQuestion`, `FileText`, `Phone` | Navy solid icons. Figma shows no icon for Our outreach in one variant (`5774:334`) and a map icon in the other (`5774:444`). |

## Available and used

| Asset | Repository path | Source |
| --- | --- | --- |
| White Time&Place Consulting logo | `public/brand/logo-consulting-white.png` | `old-consulting/public/logos/consulting-white.png` (matches Figma `6393:25`) |
| Social icons: Facebook, Instagram, LinkedIn, X, YouTube | `public/brand/social/*.png` | `old-consulting/public/social-media/` (Figma shows the first three) |
| Services hero line illustration — gears (white) | `public/hero/hero-services-white.png` | Derived once from the legacy blue-on-white `public/hero/hero-services.png` (alpha from line darkness, colour white), matching the white gears in Figma `6393:22`. Replace with a native white-on-transparent export from the shared drive if one exists. |

The POE glow is drawn in CSS (`src/components/shell/poe-link.tsx`) instead of
the `main` branch raster `public/poe-highlight.png`; pending review.

## Available in legacy, not yet used

These are candidates for later pages. Copy them only when a page uses them.

- Line illustrations (blue on an opaque white background):
  `hero-about-us.png` (hourglass), `hero-why-us.png` (certificate; not the
  Figma Why Us drawing), `hero.png`
  and `hero-mobile.png` (world map, white). `hero-services.png` is the source of
  the white services hero above; the same derivation works for the others if
  a white-on-navy version is needed.
- Legacy partner logos in `public/partners/` (20 files, the homepage logo
  band; CMS content, see the open row above).
- Legacy endorsement logos in `public/endorsements/` (EFFA, Casino
  International, Linkage, AIJN, Multiburo, Linkare, Federation of European
  Publishers, iEthanol). These are CMS content: upload them through the admin
  media library as partner logos when the endorsements are authored, rather
  than copying them into the repository.
- Legacy sector icons in `public/sectors/` not in the Figma set: digital,
  education, financial services, health, maritime, SMEs, social policy.

## Resolved

None yet.
