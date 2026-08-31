import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { CatalogueRichText } from '@/components/catalogue/catalogue-rich-text'
import { OutreachExplorer } from '@/components/outreach/outreach-explorer'
import { OutreachLoading } from '@/components/outreach/outreach-loading'
import { type AppLocale, routing } from '@/i18n/routing'
import { getPublishedOutreachDetail, getPublishedOutreachOverview, type OutreachStatistic } from '@/lib/public-outreach'

export function outreachPath(locale: AppLocale, slug?: string) {
	const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
	return `${prefix}/our-outreach${slug ? `/${slug}` : ''}`
}

function listingLanguages() {
	return Object.fromEntries([...routing.locales.map((locale) => [locale, outreachPath(locale)]), ['x-default', outreachPath(routing.defaultLocale)]])
}

export async function generateOutreachListingMetadata(locale: AppLocale): Promise<Metadata> {
	const t = await getTranslations({ locale, namespace: 'Outreach' })
	const canonical = outreachPath(locale)
	return { alternates: { canonical, languages: listingLanguages() }, description: t('metaDescription'), openGraph: { description: t('metaDescription'), title: t('title'), url: canonical }, title: t('title') }
}

export async function generateOutreachDetailMetadata(locale: AppLocale, slug: string): Promise<Metadata> {
	await connection()
	const country = await getPublishedOutreachDetail(locale, slug)
	if (!country) return { robots: { follow: false, index: false } }
	const canonical = outreachPath(locale, country.slug)
	const languages = Object.fromEntries(country.alternates.map((alternate) => [alternate.locale, outreachPath(alternate.locale, alternate.slug)]))
	const english = country.alternates.find((alternate) => alternate.locale === routing.defaultLocale)
	if (english) languages['x-default'] = outreachPath(routing.defaultLocale, english.slug)
	const title = country.seoTitle || country.name
	const description = country.seoDescription || country.summary || undefined
	return { alternates: { canonical, languages }, description, openGraph: { description, title, url: canonical }, title }
}

export function OutreachOverviewPage({ locale }: { locale: AppLocale }) {
	return <Suspense fallback={<OutreachLoading />}><OutreachOverviewContent locale={locale} /></Suspense>
}

async function OutreachOverviewContent({ locale }: { locale: AppLocale }) {
	await connection()
	const [countries, t] = await Promise.all([getPublishedOutreachOverview(locale), getTranslations({ locale, namespace: 'Outreach' })])
	const messages = {
		backToList: t('backToList'), closeSummary: t('closeSummary'), coveredCountry: t('coveredCountry'), countryList: t('countryList'), detailLink: t('detailLink'), emptyDescription: t('emptyDescription'), emptyTitle: t('emptyTitle'), experts: t('experts'), mapError: t('mapError'), mapInstructions: t('mapInstructions'), mapLabel: t('mapLabel'), mapLoading: t('mapLoading'), offices: t('offices'), region: t('region'), services: t('services'), statistics: t('statistics'),
	}
	return <main className="min-h-screen bg-white px-6 py-12 text-slate-900 sm:px-10 sm:py-16 lg:px-16"><div className="mx-auto max-w-6xl"><header className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">{t('eyebrow')}</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{t('title')}</h1><p className="mt-5 text-lg leading-8 text-slate-700">{t('introduction')}</p></header><div className="mt-10"><Suspense fallback={<div className="rounded-lg border border-slate-300 p-8" role="status">{t('loading')}</div>}><OutreachExplorer countries={countries} locale={locale} messages={messages} /></Suspense></div></div></main>
}

export function OutreachDetailPage({ locale, slug }: { locale: AppLocale; slug: string }) {
	return <Suspense fallback={<OutreachLoading />}><OutreachDetailContent locale={locale} slug={slug} /></Suspense>
}

async function OutreachDetailContent({ locale, slug }: { locale: AppLocale; slug: string }) {
	await connection()
	const [country, t] = await Promise.all([getPublishedOutreachDetail(locale, slug), getTranslations({ locale, namespace: 'Outreach' })])
	if (!country) notFound()
	const countryMedia = country.outline ?? country.flag
	return <main className="min-h-screen bg-white text-slate-900"><article><header className="bg-slate-100 px-6 py-12 sm:px-10 lg:px-16"><div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between"><div><Link className="text-sm font-medium underline underline-offset-4" href={outreachPath(locale)}>← {t('backToList')}</Link>{country.region ? <p className="mt-8 text-sm text-slate-600">{t('region')}: {country.region.name}</p> : null}<h1 className="mt-2 text-5xl font-semibold tracking-tight">{country.name}</h1><p className="mt-2 font-mono text-xs text-slate-500">ISO 3166-1: {country.code}</p>{country.summary ? <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">{country.summary}</p> : null}{country.coverageSummary ? <p className="mt-3 max-w-3xl leading-7 text-slate-700">{country.coverageSummary}</p> : null}</div>{countryMedia ? <Image alt={countryMedia.alt} className="h-auto max-h-48 w-auto max-w-64 object-contain" height={192} priority src={countryMedia.url} unoptimized width={256} /> : null}</div></header><div className="mx-auto max-w-6xl space-y-14 px-6 py-12 sm:px-10 lg:px-16"><section aria-label={t('contentLabel')}><CatalogueRichText content={country.content} /></section>{country.statistics.length ? <DetailStatistics locale={locale} sourceLabel={t('source')} statistics={country.statistics} title={t('statistics')} /> : null}{country.services.length ? <section aria-labelledby="country-services-heading"><h2 className="text-3xl font-semibold" id="country-services-heading">{t('services')}</h2><div className="mt-6 space-y-6">{country.services.map((service) => <section className="rounded-lg border border-slate-200 p-6" key={service.id}><h3 className="text-2xl font-semibold"><Link className="underline-offset-4 hover:underline" href={cataloguePath(locale, service.slug)}>{service.name}</Link></h3>{service.summary ? <p className="mt-4 leading-7 text-slate-700">{service.summary}</p> : null}<div className="mt-4"><CatalogueRichText content={service.content} /></div></section>)}</div></section> : null}{country.offices.length ? <section aria-labelledby="country-offices-heading"><h2 className="text-3xl font-semibold" id="country-offices-heading">{t('offices')}</h2><ul className="mt-6 grid gap-5 md:grid-cols-2">{country.offices.map((office) => <li className="rounded-lg border border-slate-200 p-6" key={office.id}><h3 className="text-xl font-semibold">{office.name}</h3><address className="mt-3 not-italic leading-7 text-slate-700">{office.city ? <p>{office.city}</p> : null}{office.address ? <p>{office.address}</p> : null}{office.email ? <a className="block underline underline-offset-4" href={`mailto:${office.email}`}>{office.email}</a> : null}{office.phone ? <a className="block underline underline-offset-4" href={`tel:${office.phone}`}>{office.phone}</a> : null}</address></li>)}</ul></section> : null}{country.people.length ? <section aria-labelledby="country-people-heading"><h2 className="text-3xl font-semibold" id="country-people-heading">{t('experts')}</h2><ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{country.people.map((person) => <li className="rounded-lg border border-slate-200 p-5" key={`${person.id}:${person.relationship}`}>{person.portrait ? <Image alt={person.portrait.alt} className="size-20 rounded-full object-cover" height={80} src={person.portrait.url} unoptimized width={80} /> : null}<h3 className="mt-4 text-xl font-semibold">{person.profileSlug ? <Link className="underline-offset-4 hover:underline" href={teamPath(locale, person.profileSlug)}>{person.name}</Link> : person.name}</h3>{person.role ? <p className="mt-1 text-slate-600">{person.role}</p> : null}{person.email ? <a className="mt-3 block break-all text-sm underline underline-offset-4" href={`mailto:${person.email}`}>{person.email}</a> : null}{person.phone ? <a className="mt-1 block text-sm underline underline-offset-4" href={`tel:${person.phone}`}>{person.phone}</a> : null}</li>)}</ul></section> : null}</div></article></main>
}

function DetailStatistics({ locale, sourceLabel, statistics, title }: { locale: AppLocale; sourceLabel: string; statistics: OutreachStatistic[]; title: string }) {
	return <section aria-labelledby="country-statistics-heading"><h2 className="text-3xl font-semibold" id="country-statistics-heading">{title}</h2><dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{statistics.map((statistic) => <StatisticCard key={statistic.id} locale={locale} sourceLabel={sourceLabel} statistic={statistic} />)}</dl></section>
}

function StatisticCard({ locale, sourceLabel, statistic }: { locale: AppLocale; sourceLabel: string; statistic: OutreachStatistic }) {
	const sourceUrl = safeHttpUrl(statistic.sourceUrl)
	return <div className="rounded-lg border border-slate-200 p-5"><dt className="text-sm text-slate-600">{statistic.label}</dt><dd className="mt-2 text-2xl font-semibold">{formatStatistic(statistic, locale)}</dd>{statistic.year ? <dd className="mt-1 text-sm text-slate-500">{statistic.year}</dd> : null}{sourceUrl ? <dd className="mt-3"><a className="text-sm underline underline-offset-4" href={sourceUrl} rel="noreferrer" target="_blank">{sourceLabel}</a></dd> : null}</div>
}

function cataloguePath(locale: AppLocale, slug: string) { const prefix = locale === routing.defaultLocale ? '' : `/${locale}`; return `${prefix}/services/${slug}` }
function teamPath(locale: AppLocale, slug: string) { const prefix = locale === routing.defaultLocale ? '' : `/${locale}`; return `${prefix}/team/${slug}` }
function formatStatistic(statistic: OutreachStatistic, locale: AppLocale) { if (statistic.displayValue) return statistic.displayValue; if (statistic.numericValue === null) return '—'; const value = new Intl.NumberFormat(locale).format(statistic.numericValue); return statistic.unit ? `${value} ${statistic.unit}` : value }
function safeHttpUrl(value: string | null) { if (!value) return null; try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null } catch { return null } }
