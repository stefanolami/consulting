'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'

import { savePersonTranslationAction, setPersonArchivedAction, updatePersonAction } from '@/app/(admin)/admin/actions'
import { AdminForm, Field, FieldSlot, FormActions, useAdminCommand, useAdminForm } from '@/components/admin/form/admin-form'
import { ArchivePanel, SEO_TITLE_HINT } from '@/components/admin/form/editor-section'
import { LOCALE_NAMES, LocaleTabs, useLocaleStatuses } from '@/components/admin/form/locale-tabs'
import { LibraryAltNote, MediaPicker, useMediaUploads, type MediaPickerAsset } from '@/components/admin/form/media-picker'
import { PublicationFields, type PublicationState } from '@/components/admin/form/publication-fields'
import { ProfileDocumentEditor } from '@/components/admin/profile-document-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { emptyProfileDocument } from '@/lib/team-profile-document'
import type { ProfileDocument } from '@/lib/team-profile-document'
import type { EditorStatus } from '@/lib/publication.mjs'

type Locale = 'en' | 'de' | 'it' | 'pt-BR' | 'pt-PT'
type Role = { id?: string; title: string; cardLabel: string | null; isCardRole: boolean }

type Translation = {
	locale: Locale; slug: string; cardName: string | null; roles: Role[]; profileDocument: ProfileDocument
	seoTitle: string | null; seoDescription: string | null
	status: EditorStatus
	publication: PublicationState
}
type Person = {
	id: string; displayName: string; stableKey: string; email: string | null; phone: string | null
	isTeamMember: boolean; isAuthor: boolean; isActive: boolean; displayOrder: number; teamGroup: 'managing_team' | 'team'; portraitMediaId: string | null
}

export function PersonEditor({ media, person, translations }: { media: MediaPickerAsset[]; person: Person; translations: Translation[] }) {
	const [activeLocale, setActiveLocale] = useState<Locale>('en')
	const [statuses, setStatus] = useLocaleStatuses(translations)
	const [portraitId, setPortraitId] = useState(person.portraitMediaId)
	const uploads = useMediaUploads()
	const portrait = portraitId ? media.find((item) => item.id === portraitId) ?? uploads.uploads.find((item) => item.id === portraitId) : undefined
	const scope = useId()
	const details = useAdminForm({ action: updatePersonAction, label: 'the profile details' })
	const archive = useAdminCommand(setPersonArchivedAction)

	return <div className="space-y-8">
		<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
			<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 className="font-robo text-2xl text-slate-950">Profile details</h2><p className="mt-1 text-sm text-slate-600">Shared identity, contact details, portrait, and placement in the public directory.</p></div><span className={person.isActive ? 'rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700' : 'rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700'}>{person.isActive ? 'Active' : 'Archived'}</span></div>
			<AdminForm className="mt-6 grid gap-5 md:grid-cols-2" form={details}>
				<input name="personId" type="hidden" value={person.id} />
				<Field label="Display name" name="displayName" required><Input defaultValue={person.displayName} name="displayName" required /></Field>
				<Field label="Stable key" name="stableKey" required><Input defaultValue={person.stableKey} name="stableKey" required /></Field>
				<Field label="Public email" name="email"><Input defaultValue={person.email ?? ''} name="email" type="email" /></Field>
				<Field label="Public phone" name="phone"><Input defaultValue={person.phone ?? ''} name="phone" /></Field>
				<Field label="Team group" name="teamGroup"><select className="input-select" defaultValue={person.teamGroup} name="teamGroup"><option value="managing_team">Managing team</option><option value="team">Team</option></select></Field>
				<Field label="Order within group" name="displayOrder"><Input defaultValue={person.displayOrder} min="0" name="displayOrder" type="number" /></Field>
				<label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input defaultChecked={person.isTeamMember} name="isTeamMember" type="checkbox" />Show as a team member</label>
				<label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input defaultChecked={person.isAuthor} name="isAuthor" type="checkbox" />Available as an article author</label>
				<div className="md:col-span-2"><MediaPicker hint="Shown on the team card and the profile. Its alt text comes from the Media library; without one the website uses “Portrait of …”." kind="portrait" label="Portrait" media={media} name="portraitMediaId" noneLabel="No portrait (initials are shown)" onValueChange={setPortraitId} value={portraitId} {...uploads} /></div>
				<FormActions className="md:col-span-2" form={details} label="Save profile details" />
			</AdminForm>
		</section>

		<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="font-robo text-2xl text-slate-950">Translations and publication</h2><p className="mt-1 text-sm text-slate-600">Each language has its own card content, roles, structured profile, SEO, and publication state. The portrait’s alt text is read from the Media library.</p>
			<LocaleTabs active={activeLocale} label="Profile translations" onChange={(locale) => setActiveLocale(locale as Locale)} scope={scope} statuses={statuses}>
				<LocalizedProfileForm key={activeLocale} locale={activeLocale} portrait={portrait} portraitId={portraitId} onSaved={(status) => setStatus(activeLocale, status)} person={person} scope={scope} translation={translations.find((translation) => translation.locale === activeLocale)} />
			</LocaleTabs>
		</section>

		<ArchivePanel archived={!person.isActive} archiveLabel="Archive profile" command={archive} description={{ archive: 'The profile is hidden from Who We Are in every language, and from contact, expert and author lists. Its translations, roles and portrait are kept.', restore: 'Restoring makes its published translations visible again.' }} name={person.displayName} onArchive={() => archive.run({ isArchived: 'true', personId: person.id })} onRestore={() => archive.run({ isArchived: 'false', personId: person.id })} restoreLabel="Restore profile" title={{ archive: 'Archive this profile', restore: 'Restore this profile' }} />
	</div>
}

function LocalizedProfileForm({ locale, onSaved, person, portrait, portraitId, scope, translation }: { locale: Locale; onSaved: (status: EditorStatus) => void; person: Person; portrait?: MediaPickerAsset; portraitId: string | null; scope: string; translation?: Translation }) {
	const [roles, setRoles] = useState<Role[]>(translation?.roles.length ? translation.roles : [{ title: '', cardLabel: null, isCardRole: true }])
	const form = useAdminForm({ action: savePersonTranslationAction, label: `the ${LOCALE_NAMES[locale]} translation`, onSuccess: ({ values }) => { if (values) onSaved(values.status) }, scope })
	const suggestedSlug = locale === 'en' ? person.stableKey : translation?.slug ?? person.stableKey
	function moveRole(index: number, direction: -1 | 1) { setRoles((current) => { const destination = index + direction; if (destination < 0 || destination >= current.length) return current; const next = [...current]; [next[index], next[destination]] = [next[destination], next[index]]; return next }) }
	return <AdminForm className="mt-6 grid gap-5 md:grid-cols-2" form={form}>
		<input name="personId" type="hidden" value={person.id} /><input name="locale" type="hidden" value={locale} /><input name="roles" type="hidden" value={JSON.stringify(roles)} />
		<Field label="Localized URL slug" name="slug" required><Input defaultValue={translation?.slug ?? suggestedSlug} name="slug" required /></Field>
		<Field label="Card name (optional)" name="cardName"><Input defaultValue={translation?.cardName ?? ''} name="cardName" placeholder={person.displayName} /></Field>
		<FieldSlot className="md:col-span-2 rounded-lg border border-slate-200 p-4" name="roles">
			<div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Localized roles</h3><p className="mt-1 text-sm text-slate-600">Add roles in display order. Select one to appear on the portrait/team card; its shorter card label is optional.</p></div><Button onClick={() => setRoles((current) => [...current, { title: '', cardLabel: null, isCardRole: false }])} type="button" variant="outline"><Plus />Add role</Button></div>
			<div className="mt-4 space-y-3">{roles.map((role, index) => <div className="grid gap-3 rounded-md bg-slate-50 p-3 md:grid-cols-[auto_1fr_1fr_auto] md:items-end" key={role.id ?? index}><label className="flex items-center gap-2 pb-2 text-xs font-medium text-slate-600"><input checked={role.isCardRole} name="cardRole" onChange={() => setRoles((current) => current.map((item, itemIndex) => ({ ...item, isCardRole: itemIndex === index })))} type="radio" />Card role</label><Field label={`Role ${index + 1}`}><Input value={role.title} onChange={(event) => setRoles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} required /></Field><Field label="Short card label"><Input value={role.cardLabel ?? ''} onChange={(event) => setRoles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, cardLabel: event.target.value || null } : item))} /></Field><div className="flex gap-1"><Button aria-label={`Move role ${index + 1} up`} disabled={index === 0} onClick={() => moveRole(index, -1)} size="icon" type="button" variant="ghost"><ArrowUp /></Button><Button aria-label={`Move role ${index + 1} down`} disabled={index === roles.length - 1} onClick={() => moveRole(index, 1)} size="icon" type="button" variant="ghost"><ArrowDown /></Button><Button aria-label={`Remove role ${index + 1}`} disabled={roles.length === 1} onClick={() => setRoles((current) => { const next = current.filter((_, itemIndex) => itemIndex !== index); return next.some((item) => item.isCardRole) ? next : next.map((item, itemIndex) => ({ ...item, isCardRole: itemIndex === 0 })) })} size="icon" type="button" variant="ghost"><Trash2 /></Button></div></div>)}</div>
		</FieldSlot>
		<FieldSlot className="md:col-span-2" name="profileDocument"><ProfileDocumentEditor initialValue={translation?.profileDocument ?? emptyProfileDocument()} /></FieldSlot>
		{portraitId ? <LibraryAltNote asset={portrait} assetId={portraitId} field="portraitAlt" label="Portrait alt text" locale={locale} whenMissing={`The website uses the English text, or “Portrait of ${person.displayName}” without one.`} /> : <div aria-hidden="true" className="hidden md:block" />}
		<PublicationFields initial={translation?.publication} options={translation ? undefined : ['draft', 'scheduled', 'published']} />
		<div aria-hidden="true" className="hidden md:block" />
		<Field hint={SEO_TITLE_HINT} label="SEO title" name="seoTitle"><Input defaultValue={translation?.seoTitle ?? ''} name="seoTitle" /></Field>
		<Field label="SEO description" name="seoDescription"><textarea className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm shadow-xs" defaultValue={translation?.seoDescription ?? ''} name="seoDescription" /></Field>
		<FormActions className="md:col-span-2" form={form} label={`Save ${locale} translation`} />
	</AdminForm>
}
