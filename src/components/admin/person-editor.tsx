'use client'

import { ArrowDown, ArrowUp, ImagePlus, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { attachPersonPortraitAction, savePersonTranslationAction, setPersonArchivedAction, updatePersonAction } from '@/app/(admin)/admin/actions'
import { ProfileDocumentEditor } from '@/components/admin/profile-document-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { emptyProfileDocument } from '@/lib/team-profile-document'
import type { ProfileDocument } from '@/lib/team-profile-document'
import { createClient } from '@/lib/supabase/client'

const locales = ['en', 'de', 'it', 'pt-BR', 'pt-PT'] as const
type Locale = (typeof locales)[number]
type Role = { id?: string; title: string; cardLabel: string | null; isCardRole: boolean }

type Translation = {
	locale: Locale; slug: string; cardName: string | null; roles: Role[]; profileDocument: ProfileDocument
	portraitAltText: string | null; seoTitle: string | null; seoDescription: string | null
	status: 'draft' | 'scheduled' | 'published' | 'archived'
}
type Person = {
	id: string; displayName: string; stableKey: string; email: string | null; phone: string | null
	isTeamMember: boolean; isAuthor: boolean; isActive: boolean; displayOrder: number; teamGroup: 'managing_team' | 'team'; portraitPath: string | null
}

export function PersonEditor({ person, translations }: { person: Person; translations: Translation[] }) {
	const [activeLocale, setActiveLocale] = useState<Locale>('en')
	const [portraitPath, setPortraitPath] = useState(person.portraitPath)
	const [uploadMessage, setUploadMessage] = useState<string | null>(null)
	const [isUploading, setIsUploading] = useState(false)

	async function uploadPortrait(file: File, altText: string) {
		setIsUploading(true); setUploadMessage(null)
		try {
			if (!['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'].includes(file.type)) throw new Error('Choose a GIF, JPEG, PNG, SVG, or WebP image.')
			if (file.size > 15 * 1024 * 1024) throw new Error('Images must be 15 MiB or smaller.')
			const extension = file.name.split('.').pop()?.toLowerCase() || 'image'
			const objectPath = `people/${person.id}/${crypto.randomUUID()}.${extension}`
			const supabase = createClient()
			const { error: uploadError } = await supabase.storage.from('public-media').upload(objectPath, file, { cacheControl: '31536000', contentType: file.type, upsert: false })
			if (uploadError) throw new Error(uploadError.message)
			const dimensions = await imageDimensions(file)
			await attachPersonPortraitAction({ personId: person.id, objectPath, originalFilename: file.name, mimeType: file.type, fileSizeBytes: file.size, width: dimensions.width, height: dimensions.height, altText })
			setPortraitPath(objectPath); setUploadMessage('Portrait uploaded and attached to this profile.')
		} catch (error) { setUploadMessage(error instanceof Error ? error.message : 'Could not upload the portrait.') } finally { setIsUploading(false) }
	}
	const portraitUrl = portraitPath ? createClient().storage.from('public-media').getPublicUrl(portraitPath).data.publicUrl : null

	return <div className="space-y-8">
		<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
			<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 className="font-robo text-2xl text-slate-950">Profile details</h2><p className="mt-1 text-sm text-slate-600">Shared identity, contact details, and placement in the public directory.</p></div><span className={person.isActive ? 'rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700' : 'rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700'}>{person.isActive ? 'Active' : 'Archived'}</span></div>
			<form action={updatePersonAction} className="mt-6 grid gap-5 md:grid-cols-2"><input name="personId" type="hidden" value={person.id} /><Field label="Display name"><Input defaultValue={person.displayName} name="displayName" required /></Field><Field label="Stable key"><Input defaultValue={person.stableKey} name="stableKey" required /></Field><Field label="Public email"><Input defaultValue={person.email ?? ''} name="email" type="email" /></Field><Field label="Public phone"><Input defaultValue={person.phone ?? ''} name="phone" /></Field><Field label="Team group"><select className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" defaultValue={person.teamGroup} name="teamGroup"><option value="managing_team">Managing team</option><option value="team">Team</option></select></Field><Field label="Order within group"><Input defaultValue={person.displayOrder} min="0" name="displayOrder" type="number" /></Field><label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input defaultChecked={person.isTeamMember} name="isTeamMember" type="checkbox" />Show as a team member</label><label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input defaultChecked={person.isAuthor} name="isAuthor" type="checkbox" />Available as an article author</label><div className="md:col-span-2"><Button type="submit">Save profile details</Button></div></form>
		</section>

		<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="font-robo text-2xl text-slate-950">Portrait</h2><p className="mt-1 text-sm text-slate-600">The portrait is shared. Its alternative text can be localized in each translation below.</p><div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">{portraitUrl ? <Image alt="Current profile portrait" className="size-28 rounded-full border border-slate-200 object-cover" height={112} src={portraitUrl} width={112} /> : <div className="flex size-28 items-center justify-center rounded-full bg-[#e8ebf3] text-xl font-bold text-[#27335a]">{initials(person.displayName)}</div>}<div className="max-w-md space-y-3"><Field label="English alt text for a new portrait"><Input id="portrait-alt" defaultValue={`Portrait of ${person.displayName}`} /></Field><label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#27335a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e294c]">{isUploading ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{isUploading ? 'Uploading…' : 'Choose portrait'}<input accept="image/gif,image/jpeg,image/png,image/svg+xml,image/webp" className="sr-only" disabled={isUploading} onChange={(event) => { const file = event.target.files?.[0]; const altText = (document.getElementById('portrait-alt') as HTMLInputElement | null)?.value.trim() ?? ''; if (file) void uploadPortrait(file, altText) }} type="file" /></label>{uploadMessage && <p aria-live="polite" className="text-sm text-slate-600">{uploadMessage}</p>}</div></div></section>

		<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="font-robo text-2xl text-slate-950">Translations and publication</h2><p className="mt-1 text-sm text-slate-600">Each language has its own card content, roles, structured profile, media alt text, SEO, and publication state.</p><div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Profile translations">{locales.map((locale) => <Button aria-selected={activeLocale === locale} key={locale} onClick={() => setActiveLocale(locale)} role="tab" type="button" variant={activeLocale === locale ? 'default' : 'outline'}>{locale}</Button>)}</div><LocalizedProfileForm key={activeLocale} locale={activeLocale} person={person} translation={translations.find((translation) => translation.locale === activeLocale)} /></section>

		<section className="flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-amber-950">{person.isActive ? 'Archive this profile' : 'Restore this profile'}</h2><p className="mt-1 text-sm text-amber-900">{person.isActive ? 'Archived profiles are hidden from every public locale; their translations, roles, and media text are retained.' : 'Restoring makes already-published translations visible again.'}</p></div><form action={setPersonArchivedAction}><input name="personId" type="hidden" value={person.id} /><input name="isArchived" type="hidden" value={person.isActive ? 'true' : 'false'} /><Button type="submit" variant={person.isActive ? 'destructive' : 'default'}>{person.isActive ? 'Archive profile' : 'Restore profile'}</Button></form></section>
	</div>
}

function LocalizedProfileForm({ locale, person, translation }: { locale: Locale; person: Person; translation?: Translation }) {
	const [roles, setRoles] = useState<Role[]>(translation?.roles.length ? translation.roles : [{ title: '', cardLabel: null, isCardRole: true }])
	const suggestedSlug = locale === 'en' ? person.stableKey : translation?.slug ?? person.stableKey
	function moveRole(index: number, direction: -1 | 1) { setRoles((current) => { const destination = index + direction; if (destination < 0 || destination >= current.length) return current; const next = [...current]; [next[index], next[destination]] = [next[destination], next[index]]; return next }) }
	return <form action={savePersonTranslationAction} className="mt-6 grid gap-5 md:grid-cols-2"><input name="personId" type="hidden" value={person.id} /><input name="locale" type="hidden" value={locale} /><input name="roles" type="hidden" value={JSON.stringify(roles)} /><Field label="Localized URL slug"><Input defaultValue={suggestedSlug} name="slug" required /></Field><Field label="Card name (optional)"><Input defaultValue={translation?.cardName ?? ''} name="cardName" placeholder={person.displayName} /></Field><div className="md:col-span-2 rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Localized roles</h3><p className="mt-1 text-sm text-slate-600">Add roles in display order. Select one to appear on the portrait/team card; its shorter card label is optional.</p></div><Button onClick={() => setRoles((current) => [...current, { title: '', cardLabel: null, isCardRole: false }])} type="button" variant="outline"><Plus />Add role</Button></div><div className="mt-4 space-y-3">{roles.map((role, index) => <div className="grid gap-3 rounded-md bg-slate-50 p-3 md:grid-cols-[auto_1fr_1fr_auto] md:items-end" key={role.id ?? index}><label className="flex items-center gap-2 pb-2 text-xs font-medium text-slate-600"><input checked={role.isCardRole} name="cardRole" onChange={() => setRoles((current) => current.map((item, itemIndex) => ({ ...item, isCardRole: itemIndex === index })))} type="radio" />Card role</label><Field label={`Role ${index + 1}`}><Input value={role.title} onChange={(event) => setRoles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} required /></Field><Field label="Short card label"><Input value={role.cardLabel ?? ''} onChange={(event) => setRoles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, cardLabel: event.target.value || null } : item))} /></Field><div className="flex gap-1"><Button aria-label={`Move role ${index + 1} up`} disabled={index === 0} onClick={() => moveRole(index, -1)} size="icon" type="button" variant="ghost"><ArrowUp /></Button><Button aria-label={`Move role ${index + 1} down`} disabled={index === roles.length - 1} onClick={() => moveRole(index, 1)} size="icon" type="button" variant="ghost"><ArrowDown /></Button><Button aria-label={`Remove role ${index + 1}`} disabled={roles.length === 1} onClick={() => setRoles((current) => { const next = current.filter((_, itemIndex) => itemIndex !== index); return next.some((item) => item.isCardRole) ? next : next.map((item, itemIndex) => ({ ...item, isCardRole: itemIndex === 0 })) })} size="icon" type="button" variant="ghost"><Trash2 /></Button></div></div>)}</div></div><div className="md:col-span-2"><ProfileDocumentEditor initialValue={translation?.profileDocument ?? emptyProfileDocument()} /></div><Field label="Portrait alt text"><Input defaultValue={translation?.portraitAltText ?? ''} name="portraitAltText" placeholder={portraitAltPlaceholder(person.displayName, locale)} /></Field><Field label="Publication status"><select className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" defaultValue={translation?.status === 'scheduled' ? 'draft' : translation?.status ?? 'draft'} name="status"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Field><Field label="SEO title"><Input defaultValue={translation?.seoTitle ?? ''} name="seoTitle" /></Field><Field label="SEO description"><textarea className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm shadow-xs" defaultValue={translation?.seoDescription ?? ''} name="seoDescription" /></Field><div className="md:col-span-2"><Button type="submit">Save {locale} translation</Button></div></form>
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) { return <label className={`grid gap-1.5 text-sm font-medium text-slate-700 ${className ?? ''}`}><span>{label}</span>{children}</label> }
function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2) }
function portraitAltPlaceholder(name: string, locale: string) { return locale === 'en' ? `Portrait of ${name}` : `Localized portrait description for ${name}` }
async function imageDimensions(file: File): Promise<{ width: number | null; height: number | null }> { if (file.type === 'image/svg+xml') return { width: null, height: null }; const url = URL.createObjectURL(file); try { const image = new globalThis.Image(); await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('The selected image could not be read.')); image.src = url }); return { width: image.naturalWidth || null, height: image.naturalHeight || null } } finally { URL.revokeObjectURL(url) } }
