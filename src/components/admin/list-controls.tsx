'use client'

import { ChevronLeft, ChevronRight, LoaderCircle, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState, useTransition, type FormEvent, type MouseEvent, type ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { changeListQuery, listQueryString, normalizeSearch, pageWindow, parseListQuery, type ListSpec, type ListState } from '@/lib/admin-list-query.mjs'
import { cn } from '@/lib/utils'

type Change<S extends ListSpec> = Partial<{ [K in keyof S]: ListState<S>[K] | null }>

/**
 * List state in the URL (audit NEWS-09, OUT-08, CAT-09): the state is read
 * from the current URL, so back and forward restore it. A change adds a
 * history entry; `replace` updates the current one (the search field does
 * this while the editor keeps typing). With `navigate: 'history'` the list
 * filters in the browser and only the URL changes (small lists that are
 * loaded whole); with 'server' the page is fetched again for the new URL.
 */
export function useListQuery<S extends ListSpec>(spec: S, navigate: 'history' | 'server') {
	const params = useSearchParams()
	const pathname = usePathname()
	const router = useRouter()
	const [pending, startTransition] = useTransition()
	const state = useMemo(() => parseListQuery(spec, params), [spec, params])

	function hrefFor(change: Change<S>) {
		return `${pathname}${listQueryString(spec, changeListQuery(spec, state, change))}`
	}
	function update(change: Change<S>, { replace = false }: { replace?: boolean } = {}) {
		const href = hrefFor(change)
		if (href === `${pathname}${listQueryString(spec, state)}`) return
		if (navigate === 'history') {
			window.history[replace ? 'replaceState' : 'pushState'](null, '', href)
			return
		}
		startTransition(() => {
			if (replace) router.replace(href, { scroll: false })
			else router.push(href, { scroll: false })
		})
	}
	return { hrefFor, pending, state, update }
}

/**
 * A labelled search box that filters as the editor types (after a short
 * pause) and on Enter. The first change of a search adds a history entry
 * and the following keystrokes replace it, so one search is one step back.
 * When the URL changes from outside (back, forward, a link), the box shows
 * the URL's search again.
 */
export function SearchField({ className, label, onSearch, placeholder, value }: { className?: string; label: string; onSearch: (text: string, options: { replace: boolean }) => void; placeholder?: string; value: string }) {
	// `seen` is the URL's search at the last render. When it changes, the
	// box keeps what the editor typed if the change is the search it sent,
	// and otherwise shows the URL's search (back, forward, a link).
	const [draft, setDraft] = useState({ seen: value, text: value, sent: null as string | null })
	const [session, setSession] = useState(false)
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const sent = useRef<string | null>(null)
	let current = draft
	if (value !== draft.seen) {
		const ours = value === draft.sent
		current = { seen: value, text: ours ? draft.text : value, sent: ours ? draft.sent : null }
		setDraft(current)
	}
	const text = current.text

	// A search still waiting to be sent is dropped when the URL changes from
	// outside, so it cannot undo a back or forward step.
	useEffect(() => {
		if (value !== sent.current && timer.current) {
			clearTimeout(timer.current)
			timer.current = null
		}
	}, [value])
	useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

	function commit(next: string) {
		if (timer.current) clearTimeout(timer.current)
		timer.current = null
		const normalized = normalizeSearch(next)
		sent.current = normalized
		setDraft((previous) => ({ ...previous, sent: normalized }))
		onSearch(normalized, { replace: session })
		setSession(true)
	}
	function onChange(next: string) {
		setDraft((previous) => ({ ...previous, text: next }))
		if (timer.current) clearTimeout(timer.current)
		timer.current = setTimeout(() => commit(next), 350)
	}
	function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		commit(text)
	}

	return (
		<form className={cn('relative block max-w-md flex-1', className)} onSubmit={onSubmit} role="search">
			<label className="block">
				<span className="sr-only">{label}</span>
				<Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
				<Input className="h-10 bg-white pl-9" onBlur={() => setSession(false)} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type="search" value={text} />
			</label>
		</form>
	)
}

/** A labelled filter select. The empty value means "all". */
export function FilterSelect({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: readonly { value: string; label: string; disabled?: boolean }[]; value: string }) {
	const id = useId()
	return (
		<div className="grid gap-1 text-sm">
			<label className="font-medium text-slate-700" htmlFor={id}>{label}</label>
			<select className="input-select h-10 min-w-36" id={id} onChange={(event) => onChange(event.target.value)} value={value}>
				{options.map((option) => <option disabled={option.disabled} key={option.value} value={option.value}>{option.label}</option>)}
			</select>
		</div>
	)
}

/**
 * Links between two views of one list (Services and Sectors, Partners and
 * Endorsements). They are links with `aria-current`, not tabs: each view has
 * its own URL. A plain click switches in place.
 */
export function ViewSwitch({ current, items, label, onSelect }: { current: string; items: readonly { value: string; label: string; href: string; count?: number }[]; label: string; onSelect?: (value: string) => void }) {
	function onClick(event: MouseEvent<HTMLAnchorElement>, value: string) {
		if (!onSelect || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
		event.preventDefault()
		onSelect(value)
	}
	return (
		<nav aria-label={label}>
			<ul className="flex flex-wrap gap-2">
				{items.map((item) => {
					const active = item.value === current
					return (
						<li key={item.value}>
							<a
								aria-current={active ? 'page' : undefined}
								className={cn('inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors', active ? 'border-[#27335a] bg-[#27335a] text-white' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50')}
								href={item.href}
								onClick={(event) => onClick(event, item.value)}
							>
								{item.label}
								{item.count === undefined ? null : <span className={cn('rounded-full px-1.5 text-xs', active ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>{item.count}</span>}
							</a>
						</li>
					)
				})}
			</ul>
		</nav>
	)
}

/** "Updating…" while a server list loads the new URL. */
export function ListPending({ pending }: { pending: boolean }) {
	return (
		<span aria-live="polite" className="inline-flex h-10 items-center gap-2 text-sm text-slate-500">
			{pending ? <><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Updating…</> : null}
		</span>
	)
}

/** The toolbar row: search, filters and actions, wrapping on narrow screens. */
export function ListToolbar({ children }: { children: ReactNode }) {
	return <div className="flex flex-wrap items-end gap-x-4 gap-y-3">{children}</div>
}

/**
 * Page links for a server list. Previous and next, and the pages around
 * the current one; every link is a real URL.
 */
export function Pagination<S extends ListSpec & { page: { type: 'page' } }>({ label, page, pageSize, spec, total }: { label: string; page: number; pageSize: number; spec: S; total: number }) {
	const { hrefFor } = useListQuery(spec, 'server')
	const window = pageWindow(total, page, pageSize)
	if (window.pageCount <= 1) return <p className="text-sm text-slate-500">{total ? `Showing all ${total}.` : null}</p>
	const pages = [...new Set([1, window.page - 1, window.page, window.page + 1, window.pageCount])].filter((item) => item >= 1 && item <= window.pageCount).sort((a, b) => a - b)
	const link = (target: number) => hrefFor({ page: target } as Change<S>)
	const control = 'inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50'
	return (
		<nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3">
			<p className="text-sm text-slate-600">Showing {window.first}–{window.last} of {total}</p>
			<ul className="flex flex-wrap items-center gap-1.5">
				<li>{window.page > 1 ? <Link className={control} href={link(window.page - 1)} scroll={false}><ChevronLeft aria-hidden="true" className="size-4" />Previous</Link> : <span aria-disabled="true" className={cn(control, 'pointer-events-none opacity-50')}><ChevronLeft aria-hidden="true" className="size-4" />Previous</span>}</li>
				{pages.map((item, index) => (
					<li className="flex items-center gap-1.5" key={item}>
						{index > 0 && item - pages[index - 1] > 1 ? <span aria-hidden="true" className="px-1 text-slate-400">…</span> : null}
						{item === window.page
							? <span aria-current="page" className={cn(control, 'border-[#27335a] bg-[#27335a] text-white hover:bg-[#27335a]')}><span className="sr-only">Page </span>{item}</span>
							: <Link className={control} href={link(item)} scroll={false}><span className="sr-only">Page </span>{item}</Link>}
					</li>
				))}
				<li>{window.page < window.pageCount ? <Link className={control} href={link(window.page + 1)} scroll={false}>Next<ChevronRight aria-hidden="true" className="size-4" /></Link> : <span aria-disabled="true" className={cn(control, 'pointer-events-none opacity-50')}>Next<ChevronRight aria-hidden="true" className="size-4" /></span>}</li>
			</ul>
		</nav>
	)
}
