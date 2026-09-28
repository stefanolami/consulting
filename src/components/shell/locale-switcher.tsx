'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import NextLink from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { getPathname } from '@/i18n/navigation'
import { routing, type AppLocale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

type LocaleHrefs = Record<AppLocale, string>

// Localized detail pages have different slugs per locale. Their generated
// metadata already lists every published translation as an hreflang alternate,
// so the switcher follows those links. Without an alternate for a locale, a
// detail page falls back to its parent listing; other pages keep their path.
function currentPathname(locale: AppLocale) {
	const path = window.location.pathname
	const prefix = `/${locale}`
	if (locale === routing.defaultLocale || (path !== prefix && !path.startsWith(`${prefix}/`))) return path
	return path.slice(prefix.length) || '/'
}

function readLocaleHrefs(locale: AppLocale): LocaleHrefs {
	const pathname = currentPathname(locale)
	const alternates = new Map<string, string>()
	document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]').forEach((link) => {
		try {
			const url = new URL(link.href)
			alternates.set(link.hreflang, `${url.pathname}${url.search}`)
		} catch {
			// Ignore malformed alternates.
		}
	})
	const hasLocalizedAlternates = routing.locales.some((locale) => alternates.has(locale))
	const parent = pathname.split('/').slice(0, -1).join('/') || '/'

	return Object.fromEntries(routing.locales.map((locale) => {
		const alternate = alternates.get(locale)
		if (alternate) return [locale, alternate]
		const href = hasLocalizedAlternates && pathname.split('/').length > 2 ? parent : pathname
		return [locale, getPathname({ href, locale })]
	})) as LocaleHrefs
}

type LocaleSwitcherProps = {
	className?: string
}

export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
	const t = useTranslations('Shell.locale')
	const locale = useLocale() as AppLocale
	// Resolved from the browser location when the menu opens, so the switcher
	// does not read the request path during prerendering.
	const [hrefs, setHrefs] = useState<LocaleHrefs | null>(null)

	return (
		<DropdownMenu.Root onOpenChange={(open) => { if (open) setHrefs(readLocaleHrefs(locale)) }}>
			<DropdownMenu.Trigger
				aria-label={`${t('label')}. ${t('current', { language: t(`names.${locale}`) })}`}
				className={cn(
					'inline-flex min-h-10 items-center justify-center rounded-control bg-action px-4 py-2 font-serif text-label font-medium uppercase text-on-action transition-colors hover:bg-brand-strong',
					'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-on-dark data-[state=open]:bg-brand-strong',
					className,
				)}
			>
				{locale}
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					className="z-[60] min-w-56 rounded-control bg-on-brand p-1 text-brand shadow-xl ring-1 ring-brand/10 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:zoom-in-95"
					sideOffset={8}
				>
					<DropdownMenu.Label className="px-3 pb-1 pt-2 font-label text-label text-brand/70">{t('label')}</DropdownMenu.Label>
					{routing.locales.map((option) => (
						<DropdownMenu.Item asChild key={option}>
							<NextLink
								aria-current={option === locale ? 'true' : undefined}
								className="flex cursor-pointer items-center gap-3 rounded-control px-3 py-2 font-serif text-body outline-none data-[highlighted]:bg-surface-tint"
								href={hrefs?.[option] ?? getPathname({ href: '/', locale: option })}
								hrefLang={option}
								lang={option}
							>
								<span className="w-14 whitespace-nowrap font-medium uppercase">{option}</span>
								<span className="flex-1">{t(`names.${option}`)}</span>
								{option === locale ? <Check aria-hidden="true" className="size-4" /> : null}
							</NextLink>
						</DropdownMenu.Item>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	)
}
