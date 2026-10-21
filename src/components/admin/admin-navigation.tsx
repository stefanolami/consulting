'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ADMIN_AREAS } from '@/components/admin/admin-areas'
import { cn } from '@/lib/utils'

/**
 * The area a path belongs to (audit NAV-01): the dashboard only for
 * `/admin` itself, every other area for its own path and everything below
 * it, so an editor page marks its section.
 */
function activeHref(pathname: string) {
	const path = pathname.replace(/\/+$/, '') || '/'
	if (path === '/admin') return '/admin'
	return ADMIN_AREAS.find((area) => area.href !== '/admin' && (path === area.href || path.startsWith(`${area.href}/`)))?.href ?? null
}

/**
 * The admin navigation. Exactly one link carries `aria-current="page"`, the
 * one for the current section, and it is drawn filled (white on the navy
 * sidebar, navy in the compact bar) so it reads as active without colour
 * alone.
 */
export function AdminNavigation({ compact = false }: { compact?: boolean }) {
	const active = activeHref(usePathname() ?? '')

	return (
		<nav aria-label="Admin navigation" className={compact ? 'flex min-w-max gap-2' : 'flex flex-col gap-0.5'}>
			{ADMIN_AREAS.map((item) => {
				const Icon = item.icon
				const current = item.href === active
				return (
					<Link
						aria-current={current ? 'page' : undefined}
						className={cn(
							'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
							compact
								? current
									? 'border border-[#27335a] bg-[#27335a] text-white'
									: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
								: current
									? 'bg-white font-semibold text-[#27335a] shadow-sm'
									: 'text-blue-100/85 hover:bg-white/10 hover:text-white',
						)}
						href={item.href}
						key={item.href}
					>
						<Icon aria-hidden="true" className="size-4 shrink-0" />
						{item.label}
					</Link>
				)
			})}
		</nav>
	)
}
