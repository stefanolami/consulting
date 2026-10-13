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
| Time&Place Snapshot PDF | Footer `6393:44` ("Time&Place Snapshot / Download PDF"); Who We Are snapshot band `5550:192` | `src/components/shell/navigation.ts` (`SNAPSHOT_PDF_HREF`), used by the footer and `src/components/shell/snapshot-cta.tsx` | Link to `/downloads/time-and-place-snapshot.pdf`, which does not exist yet (404) | Add the file at `public/downloads/time-and-place-snapshot.pdf`, or decide that it becomes admin-managed (control tower §23, open decision 2). |
| Snapshot download icon ("Download me") | `6393:70` (desktop footer), `5651:763` (mobile footer), `5550:212` (Who We Are band, 133 px) | `src/components/shell/download-snapshot-link.tsx`, `src/components/shell/snapshot-cta.tsx` | Lucide `FileDown` in a white circle | White round icon with a document and download arrow. |
| Service line icons, 12 (`service-icon-<slug>`) | Service tiles `6393:13` … `6397:120` ("Sercices Icon-13 … 24") on `6393:6`; detail heroes, e.g. `5488:914` ("Sercices Icon-01", 613 px) on `5488:464` | CMS media: each service's `icon_media_id`, rendered by `src/components/catalogue/catalogue-tile.tsx` and the detail `PageHero` emblem | Dashed outline in the tile; labelled dashed square in the detail hero | Not code assets: upload through the admin media library and assign per service. One icon serves both the faint tile background (25 % opacity) and the large hero emblem, so white line art on transparent works best. None of the six seeded services has an icon, and the repository and legacy site have none. |
| Sector line icons, 20 (`sector-icon-<slug>`) | Sector tiles `5457:59` … `5457:78` ("Artboard N copy") on `5408:187`; detail heroes on `5408:267` … `5480:1294` | CMS media: each sector's `icon_media_id` (same callsites as services) | As for services | Upload through the admin. The legacy `public/sectors/*.png` icons (now used by five seeded sectors) are blue square tiles with a ringed white icon, a different drawing from the Figma line art: acceptable on tiles, boxy as the detail emblem. Legacy covers 14 of the 20 Figma sectors (energy as `environment-energy.png`, defence as `defense.png`); AI, Innovation, Machine Learning & 6G, Open Source, Quantum & Cybersecurity and Space have none. |
| Newsroom kind icons ("Newletter Icons-01 … -11") | `5534:220` (event), `5534:223` (article), `5534:225` (newsletter), `5534:227` / `5534:239` (video/podcast), `5534:228` (book), `5534:230` / `5534:237` (announcement) on `5408:334`; mobile `5651:90` adds a media/share icon | `src/components/newsroom/article-kind.tsx` (`KIND_ICONS`), used by the listing cards, the article header and the homepage newsroom slides (`src/components/home/home-newsroom.tsx`; Figma `5652:39` / `5652:53`, 71 px, white over the photograph on desktop) | Lucide `PenTool`, `Newspaper`, `Megaphone`, `CalendarDays`, `Video`, `BookOpen`, `Share2` (`data-placeholder-asset="newsroom-kind-icon-<kind>"`) | Solid navy/white pictograms, about 48–70 px. One per kind key; prefer single-colour SVG so they inherit the card colour (white on navy cards, navy on white). |
| Homepage newsroom arrows, previous and next (`home-newsroom-arrow-previous`, `home-newsroom-arrow-next`) | `5412:853` (desktop, 36 px, bottom right of the card) in `5408:616`; `5652:40` (mobile, 60 px, beside the card) in `5651:631` | `src/components/home/home-newsroom-carousel.tsx` | Lucide `ArrowLeft` / `ArrowRight` in 44 px white circles with a muted-blue border | Muted-blue (`#354b83`) circle outline with a solid arrow. Figma draws them on the photograph without a fill; supply a version that stays legible over photographs (for example with a white fill), preferably single-colour SVG. |
| Newsroom filter-bar icons: magnifying glass, calendar, categories | `5466:125`, `5466:126`, `5537:27` on `5408:334` | `src/components/newsroom/newsroom-toolbar.tsx` | Lucide `Search`, `CalendarDays`, `LayoutGrid` in the round navy buttons | White pictograms in 55 px navy circles. |
| Contact country icon buttons, 8 (`contact-country-icon-<code>`) | `5439:3` Austria, `5439:5` Belgium, `5439:7` Brazil, `5439:9` France, `5439:19` Germany, `5439:20` Ireland, `5439:21` Portugal, `5439:22` Romania ("Country Icon Button 0N.1 - …") on `5408:348`; `5651:525` … `5651:532` on mobile `5651:504` | `src/components/contact/office-network-explorer.tsx` (`CountryBadge`), on the country buttons and cards | Blue-muted disc with a dashed inner ring; the country name is drawn as text on the large buttons only | A navy disc with the country's silhouette and the name in white, 175 px. The name must stay real text (it names the button), so supply the disc and silhouette without lettering, one per country code, preferably SVG. Countries come from the CMS, so new office countries need an icon too; consider making it CMS media (for example the country's existing `outline_media_id`) instead of a code asset. |
| Contact world map (`contact-world-map`) | `5439:25` ("Country Icon Button 00 - World 1", 666 × 533) on `5408:348`; `5651:563` (faint background, 10 % opacity) on mobile `5651:504` | `src/components/contact/office-network-explorer.tsx` (`WorldMapPlaceholder`), desktop panel only | Dashed box with the asset name (aspect 666 / 533) | Navy outline world map on transparent. The legacy `old-consulting/public/contact/map.png` and `pin.png` (with hand-placed pin coordinates) are a different drawing; whether the map should mark the selected country is open decision 23.15. The mobile faint background map is not rendered. |
| Contact head office icons: address, email, phone | `5439:48` ("Mail-Icon-White-on-Grey", used for the address), `5439:54` ("Email-Icon-White-on-Grey"), `5439:58` ("phone-circle-fill") on `5408:348` | `src/components/contact/head-office.tsx` (`Detail`) | Lucide `MapPin`, `AtSign`, `Phone` in white circles (`data-placeholder-asset="contact-detail-icon"`) | White circular pictograms, about 71–86 px. The legacy `old-consulting/public/contact/contact-address.png`, `contact-email.png` and `contact-phone.png` are blue raster icons for a white background. |
| Pages-menu icons: who we are, our outreach, services, sectors, why us, publications, contact | `5774:334` / `5774:444` (mobile "DROP-DOWN MENU: pages") — layers `group`, `map`, `repairing-service`, `pie-chart`, `faq`, `assignment`, `phone-call` | `src/components/shell/mobile-menu.tsx` | Lucide `Users`, `Map`, `Cog`, `ChartPie`, `MessageCircleQuestion`, `FileText`, `Phone` | Navy solid icons. Figma shows no icon for Our outreach in one variant (`5774:334`) and a map icon in the other (`5774:444`). |

## Available and used

| Asset | Repository path | Source |
| --- | --- | --- |
| White Time&Place Consulting logo | `public/brand/logo-consulting-white.png` | `old-consulting/public/logos/consulting-white.png` (matches Figma `6393:25`) |
| Social icons: Facebook, Instagram, LinkedIn, X, YouTube | `public/brand/social/*.png` | `old-consulting/public/social-media/` (Figma shows the first three) |
| POE header graphic | `public/brand/poe-highlight.png` | `main:public/poe-highlight.png` (production header). The 1851 × 1390 original was resized to 400 × 300 with its transparency kept, and replaced the earlier CSS glow on 2026-10-13. Used on the desktop header only; the mobile menu shows POE as text (control tower §15.3). |

## Available in legacy, not yet used

These are candidates for later pages. Copy them only when a page uses them.

- Line illustrations (blue on an opaque white background):
  `hero-about-us.png` (hourglass), `hero-why-us.png` (certificate; not the
  Figma Why Us drawing), `hero.png`
  and `hero-mobile.png` (world map, white). None is needed for the page
  heroes any more (see Resolved).
- Legacy partner logos in `public/partners/` (20 files). They were the
  homepage logo band, which was removed from Home on 2026-10-13 (control
  tower §15.9). They are CMS content: upload them through the admin as
  partner logos only where an endorsement needs one.
- Legacy endorsement logos in `public/endorsements/` (EFFA, Casino
  International, Linkage, AIJN, Multiburo, Linkare, Federation of European
  Publishers, iEthanol). These are CMS content: upload them through the admin
  media library as partner logos when the endorsements are authored, rather
  than copying them into the repository.
- Legacy sector icons in `public/sectors/` not in the Figma set: digital,
  education, financial services, health, maritime, SMEs, social policy.
- Legacy contact assets in `public/contact/`: `map.png` and `map-line.png`
  (world maps), `pin.png`, and the blue `contact-address.png`,
  `contact-email.png`, `contact-phone.png` icons. Not used: they are
  different drawings from the Figma Contact assets above.

## Resolved

| Asset | Repository path | Resolved |
| --- | --- | --- |
| Page-hero line illustrations, 7: homepage doors, Who We Are team, services gears, sectors skyline, publications papers, Why Us laptop, Contact telephone | `public/hero/hero-homepage-doors.png`, `hero-who-we-are-team.png`, `hero-services-gears.png`, `hero-sectors-industry.png`, `hero-publications-papers.png`, `hero-why-us-laptop.png`, `hero-contact-telephone.png` | 2026-10-13. Supplied by the designer as 8000 × 4500 white-on-transparent PNGs; cropped to the drawing band (120 px margin) and scaled to 2880 px wide. Wired through `src/components/shell/hero-art.ts`. The derived `hero-services-white.png` was removed. |
