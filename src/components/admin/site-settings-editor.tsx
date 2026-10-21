'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { saveCallsToActionAction, saveContactSettingsAction, savePoeSettingsAction, saveSocialSettingsAction } from '@/app/(admin)/admin/settings/actions'
import { AdminForm, Field, FieldSlot, FormActions, useAdminForm } from '@/components/admin/form/admin-form'
import { EditorSection, NotShownNotice } from '@/components/admin/form/editor-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SOCIAL_PLATFORMS, unusedSocialPlatform, type SocialLink } from '@/lib/admin-schema.mjs'

const locales = ['en', 'de', 'it', 'pt-BR', 'pt-PT'] as const
const PLATFORM_NAMES: Record<SocialLink['platform'], string> = { linkedin: 'LinkedIn', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', x: 'X' }
type Cta = { key: string; href: string; labels: { en: string; de: string | null; it: string | null; 'pt-BR': string | null; 'pt-PT': string | null } }
type Contact = { email: string | null; phone: string | null; address: string | null; footerNote: string | null }

/**
 * The four global settings, each with its own form and save button (audit
 * SET-05): saving one never sends, blocks or resets the others.
 */
export function SiteSettingsEditor({ contact, poeUrl, socials, callsToAction }: { contact: Contact; poeUrl: string; socials: SocialLink[]; callsToAction: Cta[] }) {
	return <div className="mt-9 space-y-7"><ContactForm contact={contact} /><PoeForm poeUrl={poeUrl} /><SocialForm initial={socials} /><CallsToActionForm initial={callsToAction} /></div>
}

function ContactForm({ contact }: { contact: Contact }) {
	const form = useAdminForm({ action: saveContactSettingsAction, label: 'the contact and footer details' })
	return (
		<EditorSection description="Shown in the site footer and on the Contact page. Footer layout, legal links and styling remain in code." title="Contact and footer details">
			<AdminForm className="grid gap-5 md:grid-cols-2" form={form}>
				<Field label="Contact email" name="email"><Input defaultValue={contact.email ?? ''} name="email" type="email" /></Field>
				<Field label="Contact phone" name="phone"><Input defaultValue={contact.phone ?? ''} name="phone" /></Field>
				<Field className="md:col-span-2" label="Postal address" name="address"><textarea className="input-textarea" defaultValue={contact.address ?? ''} name="address" rows={4} /></Field>
				{/* The footer prints its own translated copyright line (Shell.footer.copyright), so this one-language note has no place there (audit SET-03). */}
				<div className="grid gap-2 md:col-span-2">
					<Field label="Footer note" name="footerNote"><Input defaultValue={contact.footerNote ?? ''} maxLength={500} name="footerNote" /></Field>
					<NotShownNotice>The footer shows its own copyright line, translated into every language (“© [current year] Time&amp;Place Consulting. All rights reserved.”). This note is kept for later use and changing it has no visible effect.</NotShownNotice>
				</div>
				<FormActions className="md:col-span-2" form={form} label="Save contact details" />
			</AdminForm>
		</EditorSection>
	)
}

function PoeForm({ poeUrl }: { poeUrl: string }) {
	const form = useAdminForm({ action: savePoeSettingsAction, label: 'the POE link' })
	return (
		<EditorSection description="Where the POE link in the site header points." title="POE external link">
			<AdminForm className="grid gap-5" form={form}>
				<Field label="Complete web URL" name="poeUrl" required><Input defaultValue={poeUrl} name="poeUrl" placeholder="https://…" required type="url" /></Field>
				<FormActions form={form} label="Save POE link" />
			</AdminForm>
		</EditorSection>
	)
}

function SocialForm({ initial }: { initial: SocialLink[] }) {
	const [socials, setSocials] = useState(initial)
	const form = useAdminForm({ action: saveSocialSettingsAction, label: 'the social links' })
	// A new row starts with a platform that is not used yet (audit SET-04).
	const nextPlatform = unusedSocialPlatform(socials.map((item) => item.platform))
	const update = (index: number, change: Partial<SocialLink>) => setSocials((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...change } : item))
	return (
		<EditorSection description="Shown as icons in the site footer. One link per platform." title="Social links">
			<AdminForm className="grid gap-5" form={form}>
				<FieldSlot name="socialLinks">
					<input name="socialLinks" type="hidden" value={JSON.stringify(socials)} />
					<div className="space-y-3">
						{socials.map((social, index) => (
							<div className="grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-[12rem_1fr_auto] md:items-end" key={index}>
								<Field label="Platform">
									<select className="input-select" onChange={(event) => update(index, { platform: event.target.value as SocialLink['platform'] })} value={social.platform}>
										{SOCIAL_PLATFORMS.map((platform) => <option disabled={platform !== social.platform && socials.some((item) => item.platform === platform)} key={platform} value={platform}>{PLATFORM_NAMES[platform]}</option>)}
									</select>
								</Field>
								<Field label={`${PLATFORM_NAMES[social.platform]} profile URL`}><Input onChange={(event) => update(index, { url: event.target.value })} placeholder="https://…" type="url" value={social.url} /></Field>
								<Button aria-label={`Remove the ${PLATFORM_NAMES[social.platform]} link`} onClick={() => setSocials((current) => current.filter((_, itemIndex) => itemIndex !== index))} size="icon" type="button" variant="ghost"><Trash2 /></Button>
							</div>
						))}
						{!socials.length && <p className="text-sm text-slate-500">No social links are configured.</p>}
					</div>
				</FieldSlot>
				<div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Removing a link takes effect only when you save; reload the page to get it back before then.</p><Button disabled={!nextPlatform} onClick={() => { if (nextPlatform) setSocials((current) => [...current, { platform: nextPlatform, url: '' }]) }} title={nextPlatform ? undefined : 'Every platform has a link.'} type="button" variant="outline"><Plus />Add social link</Button></div>
				<FormActions form={form} label="Save social links" />
			</AdminForm>
		</EditorSection>
	)
}

function CallsToActionForm({ initial }: { initial: Cta[] }) {
	const [ctas, setCtas] = useState(initial)
	const form = useAdminForm({ action: saveCallsToActionAction, label: 'the calls to action' })
	const update = (index: number, change: (item: Cta) => Cta) => setCtas((current) => current.map((item, itemIndex) => itemIndex === index ? change(item) : item))
	return (
		<EditorSection description="Reusable keys, destinations and localized labels." title="Approved calls to action">
			{/* No public page reads approved_calls_to_action yet; every button on the site has its own translated label in code (audit SET-03). */}
			<NotShownNotice className="mb-5">No page of the website uses these calls to action: its buttons and links have their own labels in code. They are kept for later use, so changing them has no visible effect.</NotShownNotice>
			<AdminForm className="grid gap-5" form={form}>
				<FieldSlot name="callsToAction">
					<input name="callsToAction" type="hidden" value={JSON.stringify(ctas)} />
					<div className="space-y-4">
						{ctas.map((cta, index) => (
							<div className="rounded-lg border border-slate-200 p-4" key={index}>
								<div className="grid gap-3 md:grid-cols-2">
									<Field label="Stable key"><Input onChange={(event) => update(index, (item) => ({ ...item, key: event.target.value }))} placeholder="e.g. contact-us" value={cta.key} /></Field>
									<Field label="Destination"><Input onChange={(event) => update(index, (item) => ({ ...item, href: event.target.value }))} placeholder="/contact or https://…" value={cta.href} /></Field>
									{locales.map((locale) => <Field key={locale} label={`${locale} label${locale === 'en' ? '' : ' (optional)'}`}><Input onChange={(event) => update(index, (item) => ({ ...item, labels: { ...item.labels, [locale]: event.target.value || null } }))} value={cta.labels[locale] ?? ''} /></Field>)}
								</div>
								<Button className="mt-3" onClick={() => setCtas((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button" variant="ghost"><Trash2 />Remove call to action</Button>
							</div>
						))}
						{!ctas.length && <p className="text-sm text-slate-500">No reusable calls to action are configured.</p>}
					</div>
				</FieldSlot>
				<div><Button onClick={() => setCtas((current) => [...current, { key: '', href: '', labels: { en: '', de: null, it: null, 'pt-BR': null, 'pt-PT': null } }])} type="button" variant="outline"><Plus />Add call to action</Button></div>
				<FormActions form={form} label="Save calls to action" />
			</AdminForm>
		</EditorSection>
	)
}
