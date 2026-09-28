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
| Homepage hero line illustration — doors (`hero-homepage-doors`) | `5412:865` in desktop homepage `5408:616`; `5651:669` in mobile homepage `5651:631` | `src/app/[locale]/page.tsx` → `PageHero` | Dashed box with the asset name | White line art on transparent, full-bleed; about 1440 × 497 in Figma. Prefer SVG or a wide transparent PNG. The legacy world-map hero (`old-consulting/public/hero/hero.png`) is a different drawing. |
| Time&Place Snapshot PDF | Footer `6393:44` ("Time&Place Snapshot / Download PDF") | `src/components/shell/navigation.ts` (`SNAPSHOT_PDF_HREF`) | Link to `/downloads/time-and-place-snapshot.pdf`, which does not exist yet (404) | Add the file at `public/downloads/time-and-place-snapshot.pdf`, or decide that it becomes admin-managed (control tower §23, open decision 2). |
| Snapshot download icon ("Download me") | `6393:70` (desktop footer), `5651:763` (mobile footer) | `src/components/shell/download-snapshot-link.tsx` | Lucide `FileDown` in a white circle | White round icon with a document and download arrow. |
| Pages-menu icons: who we are, our outreach, services, sectors, why us, publications, contact | `5774:334` / `5774:444` (mobile "DROP-DOWN MENU: pages") — layers `group`, `map`, `repairing-service`, `pie-chart`, `faq`, `assignment`, `phone-call` | `src/components/shell/mobile-menu.tsx` | Lucide `Users`, `Map`, `Cog`, `ChartPie`, `MessageCircleQuestion`, `FileText`, `Phone` | Navy solid icons. Figma shows no icon for Our outreach in one variant (`5774:334`) and a map icon in the other (`5774:444`). |

## Available and used

| Asset | Repository path | Source |
| --- | --- | --- |
| White Time&Place Consulting logo | `public/brand/logo-consulting-white.png` | `old-consulting/public/logos/consulting-white.png` (matches Figma `6393:25`) |
| Social icons: Facebook, Instagram, LinkedIn, X, YouTube | `public/brand/social/*.png` | `old-consulting/public/social-media/` (Figma shows the first three) |

The POE glow is drawn in CSS (`src/components/shell/poe-link.tsx`) instead of
the `main` branch raster `public/poe-highlight.png`; pending review.

## Available in legacy, not yet used

These are candidates for later pages. Copy them only when a page uses them.

- Line illustrations (blue on transparent): `hero-services.png` (gears; Figma
  `6393:6` shows the same gears in white), `hero-about-us.png` (hourglass),
  `hero-why-us.png` (certificate), `hero.png` and `hero-mobile.png` (world map,
  white). Colour changes for white-on-navy heroes still need a decision.

## Resolved

None yet.
