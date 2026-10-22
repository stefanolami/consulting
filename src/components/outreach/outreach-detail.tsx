import { ArrowLeft, ChartColumn, Globe, Users, type LucideIcon } from 'lucide-react'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense, type CSSProperties, type ReactNode } from 'react'

import { CatalogueRichText } from '@/components/catalogue/catalogue-rich-text'
import { LoadingMessage } from '@/components/loading/loading-message'
import { LoadingRegion } from '@/components/loading/loading-region'
import { SkeletonText } from '@/components/loading/skeleton-text'
import { PageHero, PageHeroSkeleton, type HeroIllustration } from '@/components/shell/page-hero'
import { TeamPortrait } from '@/components/team/team-portrait'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from '@/i18n/navigation'
import type { AppLocale } from '@/i18n/routing'
import { countryHeroDrawing } from '@/lib/outreach/country-geometry'
import { countryDetailBlocks, longestWordLength, type DetailStatistic } from '@/lib/outreach/outreach-detail.mjs'
import { parseMapConfig } from '@/lib/outreach/outreach-geo.mjs'
import { outreachSearch } from '@/lib/outreach/outreach-state.mjs'
import { getPublishedOutreachDetail, type OutreachCountry, type OutreachOffice, type OutreachPerson } from '@/lib/public-outreach'
import { TEAM_SEGMENT } from '@/lib/team-paths'
import { cn } from '@/lib/utils'

import { ServiceBadge } from './outreach-service-badge'

// Layout shared by the page and its skeleton, so the two cannot drift.
const bodyClass = 'bg-white px-gutter pt-[clamp(1.5rem,1rem+2vw,2.5rem)] pb-section text-tp-teal'
const columnClass = 'mx-auto flex max-w-content flex-col items-center gap-[clamp(2.5rem,2rem+2vw,4rem)] text-center'
const flagClass = 'relative h-[clamp(3.5rem,3rem+1.5vw,4.5rem)] w-[clamp(5.25rem,4.5rem+2.25vw,6.75rem)]'
const statisticsListClass = 'flex flex-wrap justify-center gap-x-[clamp(2rem,1rem+5vw,7rem)] gap-y-8'
const statisticClass = 'flex w-[min(100%,15rem)] flex-col items-center'
const statisticIconClass = 'size-[clamp(3.5rem,3rem+1.5vw,4.5rem)]'
const statisticLabelClass = 'mt-[clamp(1rem,0.5rem+1.5vw,2rem)] font-label text-lead font-bold'
const statisticValueClass = 'font-label text-lead'
const textBlockClass = 'w-full max-w-[60rem]'
const summaryClass = 'font-label text-lead'
const reviewedClass = 'mt-4 font-label text-body font-light italic'
const sectionHeadingClass = 'font-label text-body-lg font-bold'
const serviceListClass = 'mt-5 flex flex-wrap justify-center gap-[clamp(0.75rem,0.5rem+1vw,1.5rem)] text-label'
const serviceItemClass = 'w-[max(clamp(6rem,5.25rem+2.5vw,6.75rem),var(--word-fit,0rem))]'
const peopleListClass = 'mt-5 flex flex-wrap justify-center gap-x-16 gap-y-10'
const personClass = 'flex w-[min(100%,20rem)] flex-col items-center font-label text-body'
const portraitClass = 'mt-4 w-[clamp(7rem,6rem+3vw,8.875rem)]'
const linkClass = 'rounded-control underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

// Statistic pictograms by `metric_key` (Figma "people 1", "global 1"). None
// is in the repository yet: Lucide stands in (docs/figma-asset-needs.md).
const STATISTIC_ICONS: Record<string, LucideIcon> = { gdp: Globe, population: Users }

export function OutreachDetailPage({ locale, slug }: { locale: AppLocale; slug: string }) {
	return (
		<Suspense fallback={<OutreachDetailSkeleton label={<LoadingMessage messageKey="Outreach.detail.loading" />} />}>
			<OutreachDetailContent locale={locale} slug={slug} />
		</Suspense>
	)
}

// The country page (Figma 5741:293; control tower §15.12.7, slice b): a navy
// hero with the country's line drawing and name, then the flag, statistics,
// summary and body, last update, services and coverage, per-country service
// copy, experts and offices. Every block after the flag renders only when it
// has published content.
async function OutreachDetailContent({ locale, slug }: { locale: AppLocale; slug: string }) {
	await connection()
	const [country, t, tShell] = await Promise.all([
		getPublishedOutreachDetail(locale, slug),
		getTranslations({ locale, namespace: 'Outreach' }),
		getTranslations({ locale, namespace: 'Shell' }),
	])
	if (!country) notFound()
	const blocks = countryDetailBlocks(country, locale)
	const drawing = countryHeroDrawing(country.code, parseMapConfig(country.mapConfig)?.center ?? null)
	const drawingName = `outreach-country-outline-${country.code.toLowerCase()}`
	// Decorative: the h1 names the country. Without geometry or map_config
	// coordinates there is nothing to draw, and a placeholder keeps the hero's
	// proportions (docs/figma-asset-needs.md).
	const illustration: HeroIllustration = drawing
		? { kind: 'lines', ...drawing }
		: { kind: 'placeholder', height: 100, label: tShell('placeholder.illustration', { name: drawingName }), name: drawingName, width: 160 }
	const back = (
		<Link
			className="inline-flex min-h-11 items-center gap-2 rounded-control underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-on-dark"
			href={`/our-outreach${outreachSearch({ country: country.code, region: null })}`}
		>
			<ArrowLeft aria-hidden="true" className="size-5 shrink-0" />
			{t('detail.backToOverview')}
		</Link>
	)
	const reviewed = blocks.lastReviewed
		? new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(blocks.lastReviewed)
		: null

	return (
		<main>
			<article>
				<PageHero illustration={illustration} navigation={back} title={country.name} />
				<div className={bodyClass}>
					<div className={columnClass}>
						<CountryFlag country={country} />
						{blocks.statistics.length ? (
							<section aria-labelledby="country-statistics-heading" className="w-full">
								<h2 className="sr-only" id="country-statistics-heading">{t('detail.keyFigures')}</h2>
								<dl className={statisticsListClass}>
									{blocks.statistics.map((statistic) => <Statistic key={statistic.id} sourceLabel={t('detail.source')} statistic={statistic} />)}
								</dl>
							</section>
						) : null}
						{blocks.summary || blocks.content || reviewed ? (
							<div className={textBlockClass}>
								{blocks.summary ? <p className={summaryClass}>{blocks.summary}</p> : null}
								{blocks.content ? <CatalogueRichText className={cn('text-left', blocks.summary && 'mt-8')} content={country.content} /> : null}
								{reviewed ? <p className={reviewedClass}>{t('detail.lastUpdated', { date: reviewed })}</p> : null}
							</div>
						) : null}
						{blocks.services.length || blocks.coverage ? (
							<div className={cn('grid w-full gap-x-12 gap-y-12', blocks.services.length && blocks.coverage && 'md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]')}>
								{blocks.services.length ? (
									<section aria-labelledby="country-services-heading">
										<h2 className={sectionHeadingClass} id="country-services-heading">{t('detail.servicesProvided')}</h2>
										<ul className={serviceListClass} style={wordFit(blocks.services.map((service) => service.name))}>
											{blocks.services.map((service) => <li className={serviceItemClass} key={service.id}><ServiceBadge service={service} tone="brand" /></li>)}
										</ul>
									</section>
								) : null}
								{blocks.coverage ? (
									<section aria-labelledby="country-coverage-heading" className="mx-auto max-w-[34rem]">
										<h2 className={sectionHeadingClass} id="country-coverage-heading">{t('detail.coverage')}</h2>
										<p className="mt-5 font-label text-body-lg">{blocks.coverage}</p>
									</section>
								) : null}
							</div>
						) : null}
						{blocks.serviceDetails.length ? (
							<section aria-labelledby="country-service-details-heading" className={cn(textBlockClass, 'text-left')}>
								<h2 className={cn(sectionHeadingClass, 'text-center')} id="country-service-details-heading">{t('detail.serviceDetails', { country: country.name })}</h2>
								<div className="mt-5 divide-y divide-tp-mist border-y border-tp-mist">
									{blocks.serviceDetails.map((service) => (
										<div className="py-6" key={service.id}>
											<h3 className="font-display text-heading-3 font-bold">
												<Link className={linkClass} href={`/services/${service.slug}`}>{service.name}</Link>
											</h3>
											{service.summary?.trim() ? <p className="mt-2 font-label text-body-lg">{service.summary}</p> : null}
											<CatalogueRichText className="mt-4" content={service.content} />
										</div>
									))}
								</div>
							</section>
						) : null}
						{blocks.people.length ? (
							<section aria-labelledby="country-experts-heading" className="w-full">
								<h2 className={sectionHeadingClass} id="country-experts-heading">{t('detail.contactExperts', { count: blocks.people.length })}</h2>
								<ul className={peopleListClass}>
									{blocks.people.map((person) => <Expert key={person.id} labels={{ email: t('detail.email'), phone: t('detail.phone') }} person={person} />)}
								</ul>
							</section>
						) : null}
						{blocks.offices.length ? (
							<section aria-labelledby="country-offices-heading" className="w-full">
								<h2 className={sectionHeadingClass} id="country-offices-heading">{t('detail.offices')}</h2>
								<ul className={peopleListClass}>
									{blocks.offices.map((office) => <Office key={office.id} labels={{ email: t('detail.email'), phone: t('detail.phone') }} office={office} />)}
								</ul>
							</section>
						) : null}
					</div>
				</div>
			</article>
		</main>
	)
}

// Circles wide enough for the longest word of any service name at the
// badge's 14 px, all the same size, up to 10rem: Josefin Sans bold measures
// 0.47–0.64 em a character (0.56 for "Communications"), plus the label's
// padding. Figma's circles are 108 px with about 11 px text; at 14 px
// "Communications" no longer fits, and headless Chromium does not hyphenate.
function wordFit(names: string[]) {
	return { '--word-fit': `min(${longestWordLength(names) * 0.58}em + 1rem, 10rem)` } as CSSProperties
}

// The flag under the hero (Figma "image 3"), with its localized alt text; a
// dashed box until a flag is uploaded (docs/figma-asset-needs.md).
function CountryFlag({ country }: { country: OutreachCountry }) {
	if (country.flag) {
		return (
			<div className={flagClass}>
				<Image alt={country.flag.alt} className="object-contain" fill sizes="7rem" src={country.flag.url} />
			</div>
		)
	}
	// PLACEHOLDER: no flag uploaded for this country (docs/figma-asset-needs.md).
	return <div aria-hidden="true" className={cn(flagClass, 'rounded-control border-2 border-dashed border-tp-teal/40')} data-placeholder-asset={`outreach-country-flag-${country.code.toLowerCase()}`} />
}

// "Population: 19.06 million (2023) / World Bank" (Figma 5741:333, 5741:334).
// The contract has no source name, so the source shows its host name.
function Statistic({ sourceLabel, statistic }: { sourceLabel: string; statistic: DetailStatistic }) {
	const Icon = STATISTIC_ICONS[statistic.metricKey] ?? ChartColumn
	return (
		<div className={statisticClass}>
			<dt className="flex flex-col items-center">
				{/* PLACEHOLDER: Lucide in place of the Figma pictogram (docs/figma-asset-needs.md). */}
				<Icon aria-hidden="true" className={cn(statisticIconClass, 'text-tp-navy')} data-placeholder-asset={`outreach-statistic-icon-${STATISTIC_ICONS[statistic.metricKey] ? statistic.metricKey : 'other'}`} strokeWidth={1.75} />
				<span className={statisticLabelClass}>{statistic.label}</span>
			</dt>
			<dd className={statisticValueClass}>{statistic.text}</dd>
			{statistic.source ? (
				<dd className="font-label text-lead font-light italic">
					<span className="sr-only">{sourceLabel} </span>
					<a className={linkClass} href={statistic.source.href} rel="noreferrer">{statistic.source.host}</a>
				</dd>
			) : null}
		</div>
	)
}

function ContactLines({ email, labels, phone }: { email: string | null; labels: { email: string; phone: string }; phone: string | null }) {
	if (!email && !phone) return null
	return (
		<dl className="mt-3">
			{phone ? <div><dt className="sr-only">{labels.phone}</dt><dd><a className={linkClass} href={`tel:${phone.replace(/[^+\d]/g, '')}`}>{phone}</a></dd></div> : null}
			{email ? <div><dt className="sr-only">{labels.email}</dt><dd><a className={cn(linkClass, 'break-all')} href={`mailto:${email}`}>{email}</a></dd></div> : null}
		</dl>
	)
}

// "Contact our expert" (Figma 5769:97 … 5769:99): the name, linking to the
// localized team profile when the person has one, the round portrait, then
// role, phone and email. Figma's office address is not in the people
// contract, so it is not shown (control tower §15.4).
function Expert({ labels, person }: { labels: { email: string; phone: string }; person: OutreachPerson }) {
	return (
		<li className={personClass}>
			<h3 className="text-body-lg uppercase">
				{person.profileSlug ? <Link className={linkClass} href={`/${TEAM_SEGMENT}/${person.profileSlug}`}>{person.name}</Link> : person.name}
			</h3>
			<TeamPortrait
				alt=""
				className={portraitClass}
				name={person.name}
				portrait={person.portrait ? { ...person.portrait, height: null, width: null } : null}
				sizes="9rem"
			/>
			{person.role ? <p className="mt-3">{person.role}</p> : null}
			<ContactLines email={person.email} labels={labels} phone={person.phone} />
		</li>
	)
}

// Offices are not in Figma; they follow the expert block in its style.
function Office({ labels, office }: { labels: { email: string; phone: string }; office: OutreachOffice }) {
	const city = office.city && !office.address?.includes(office.city) ? office.city : null
	return (
		<li className={personClass}>
			<h3 className="text-body-lg font-bold">{office.name}</h3>
			{office.address || city ? (
				<address className="mt-2 not-italic">
					{office.address ? <p>{office.address}</p> : null}
					{city ? <p>{city}</p> : null}
				</address>
			) : null}
			<ContactLines email={office.email} labels={labels} phone={office.phone} />
		</li>
	)
}

// The page while the country loads: the hero with its back link and drawing
// frame, the flag, two statistics, the summary, the services row and one
// expert, in the loaded page's layout.
export function OutreachDetailSkeleton({ label }: { label: ReactNode }) {
	return (
		<LoadingRegion as="main" label={label}>
			<PageHeroSkeleton illustration={{ height: 100, width: 160 }} introLines={0} navigation />
			<div className={bodyClass}>
				<div className={columnClass}>
					<Skeleton className={flagClass} tone="light" />
					<div className={cn(statisticsListClass, 'w-full')}>
						{[0, 1].map((index) => (
							<div className={statisticClass} key={index}>
								<Skeleton className={cn(statisticIconClass, 'rounded-pill')} tone="light" />
								<SkeletonText className={cn(statisticLabelClass, 'w-1/2 [&>span]:justify-center')} lastLineWidth="w-full" />
								<SkeletonText className={cn(statisticValueClass, 'w-3/4 [&>span]:justify-center')} lastLineWidth="w-full" />
							</div>
						))}
					</div>
					<div className={textBlockClass}>
						<SkeletonText className={cn(summaryClass, '[&>span]:justify-center')} lastLineWidth="w-2/3" lines={3} />
						<SkeletonText className={cn(reviewedClass, 'mx-auto w-56')} lastLineWidth="w-full" />
					</div>
					<div className="w-full">
						<SkeletonText className={cn(sectionHeadingClass, 'mx-auto w-48')} lastLineWidth="w-full" />
						<div className={serviceListClass}>
							{[0, 1, 2].map((index) => <Skeleton className={cn(serviceItemClass, 'aspect-square rounded-pill')} key={index} tone="light" />)}
						</div>
					</div>
					<div className="w-full">
						<SkeletonText className={cn(sectionHeadingClass, 'mx-auto w-52')} lastLineWidth="w-full" />
						<div className={peopleListClass}>
							<div className={personClass}>
								<SkeletonText className="w-40 text-body-lg" lastLineWidth="w-full" />
								<Skeleton className={cn(portraitClass, 'aspect-square rounded-pill')} tone="light" />
								<SkeletonText className="mt-3 w-44 [&>span]:justify-center" lastLineWidth="w-3/4" lines={2} />
							</div>
						</div>
					</div>
				</div>
			</div>
		</LoadingRegion>
	)
}
