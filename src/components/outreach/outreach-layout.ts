// Layout shared by the Our Outreach overview, its map and its skeleton
// (Figma 5741:2 … 5741:156; control tower §15.12). No 'use client': the
// server page and the client explorer both import it.

export const TOPOLOGY_URL = '/data/world-countries-110m.topo.json'

/** From this width the column, map and floating panel sit side by side. */
export const DESKTOP_QUERY = '(min-width: 64rem)'

// One band below the header. Below `lg` the parts stack (title, map, summary,
// regions); from `lg` the blue column holds the title and regions, the map
// fills the rest of the band to the viewport edge, and the summary floats over
// the map's right side. The column lines up with the header's 90rem container.
export const BAND_CLASS = [
	'grid grid-cols-1 [grid-template-areas:"title"_"map"_"panel"_"nav"]',
	'lg:h-[max(36rem,var(--page-hero-height))] lg:grid-cols-[17rem_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:[grid-template-areas:"title_map"_"nav_map"]',
	'lg:pl-[max(var(--spacing-gutter),calc((100%-90rem)/2+var(--spacing-gutter)))]',
].join(' ')

export const TITLE_AREA_CLASS = '[grid-area:title] bg-tp-blue px-gutter pt-8 pb-4 text-on-brand lg:px-8 lg:pt-10'
export const NAV_AREA_CLASS = '[grid-area:nav] min-h-0 bg-tp-blue px-gutter pt-6 pb-10 text-on-brand lg:overflow-y-auto lg:px-8 lg:pt-0 lg:[scrollbar-color:var(--color-on-brand)_transparent] lg:[scrollbar-width:thin]'
export const MAP_AREA_CLASS = 'relative [grid-area:map] aspect-[16/10] min-w-0 overflow-hidden bg-white lg:aspect-auto lg:h-full'
export const PANEL_AREA_CLASS = [
	'[grid-area:panel] bg-tp-blue px-gutter py-8 text-on-brand',
	'lg:z-10 lg:[grid-area:map] lg:mt-14 lg:mr-4 lg:max-h-[calc(100%-7rem)] lg:w-[clamp(18rem,26vw,24rem)] lg:self-start lg:justify-self-end lg:overflow-y-auto lg:px-5 lg:py-5 lg:shadow-[0_1px_4px_rgba(12,12,13,0.1),0_1px_4px_rgba(12,12,13,0.05)]',
].join(' ')

// The page title is visible above the stacked map below `lg` and kept for
// assistive technology only in the desktop column (product owner, 2026-10-16).
export const TITLE_CLASS = 'font-display text-heading-2 font-bold wrap-anywhere lg:sr-only'
export const INSTRUCTIONS_CLASS = 'mt-2 font-label text-label lg:mt-0'
export const REGION_LINK_CLASS = 'font-label text-[1.25rem] leading-tight font-bold'

const REM = 16

/** Height (px) kept clear of map frames at the bottom for the legend. */
export const LEGEND_RESERVE = 44

// The strip the floating panel covers (its width, 1rem to the edge and 1rem of
// air), which region frames keep free so a selected country is never under it.
export function panelInset(viewportWidth: number) {
	return Math.min(Math.max(18 * REM, 0.26 * viewportWidth), 24 * REM) + 2 * REM
}
