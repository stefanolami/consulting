'use client'

import { ExternalLink, LoaderCircle } from 'lucide-react'
import { useActionState, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import { deleteLegalTranslationAction, saveLegalTranslationAction, type LegalActionState } from '@/app/(admin)/admin/legal/actions'
import { LegalRichTextEditor } from '@/components/admin/legal-rich-text-editor'
import { legalStatusLabel, LegalStatusBadge, type LegalStatus } from '@/components/admin/legal-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { routing, type AppLocale } from '@/i18n/routing'
import { emptyLegalDocument, type LegalDocument } from '@/lib/legal-document.mjs'
import { legalPath, type LegalPageKey } from '@/lib/legal-pages'

export type LegalEditorTranslation = {
	content: LegalDocument
	lastUpdatedOn: string | null
	locale: AppLocale
	scheduledFor: string | null
	seoDescription: string | null
	seoTitle: string | null
	status: LegalStatus
	title: string
	updatedAt: string
	updatedByName: string | null
}

const LOCALE_NAMES: Record<AppLocale, string> = { de: 'German', en: 'English', it: 'Italian', 'pt-BR': 'Portuguese (Brazil)', 'pt-PT': 'Portuguese (Portugal)' }
const initialState: LegalActionState = {}

export function LegalEditor({ canDelete, stableKey, translations }: { canDelete: boolean; stableKey: LegalPageKey; translations: LegalEditorTranslation[] }) {
	const [activeLocale, setActiveLocale] = useState<AppLocale>(routing.defaultLocale)
	const tabRefs = useRef<Partial<Record<AppLocale, HTMLButtonElement | null>>>({})
	const baseId = useId()
	const tabId = (locale: AppLocale) => `${baseId}-tab-${locale}`
	const panelId = `${baseId}-panel`

	// Arrow keys, Home and End move between language tabs (WAI-ARIA tabs).
	function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
		const index = routing.locales.indexOf(activeLocale)
		const next = { ArrowLeft: index - 1, ArrowRight: index + 1, End: routing.locales.length - 1, Home: 0 }[event.key]
		if (next === undefined) return
		event.preventDefault()
		const locale = routing.locales[(next + routing.locales.length) % routing.locales.length]
		setActiveLocale(locale)
		tabRefs.current[locale]?.focus()
	}

	return (
		<section aria-labelledby={`${baseId}-heading`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
			<h2 className="font-robo text-2xl text-slate-950" id={`${baseId}-heading`}>Translations and publication</h2>
			<p className="mt-1 text-sm text-slate-600">Each language has its own title, text, “Last updated” date, SEO fields and publication state. Nothing falls back to English.</p>
			<div aria-label="Languages" className="mt-5 flex flex-wrap gap-2" role="tablist">
				{routing.locales.map((locale) => {
					const status = translations.find((item) => item.locale === locale)?.status ?? null
					const selected = activeLocale === locale
					return (
						<button
							aria-controls={panelId}
							aria-label={`${LOCALE_NAMES[locale]}: ${legalStatusLabel(status)}`}
							aria-selected={selected}
							className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27335a] ${selected ? 'border-[#27335a] bg-[#27335a] text-white' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'}`}
							id={tabId(locale)}
							key={locale}
							onClick={() => setActiveLocale(locale)}
							onKeyDown={onTabKeyDown}
							ref={(element) => { tabRefs.current[locale] = element }}
							role="tab"
							tabIndex={selected ? 0 : -1}
							type="button"
						>
							{locale}
							<LegalStatusBadge status={status} />
						</button>
					)
				})}
			</div>
			<div aria-labelledby={tabId(activeLocale)} id={panelId} role="tabpanel">
				<TranslationForm canDelete={canDelete} key={activeLocale} locale={activeLocale} stableKey={stableKey} translation={translations.find((item) => item.locale === activeLocale)} />
			</div>
		</section>
	)
}

function TranslationForm({ canDelete, locale, stableKey, translation }: { canDelete: boolean; locale: AppLocale; stableKey: LegalPageKey; translation?: LegalEditorTranslation }) {
	const [state, action, pending] = useActionState(saveLegalTranslationAction, initialState)
	// Controlled fields, so React's form reset after an action never discards
	// what the editor typed when the server returns an error.
	const [title, setTitle] = useState(translation?.title ?? '')
	const [lastUpdatedOn, setLastUpdatedOn] = useState(translation?.lastUpdatedOn ?? '')
	const [status, setStatus] = useState<LegalStatus>(translation?.status ?? 'draft')
	const [scheduledFor, setScheduledFor] = useState(toDateTimeLocal(translation?.scheduledFor))
	const [seoTitle, setSeoTitle] = useState(translation?.seoTitle ?? '')
	const [seoDescription, setSeoDescription] = useState(translation?.seoDescription ?? '')
	const [editorKey, setEditorKey] = useState(0)
	// After an admin deletes the translation, the form starts again from an
	// empty draft.
	const [deleteState, deleteAction, deleting] = useActionState(async (previous: LegalActionState, formData: FormData) => {
		const result = await deleteLegalTranslationAction(previous, formData)
		if (result.success) {
			setTitle(''); setLastUpdatedOn(''); setStatus('draft'); setScheduledFor(''); setSeoTitle(''); setSeoDescription('')
			setEditorKey((key) => key + 1)
		}
		return result
	}, initialState)
	const formRef = useRef<HTMLFormElement>(null)
	const id = useId()
	const fieldId = (field: string) => `${id}-${field}`
	const errorId = `${id}-error`
	const invalid = (field: NonNullable<LegalActionState['field']>) => state.error && state.field === field ? { 'aria-describedby': errorId, 'aria-invalid': true } : {}

	// Move focus to the field the server rejected.
	useEffect(() => {
		if (!state.field) return
		const target = formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(fieldId(state.field))}`)
		target?.focus()
	}, [state]) // eslint-disable-line react-hooks/exhaustive-deps


	function changeStatus(next: LegalStatus) {
		setStatus(next)
		// The "Last updated" date is required to publish; suggest today.
		if ((next === 'published' || next === 'scheduled') && !lastUpdatedOn) setLastUpdatedOn(localToday())
	}

	const exists = Boolean(translation) && !deleteState.success
	const publicHref = legalPath(stableKey, locale)

	return (
		<div className="mt-6 space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
				<p>
					{exists && translation
						? <>Last saved {formatDateTime(translation.updatedAt)}{translation.updatedByName ? <> by {translation.updatedByName}</> : null}.</>
						: <>No {LOCALE_NAMES[locale]} translation yet. Saving creates it.</>}
				</p>
				{exists && translation?.status === 'published'
					? <a className="inline-flex items-center gap-1 font-medium text-[#27335a] underline-offset-4 hover:underline" href={publicHref} rel="noreferrer" target="_blank">View public page<ExternalLink aria-hidden="true" className="size-3.5" /><span className="sr-only"> (opens in a new tab)</span></a>
					: null}
			</div>
			<form action={action} className="grid gap-5 md:grid-cols-2" noValidate ref={formRef}>
				<input name="stableKey" type="hidden" value={stableKey} />
				<input name="locale" type="hidden" value={locale} />
				<Field className="md:col-span-2" htmlFor={fieldId('title')} label="Page title" required>
					<Input id={fieldId('title')} maxLength={160} name="title" onChange={(event) => setTitle(event.target.value)} value={title} {...invalid('title')} />
				</Field>
				<div className="md:col-span-2">
					<span className="text-sm font-medium text-slate-700" id={`${fieldId('content')}-label`}>Page text</span>
					<p className="mt-1 text-sm text-slate-600" id={`${fieldId('content')}-hint`}>Section headings, paragraphs, bold, italic, lists, line breaks (Shift+Enter) and links. Link to other pages of this website with a path such as <code>/privacy-policy</code>; visitors stay in their language.</p>
					<LegalRichTextEditor
						describedBy={[`${fieldId('content')}-hint`, state.field === 'content' && state.error ? errorId : null].filter(Boolean).join(' ')}
						id={fieldId('content')}
						initialValue={(exists ? translation?.content : undefined) ?? emptyLegalDocument()}
						invalid={state.field === 'content' && Boolean(state.error)}
						key={editorKey}
						label={`${LOCALE_NAMES[locale]} page text`}
					/>
				</div>
				<Field htmlFor={fieldId('status')} label="Publication status">
					<select className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" id={fieldId('status')} name="status" onChange={(event) => changeStatus(event.target.value as LegalStatus)} value={status} {...invalid('status')}>
						<option value="draft">Draft</option>
						<option value="scheduled">Scheduled</option>
						<option value="published">Published</option>
						<option value="archived">Archived</option>
					</select>
				</Field>
				<Field hint="Shown to visitors. Required to publish; today is suggested when you choose Published." htmlFor={fieldId('lastUpdatedOn')} label="“Last updated” date" required={status === 'published' || status === 'scheduled'}>
					<div className="flex gap-2">
						<Input className="flex-1" id={fieldId('lastUpdatedOn')} name="lastUpdatedOn" onChange={(event) => setLastUpdatedOn(event.target.value)} type="date" value={lastUpdatedOn} {...invalid('lastUpdatedOn')} />
						<Button onClick={() => setLastUpdatedOn(localToday())} type="button" variant="outline">Today</Button>
					</div>
				</Field>
				{status === 'scheduled' ? (
					<Field hint="Scheduled translations are not published automatically yet; publish them at this time." htmlFor={fieldId('scheduledFor')} label="Scheduled publication time" required>
						<Input id={fieldId('scheduledFor')} name="scheduledFor" onChange={(event) => setScheduledFor(event.target.value)} type="datetime-local" value={scheduledFor} {...invalid('scheduledFor')} />
					</Field>
				) : <div aria-hidden="true" className="hidden md:block" />}
				<div aria-hidden="true" className="hidden md:block" />
				<Field hint="Optional. The page title is used when empty." htmlFor={fieldId('seoTitle')} label="SEO title">
					<Input id={fieldId('seoTitle')} maxLength={160} name="seoTitle" onChange={(event) => setSeoTitle(event.target.value)} value={seoTitle} {...invalid('seoTitle')} />
				</Field>
				<Field hint="Optional, up to 320 characters." htmlFor={fieldId('seoDescription')} label="SEO description">
					<textarea className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm shadow-xs" id={fieldId('seoDescription')} maxLength={320} name="seoDescription" onChange={(event) => setSeoDescription(event.target.value)} value={seoDescription} {...invalid('seoDescription')} />
				</Field>
				<div className="flex flex-wrap items-center gap-3 md:col-span-2">
					<Button disabled={pending} type="submit">{pending && <LoaderCircle aria-hidden="true" className="animate-spin" />}Save {LOCALE_NAMES[locale]} translation</Button>
				</div>
				<Notice id={errorId} state={state} />
			</form>
			{canDelete && exists ? (
				<form
					action={deleteAction}
					className="flex flex-col justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center"
					onSubmit={(event) => {
						if (!window.confirm(`Delete the ${LOCALE_NAMES[locale]} translation of this page permanently? This cannot be undone.${locale === routing.defaultLocale ? ' Without English, the page returns “not found” in every language.' : ''}`)) event.preventDefault()
					}}
				>
					<input name="stableKey" type="hidden" value={stableKey} />
					<input name="locale" type="hidden" value={locale} />
					<div>
						<h3 className="font-semibold text-red-950">Delete this translation</h3>
						<p className="mt-1 text-sm text-red-900">Administrators only. Archiving is the usual way to withdraw a translation.</p>
					</div>
					<Button disabled={deleting} type="submit" variant="destructive">{deleting && <LoaderCircle aria-hidden="true" className="animate-spin" />}Delete {locale}</Button>
				</form>
			) : null}
			<Notice state={deleteState} />
		</div>
	)
}

function Field({ children, className, hint, htmlFor, label, required = false }: { children: ReactNode; className?: string; hint?: string; htmlFor: string; label: string; required?: boolean }) {
	return (
		<div className={`grid content-start gap-1.5 text-sm ${className ?? ''}`}>
			<label className="font-medium text-slate-700" htmlFor={htmlFor}>{label}{required ? <span aria-hidden="true" className="text-red-700"> *</span> : null}{required ? <span className="sr-only"> (required)</span> : null}</label>
			{children}
			{hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
		</div>
	)
}

function Notice({ id, state }: { id?: string; state: LegalActionState }) {
	if (state.error) return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 md:col-span-2" id={id} role="alert">{state.error}</p>
	if (state.success) return <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 md:col-span-2" role="status">{state.success}</p>
	return null
}

function localToday() {
	const now = new Date()
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function toDateTimeLocal(value: string | null | undefined) {
	if (!value) return ''
	const date = new Date(value)
	return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

// UTC, so the server and the browser render the same text.
function formatDateTime(value: string) {
	return `${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value))} UTC`
}
