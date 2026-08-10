'use client'

import { ImagePlus, LoaderCircle } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import {
	attachPersonPortraitAction,
	savePersonTranslationAction,
	setPersonArchivedAction,
	updatePersonAction,
} from '@/app/(admin)/admin/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

const locales = ['en', 'de', 'it', 'pt-BR', 'pt-PT'] as const
type Locale = (typeof locales)[number]

type Translation = {
	locale: Locale
	slug: string
	jobTitle: string | null
	shortBio: string | null
	biography: string
	seoTitle: string | null
	seoDescription: string | null
	status: 'draft' | 'scheduled' | 'published' | 'archived'
}

type Person = {
	id: string
	displayName: string
	stableKey: string
	email: string | null
	phone: string | null
	websiteUrl: string | null
	isTeamMember: boolean
	isAuthor: boolean
	isActive: boolean
	displayOrder: number
	portraitPath: string | null
}

export function PersonEditor({ person, translations }: { person: Person; translations: Translation[] }) {
	const [activeLocale, setActiveLocale] = useState<Locale>('en')
	const [portraitPath, setPortraitPath] = useState(person.portraitPath)
	const [uploadMessage, setUploadMessage] = useState<string | null>(null)
	const [isUploading, setIsUploading] = useState(false)
	const activeTranslation = translations.find((translation) => translation.locale === activeLocale)
	const suggestedSlug = activeLocale === 'en' ? person.stableKey : activeTranslation?.slug ?? person.stableKey

	async function uploadPortrait(file: File, altText: string) {
		setIsUploading(true)
		setUploadMessage(null)
		try {
			if (!['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'].includes(file.type)) {
				throw new Error('Choose a GIF, JPEG, PNG, SVG, or WebP image.')
			}
			if (file.size > 15 * 1024 * 1024) throw new Error('Images must be 15 MiB or smaller.')

			const extension = file.name.split('.').pop()?.toLowerCase() || 'image'
			const objectPath = `people/${person.id}/${crypto.randomUUID()}.${extension}`
			const supabase = createClient()
			const { error: uploadError } = await supabase.storage.from('public-media').upload(objectPath, file, {
				cacheControl: '31536000',
				contentType: file.type,
				upsert: false,
			})
			if (uploadError) throw new Error(uploadError.message)

			const dimensions = await imageDimensions(file)
			await attachPersonPortraitAction({
				personId: person.id,
				objectPath,
				originalFilename: file.name,
				mimeType: file.type,
				fileSizeBytes: file.size,
				width: dimensions.width,
				height: dimensions.height,
				altText,
			})
			setPortraitPath(objectPath)
			setUploadMessage('Portrait uploaded and attached to this profile.')
		} catch (error) {
			setUploadMessage(error instanceof Error ? error.message : 'Could not upload the portrait.')
		} finally {
			setIsUploading(false)
		}
	}

	const portraitUrl = portraitPath
		? createClient().storage.from('public-media').getPublicUrl(portraitPath).data.publicUrl
		: null

	return (
		<div className="space-y-8">
			<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
				<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
					<div><h2 className="font-robo text-2xl text-slate-950">Profile details</h2><p className="mt-1 text-sm text-slate-600">Shared identity, contact details and team placement.</p></div>
					<span className={person.isActive ? 'rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700' : 'rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700'}>{person.isActive ? 'Active' : 'Archived'}</span>
				</div>
				<form action={updatePersonAction} className="mt-6 grid gap-5 md:grid-cols-2">
					<input name="personId" type="hidden" value={person.id} />
					<Field label="Display name"><Input defaultValue={person.displayName} name="displayName" required /></Field>
					<Field label="Stable key"><Input defaultValue={person.stableKey} name="stableKey" required /></Field>
					<Field label="Public email"><Input defaultValue={person.email ?? ''} name="email" type="email" /></Field>
					<Field label="Public phone"><Input defaultValue={person.phone ?? ''} name="phone" /></Field>
					<Field label="Website URL"><Input defaultValue={person.websiteUrl ?? ''} name="websiteUrl" type="url" /></Field>
					<Field label="Display order"><Input defaultValue={person.displayOrder} min="0" name="displayOrder" type="number" /></Field>
					<label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input defaultChecked={person.isTeamMember} name="isTeamMember" type="checkbox" /> Show as a team member</label>
					<label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input defaultChecked={person.isAuthor} name="isAuthor" type="checkbox" /> Available as an article author</label>
					<div className="md:col-span-2"><Button type="submit">Save profile details</Button></div>
				</form>
			</section>

			<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
				<h2 className="font-robo text-2xl text-slate-950">Portrait</h2>
				<p className="mt-1 text-sm text-slate-600">Upload a new image to replace the profile portrait. The previous file remains safely available for later cleanup.</p>
				<div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
					{portraitUrl ? <Image alt="Current profile portrait" className="size-28 rounded-full border border-slate-200 object-cover" height={112} src={portraitUrl} width={112} /> : <div className="flex size-28 items-center justify-center rounded-full bg-[#e8ebf3] text-xl font-bold text-[#27335a]">{person.displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}</div>}
					<div className="max-w-md space-y-3">
						<Field label="English alt text"><Input id="portrait-alt" defaultValue={`Portrait of ${person.displayName}`} /></Field>
						<label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#27335a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e294c]">
							{isUploading ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {isUploading ? 'Uploading…' : 'Choose portrait'}
							<input accept="image/gif,image/jpeg,image/png,image/svg+xml,image/webp" className="sr-only" disabled={isUploading} onChange={(event) => { const file = event.target.files?.[0]; const altText = (document.getElementById('portrait-alt') as HTMLInputElement | null)?.value.trim() ?? ''; if (file) void uploadPortrait(file, altText) }} type="file" />
						</label>
						{uploadMessage && <p aria-live="polite" className="text-sm text-slate-600">{uploadMessage}</p>}
					</div>
				</div>
			</section>

			<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
				<h2 className="font-robo text-2xl text-slate-950">Translations and publication</h2>
				<div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Profile translations">
					{locales.map((locale) => <Button aria-selected={activeLocale === locale} key={locale} onClick={() => setActiveLocale(locale)} role="tab" type="button" variant={activeLocale === locale ? 'default' : 'outline'}>{locale}</Button>)}
				</div>
				<form action={savePersonTranslationAction} className="mt-6 grid gap-5 md:grid-cols-2" key={activeLocale}>
					<input name="personId" type="hidden" value={person.id} />
					<input name="locale" type="hidden" value={activeLocale} />
					<Field label="Localized URL slug"><Input defaultValue={suggestedSlug} name="slug" required /></Field>
					<Field label="Role / job title"><Input defaultValue={activeTranslation?.jobTitle ?? ''} name="jobTitle" /></Field>
					<Field label="Short introduction"><textarea className="min-h-24 w-full rounded-md border border-input px-3 py-2 text-sm shadow-xs" defaultValue={activeTranslation?.shortBio ?? ''} name="shortBio" /></Field>
					<Field label="Publication status"><select className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" defaultValue={activeTranslation?.status === 'scheduled' ? 'draft' : activeTranslation?.status ?? 'draft'} name="status"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
					<Field className="md:col-span-2" label="Biography"><textarea className="min-h-48 w-full rounded-md border border-input px-3 py-2 text-sm shadow-xs" defaultValue={activeTranslation?.biography ?? ''} name="biography" /></Field>
					<Field label="SEO title"><Input defaultValue={activeTranslation?.seoTitle ?? ''} name="seoTitle" /></Field>
					<Field label="SEO description"><textarea className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm shadow-xs" defaultValue={activeTranslation?.seoDescription ?? ''} name="seoDescription" /></Field>
					<div className="md:col-span-2"><Button type="submit">Save {activeLocale} translation</Button></div>
				</form>
			</section>

			<section className="flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
				<div><h2 className="font-semibold text-amber-950">{person.isActive ? 'Archive this profile' : 'Restore this profile'}</h2><p className="mt-1 text-sm text-amber-900">{person.isActive ? 'Archived profiles are hidden from all public team pages; their translations are preserved.' : 'Restoring makes already published translations visible again.'}</p></div>
				<form action={setPersonArchivedAction}><input name="personId" type="hidden" value={person.id} /><input name="isArchived" type="hidden" value={person.isActive ? 'true' : 'false'} /><Button type="submit" variant={person.isActive ? 'destructive' : 'default'}>{person.isActive ? 'Archive profile' : 'Restore profile'}</Button></form>
			</section>
		</div>
	)
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
	return <label className={`grid gap-1.5 text-sm font-medium text-slate-700 ${className ?? ''}`}><span>{label}</span>{children}</label>
}

async function imageDimensions(file: File): Promise<{ width: number | null; height: number | null }> {
	if (file.type === 'image/svg+xml') return { width: null, height: null }
	const url = URL.createObjectURL(file)
	try {
		const image = new globalThis.Image()
		await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('The selected image could not be read.')); image.src = url })
		return { width: image.naturalWidth || null, height: image.naturalHeight || null }
	} finally { URL.revokeObjectURL(url) }
}
