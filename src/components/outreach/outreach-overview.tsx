import { getTranslations } from 'next-intl/server'
import { connection } from 'next/server'
import type { ReactNode } from 'react'
import { preload } from 'react-dom'
import { Suspense } from 'react'

import { LoadingRegion } from '@/components/loading/loading-region'
import { SkeletonText } from '@/components/loading/skeleton-text'
import type { AppLocale } from '@/i18n/routing'
import { buildOutreachOverview } from '@/lib/outreach/outreach-overview'
import { getPublishedOutreachOverview } from '@/lib/public-outreach'
import { cn } from '@/lib/utils'

import { OutreachExplorer } from './outreach-explorer'
import {
	BAND_CLASS,
	INSTRUCTIONS_CLASS,
	MAP_AREA_CLASS,
	NAV_AREA_CLASS,
	REGION_LINK_CLASS,
	TITLE_AREA_CLASS,
	TITLE_CLASS,
	TOPOLOGY_URL,
} from './outreach-layout'
import { MapSkeleton } from './outreach-map-skeleton'

// Our Outreach overview (control tower §15.12). The map geometry is requested
// with the HTML; the published countries stream into the explorer behind a
// skeleton of the same band.
export async function OutreachOverviewPage({ locale }: { locale: AppLocale }) {
	preload(TOPOLOGY_URL, { as: 'fetch', crossOrigin: 'anonymous' })
	const t = await getTranslations({ locale, namespace: 'Outreach' })
	return (
		<main>
			<Suspense fallback={<OutreachOverviewSkeleton label={t('loading')} />}>
				<OutreachOverviewContent locale={locale} />
			</Suspense>
		</main>
	)
}

async function OutreachOverviewContent({ locale }: { locale: AppLocale }) {
	await connection()
	const countries = await getPublishedOutreachOverview(locale)
	return <OutreachExplorer overview={buildOutreachOverview(countries, locale)} />
}

const SKELETON_REGIONS = 6

// Loading shape of the band: the column's title, instructions and region
// rows, and the map area.
export function OutreachOverviewSkeleton({ label }: { label: ReactNode }) {
	return (
		<LoadingRegion className={BAND_CLASS} label={label}>
			<div className={TITLE_AREA_CLASS}>
				<SkeletonText className={cn(TITLE_CLASS, 'w-4/5 lg:hidden')} lastLineWidth="w-full" tone="brand" />
				<SkeletonText className={cn(INSTRUCTIONS_CLASS, 'w-full')} lines={2} tone="brand" />
			</div>
			<div className={MAP_AREA_CLASS}><MapSkeleton /></div>
			<div className={NAV_AREA_CLASS}>
				{Array.from({ length: SKELETON_REGIONS }, (_, index) => (
					<SkeletonText className={cn(REGION_LINK_CLASS, 'py-1.5', index % 2 ? 'w-1/2' : 'w-2/3')} key={index} lastLineWidth="w-full" tone="brand" />
				))}
			</div>
		</LoadingRegion>
	)
}
