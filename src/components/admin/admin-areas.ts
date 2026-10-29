import {
	BookOpenText,
	Globe2,
	HeartHandshake,
	ImageIcon,
	Layers3,
	LayoutDashboard,
	Route,
	Scale,
	Settings,
	UsersRound,
	type LucideIcon,
} from 'lucide-react'

import type { AppRole } from '@/lib/auth/authorization'

export type AdminArea = { label: string; href: string; icon: LucideIcon; description: string; adminOnly?: boolean }

/** The admin areas, in navigation order; the dashboard links to all but itself. */
export const ADMIN_AREAS: readonly AdminArea[] = [
	{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard, description: 'What needs attention and what changed recently.' },
	{ label: 'People', href: '/admin/people', icon: UsersRound, description: 'Team profiles, roles, portraits, order and translations.' },
	{ label: 'Catalogue', href: '/admin/catalogue', icon: Layers3, description: 'Services and sectors, their icons, contacts and translations.' },
	{ label: 'Newsroom', href: '/admin/newsroom', icon: BookOpenText, description: 'Articles, authors, tags, covers, dates and translations.' },
	{ label: 'Our Outreach', href: '/admin/outreach', icon: Globe2, description: 'Countries, coverage, regions, offices and country pages.' },
	{ label: 'Media', href: '/admin/media', icon: ImageIcon, description: 'The image library, alt text, replacing and removing files.' },
	{ label: 'Partners', href: '/admin/partners', icon: HeartHandshake, description: 'Partner and client logos, and endorsements.' },
	{ label: 'Legal pages', href: '/admin/legal', icon: Scale, description: 'Privacy policy, terms and conditions, cookie use.' },
	{ label: 'Site settings', href: '/admin/settings', icon: Settings, description: 'Contact details, social links, the POE link and calls to action.' },
	{ label: 'Redirects', href: '/admin/redirects', icon: Route, description: 'The registry of moved addresses (not applied to the site yet).', adminOnly: true },
]

/** The areas `role` sees: Redirects is for administrators only (editorial simplification §3.4), and its route checks it too. */
export function areasFor(role: AppRole) {
	return ADMIN_AREAS.filter((area) => !area.adminOnly || role === 'admin')
}
