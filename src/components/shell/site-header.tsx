import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { AudienceSwitch } from '@/components/audience/audience-switch'
import { Link } from '@/i18n/navigation'
import type { AppLocale } from '@/i18n/routing'
import { getPublishedGlobalContent } from '@/lib/public-global-content'
import { cn } from '@/lib/utils'

import { HeaderFrame } from './header-frame'
import { LocaleSwitcher } from './locale-switcher'
import { MobileMenu } from './mobile-menu'
import { NavLink } from './nav-link'
import { PRIMARY_NAV } from './navigation'
import { PoeLink } from './poe-link'

// Legacy desktop link treatment: full-height links, brand-blue hover, and a
// white bar under the current page. Labels are lighter than text-label so the
// row keeps room for the audience button and globe (control tower §15.3):
// 12px with 14px between labels up to 90rem, where the row reaches its full
// width, then 13px with 24px between labels.
const desktopLink = [
	'relative flex items-center px-1.75 min-[90rem]:px-3 font-serif text-[0.75rem] min-[90rem]:text-[0.8125rem] font-medium uppercase whitespace-nowrap',
	'transition-[background-color,box-shadow,scale] duration-200 hover:z-10 hover:bg-brand-strong hover:shadow-xl motion-safe:hover:scale-110 motion-reduce:transition-none',
	'focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-focus-on-dark',
].join(' ')
const currentLink = "after:absolute after:inset-x-0 after:bottom-0 after:h-1.5 after:bg-on-brand hover:after:hidden"

type SiteHeaderProps = {
	locale: AppLocale
}

export async function SiteHeader({ locale }: SiteHeaderProps) {
	const t = await getTranslations({ locale, namespace: 'Shell' })

	// Width and row heights come from --header-logo-width and --header-height
	// (globals.css), which the page heroes and scroll padding also use.
	const logo = (
		<Link
			className="relative block aspect-[694/182] w-(--header-logo-width) shrink-0 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-on-dark"
			href="/"
		>
			<Image
				alt={t('homeLink')}
				fill
				priority
				sizes="(min-width: 1280px) 216px, 124px"
				src="/brand/logo-consulting-white.png"
			/>
		</Link>
	)

	return (
		<HeaderFrame>
			{/* Narrow screens: language toggle, centred logo, pages menu (Figma 5651:631). */}
			<div className="mx-auto grid min-h-(--header-height) max-w-[90rem] grid-cols-[1fr_auto_1fr] items-center gap-4 px-gutter py-3 xl:hidden">
				<LocaleSwitcher className="justify-self-start" />
				{logo}
				<div className="justify-self-end">
					<Suspense fallback={<MobileMenu poeUrl={null} />}>
						<MobileMenuWithPoe locale={locale} />
					</Suspense>
				</div>
			</div>

			{/* Wide screens: logo, POE and pages inline, audience switch and language
			    toggle (Figma 6393:6, 6648:12). The audience switch sits in the space
			    kept for it (control tower §15.3); the mobile menu lists the same
			    choice. */}
			<div className="mx-auto hidden min-h-(--header-height) max-w-[90rem] items-stretch gap-6 px-gutter xl:flex">
				<div className="flex items-center">{logo}</div>
				<nav aria-label={t('nav.label')} className="ml-auto flex items-stretch">
					<Suspense fallback={null}>
						<DesktopPoe locale={locale} />
					</Suspense>
					<ul className="flex items-stretch">
						{PRIMARY_NAV.map((item) => (
							<li className="flex" key={item.key}>
								<NavLink className={desktopLink} currentClassName={currentLink} href={item.href} matchNested={item.matchNested}>
									{t(`nav.${item.key}`)}
								</NavLink>
							</li>
						))}
					</ul>
				</nav>
				<div className="flex items-center gap-4">
					<AudienceSwitch />
					<LocaleSwitcher />
				</div>
			</div>
		</HeaderFrame>
	)
}

async function DesktopPoe({ locale }: SiteHeaderProps) {
	const [{ poeUrl }, t] = await Promise.all([getPublishedGlobalContent(locale), getTranslations({ locale, namespace: 'Shell.nav' })])
	if (!poeUrl) return null
	return (
		// First header item, as on the production site. The link is as tall as
		// the header and takes the same hover and focus treatment as the links;
		// the graphic is 64px tall, 72px from 90rem (Figma 6633:100: 75px).
		<PoeLink
			className={cn(desktopLink, 'h-(--header-height) shrink-0 px-0 min-[90rem]:px-0')}
			externalHint={t('externalHint')}
			href={poeUrl}
			imageClassName="h-16 min-[90rem]:h-18"
			label={t('poe')}
		/>
	)
}

async function MobileMenuWithPoe({ locale }: SiteHeaderProps) {
	const { poeUrl } = await getPublishedGlobalContent(locale)
	return <MobileMenu poeUrl={poeUrl} />
}
