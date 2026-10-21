'use client'

import { Pencil, Plus } from 'lucide-react'
import Link from 'next/link'
import { useId, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
	createEndorsementAction,
	createPartnerAction,
	movePartnerEntityAction,
	saveEndorsementDetailsAction,
	saveEndorsementTranslationAction,
	savePartnerDetailsAction,
	savePartnerTranslationAction,
	setPartnerEntityArchivedAction,
} from '@/app/(admin)/admin/partners/actions'
import type { PartnerEntityKind } from '@/app/(admin)/admin/partners/actions'
import { AdminForm, CommandNotice, Field, FormActions, useAdminCommand, useAdminForm } from '@/components/admin/form/admin-form'
import { ArchivePanel, EditorSection, NotShownNotice } from '@/components/admin/form/editor-section'
import { LibraryAltNote, MediaPicker, useMediaUploads, type MediaPickerAsset } from '@/components/admin/form/media-picker'
import { PublicationFields, type PublicationState } from '@/components/admin/form/publication-fields'
import { LOCALE_NAMES, LocaleTabs, useLocaleStatuses, type PublicationStatus } from '@/components/admin/form/locale-tabs'
import { SearchField, useListQuery, ViewSwitch } from '@/components/admin/list-controls'
import { LocaleStates, LocaleStatesLegend } from '@/components/admin/locale-states'
import { ReorderControls, ReorderNote } from '@/components/admin/reorder-controls'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PARTNER_LIST } from '@/lib/admin-list-query.mjs'
import { moveAvailability, sortByDisplayOrder } from '@/lib/display-order.mjs'

type Locale = 'en' | 'de' | 'it' | 'pt-BR' | 'pt-PT'
type PartnerOption = { id: string; label: string }
type ListItem = { id: string; kind: PartnerEntityKind; stableKey: string; title: string; displayOrder: number; isActive: boolean; states: Record<string, PublicationStatus | null>; status: string | null }
type PartnerTranslation = { locale: Locale; altText: string; description: string | null; status: PublicationStatus; publication: PublicationState }
type EndorsementTranslation = { locale: Locale; quote: string; attributionTitle: string | null; status: PublicationStatus; publication: PublicationState }
type PartnerEntry = { id: string; stableKey: string; name: string; websiteUrl: string | null; displayOrder: number; logoMediaId: string | null; isActive: boolean }
type EndorsementEntry = { id: string; stableKey: string; attributionName: string; partnerId: string | null; portraitMediaId: string | null; displayOrder: number; isActive: boolean }

const LIST_COLUMNS = 'md:grid-cols-[minmax(0,1fr)_14rem_7rem_9rem]'

export function PartnerRecordsList({ items }: { items: ListItem[] }) {
	const { hrefFor, state, update } = useListQuery(PARTNER_LIST, 'history')
	const kind = state.kind as PartnerEntityKind
	const move = useAdminCommand(movePartnerEntityAction)
	const searching = state.q !== ''
	const { availability, visible } = useMemo(() => {
		const ofKind = sortByDisplayOrder(items.filter((item) => item.kind === kind).map((item) => ({ ...item, order: item.displayOrder, tieBreak: item.title })))
		const query = state.q.toLowerCase()
		return {
			availability: moveAvailability(ofKind, (item) => item.isActive),
			visible: query ? ofKind.filter((item) => `${item.title} ${item.stableKey}`.toLowerCase().includes(query)) : ofKind,
		}
	}, [items, kind, state.q])
	return <div className="space-y-6">
		<ViewSwitch current={kind} items={(['partners', 'endorsements'] as const).map((value) => ({ value, label: value === 'partners' ? 'Partners and clients' : 'Endorsements', href: hrefFor({ kind: value }), count: items.filter((item) => item.kind === value).length }))} label="Relationship lists" onSelect={(value) => update({ kind: value as PartnerEntityKind })} />
		{kind === 'partners' ? <NotShownNotice title="Not shown on the site on their own">Partners and clients have no page or list of their own on the website. A partner appears only through an endorsement: when an endorsement names it as its associated partner, Why Us shows the partner’s logo with that endorsement, in each language where both are published.</NotShownNotice> : null}<ReorderNote searching={searching}>Ordering applies only to active records; archived ones keep their place and are skipped. Archiving preserves translations and media links while removing the record from public eligibility.</ReorderNote>
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><SearchField label={`Search ${kind} by name or stable key`} onSearch={(q, options) => update({ q }, options)} placeholder={`Search ${kind}`} value={state.q} /><Button asChild><Link href={`/admin/partners/${kind}/new`}><Plus aria-hidden="true" />New {kind === 'partners' ? 'partner/client' : 'endorsement'}</Link></Button></div>
		<LocaleStatesLegend />
		<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
			<div aria-hidden="true" className={`hidden gap-5 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid ${LIST_COLUMNS}`}><span>Record</span><span>Languages</span><span>English</span><span className="text-right">Order and edit</span></div>
			{visible.length ? <ul>{visible.map((item) => {
				const moves = availability.get(item.id) ?? { up: false, down: false }
				return <li className="border-b border-slate-100 last:border-0" key={item.id}>
					<div className={`grid gap-3 px-5 py-4 md:items-center md:gap-5 ${LIST_COLUMNS}`}>
						<div className="min-w-0"><Link className="font-semibold underline-offset-4 hover:underline" href={`/admin/partners/${item.kind}/${item.id}`}>{item.title}</Link><p className="mt-0.5 truncate text-sm text-slate-500">{item.stableKey}</p></div>
						<LocaleStates states={item.states} />
						<Badge className={item.isActive && item.status === 'published' ? 'w-fit border-emerald-200 bg-emerald-50 text-emerald-700' : 'w-fit border-amber-200 bg-amber-50 text-amber-800'} variant="outline">{item.isActive ? item.status ?? 'draft' : 'archived'}</Badge>
						<div className="flex items-center gap-1 md:justify-end"><span className="mr-1 text-sm tabular-nums text-slate-500" title="Display order">{item.displayOrder}</span><ReorderControls busy={move.pending} canDown={!searching && moves.down} canUp={!searching && moves.up} name={item.title} onMove={(direction) => move.run({ direction, entryId: item.id, kind: item.kind }, `${item.id}:${direction}`)} pendingDirection={move.pending && move.key?.startsWith(`${item.id}:`) ? move.key.endsWith(':up') ? 'up' : 'down' : null} /><Button asChild aria-label={`Edit ${item.title}`} size="icon" title="Edit" variant="ghost"><Link href={`/admin/partners/${item.kind}/${item.id}`}><Pencil aria-hidden="true" /></Link></Button></div>
					</div>
					{move.key?.startsWith(`${item.id}:`) ? <CommandNotice className="mx-5 mb-4" command={move} /> : null}
				</li>
			})}</ul> : <p className="px-5 py-14 text-center text-sm text-slate-500">{state.q ? `No ${kind} match this search.` : kind === 'partners' ? 'No partners or clients yet.' : 'No endorsements yet.'}</p>}
		</div>
	</div>
}

export function PartnerEditor({ entry, translations = [], media }: { entry?: PartnerEntry; translations?: PartnerTranslation[]; media: MediaPickerAsset[] }) {
	const router = useRouter(); const [locale, setLocale] = useState<Locale>('en'); const [statuses, setStatus] = useLocaleStatuses(translations); const scope = useId()
	const [logoId, setLogoId] = useState<string | null>(entry?.logoMediaId ?? null)
	const uploads = useMediaUploads()
	const logoAsset = logoId ? media.find((item) => item.id === logoId) ?? uploads.uploads.find((item) => item.id === logoId) : undefined
	const create = useAdminForm({ action: createPartnerAction, label: 'the new partner', onSuccess: ({ redirectTo }) => { if (redirectTo) router.push(redirectTo) } })
	const details = useAdminForm({ action: savePartnerDetailsAction, label: 'the shared partner details' })
	const archive = useAdminCommand(setPartnerEntityArchivedAction)
	const logo = <div className="md:col-span-2"><MediaPicker hint="Needed to publish." kind="logo" label="Logo" media={media} name="logoMediaId" noneLabel="No logo" onValueChange={setLogoId} value={logoId} {...uploads} /></div>
	const notice = <NotShownNotice title="Not shown on the site on their own">Partners and clients have no page or list of their own on the website. A partner appears only through an endorsement: when an endorsement names it as its associated partner, Why Us shows the partner’s logo with that endorsement, in each language where both are published.</NotShownNotice>
	if (!entry) return <AdminForm className="mt-8 space-y-7" form={create}>{notice}<Panel title="Shared partner/client details"><div className="grid gap-5 md:grid-cols-2"><PartnerFields logo={logo} /><PartnerTranslationFields locale="en" logo={logoAsset} /></div></Panel><FormActions form={create} label="Create partner/client" /></AdminForm>
	return <div className="mt-8 space-y-7">{notice}<Panel title="Shared partner/client details"><AdminForm className="grid gap-5 md:grid-cols-2" form={details}><input name="partnerId" type="hidden" value={entry.id} /><PartnerFields entry={entry} logo={logo} /><FormActions className="md:col-span-2" form={details} label="Save shared details" /></AdminForm></Panel><TranslationPanel locale={locale} scope={scope} setLocale={setLocale} statuses={statuses}><PartnerTranslationForm entryId={entry.id} key={locale} locale={locale} logo={logoAsset} onSaved={(status) => setStatus(locale, status)} scope={scope} translation={translations.find((item) => item.locale === locale)} /></TranslationPanel><ArchivePanel archived={!entry.isActive} command={archive} description={{ archive: 'Its logo is no longer shown with the endorsements that name it. The record and its content in every language are kept for a restore.', restore: 'Restoring shows its logo with its endorsements again.' }} name={entry.name} onArchive={() => archive.run({ archive: 'true', entryId: entry.id, kind: 'partners' })} onRestore={() => archive.run({ archive: 'false', entryId: entry.id, kind: 'partners' })} title={{ archive: 'Archive this partner', restore: 'Restore this partner' }} /></div>
}

function PartnerFields({ entry, logo }: { entry?: PartnerEntry; logo: React.ReactNode }) {
	return <><Field label="Stable key" name="stableKey" required><Input defaultValue={entry?.stableKey ?? ''} name="stableKey" placeholder="e.g. european-client" required /></Field><Field label="Canonical display name" name="name" required><Input defaultValue={entry?.name ?? ''} name="name" required /></Field><Field label="Website URL" name="websiteUrl"><Input defaultValue={entry?.websiteUrl ?? ''} name="websiteUrl" placeholder="https://…" type="url" /></Field>{entry ? <Field label="Display order" name="displayOrder" required><Input defaultValue={entry.displayOrder} min="0" name="displayOrder" type="number" required /></Field> : null}{logo}</>
}

function PartnerTranslationForm({ entryId, locale, logo, onSaved, scope, translation }: { entryId: string; locale: Locale; logo?: MediaPickerAsset; onSaved: (status: PublicationStatus) => void; scope: string; translation?: PartnerTranslation }) { const form = useAdminForm({ action: savePartnerTranslationAction, label: `the ${LOCALE_NAMES[locale]} content`, onSuccess: ({ values }) => { if (values) onSaved(values.status) }, scope }); return <AdminForm className="mt-6 grid gap-5 md:grid-cols-2" form={form}><input name="partnerId" type="hidden" value={entryId} /><PartnerTranslationFields locale={locale} logo={logo} translation={translation} /><FormActions className="md:col-span-2" form={form} label={`Save ${locale} content`} /></AdminForm> }
function PartnerTranslationFields({ locale, logo, translation }: { locale: Locale; logo?: MediaPickerAsset; translation?: PartnerTranslation }) { const libraryAlt = logo?.alts[locale]; return <><input name="locale" type="hidden" value={locale} /><Field hint={libraryAlt ? `Leave empty to use the Media library’s ${LOCALE_NAMES[locale]} alt text: “${libraryAlt}”.` : `Optional when the logo has ${LOCALE_NAMES[locale]} alt text in the Media library; it has none yet. Only this partner uses this text.`} label="Logo alt text for this partner" name="altText"><Input defaultValue={translation?.altText ?? ''} name="altText" placeholder={libraryAlt ?? 'Describe the logo'} /></Field><div aria-hidden="true" className="hidden md:block" /><Field className="md:col-span-2" label="Localized description" name="description"><textarea className="input-textarea" defaultValue={translation?.description ?? ''} maxLength={2000} name="description" rows={4} /></Field><PublicationFields initial={translation?.publication} options={translation ? undefined : ['draft', 'scheduled', 'published']} /></> }

export function EndorsementEditor({ entry, translations = [], media, partners }: { entry?: EndorsementEntry; translations?: EndorsementTranslation[]; media: MediaPickerAsset[]; partners: PartnerOption[] }) {
	const router = useRouter(); const [locale, setLocale] = useState<Locale>('en'); const [statuses, setStatus] = useLocaleStatuses(translations); const scope = useId()
	const [portraitId, setPortraitId] = useState<string | null>(entry?.portraitMediaId ?? null)
	const uploads = useMediaUploads()
	const portraitAsset = portraitId ? media.find((item) => item.id === portraitId) ?? uploads.uploads.find((item) => item.id === portraitId) : undefined
	const create = useAdminForm({ action: createEndorsementAction, label: 'the new endorsement', onSuccess: ({ redirectTo }) => { if (redirectTo) router.push(redirectTo) } })
	const details = useAdminForm({ action: saveEndorsementDetailsAction, label: 'the shared endorsement details' })
	const archive = useAdminCommand(setPartnerEntityArchivedAction)
	const portrait = <div className="md:col-span-2"><MediaPicker hint="Optional. Its alt text comes from the Media library." kind="portrait" label="Portrait" media={media} name="portraitMediaId" noneLabel="No portrait" onValueChange={setPortraitId} value={portraitId} {...uploads} /></div>
	if (!entry) return <AdminForm className="mt-8 space-y-7" form={create}><Panel title="Shared endorsement details"><div className="grid gap-5 md:grid-cols-2"><EndorsementFields partners={partners} portrait={portrait} /><EndorsementTranslationFields locale="en" portrait={portraitAsset} portraitId={portraitId} /></div></Panel><FormActions form={create} label="Create endorsement" /></AdminForm>
	return <div className="mt-8 space-y-7"><Panel title="Shared endorsement details"><AdminForm className="grid gap-5 md:grid-cols-2" form={details}><input name="endorsementId" type="hidden" value={entry.id} /><EndorsementFields entry={entry} partners={partners} portrait={portrait} /><FormActions className="md:col-span-2" form={details} label="Save shared details" /></AdminForm></Panel><TranslationPanel locale={locale} scope={scope} setLocale={setLocale} statuses={statuses}><EndorsementTranslationForm entryId={entry.id} key={locale} locale={locale} portrait={portraitAsset} portraitId={portraitId} onSaved={(status) => setStatus(locale, status)} scope={scope} translation={translations.find((item) => item.locale === locale)} /></TranslationPanel><ArchivePanel archived={!entry.isActive} command={archive} description={{ archive: 'The endorsement is removed from Why Us in every language. The record and its content in every language are kept for a restore.', restore: 'Restoring shows the endorsement again where it is published.' }} name={entry.attributionName} onArchive={() => archive.run({ archive: 'true', entryId: entry.id, kind: 'endorsements' })} onRestore={() => archive.run({ archive: 'false', entryId: entry.id, kind: 'endorsements' })} title={{ archive: 'Archive this endorsement', restore: 'Restore this endorsement' }} /></div>
}

function EndorsementFields({ entry, partners, portrait }: { entry?: EndorsementEntry; partners: PartnerOption[]; portrait: React.ReactNode }) { return <><Field label="Stable key" name="stableKey" required><Input defaultValue={entry?.stableKey ?? ''} name="stableKey" required /></Field><Field label="Attribution name" name="attributionName" required><Input defaultValue={entry?.attributionName ?? ''} name="attributionName" required /></Field><Field label="Associated partner/client" name="partnerId"><select className="input-select" defaultValue={entry?.partnerId ?? ''} name="partnerId"><option value="">No associated partner</option>{partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.label}</option>)}</select></Field>{entry ? <Field label="Display order" name="displayOrder" required><Input defaultValue={entry.displayOrder} min="0" name="displayOrder" type="number" required /></Field> : null}{portrait}</> }
function EndorsementTranslationForm({ entryId, locale, onSaved, portrait, portraitId, scope, translation }: { entryId: string; locale: Locale; portrait?: MediaPickerAsset; portraitId: string | null; onSaved: (status: PublicationStatus) => void; scope: string; translation?: EndorsementTranslation }) { const form = useAdminForm({ action: saveEndorsementTranslationAction, label: `the ${LOCALE_NAMES[locale]} content`, onSuccess: ({ values }) => { if (values) onSaved(values.status) }, scope }); return <AdminForm className="mt-6 grid gap-5 md:grid-cols-2" form={form}><input name="endorsementId" type="hidden" value={entryId} /><EndorsementTranslationFields locale={locale} portrait={portrait} portraitId={portraitId} translation={translation} /><FormActions className="md:col-span-2" form={form} label={`Save ${locale} content`} /></AdminForm> }
function EndorsementTranslationFields({ locale, portrait, portraitId, translation }: { locale: Locale; portrait?: MediaPickerAsset; portraitId: string | null; translation?: EndorsementTranslation }) { return <><input name="locale" type="hidden" value={locale} /><Field className="md:col-span-2" label="Localized quote" name="quote" required><textarea className="input-textarea" defaultValue={translation?.quote ?? ''} maxLength={5000} name="quote" required rows={6} /></Field><Field label="Localized attribution title" name="attributionTitle"><Input defaultValue={translation?.attributionTitle ?? ''} name="attributionTitle" /></Field>{portraitId ? <LibraryAltNote asset={portrait} assetId={portraitId} field="portraitAlt" label="Portrait alt text" locale={locale} whenMissing="Published content needs it to show the portrait." /> : <div aria-hidden="true" className="hidden md:block" />}<PublicationFields initial={translation?.publication} options={translation ? undefined : ['draft', 'scheduled', 'published']} /></> }

function TranslationPanel({ children, locale, scope, setLocale, statuses }: { children: React.ReactNode; locale: Locale; scope: string; setLocale: (locale: Locale) => void; statuses: Record<Locale, PublicationStatus | null> }) { return <EditorSection description="Editorial fields and publication are managed independently for each language." title="Translations and publication"><LocaleTabs active={locale} onChange={(next) => setLocale(next as Locale)} scope={scope} statuses={statuses}>{children}</LocaleTabs></EditorSection> }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <EditorSection title={title}>{children}</EditorSection> }
