'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'

import { createNewsroomTagAction, saveTagDetailsAction, saveTagTranslationAction, setTagArchivedAction } from '@/app/(admin)/admin/actions'
import { AdminForm, Field, FormActions, useAdminCommand, useAdminForm } from '@/components/admin/form/admin-form'
import { AdvancedSection } from '@/components/admin/form/advanced-section'
import { ArchivePanel, EditorSection } from '@/components/admin/form/editor-section'
import { LOCALE_NAMES, LocaleTabs, useLocaleStatuses, type PublicationStatus } from '@/components/admin/form/locale-tabs'
import { PublicationFields, type PublicationState } from '@/components/admin/form/publication-fields'
import { useSlugPrefill } from '@/components/admin/form/slug-prefill'
import { Input } from '@/components/ui/input'

type Locale = 'en' | 'de' | 'it' | 'pt-BR' | 'pt-PT'
type Translation = { locale: Locale; name: string; slug: string; status: PublicationStatus; publication: PublicationState }
type Tag = { id: string; stableKey: string; displayOrder: number; isActive: boolean; articleCount: number }

/** Creates a tag with its English label (audit NEWS-10); the tag's page adds the other languages. */
export function TagCreator() {
	const router = useRouter()
	const form = useAdminForm({ action: createNewsroomTagAction, label: 'the new tag', onSuccess: ({ redirectTo }) => { if (redirectTo) router.push(redirectTo) } })
	// The key and the English slug follow the English label.
	const prefill = useSlugPrefill()
	return (
		<EditorSection description="A tag starts with its English label. Its page then adds the label and URL slug in each other language; the newsroom offers a tag only in the languages where it is published." title="New tag">
			<AdminForm className="grid gap-4 md:grid-cols-3" form={form}>
				<Field label="English label" name="name" required><Input name="name" placeholder="e.g. Hiring" required {...prefill.source} /></Field>
				<Field hint="Used in the newsroom filter URL." label="English URL slug" name="slug" required><Input {...prefill.target('slug')} name="slug" placeholder="e.g. hiring" required /></Field>
				<input name="locale" type="hidden" value="en" />
				<PublicationFields options={['draft', 'published']} />
				<AdvancedSection className="md:col-span-3"><Field hint="Lowercase letters, numbers and hyphens. It does not change." label="Stable key" name="stableKey" required><Input {...prefill.target('stableKey')} name="stableKey" placeholder="e.g. hiring" required /></Field></AdvancedSection>
				<FormActions className="md:col-span-3" form={form} label="Create tag" />
			</AdminForm>
		</EditorSection>
	)
}

/** Edits a tag: its shared key and order, a label and slug per language, and archiving (audit NEWS-10). */
export function TagEditor({ tag, translations }: { tag: Tag; translations: Translation[] }) {
	const [locale, setLocale] = useState<Locale>('en')
	const [statuses, setStatus] = useLocaleStatuses(translations)
	const scope = useId()
	const details = useAdminForm({ action: saveTagDetailsAction, label: 'the tag details' })
	const archive = useAdminCommand(setTagArchivedAction)
	const name = translations.find((item) => item.locale === 'en')?.name ?? tag.stableKey
	const used = tag.articleCount === 1 ? '1 article uses it' : `${tag.articleCount} articles use it`
	return (
		<div className="mt-9 space-y-8">
			<EditorSection action={<span className={tag.isActive ? 'rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700' : 'rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800'}>{tag.isActive ? 'Active' : 'Archived'}</span>} description={`Shared by every language. ${used}.`} title="Tag details">
				<AdminForm className="grid gap-5 md:grid-cols-2" form={details}>
					<input name="tagId" type="hidden" value={tag.id} />
					<AdvancedSection className="md:col-span-2">
						<Field label="Stable key" name="stableKey" required><Input defaultValue={tag.stableKey} name="stableKey" required /></Field>
						<Field hint="Lower numbers come first in the newsroom tag filter." label="Display order" name="displayOrder" required><Input defaultValue={tag.displayOrder} min="0" name="displayOrder" required type="number" /></Field>
					</AdvancedSection>
					<FormActions className="md:col-span-2" form={details} label="Save tag details" />
				</AdminForm>
			</EditorSection>
			<EditorSection description="Each language has its own label, URL slug and publication. Without a published label in a language, the tag is not offered there." title="Labels and publication">
				<LocaleTabs active={locale} label="Tag languages" onChange={(next) => setLocale(next as Locale)} scope={scope} statuses={statuses}>
					<TagTranslationForm key={locale} locale={locale} onSaved={(status) => setStatus(locale, status)} scope={scope} tagId={tag.id} translation={translations.find((item) => item.locale === locale)} />
				</LocaleTabs>
			</EditorSection>
			<ArchivePanel archived={!tag.isActive} command={archive} description={{ archive: `Archiving removes the tag from the article editor and from the newsroom in every language. ${used}; the articles keep it, so a restore brings it back.`, restore: 'Restoring offers the tag again wherever its labels are published.' }} name={name} onArchive={() => archive.run({ archive: 'true', tagId: tag.id })} onRestore={() => archive.run({ archive: 'false', tagId: tag.id })} title={{ archive: 'Archive this tag', restore: 'Restore this tag' }} />
		</div>
	)
}

// Keyed by locale by its parent, so each language starts from its own saved label.
function TagTranslationForm({ locale, onSaved, scope, tagId, translation }: { locale: Locale; onSaved: (status: PublicationStatus) => void; scope: string; tagId: string; translation?: Translation }) {
	const form = useAdminForm({ action: saveTagTranslationAction, label: `the ${LOCALE_NAMES[locale]} label`, onSuccess: ({ values }) => { if (values) onSaved(values.status) }, scope })
	// A new language's slug follows its label.
	const prefill = useSlugPrefill()
	return (
		<AdminForm className="mt-6 grid gap-5 md:grid-cols-2" form={form}>
			<input name="tagId" type="hidden" value={tagId} />
			<input name="locale" type="hidden" value={locale} />
			<Field label={`${LOCALE_NAMES[locale]} label`} name="name" required><Input defaultValue={translation?.name ?? ''} name="name" required {...(translation ? {} : prefill.source)} /></Field>
			<Field hint="Used in the newsroom filter URL in this language." label="URL slug" name="slug" required><Input {...(translation ? { defaultValue: translation.slug } : prefill.target('slug'))} name="slug" required /></Field>
			<PublicationFields initial={translation?.publication} options={translation ? undefined : ['draft', 'scheduled', 'published']} />
			<FormActions className="md:col-span-2" form={form} label={`Save ${LOCALE_NAMES[locale]}`} />
		</AdminForm>
	)
}
