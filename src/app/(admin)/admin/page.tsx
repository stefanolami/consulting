import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'

import { areasFor } from '@/components/admin/admin-areas'
import { LocalDateTime } from '@/components/admin/local-date-time'
import { loadAltGaps, loadAreaCounts, loadDrafts, loadRecent, loadScheduled, loadTranslationGaps, type AreaCounts, type DashboardItem } from '@/lib/admin-dashboard'
import { DASHBOARD_LIST_LIMIT, SCHEDULE_WINDOW_DAYS } from '@/lib/admin-dashboard-rules.mjs'
import { requireActiveStaff } from '@/lib/auth/authorization'

// The admin layout's title template applies to the pages below it, not to
// this page in its own segment, so the suffix is written out (audit X-14).
export const metadata: Metadata = {
	title: { absolute: 'Dashboard | Time&Place Admin' },
}

type DashboardPageProps = {
	searchParams: Promise<{ notice?: string | string[] }>
}

/*
 * The dashboard (audit DASH-01 to DASH-04, control tower §12.1): live
 * counts per area, what needs attention, and what changed recently. Each
 * section loads on its own, so a slow query does not hold up the rest.
 */
export default function DashboardPage({ searchParams }: DashboardPageProps) {
	return (
		<div className="mx-auto max-w-6xl">
			<Suspense fallback={null}>
				<AdminRequiredNotice searchParams={searchParams} />
			</Suspense>

			<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Overview</p>
			<h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950 sm:text-5xl">Dashboard</h1>
			<p className="mt-3 max-w-2xl leading-7 text-slate-600">
				What needs attention on the website and what changed recently.
			</p>

			<section aria-labelledby="areas-heading" className="mt-10">
				<SectionHeading id="areas-heading" title="Areas" />
				<Suspense fallback={<Skeleton className="h-104" label="Loading the areas" />}>
					<AreaCards />
				</Suspense>
			</section>

			<section aria-labelledby="attention-heading" className="mt-12">
				<SectionHeading id="attention-heading" text="Counts include every area; lists show the first items." title="Needs attention" />
				<div className="grid gap-5 lg:grid-cols-2">
					<Suspense fallback={<Skeleton className="h-72" label="Loading drafts" />}>
						<DraftsPanel />
					</Suspense>
					<Suspense fallback={<Skeleton className="h-72" label="Loading scheduled content" />}>
						<ScheduledPanel />
					</Suspense>
					<Suspense fallback={<Skeleton className="h-72 lg:col-span-2" label="Loading translation status" />}>
						<TranslationPanel />
					</Suspense>
					<Suspense fallback={<Skeleton className="h-56 lg:col-span-2" label="Loading the image check" />}>
						<AltTextPanel />
					</Suspense>
				</div>
			</section>

			<section aria-labelledby="recent-heading" className="mt-12">
				<SectionHeading id="recent-heading" title="Recently updated" />
				<Suspense fallback={<Skeleton className="h-96" label="Loading recent changes" />}>
					<RecentPanel />
				</Suspense>
			</section>
		</div>
	)
}

async function AdminRequiredNotice({ searchParams }: DashboardPageProps) {
	const params = await searchParams
	if (params.notice !== 'admin-required') return null
	return (
		<div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
			That area is available to administrators only.
		</div>
	)
}

function SectionHeading({ id, text, title }: { id: string; text?: string; title: string }) {
	return (
		<div className="mb-5">
			<h2 className="font-robo text-2xl text-slate-950" id={id}>{title}</h2>
			{text ? <p className="mt-1 text-sm text-slate-500">{text}</p> : null}
		</div>
	)
}

function Skeleton({ className, label }: { className: string; label: string }) {
	return <div aria-busy="true" aria-label={label} className={`animate-pulse rounded-xl bg-white ${className}`} role="status" />
}

function plural(count: number, one: string, many: string) {
	return `${count.toLocaleString('en-GB')} ${count === 1 ? one : many}`
}

// Areas -------------------------------------------------------------------------

function areaFacts(href: string, counts: AreaCounts): string[] {
	const live = (count: number) => `${count.toLocaleString('en-GB')} live in English`
	switch (href) {
		case '/admin/people': return [plural(counts.people.total, 'team profile', 'team profiles'), live(counts.people.liveInDefault), ...(counts.people.archived ? [`${counts.people.archived} archived`] : [])]
		case '/admin/catalogue': return [`${plural(counts.services.total, 'service', 'services')}, ${plural(counts.sectors.total, 'sector', 'sectors')}`, `${counts.services.liveInDefault} and ${counts.sectors.liveInDefault} live in English`]
		case '/admin/newsroom': return [plural(counts.articles.total, 'article', 'articles'), live(counts.articles.liveInDefault)]
		case '/admin/outreach': return [`${plural(counts.countries.total, 'country', 'countries')}, ${counts.countries.covered} covered`, `${plural(counts.offices.total, 'office', 'offices')}, ${plural(counts.regions.total, 'region', 'regions')}`]
		case '/admin/media': return [plural(counts.media.total, 'file', 'files')]
		case '/admin/partners': return [`${plural(counts.partners.total, 'partner', 'partners')}, ${plural(counts.endorsements.total, 'endorsement', 'endorsements')}`, `${counts.partners.liveInDefault} and ${counts.endorsements.liveInDefault} live in English`]
		case '/admin/legal': return [plural(counts.legal.total, 'page', 'pages'), live(counts.legal.liveInDefault)]
		case '/admin/redirects': return [plural(counts.redirects.total, 'redirect', 'redirects'), `${counts.redirects.enabled} enabled`]
		default: return []
	}
}

async function AreaCards() {
	const [counts, { profile }] = await Promise.all([loadAreaCounts(), requireActiveStaff()])
	return (
		<ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{areasFor(profile.role).filter((area) => area.href !== '/admin').map((area) => {
				const Icon = area.icon
				const facts = areaFacts(area.href, counts)
				return (
					<li key={area.href}>
						<Link className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-[#27335a]/40 hover:bg-[#f9fafc]" href={area.href}>
							<span className="flex items-center gap-3">
								<span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#27335a]"><Icon className="size-5" /></span>
								<span className="text-lg font-semibold text-slate-950 group-hover:underline group-hover:underline-offset-4">{area.label}</span>
								<ArrowRight aria-hidden="true" className="ml-auto size-4 text-slate-400 group-hover:text-[#27335a]" />
							</span>
							{facts.length ? (
								<span className="mt-4 grid gap-0.5">
									<span className="text-base font-semibold text-slate-900">{facts[0]}</span>
									{facts.slice(1).map((fact) => <span className="text-sm text-slate-600" key={fact}>{fact}</span>)}
								</span>
							) : null}
							<span className="mt-3 text-sm leading-6 text-slate-500">{area.description}</span>
						</Link>
					</li>
				)
			})}
		</ul>
	)
}

// Needs attention -----------------------------------------------------------------

function Panel({ children, className = '', count, footer, title }: { children: ReactNode; className?: string; count?: number; footer?: ReactNode; title: string }) {
	return (
		<div className={`flex flex-col rounded-xl border border-slate-200 bg-white p-5 ${className}`}>
			<h3 className="flex items-baseline gap-2 text-lg font-semibold text-slate-950">
				{title}
				{count === undefined ? null : <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${count ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{count.toLocaleString('en-GB')}</span>}
			</h3>
			<div className="mt-3 flex-1">{children}</div>
			{footer ? <div className="mt-4 border-t border-slate-100 pt-3 text-sm">{footer}</div> : null}
		</div>
	)
}

function Empty({ children }: { children: ReactNode }) {
	return <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">{children}</p>
}

function LocaleTag({ locale }: { locale: string | null }) {
	if (!locale) return null
	return <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold uppercase text-slate-600">{locale}</span>
}

function ItemList({ items, time }: { items: DashboardItem[]; time: 'updated' | 'live' }) {
	return (
		<ul className="divide-y divide-slate-100">
			{items.map((item) => (
				<li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5" key={`${item.key}:${item.locale ?? ''}`}>
					<span className="min-w-0">
						<span className="block text-xs font-medium uppercase tracking-wide text-slate-500">{item.noun}</span>
						<Link className="font-medium text-slate-900 underline-offset-4 hover:underline" href={item.href}>{item.label}</Link>
						{item.locale ? <> <LocaleTag locale={item.locale} /></> : null}
					</span>
					<span className="text-sm text-slate-500">
						{time === 'live' ? 'Goes live ' : 'Edited '}
						<LocalDateTime value={item.at} />
					</span>
				</li>
			))}
		</ul>
	)
}

function shownNote(count: number, shown: number, what: string) {
	return count > shown ? <p className="text-slate-500">Showing the {shown} {what}.</p> : null
}

async function DraftsPanel() {
	const drafts = await loadDrafts()
	return (
		<Panel count={drafts.count} footer={<div className="grid gap-1">{shownNote(drafts.count, drafts.items.length, 'most recently edited')}<Link className="font-medium text-[#27335a] underline-offset-4 hover:underline" href="/admin/newsroom?status=draft">Newsroom drafts</Link></div>} title="Drafts">
			<p className="mb-2 text-sm text-slate-600">Translations saved as drafts. Countries count only when covered: every country has a draft reference row.</p>
			{drafts.items.length ? <ItemList items={drafts.items} time="updated" /> : <Empty>No translation is a draft.</Empty>}
		</Panel>
	)
}

async function ScheduledPanel() {
	const scheduled = await loadScheduled()
	return (
		<Panel count={scheduled.count} footer={shownNote(scheduled.count, scheduled.items.length, 'soonest')} title={`Scheduled in the next ${SCHEDULE_WINDOW_DAYS} days`}>
			{scheduled.items.length ? <ItemList items={scheduled.items} time="live" /> : <Empty>Nothing is scheduled to go live in the next {SCHEDULE_WINDOW_DAYS} days.</Empty>}
		</Panel>
	)
}

async function TranslationPanel() {
	const gaps = await loadTranslationGaps()
	const rows = gaps.rows.filter((row) => row.liveInDefault > 0)
	const defaultLabel = gaps.labels[gaps.defaultLocale] ?? gaps.defaultLocale
	return (
		<Panel className="lg:col-span-2" title="Not yet live in every language">
			<p className="text-sm leading-6 text-slate-600">
				For content live in {defaultLabel}: how many items are not live in each other language yet, because the translation is missing, a draft, scheduled or archived.
			</p>
			{rows.length ? (
				<div className="mt-4 overflow-x-auto">
					<table className="w-full min-w-160 text-left text-sm">
						<caption className="sr-only">Content live in {defaultLabel} that is not live in each other language</caption>
						<thead className="border-b border-slate-200 text-slate-600">
							<tr>
								<th className="py-2 pr-4 font-medium" scope="col">Content</th>
								<th className="px-3 py-2 text-right font-medium" scope="col">Live in {defaultLabel}</th>
								{gaps.locales.map((locale) => <th className="px-3 py-2 text-right font-medium" key={locale} scope="col"><abbr className="no-underline" title={gaps.labels[locale]}>{locale}</abbr><span className="sr-only">: not live</span></th>)}
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => (
								<tr className="border-b border-slate-100 last:border-0" key={row.source}>
									<th className="py-2 pr-4 font-medium text-slate-900" scope="row">{row.plural.charAt(0).toUpperCase()}{row.plural.slice(1)}</th>
									<td className="px-3 py-2 text-right tabular-nums text-slate-700">{row.liveInDefault}</td>
									{gaps.locales.map((locale) => {
										const count = row.missing[locale] ?? 0
										const href = row.missingHref?.[locale]
										return (
											<td className="px-3 py-2 text-right tabular-nums" key={locale}>
												{count === 0
													? <span className="text-emerald-700">0</span>
													: href
														? <Link aria-label={`${count} ${row.plural} not live in ${gaps.labels[locale]}`} className="font-semibold text-amber-800 underline underline-offset-4" href={href}>{count}</Link>
														: <span className="font-semibold text-amber-800">{count}</span>}
											</td>
										)
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : <Empty>Nothing is live in {defaultLabel} yet.</Empty>}
			<p className="mt-3 text-xs leading-5 text-slate-500">Whether every language must be complete at launch is still open (control tower §23, decision 1). Newsroom and country numbers link to their filtered lists.</p>
		</Panel>
	)
}

async function AltTextPanel() {
	const gaps = await loadAltGaps()
	const shown = gaps.items.slice(0, DASHBOARD_LIST_LIMIT * 2)
	return (
		<Panel className="lg:col-span-2" count={gaps.count} footer={shownNote(gaps.count, shown.length, 'first by content type')} title="Images without alt text">
			<p className="text-sm leading-6 text-slate-600">Images on live content with no alt text in a language the content is live in. The public page leaves such an image out in that language.</p>
			{shown.length ? (
				<ul className="mt-3 divide-y divide-slate-100">
					{shown.map((gap) => (
						<li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5" key={gap.key}>
							<span className="min-w-0">
								<span className="block text-xs font-medium uppercase tracking-wide text-slate-500">{gap.noun}</span>
								<Link className="font-medium text-slate-900 underline-offset-4 hover:underline" href={gap.href}>{gap.label}</Link>
								<span className="text-sm text-slate-500"> · {gap.image}</span>
							</span>
							<span className="flex flex-wrap items-center gap-2">
								<span className="sr-only">Missing in:</span>
								{gap.missing.map((locale) => <LocaleTag key={locale} locale={locale} />)}
								<Link className="text-sm font-medium text-[#27335a] underline underline-offset-4" href={gap.mediaHref}>Add alt text<span className="sr-only"> for {gap.image}</span></Link>
							</span>
						</li>
					))}
				</ul>
			) : <div className="mt-3"><Empty>Every image on live content has alt text in each language it is live in.</Empty></div>}
		</Panel>
	)
}

// Recently updated ----------------------------------------------------------------

async function RecentPanel() {
	const [recent, { profile }] = await Promise.all([loadRecent(), requireActiveStaff()])
	// Editors do not see Redirects (editorial simplification §3.4).
	const items = profile.role === 'admin' ? recent : recent.filter((item) => item.source !== 'redirects')
	return (
		<div className="rounded-xl border border-slate-200 bg-white px-5 py-2">
			{items.length ? <ItemList items={items} time="updated" /> : <div className="py-3"><Empty>Nothing has been edited yet.</Empty></div>}
		</div>
	)
}
