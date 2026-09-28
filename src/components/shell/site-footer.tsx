import { cacheLife } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { Link } from '@/i18n/navigation'
import type { AppLocale } from '@/i18n/routing'
import { getPublishedGlobalContent } from '@/lib/public-global-content'

import { DownloadSnapshotLink } from './download-snapshot-link'
import { LEGAL_NAV, SNAPSHOT_PDF_HREF } from './navigation'
import { SocialLinks } from './social-links'

async function getCopyrightYear() {
	'use cache'
	cacheLife('days')
	return new Date().getFullYear()
}

type SiteFooterProps = {
	locale: AppLocale
}

// Figma footer (6393:44 desktop, floating mobile footer beside 5651:631):
// social icons, legal links and copyright, Time&Place Snapshot download.
// Contact details from the public site settings are an addition to Figma.
export async function SiteFooter({ locale }: SiteFooterProps) {
	const t = await getTranslations({ locale, namespace: 'Shell' })

	return (
		<footer className="bg-brand text-on-brand">
			<div className="mx-auto grid max-w-[90rem] gap-8 px-gutter py-10 md:grid-cols-[minmax(6rem,1fr)_auto_minmax(6rem,1fr)] md:items-center md:gap-6 md:py-12">
				<Suspense fallback={<div className="min-h-10" />}>
					<FooterSocials locale={locale} />
				</Suspense>

				<div className="flex flex-col items-center gap-4 text-center">
					<nav aria-label={t('footer.legalLabel')}>
						<ul className="flex flex-wrap items-center justify-center gap-y-2 font-display text-[clamp(0.75rem,0.4rem+0.95vw,1.25rem)] uppercase leading-tight">
							{LEGAL_NAV.map((item, index) => (
								<li className={index ? 'border-l border-on-brand/80' : undefined} key={item.key}>
									<Link
										className="mx-[clamp(0.5rem,0.1rem+2vw,2.25rem)] inline-block rounded-control underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-on-dark"
										href={item.href}
									>
										{t(`footer.${item.key}`)}
									</Link>
								</li>
							))}
						</ul>
					</nav>
					<p className="font-label text-label italic md:text-body">{t('footer.copyright', { year: await getCopyrightYear() })}</p>
					<Suspense fallback={null}>
						<FooterContact locale={locale} />
					</Suspense>
				</div>

				<div className="flex justify-center md:justify-end">
					<DownloadSnapshotLink download={t('footer.snapshotDownload')} href={SNAPSHOT_PDF_HREF} title={t('footer.snapshotTitle')} />
				</div>
			</div>
		</footer>
	)
}

async function FooterSocials({ locale }: SiteFooterProps) {
	const [{ socials }, t] = await Promise.all([getPublishedGlobalContent(locale), getTranslations({ locale, namespace: 'Shell' })])
	return (
		<SocialLinks
			className="md:grid md:w-fit md:grid-cols-[repeat(2,auto)] md:gap-x-2 md:gap-y-1 md:[&>li:nth-child(even)]:translate-y-1/2"
			externalHint={t('nav.externalHint')}
			label={t('footer.socialLabel')}
			socials={socials}
		/>
	)
}

async function FooterContact({ locale }: SiteFooterProps) {
	const [{ contact }, t] = await Promise.all([getPublishedGlobalContent(locale), getTranslations({ locale, namespace: 'Shell.footer' })])
	// The settings footer note currently holds the legacy copyright line, which
	// the Figma copyright already covers, so only address, email and phone show.
	if (!contact || (!contact.address && !contact.email && !contact.phone)) return null
	const address = contact.address?.split(/\s*\n\s*/).filter(Boolean).join(', ')

	return (
		<address aria-label={t('contactLabel')} className="font-label text-label not-italic text-on-brand/90">
			<span className="flex flex-wrap justify-center gap-x-4 gap-y-1">
				{address ? <span>{address}</span> : null}
				{contact.email ? <a className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-on-dark" href={`mailto:${contact.email}`}>{contact.email}</a> : null}
				{contact.phone ? <a className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-on-dark" href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>{contact.phone}</a> : null}
			</span>
		</address>
	)
}
