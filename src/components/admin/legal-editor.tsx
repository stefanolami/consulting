'use client'

import { ExternalLink } from 'lucide-react'
import { useId, useState } from 'react'

import { deleteLegalTranslationAction, saveLegalTranslationAction } from '@/app/(admin)/admin/legal/actions'
import { AdminForm, CommandButton, CommandNotice, Field, FieldGroup, FormActions, useAdminCommand, useAdminForm } from '@/components/admin/form/admin-form'
import { StatusSelect } from '@/components/admin/form/controls'
import { LOCALE_NAMES, LocaleTabs, useLocaleStatuses } from '@/components/admin/form/locale-tabs'
import { LegalRichTextEditor } from '@/components/admin/legal-rich-text-editor'
import type { LegalStatus } from '@/components/admin/legal-status'
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

export function LegalEditor({ canDelete, stableKey, translations }: { canDelete: boolean; stableKey: LegalPageKey; translations: LegalEditorTranslation[] }) {
	const [activeLocale, setActiveLocale] = useState<AppLocale>(routing.defaultLocale)
	// Statuses saved or deleted in this session show on the tab badges at once.
	const [statuses, setStatus] = useLocaleStatuses(translations)
	const [deleted, setDeleted] = useState<Partial<Record<AppLocale, boolean>>>({})
	const scope = useId()

	return (
		<section aria-labelledby={`${scope}-heading`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
			<h2 className="font-robo text-2xl text-slate-950" id={`${scope}-heading`}>Translations and publication</h2>
			<p className="mt-1 text-sm text-slate-600">Each language has its own title, text, “Last updated” date, SEO fields and publication state. Nothing falls back to English.</p>
			<LocaleTabs active={activeLocale} onChange={setActiveLocale} scope={scope} statuses={Object.fromEntries(routing.locales.map((locale) => [locale, deleted[locale] ? null : statuses[locale]]))}>
				<TranslationForm
					canDelete={canDelete}
					key={activeLocale}
					locale={activeLocale}
					onDeleted={() => setDeleted((current) => ({ ...current, [activeLocale]: true }))}
					onSaved={(status) => { setStatus(activeLocale, status); setDeleted((current) => ({ ...current, [activeLocale]: false })) }}
					scope={scope}
					stableKey={stableKey}
					translation={deleted[activeLocale] ? undefined : translations.find((item) => item.locale === activeLocale)}
				/>
			</LocaleTabs>
		</section>
	)
}

function TranslationForm({ canDelete, locale, onDeleted, onSaved, scope, stableKey, translation }: { canDelete: boolean; locale: AppLocale; onDeleted: () => void; onSaved: (status: LegalStatus) => void; scope: string; stableKey: LegalPageKey; translation?: LegalEditorTranslation }) {
	// Controlled fields. After a save, every field, the "Last saved" line and
	// the language tab take the values the database stored.
	const [title, setTitle] = useState(translation?.title ?? '')
	const [lastUpdatedOn, setLastUpdatedOn] = useState(translation?.lastUpdatedOn ?? '')
	const [status, setStatus] = useState<LegalStatus>(translation?.status ?? 'draft')
	const [scheduledFor, setScheduledFor] = useState(toDateTimeLocal(translation?.scheduledFor))
	const [seoTitle, setSeoTitle] = useState(translation?.seoTitle ?? '')
	const [seoDescription, setSeoDescription] = useState(translation?.seoDescription ?? '')
	const [editorKey, setEditorKey] = useState(0)
	const [record, setRecord] = useState(translation ? { status: translation.status, updatedAt: translation.updatedAt } : null)
	const form = useAdminForm({
		action: saveLegalTranslationAction,
		label: `the ${LOCALE_NAMES[locale]} translation`,
		onSuccess: ({ values: saved }) => {
			if (!saved) return
			setTitle(saved.title); setLastUpdatedOn(saved.lastUpdatedOn ?? ''); setStatus(saved.status); setScheduledFor(toDateTimeLocal(saved.scheduledFor))
			setSeoTitle(saved.seoTitle ?? ''); setSeoDescription(saved.seoDescription ?? '')
			setRecord({ status: saved.status, updatedAt: saved.updatedAt })
			onSaved(saved.status)
		},
		scope,
	})
	// After an admin deletes the translation, the form starts again from an
	// empty draft.
	const remove = useAdminCommand(deleteLegalTranslationAction, {
		onSuccess: () => {
			setTitle(''); setLastUpdatedOn(''); setStatus('draft'); setScheduledFor(''); setSeoTitle(''); setSeoDescription('')
			setEditorKey((key) => key + 1)
			setRecord(null)
			form.resetBaseline()
			onDeleted()
		},
	})
	const id = useId()
	const fieldId = (field: string) => `${id}-${field}`
	const contentInvalid = Boolean(form.outcome.fieldErrors.content)

	function changeStatus(next: LegalStatus) {
		setStatus(next)
		// The "Last updated" date is required to publish; suggest today.
		if ((next === 'published' || next === 'scheduled') && !lastUpdatedOn) setLastUpdatedOn(localToday())
	}

	const exists = record !== null
	const publicHref = legalPath(stableKey, locale)
	// The editor's name is known only for the save the page was loaded with.
	const savedBy = translation && record?.updatedAt === translation.updatedAt ? translation.updatedByName : null

	return (
		<div className="mt-6 space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
				<p>
					{record
						? <>Last saved {formatDateTime(record.updatedAt)}{savedBy ? <> by {savedBy}</> : null}.</>
						: <>No {LOCALE_NAMES[locale]} translation yet. Saving creates it.</>}
				</p>
				{record?.status === 'published'
					? <a className="inline-flex items-center gap-1 font-medium text-[#27335a] underline-offset-4 hover:underline" href={publicHref} rel="noreferrer" target="_blank">View public page<ExternalLink aria-hidden="true" className="size-3.5" /><span className="sr-only"> (opens in a new tab)</span></a>
					: null}
			</div>
			<AdminForm className="grid gap-5 md:grid-cols-2" form={form}>
				<input name="stableKey" type="hidden" value={stableKey} />
				<input name="locale" type="hidden" value={locale} />
				<Field className="md:col-span-2" label="Page title" name="title" required>
					<Input maxLength={160} name="title" onChange={(event) => setTitle(event.target.value)} value={title} />
				</Field>
				<FieldGroup className="md:col-span-2" hint={<>Section headings, paragraphs, bold, italic, lists, line breaks (Shift+Enter) and links. Link to other pages of this website with a path such as <code>/privacy-policy</code>; visitors stay in their language.</>} id={fieldId('content')} label="Page text" name="content">
					<LegalRichTextEditor
						describedBy={[`${fieldId('content')}-hint`, contentInvalid ? `${fieldId('content')}-error` : null].filter(Boolean).join(' ')}
						id={`${fieldId('content')}-editor`}
						initialValue={(exists ? translation?.content : undefined) ?? emptyLegalDocument()}
						invalid={contentInvalid}
						key={editorKey}
						label={`${LOCALE_NAMES[locale]} page text`}
					/>
				</FieldGroup>
				<Field label="Publication status" name="status">
					<StatusSelect onValueChange={changeStatus} value={status} />
				</Field>
				<Field addon={<Button onClick={() => setLastUpdatedOn(localToday())} type="button" variant="outline">Today</Button>} hint="Shown to visitors. Required to publish; today is suggested when you choose Published." label="“Last updated” date" name="lastUpdatedOn" required={status === 'published' || status === 'scheduled'}>
					<Input className="flex-1" name="lastUpdatedOn" onChange={(event) => setLastUpdatedOn(event.target.value)} type="date" value={lastUpdatedOn} />
				</Field>
				{status === 'scheduled' ? (
					<Field hint="Scheduled translations are not published automatically yet; publish them at this time." label="Scheduled publication time" name="scheduledFor" required>
						<Input name="scheduledFor" onChange={(event) => setScheduledFor(event.target.value)} type="datetime-local" value={scheduledFor} />
					</Field>
				) : <div aria-hidden="true" className="hidden md:block" />}
				<div aria-hidden="true" className="hidden md:block" />
				<Field hint="Optional. The page title is used when empty." label="SEO title" name="seoTitle">
					<Input maxLength={160} name="seoTitle" onChange={(event) => setSeoTitle(event.target.value)} value={seoTitle} />
				</Field>
				<Field hint="Optional, up to 320 characters." label="SEO description" name="seoDescription">
					<textarea className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm shadow-xs" maxLength={320} name="seoDescription" onChange={(event) => setSeoDescription(event.target.value)} value={seoDescription} />
				</Field>
				<FormActions className="md:col-span-2" form={form} label={`Save ${LOCALE_NAMES[locale]} translation`} />
			</AdminForm>
			{canDelete && exists ? (
				<div className="grid gap-3">
					<div className="flex flex-col justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center">
						<div>
							<h3 className="font-semibold text-red-950">Delete this translation</h3>
							<p className="mt-1 text-sm text-red-900">Administrators only. Archiving is the usual way to withdraw a translation.</p>
						</div>
						<CommandButton
							onClick={() => {
								if (!window.confirm(`Delete the ${LOCALE_NAMES[locale]} translation of this page permanently? This cannot be undone.${locale === routing.defaultLocale ? ' Without English, the page returns “not found” in every language.' : ''}`)) return
								remove.run({ locale, stableKey })
							}}
							pending={remove.pending}
							pendingLabel="Deleting…"
							variant="destructive"
						>
							Delete {locale}
						</CommandButton>
					</div>
					<CommandNotice command={remove} />
				</div>
			) : <CommandNotice command={remove} />}
		</div>
	)
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
