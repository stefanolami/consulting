import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { LoadingRegion } from '@/components/loading/loading-region'
import { Skeleton } from '@/components/ui/skeleton'
import type { AppLocale } from '@/i18n/routing'
import { getPublishedGlobalContent, type PublicGlobalContent } from '@/lib/public-global-content'
import { cn } from '@/lib/utils'

type PublicPartner = PublicGlobalContent['partners'][number]

const sectionClass = 'bg-surface-muted px-gutter py-section'
const listClass = 'mx-auto flex max-w-shell flex-wrap items-center justify-center gap-x-[clamp(1rem,0.5rem+2.2vw,3rem)] gap-y-[clamp(1.5rem,1.1rem+1.6vw,3rem)]'
// One logo cell: a fixed box the logo is contained in, so wide and square
// marks share a rhythm (Figma "Homepage Sponsors": seven a row at 1440 px).
const cellClass = 'relative h-[clamp(3.5rem,2.9rem+2.4vw,5.5rem)] w-[clamp(6rem,4.6rem+5vw,9.25rem)]'
const SKELETON_CELLS = 14

type PartnersProps = { className?: string; locale: AppLocale }

// Reusable partner and client logo band (Figma 5527:46 / 5651:680, a flat
// image there; legacy partners.jsx). The logos come from the CMS through the
// public global-content contract and stream behind a template-shaped
// skeleton. A locale without published partners renders no section at all.
// The band is static: the design shows a still wall of logos, so there is no
// motion to pause.
export async function Partners({ className, locale }: PartnersProps) {
	const t = await getTranslations({ locale, namespace: 'Partners' })
	return (
		<Suspense fallback={<LoadingRegion as="section" className={cn(sectionClass, className)} label={t('loading')}><PartnersSkeleton /></LoadingRegion>}>
			<PartnersContent className={className} locale={locale} />
		</Suspense>
	)
}

async function PartnersContent({ className, locale }: PartnersProps) {
	await connection()
	const [{ partners }, t, tShell] = await Promise.all([
		getPublishedGlobalContent(locale),
		getTranslations({ locale, namespace: 'Partners' }),
		getTranslations({ locale, namespace: 'Shell.nav' }),
	])
	if (!partners.length) return null
	return (
		<section aria-labelledby="partners-heading" className={cn(sectionClass, className)}>
			{/* Figma shows no heading; the section keeps a named heading for the outline. */}
			<h2 className="sr-only" id="partners-heading">{t('title')}</h2>
			<ul className={listClass}>
				{partners.map((partner) => <li className={cellClass} key={partner.id}><PartnerLogo externalHint={tShell('externalHint')} partner={partner} /></li>)}
			</ul>
		</section>
	)
}

// The logo's localized alt text names the link; the new-tab hint is added for
// assistive technology. Only safe http(s) website URLs reach this component.
function PartnerLogo({ externalHint, partner }: { externalHint: string; partner: PublicPartner }) {
	const image = <Image alt={partner.alt} className="object-contain" fill sizes="9.25rem" src={partner.logoUrl} />
	if (!partner.websiteUrl) return image
	return (
		<a
			className="absolute inset-0 rounded-control transition-transform duration-200 motion-safe:hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand motion-reduce:transition-none"
			href={partner.websiteUrl}
			rel="noopener noreferrer"
			target="_blank"
		>
			{image}
			<span className="sr-only"> ({externalHint})</span>
		</a>
	)
}

// Loading shape: a centred wall of logo cells, like the loaded band.
export function PartnersSkeleton() {
	return (
		<ul className={listClass}>
			{Array.from({ length: SKELETON_CELLS }, (_, index) => <li className={cellClass} key={index}><Skeleton className="size-full" tone="light" /></li>)}
		</ul>
	)
}
