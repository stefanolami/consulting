import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { CatalogueLoading } from '@/components/catalogue/catalogue-loading'
import { CatalogueRichText } from '@/components/catalogue/catalogue-rich-text'
import { routing, type AppLocale } from '@/i18n/routing'
import {
	getPublishedCatalogueDetail,
	getPublishedCatalogueList,
	type PublicCatalogueKind,
} from '@/lib/public-catalogue'

export function cataloguePath(locale: AppLocale, kind: PublicCatalogueKind, slug?: string) {
	const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
	const segment = kind === 'service' ? 'services' : 'sectors'
	return `${prefix}/${segment}${slug ? `/${slug}` : ''}`
}

function listingLanguages(kind: PublicCatalogueKind) {
	return Object.fromEntries([
		...routing.locales.map((locale) => [locale, cataloguePath(locale, kind)]),
		['x-default', cataloguePath(routing.defaultLocale, kind)],
	])
}

export async function generateCatalogueListingMetadata(
	kind: PublicCatalogueKind,
	locale: AppLocale,
): Promise<Metadata> {
	const t = await getTranslations({ locale, namespace: 'Catalogue' })
	const canonical = cataloguePath(locale, kind)
	return {
		alternates: { canonical, languages: listingLanguages(kind) },
		description: t(`${kind}.metaDescription`),
		openGraph: {
			description: t(`${kind}.metaDescription`),
			title: t(`${kind}.title`),
			url: canonical,
		},
		title: t(`${kind}.title`),
	}
}

export async function generateCatalogueDetailMetadata(
	kind: PublicCatalogueKind,
	locale: AppLocale,
	slug: string,
): Promise<Metadata> {
	await connection()
	const detail = await getPublishedCatalogueDetail(kind, locale, slug)
	if (!detail) return { robots: { follow: false, index: false } }
	const canonical = cataloguePath(locale, kind, detail.slug)
	const languages = Object.fromEntries(detail.alternates.map((alternate) => [
		alternate.locale,
		cataloguePath(alternate.locale, kind, alternate.slug),
	]))
	const english = detail.alternates.find((alternate) => alternate.locale === routing.defaultLocale)
	if (english) languages['x-default'] = cataloguePath(routing.defaultLocale, kind, english.slug)
	const title = detail.seoTitle || detail.name
	const description = detail.seoDescription || detail.summary || undefined
	return {
		alternates: { canonical, languages },
		description,
		openGraph: { description, title, url: canonical },
		title,
	}
}

export function CatalogueListingPage({
	kind,
	locale,
}: {
	kind: PublicCatalogueKind
	locale: AppLocale
}) {
	return <Suspense fallback={<CatalogueLoading kind={kind} />}><CatalogueListingContent kind={kind} locale={locale} /></Suspense>
}

async function CatalogueListingContent({
	kind,
	locale,
}: {
	kind: PublicCatalogueKind
	locale: AppLocale
}) {
	await connection()
	const [items, t] = await Promise.all([
		getPublishedCatalogueList(kind, locale),
		getTranslations({ locale, namespace: 'Catalogue' }),
	])
	return (
		<main className="min-h-screen bg-white text-[#27335a]">
			<header className="overflow-hidden bg-[#eef1f7] px-6 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
				<div className="relative mx-auto max-w-6xl">
					<div aria-hidden="true" className="absolute -right-24 -top-40 size-80 rounded-full border-[48px] border-white/70 sm:size-96" />
					<p className="relative font-jose text-sm font-semibold uppercase tracking-[0.22em] text-[#53617f]">{t(`${kind}.eyebrow`)}</p>
					<h1 className="relative mt-4 max-w-4xl font-unna text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">{t(`${kind}.title`)}</h1>
					<p className="relative mt-6 max-w-2xl text-lg leading-8 text-slate-600">{t(`${kind}.introduction`)}</p>
				</div>
			</header>
			<section aria-labelledby={`${kind}-catalogue-heading`} className="px-6 py-14 sm:px-10 sm:py-20 lg:px-16">
				<div className="mx-auto max-w-6xl">
					<h2 className="sr-only" id={`${kind}-catalogue-heading`}>{t(`${kind}.catalogueLabel`)}</h2>
					{items.length ? (
						<ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
							{items.map((item, index) => (
								<li className={index % 2 ? 'sm:translate-y-6 lg:translate-y-0' : ''} key={item.id}>
									<Link className="group flex h-full min-h-72 flex-col overflow-hidden rounded-[2rem] border border-[#d9deea] bg-white p-7 shadow-[0_18px_50px_-36px_rgba(39,51,90,0.6)] transition duration-300 hover:-translate-y-1 hover:border-[#8d9bc0] hover:shadow-[0_24px_60px_-34px_rgba(39,51,90,0.65)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#27335a]" href={cataloguePath(locale, kind, item.slug)}>
										{item.icon ? <Image alt={item.icon.alt} className="size-24 object-contain object-left" height={96} src={item.icon.url} width={96} /> : <span aria-hidden="true" className="block size-16 rounded-full bg-[#e8ebf3] ring-8 ring-[#f6f7fa]" />}
										<div className="mt-auto pt-10">
											<h3 className="font-unna text-3xl leading-tight sm:text-4xl">{item.name}</h3>
											{item.summary ? <p className="mt-4 line-clamp-4 leading-7 text-slate-600">{item.summary}</p> : null}
											<span className="mt-6 inline-flex items-center gap-2 font-jose text-sm font-semibold uppercase tracking-[0.12em] text-[#53617f]">{t('readMore')}<span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></span>
										</div>
									</Link>
								</li>
							))}
						</ul>
					) : (
						<div className="rounded-[2rem] border border-dashed border-[#b9c1d5] bg-[#f8f9fb] px-6 py-14 text-center" role="status">
							<p className="font-unna text-3xl">{t(`${kind}.emptyTitle`)}</p>
							<p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">{t(`${kind}.emptyDescription`)}</p>
						</div>
					)}
				</div>
			</section>
		</main>
	)
}

export function CatalogueDetailPage({
	kind,
	locale,
	slug,
}: {
	kind: PublicCatalogueKind
	locale: AppLocale
	slug: string
}) {
	return <Suspense fallback={<CatalogueLoading kind={kind} />}><CatalogueDetailContent kind={kind} locale={locale} slug={slug} /></Suspense>
}

async function CatalogueDetailContent({
	kind,
	locale,
	slug,
}: {
	kind: PublicCatalogueKind
	locale: AppLocale
	slug: string
}) {
	await connection()
	const [detail, t] = await Promise.all([
		getPublishedCatalogueDetail(kind, locale, slug),
		getTranslations({ locale, namespace: 'Catalogue' }),
	])
	if (!detail) notFound()
	return (
		<main className="min-h-screen bg-white text-[#27335a]">
			<article>
				<header className="bg-[#eef1f7] px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
					<div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
						<div className="max-w-4xl">
							<Link className="font-jose text-sm font-semibold uppercase tracking-[0.16em] text-[#53617f] underline-offset-4 hover:underline" href={cataloguePath(locale, kind)}>← {t(`${kind}.title`)}</Link>
							<h1 className="mt-8 font-unna text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">{detail.name}</h1>
							{detail.summary ? <p className="mt-7 max-w-3xl text-xl leading-9 text-slate-600">{detail.summary}</p> : null}
						</div>
						{detail.icon ? <div className="flex size-40 shrink-0 items-center justify-center rounded-[2rem] bg-white p-7 shadow-sm"><Image alt={detail.icon.alt} className="size-full object-contain" height={112} priority src={detail.icon.url} width={112} /></div> : null}
					</div>
				</header>
				<div className="mx-auto grid max-w-6xl gap-14 px-6 py-14 sm:px-10 sm:py-20 lg:grid-cols-[minmax(0,1fr)_19rem] lg:px-16">
					<section aria-label={t('contentLabel')} className="min-w-0"><CatalogueRichText content={detail.content} /></section>
					{detail.contacts.length ? (
						<aside aria-labelledby="catalogue-contacts-heading" className="lg:border-l lg:border-slate-200 lg:pl-8">
							<p className="font-jose text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]" id="catalogue-contacts-heading">{t('contacts')}</p>
							<ul className="mt-5 space-y-5">
								{detail.contacts.map((contact) => (
									<li className="rounded-2xl border border-slate-200 p-5" key={contact.id}>
										<Link className="group block" href={cataloguePathForTeam(locale, contact.slug)}>
											{contact.portrait ? <Image alt={contact.portrait.alt} className="size-16 rounded-full object-cover" height={64} src={contact.portrait.url} width={64} /> : <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-[#e8ebf3] font-jose text-sm font-semibold">{initials(contact.cardName)}</span>}
											<span className="mt-4 block font-unna text-2xl leading-tight group-hover:underline">{contact.cardName}</span>
											{contact.role ? <span className="mt-1 block text-sm leading-6 text-slate-600">{contact.role}</span> : null}
										</Link>
										{contact.email || contact.phone ? <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-sm text-slate-600">{contact.email ? <a className="block break-all underline underline-offset-4" href={`mailto:${contact.email}`}>{contact.email}</a> : null}{contact.phone ? <a className="block underline underline-offset-4" href={`tel:${contact.phone}`}>{contact.phone}</a> : null}</div> : null}
									</li>
								))}
							</ul>
						</aside>
					) : null}
				</div>
				{detail.relatedArticles.length ? (
					<section aria-labelledby="related-newsroom-heading" className="bg-[#27335a] px-6 py-14 text-white sm:px-10 sm:py-20 lg:px-16">
						<div className="mx-auto max-w-6xl">
							<p className="font-jose text-xs font-semibold uppercase tracking-[0.2em] text-[#cbd2e4]">{t('newsroomEyebrow')}</p>
							<h2 className="mt-3 font-unna text-4xl sm:text-5xl" id="related-newsroom-heading">{t('relatedArticles')}</h2>
							<ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
								{detail.relatedArticles.map((article) => (
									<li className="rounded-2xl border border-white/20 bg-white/5 p-6" key={article.slug}>
										<time className="text-sm text-[#cbd2e4]" dateTime={article.publishedAt}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(article.publishedAt))}</time>
										<h3 className="mt-3 font-unna text-3xl leading-tight"><Link className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4" href={newsroomPath(locale, article.slug)}>{article.title}</Link></h3>
										{article.excerpt ? <p className="mt-4 line-clamp-4 leading-7 text-[#e5e8f0]">{article.excerpt}</p> : null}
									</li>
								))}
							</ul>
						</div>
					</section>
				) : null}
			</article>
		</main>
	)
}

function cataloguePathForTeam(locale: AppLocale, slug: string) {
	const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
	return `${prefix}/team/${slug}`
}

function newsroomPath(locale: AppLocale, slug: string) {
	const prefix = locale === routing.defaultLocale ? '' : `/${locale}`
	return `${prefix}/newsroom/${slug}`
}

function initials(name: string) {
	return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)
}
