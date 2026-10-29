'use client'

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import { useUnsavedChanges } from '@/components/admin/form/unsaved-changes'
import { legalStatusLabel, LegalStatusBadge, type LegalStatus } from '@/components/admin/legal-status'
import { routing, type AppLocale } from '@/i18n/routing'
import { nextTabIndex } from '@/lib/admin-form-state.mjs'

export type PublicationStatus = LegalStatus

export const LOCALE_NAMES: Record<AppLocale, string> = { de: 'German', en: 'English', it: 'Italian', 'pt-BR': 'Portuguese (Brazil)', 'pt-PT': 'Portuguese (Portugal)' }

/**
 * Language tabs for a translation form (audit X-06, from the legal editor):
 * WAI-ARIA tabs with a roving tab stop, arrow keys, Home and End; a status
 * badge per language when `statuses` is given; and, when the form in `scope`
 * has unsaved changes, an in-page dialog before switching. The panel's
 * content should be keyed by the active locale so each language starts from
 * its own saved data.
 */
export function LocaleTabs({ active, children, label = 'Languages', locales = routing.locales, onChange, scope, statuses }: {
	active: AppLocale
	children: ReactNode
	label?: string
	locales?: readonly AppLocale[]
	onChange: (locale: AppLocale) => void
	scope?: string
	statuses?: Partial<Record<AppLocale, PublicationStatus | null>>
}) {
	const unsaved = useUnsavedChanges()
	const tabRefs = useRef<Partial<Record<AppLocale, HTMLButtonElement | null>>>({})
	const baseId = useId()
	const tabId = (locale: AppLocale) => `${baseId}-tab-${locale}`
	const panelId = `${baseId}-panel`

	async function select(locale: AppLocale) {
		if (locale === active) return
		const discard = unsaved ? await unsaved.confirmDiscard({ reason: 'switch', scope }) : true
		if (!discard) {
			tabRefs.current[active]?.focus()
			return
		}
		onChange(locale)
		tabRefs.current[locale]?.focus()
	}

	function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
		const next = nextTabIndex(event.key, locales.indexOf(active), locales.length)
		if (next === null) return
		event.preventDefault()
		void select(locales[next])
	}

	return (
		<>
			<div aria-label={label} className="mt-5 flex flex-wrap gap-2" role="tablist">
				{locales.map((locale) => {
					const selected = locale === active
					const status = statuses ? statuses[locale] ?? null : undefined
					return (
						<button
							aria-controls={panelId}
							aria-label={status === undefined ? LOCALE_NAMES[locale] : `${LOCALE_NAMES[locale]}: ${legalStatusLabel(status)}`}
							aria-selected={selected}
							className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27335a] ${selected ? 'border-[#27335a] bg-[#27335a] text-white' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'}`}
							id={tabId(locale)}
							key={locale}
							onClick={() => void select(locale)}
							onKeyDown={onKeyDown}
							ref={(element) => { tabRefs.current[locale] = element }}
							role="tab"
							tabIndex={selected ? 0 : -1}
							type="button"
						>
							{LOCALE_NAMES[locale] ?? locale}
							{status === undefined ? null : <LegalStatusBadge status={status} />}
						</button>
					)
				})}
			</div>
			<div aria-labelledby={tabId(active)} id={panelId} role="tabpanel">
				{children}
			</div>
		</>
	)
}

/**
 * Per-locale statuses for the tab badges: the page's data, overridden by the
 * statuses saved in this session until the refreshed page data arrives.
 */
export function useLocaleStatuses(translations: readonly { locale: string; status: PublicationStatus }[]) {
	const [saved, setSaved] = useState<{ basis: unknown; statuses: Partial<Record<AppLocale, PublicationStatus>> }>({ basis: translations, statuses: {} })
	const overrides = saved.basis === translations ? saved.statuses : {}
	const statuses = Object.fromEntries(routing.locales.map((locale) => [locale, overrides[locale] ?? translations.find((item) => item.locale === locale)?.status ?? null])) as Record<AppLocale, PublicationStatus | null>
	function setStatus(locale: AppLocale, status: PublicationStatus) {
		setSaved((current) => ({ basis: translations, statuses: { ...(current.basis === translations ? current.statuses : {}), [locale]: status } }))
	}
	return [statuses, setStatus] as const
}
