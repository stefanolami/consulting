import { getTranslations } from 'next-intl/server'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { LoadingRegion } from '@/components/loading/loading-region'
import { SkeletonText } from '@/components/loading/skeleton-text'
import { Skeleton } from '@/components/ui/skeleton'
import type { AppLocale } from '@/i18n/routing'
import { getPublishedOfficeNetwork } from '@/lib/public-offices'
import { cn } from '@/lib/utils'

import { OfficeNetworkExplorer } from './office-network-explorer'
import {
	OFFICE_BADGE_SMALL_CLASS,
	OFFICE_BOTTOM_BAND_CLASS,
	OFFICE_BUTTON_LIST_CLASS,
	OFFICE_BUTTON_SIZE_CLASS,
	OFFICE_CARD_GRID_CLASS,
	OFFICE_CITIES_CLASS,
	OFFICE_DESKTOP_CLASS,
	OFFICE_EMAILS_CLASS,
	OFFICE_HEADING_CLASS,
	OFFICE_MAP_CLASS,
	OFFICE_NAME_CLASS,
	OFFICE_TOP_BAND_CLASS,
} from './office-network-styles'

const SKELETON_COUNTRIES = 5

// The CMS offices grouped by country (control tower §15.10). The heading is
// part of the streamed content, so a locale without published offices renders
// no section at all.
export async function OfficeNetwork({ locale }: { locale: AppLocale }) {
	const t = await getTranslations({ locale, namespace: 'Contact.network' })
	return (
		<Suspense fallback={<LoadingRegion as="section" label={t('loading')}><OfficeNetworkSkeleton /></LoadingRegion>}>
			<OfficeNetworkContent locale={locale} />
		</Suspense>
	)
}

async function OfficeNetworkContent({ locale }: { locale: AppLocale }) {
	await connection()
	const countries = await getPublishedOfficeNetwork(locale)
	if (!countries.length) return null
	return <OfficeNetworkExplorer countries={countries} />
}

// Loading shape: the heading, then the card grid on narrow screens, or the
// country buttons, the panel and the map from `lg`.
export function OfficeNetworkSkeleton() {
	return (
		<>
			<div className={OFFICE_TOP_BAND_CLASS}>
				<SkeletonText className={cn(OFFICE_HEADING_CLASS, 'mx-auto w-[min(24rem,80%)]')} lastLineWidth="w-full" />
				<ul className={cn(OFFICE_BUTTON_LIST_CLASS, 'hidden lg:flex')}>
					{Array.from({ length: SKELETON_COUNTRIES }, (_, index) => <li key={index}><Skeleton className={cn(OFFICE_BUTTON_SIZE_CLASS, 'rounded-full')} tone="light" /></li>)}
				</ul>
			</div>
			<div className={OFFICE_BOTTOM_BAND_CLASS}>
				<ul className={cn(OFFICE_CARD_GRID_CLASS, 'lg:hidden')}>
					{Array.from({ length: 4 }, (_, index) => (
						<li className="flex flex-col items-center" key={index}>
							<Skeleton className={cn(OFFICE_BADGE_SMALL_CLASS, 'rounded-full')} tone="light" />
							<CountryOfficesSkeleton className="mt-5 w-full max-w-[17rem]" />
						</li>
					))}
				</ul>
				<div className={cn(OFFICE_DESKTOP_CLASS, 'hidden lg:grid')}>
					<CountryOfficesSkeleton className="w-[min(20rem,100%)] justify-self-center" />
					<Skeleton className={OFFICE_MAP_CLASS} tone="light" />
				</div>
			</div>
		</>
	)
}

function CountryOfficesSkeleton({ className }: { className?: string }) {
	return (
		<div className={className}>
			<div className={cn(OFFICE_NAME_CLASS, 'border-tp-mist')}><SkeletonText className="mx-auto w-3/5" lastLineWidth="w-full" /></div>
			<SkeletonText className={cn(OFFICE_CITIES_CLASS, 'mx-auto w-1/2 [&>span]:justify-center')} lastLineWidth="w-full" lines={2} />
			<SkeletonText className={cn(OFFICE_EMAILS_CLASS, 'mx-auto w-4/5')} lastLineWidth="w-full" />
		</div>
	)
}
