import { CalendarDays, LayoutGrid, Search, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { isArticleKind } from '@/components/newsroom/article-kind'
import { NewsroomFilterForm } from '@/components/newsroom/newsroom-filter-form'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from '@/i18n/navigation'
import type { AppLocale } from '@/i18n/routing'
import type { NewsroomFilters, NewsroomListing } from '@/lib/public-newsroom'
import { cn } from '@/lib/utils'

export type NewsroomToolbarLabels = {
	activeFilters: string
	anyOption: string
	anyYear: string
	apply: string
	author: string
	calendar: string
	categories: string
	clear: string
	kind: string
	kinds: Record<string, string>
	removeFilter: (label: string) => string
	search: string
	searchChip: (query: string) => string
	searchPlaceholder: string
	searchSubmit: string
	sector: string
	service: string
	tag: string
	year: string
}

type NewsroomToolbarProps = {
	action: string
	filters: NewsroomFilters
	labels: NewsroomToolbarLabels
	options: NewsroomListing['filters']
}

const rowClass = 'flex flex-wrap items-center gap-3'
const searchFieldClass = 'h-[3.4375rem] w-full min-w-0 rounded-pill sm:w-[20.75rem]'
const circleClass = 'relative grid size-[3.4375rem] shrink-0 place-items-center rounded-pill'
const buttonClass = cn(circleClass, 'cursor-pointer bg-tp-blue text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none')
const panelClass = 'absolute inset-x-0 top-full z-20 mt-3 border border-tp-blue bg-white p-[clamp(1.25rem,1rem+1vw,2rem)] text-black shadow-lg'
const fieldLabelClass = 'grid gap-1.5 font-serif text-label font-bold text-brand'
const controlClass = 'h-11 w-full rounded-control border border-tp-blue bg-white px-3 font-label text-body font-normal text-black focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus'
const applyClass = 'cursor-pointer bg-tp-blue px-6 py-2.5 font-serif text-body uppercase text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none'
const secondaryLinkClass = 'rounded-control font-serif text-body text-brand underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

// Figma 5408:334 filter bar: a grey search pill, then round buttons for
// search, the calendar drop-down and the categories drop-down (annotations
// "DROP-DOWN MENU: CALENDAR / CATEGORIES"). The drop-downs are native
// disclosures that share a name, so opening one closes the other; they sit in
// the one GET form, so every choice travels together in the URL. The
// "Subscribe to Newsletter" button is omitted: there is no subscription
// feature (control tower §15.7).
export function NewsroomToolbar({ action, filters, labels, options }: NewsroomToolbarProps) {
	const kinds = options.kinds.filter(isArticleKind)
	const categoryCount = (['kind', 'tag', 'service', 'sector', 'author'] as const).filter((key) => filters[key]).length
	return (
		<NewsroomFilterForm action={action} className="relative">
			<div className={rowClass}>
				<label className="sr-only" htmlFor="newsroom-search">{labels.search}</label>
				<input
					className={cn(searchFieldClass, 'bg-surface-muted px-6 font-serif text-lead font-light italic text-brand placeholder:text-brand/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus')}
					defaultValue={filters.q ?? ''}
					enterKeyHint="search"
					id="newsroom-search"
					maxLength={100}
					name="q"
					placeholder={labels.searchPlaceholder}
					type="search"
				/>
				<button className={buttonClass} type="submit">
					<Search aria-hidden="true" className="size-6" strokeWidth={2.25} />
					<span className="sr-only">{labels.searchSubmit}</span>
				</button>
				<FilterMenu active={filters.year ? 1 : 0} icon={<CalendarDays aria-hidden="true" className="size-6" strokeWidth={2} />} label={labels.calendar}>
					<fieldset>
						<legend className="font-serif text-body font-bold text-brand">{labels.year}</legend>
						<div className="mt-3 flex flex-wrap gap-2">
							{[{ label: labels.anyYear, value: '' }, ...options.years.map((year) => ({ label: year, value: year }))].map((option) => (
								<label className="cursor-pointer rounded-pill border border-tp-blue px-4 py-1.5 font-label text-body text-brand has-[:checked]:bg-tp-blue has-[:checked]:text-on-brand has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus" key={option.value || 'any'}>
									<input className="sr-only" defaultChecked={(filters.year ?? '') === option.value} name="year" type="radio" value={option.value} />
									{option.label}
								</label>
							))}
						</div>
					</fieldset>
					<PanelActions action={action} labels={labels} />
				</FilterMenu>
				<FilterMenu active={categoryCount} icon={<LayoutGrid aria-hidden="true" className="size-6" strokeWidth={2} />} label={labels.categories}>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{kinds.length ? <FilterSelect anyOption={labels.anyOption} defaultValue={filters.kind} label={labels.kind} name="kind" options={kinds.map((kind) => ({ label: labels.kinds[kind] ?? kind, slug: kind }))} /> : null}
						<FilterSelect anyOption={labels.anyOption} defaultValue={filters.tag} label={labels.tag} name="tag" options={options.tags} />
						<FilterSelect anyOption={labels.anyOption} defaultValue={filters.service} label={labels.service} name="service" options={options.services} />
						<FilterSelect anyOption={labels.anyOption} defaultValue={filters.sector} label={labels.sector} name="sector" options={options.sectors} />
						<FilterSelect anyOption={labels.anyOption} defaultValue={filters.author} label={labels.author} name="author" options={options.authors} />
					</div>
					<PanelActions action={action} labels={labels} />
				</FilterMenu>
			</div>
		</NewsroomFilterForm>
	)
}

function FilterMenu({ active, children, icon, label }: { active: number; children: ReactNode; icon: ReactNode; label: string }) {
	return (
		<details className="group/menu" name="newsroom-filter-menu">
			<summary className={cn(buttonClass, 'list-none group-open/menu:bg-brand [&::-webkit-details-marker]:hidden')}>
				{icon}
				<span className="sr-only">{label}</span>
				{active ? <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-pill bg-action font-label text-[0.75rem] font-bold text-on-action">{active}</span> : null}
			</summary>
			<div className={panelClass}>{children}</div>
		</details>
	)
}

function PanelActions({ action, labels }: { action: string; labels: Pick<NewsroomToolbarLabels, 'apply' | 'clear'> }) {
	return (
		<div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
			<button className={applyClass} type="submit">{labels.apply}</button>
			<a className={secondaryLinkClass} href={action}>{labels.clear}</a>
		</div>
	)
}

function FilterSelect({ anyOption, defaultValue, label, name, options }: { anyOption: string; defaultValue?: string; label: string; name: string; options: Array<{ label: string; slug: string }> }) {
	return (
		<label className={fieldLabelClass}>
			<span>{label}</span>
			<select className={controlClass} defaultValue={defaultValue ?? ''} name={name}>
				<option value="">{anyOption}</option>
				{options.map((option) => <option key={option.slug} value={option.slug}>{option.label}</option>)}
			</select>
		</label>
	)
}

// Active filters as removable chips, each a link to the listing without it.
export function NewsroomActiveFilters({ filters, labels, locale, options }: { filters: NewsroomFilters; labels: NewsroomToolbarLabels; locale: AppLocale; options: NewsroomListing['filters'] }) {
	const find = (items: Array<{ label: string; slug: string }>, slug: string) => items.find((item) => item.slug === slug)?.label ?? slug
	const chips = (Object.entries(filters) as Array<[keyof NewsroomFilters, string]>).map(([key, value]) => ({
		key,
		label: key === 'q' ? labels.searchChip(value)
			: key === 'year' ? value
				: key === 'kind' ? labels.kinds[value] ?? value
					: key === 'tag' ? find(options.tags, value)
						: key === 'service' ? find(options.services, value)
							: key === 'sector' ? find(options.sectors, value)
								: find(options.authors, value),
	}))
	if (!chips.length) return null
	return (
		<div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
			<h2 className="sr-only">{labels.activeFilters}</h2>
			<ul className="flex flex-wrap gap-2">
				{chips.map((chip) => {
					const rest = Object.fromEntries(Object.entries(filters).filter(([key]) => key !== chip.key))
					return (
						<li key={chip.key}>
							<Link aria-label={labels.removeFilter(chip.label)} className="inline-flex items-center gap-1.5 rounded-pill bg-tp-blue py-1.5 pl-4 pr-3 font-label text-body text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none" href={{ pathname: '/newsroom', query: rest }} locale={locale}>
								{chip.label}
								<X aria-hidden="true" className="size-4" />
							</Link>
						</li>
					)
				})}
			</ul>
			<Link className={secondaryLinkClass} href="/newsroom" locale={locale}>{labels.clear}</Link>
		</div>
	)
}

export function NewsroomToolbarSkeleton() {
	return (
		<div className={rowClass}>
			<Skeleton className={cn(searchFieldClass, 'rounded-pill')} tone="light" />
			{Array.from({ length: 3 }, (_, index) => <Skeleton className={cn(circleClass, 'rounded-pill')} key={index} tone="light" />)}
		</div>
	)
}
