'use client'

import { ChartPie, Cog, FileText, Map as MapIcon, MessageCircleQuestion, Phone, Users, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

import { NavLink } from './nav-link'
import { PRIMARY_NAV, type NavKey } from './navigation'
import { PoeLink } from './poe-link'

// PLACEHOLDER icons: the Figma pages menu uses raster icons that are not in
// the repository yet (see docs/figma-asset-needs.md).
const ICONS: Record<NavKey, LucideIcon> = {
	whoWeAre: Users,
	ourOutreach: MapIcon,
	services: Cog,
	sectors: ChartPie,
	whyUs: MessageCircleQuestion,
	publications: FileText,
	contact: Phone,
}

type MobileMenuProps = {
	poeUrl: string | null
}

// Disclosure navigation: a toggle button controls the "pages" panel from the
// Figma mobile header. Escape and outside clicks close it; focus returns to
// the toggle after Escape.
export function MobileMenu({ poeUrl }: MobileMenuProps) {
	const t = useTranslations('Shell')
	const [open, setOpen] = useState(false)
	const panelId = useId()
	const rootRef = useRef<HTMLDivElement>(null)
	const buttonRef = useRef<HTMLButtonElement>(null)

	useEffect(() => {
		if (!open) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return
			setOpen(false)
			buttonRef.current?.focus()
		}
		const onPointerDown = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
		}
		document.addEventListener('keydown', onKeyDown)
		document.addEventListener('pointerdown', onPointerDown)
		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.removeEventListener('pointerdown', onPointerDown)
		}
	}, [open])

	const bar = 'absolute left-1/2 h-[0.1875rem] w-7 -translate-x-1/2 rounded-full bg-action transition-transform duration-300 motion-reduce:transition-none'

	return (
		<div className="relative" ref={rootRef}>
			<button
				aria-controls={panelId}
				aria-expanded={open}
				aria-label={open ? t('menu.close') : t('menu.open')}
				className="relative size-11 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-on-dark"
				onClick={() => setOpen((value) => !value)}
				ref={buttonRef}
				type="button"
			>
				<span aria-hidden="true" className={cn(bar, 'top-[30%]', open && 'top-1/2 -translate-y-1/2 rotate-45')} />
				<span aria-hidden="true" className={cn(bar, 'top-1/2 -translate-y-1/2', open && 'scale-x-0')} />
				<span aria-hidden="true" className={cn(bar, 'top-[70%] -translate-y-full', open && 'top-1/2 -translate-y-1/2 -rotate-45')} />
			</button>
			<nav
				aria-label={t('menu.label')}
				className={cn(
					'absolute right-0 top-full mt-3 w-[min(19rem,calc(100vw_-_2*var(--spacing-gutter)))] rounded-panel bg-surface-tint px-6 py-7 text-brand shadow-2xl',
					!open && 'hidden',
				)}
				id={panelId}
			>
				<ul className="flex flex-col gap-5">
					{PRIMARY_NAV.map((item) => {
						const Icon = ICONS[item.key]
						return (
							<li key={item.key}>
								<NavLink
									className="flex items-center gap-4 rounded-control font-serif text-body-lg font-bold uppercase underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
									currentClassName="underline decoration-2"
									href={item.href}
									matchNested={item.matchNested}
									onClick={() => setOpen(false)}
								>
									<Icon aria-hidden="true" className="size-8 shrink-0" strokeWidth={1.75} />
									{t(`nav.${item.key}`)}
								</NavLink>
							</li>
						)
					})}
				</ul>
				{poeUrl ? (
					<div className="mt-6 border-t border-brand/20 pt-5">
						<PoeLink className="rounded-control bg-brand px-6 py-2 text-heading-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus" externalHint={t('nav.externalHint')} href={poeUrl} label={t('nav.poe')} />
					</div>
				) : null}
			</nav>
		</div>
	)
}
