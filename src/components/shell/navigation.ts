// Page composition stays in code (control tower §3.2). Order and labels follow
// the Figma header in the revised Services frame (6393:6); POE is rendered
// separately because its URL comes from the public site settings.

export type NavKey = 'whoWeAre' | 'ourOutreach' | 'services' | 'sectors' | 'whyUs' | 'publications' | 'contact'

export type NavItem = {
	key: NavKey
	href: string
	/** Whether nested paths (detail pages) mark the item as current. */
	matchNested: boolean
}

// Who we are keeps the legacy `/who-we-are` path (team profiles are linked from
// printed QR codes). Contact is the legacy `/contact` path (control tower §15.10).
export const PRIMARY_NAV: readonly NavItem[] = [
	{ key: 'whoWeAre', href: '/who-we-are', matchNested: true },
	{ key: 'ourOutreach', href: '/our-outreach', matchNested: true },
	{ key: 'services', href: '/services', matchNested: true },
	{ key: 'sectors', href: '/sectors', matchNested: true },
	{ key: 'whyUs', href: '/why-us', matchNested: false },
	{ key: 'publications', href: '/newsroom', matchNested: true },
	{ key: 'contact', href: '/contact', matchNested: false },
]

export type LegalKey = 'cookieUse' | 'privacyPolicy' | 'termsAndConditions'

// Legacy legal paths, served by the admin-managed legal pages (platform doc
// §11). The links are static: a locale without a published translation shows
// a notice that links to English, so no publication read is needed here.
export const LEGAL_NAV: readonly { key: LegalKey; href: string }[] = [
	{ key: 'cookieUse', href: '/cookie-use' },
	{ key: 'privacyPolicy', href: '/privacy-policy' },
	{ key: 'termsAndConditions', href: '/terms-and-conditions' },
]

// PLACEHOLDER: the Snapshot PDF is not in the repository yet (see
// docs/figma-asset-needs.md). The link targets its intended static path.
export const SNAPSHOT_PDF_HREF = '/downloads/time-and-place-snapshot.pdf'

export function isCurrentPath(pathname: string, item: Pick<NavItem, 'href' | 'matchNested'>) {
	if (pathname === item.href) return true
	return item.matchNested && pathname.startsWith(`${item.href}/`)
}
