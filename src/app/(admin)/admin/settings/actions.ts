'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

import { requireActiveStaff } from '@/lib/auth/authorization'
import { PUBLIC_GLOBAL_CACHE_TAG } from '@/lib/cache-tags'
import { createClient } from '@/lib/supabase/server'

export type SiteSettingsActionState = { error?: string; success?: string }

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().transform((value) => value || null)
const webUrl = z.string().trim().max(2_048).superRefine((value, context) => {
	try {
		const url = new URL(value)
		if (url.protocol !== 'http:' && url.protocol !== 'https:') context.addIssue({ code: 'custom', message: 'Use a complete http or https URL.' })
	} catch { context.addIssue({ code: 'custom', message: 'Use a complete http or https URL.' }) }
})
const ctaHref = z.string().trim().max(2_048).refine((value) => value.startsWith('/') || webUrl.safeParse(value).success, 'Calls to action need an internal path or complete web URL.')
const localeLabels = z.object({ en: z.string().trim().min(1).max(120), de: optionalText(120), it: optionalText(120), 'pt-BR': optionalText(120), 'pt-PT': optionalText(120) }).strict()
const socialSchema = z.array(z.object({ platform: z.enum(['linkedin', 'instagram', 'facebook', 'youtube', 'x']), url: webUrl }).strict()).max(10)
const ctaSchema = z.array(z.object({ key: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'CTA keys use lowercase letters, numbers and hyphens.'), href: ctaHref, labels: localeLabels }).strict()).max(30)

function jsonField(value: FormDataEntryValue | null, label: string): unknown {
	if (typeof value !== 'string') throw new Error(`${label} is invalid.`)
	try { return JSON.parse(value) } catch { throw new Error(`${label} is invalid.`) }
}

export async function saveSiteSettingsAction(_: SiteSettingsActionState, formData: FormData): Promise<SiteSettingsActionState> {
	try {
		const contact = z.object({
			email: optionalText(320).refine((value) => value === null || z.string().email().safeParse(value).success, 'Enter a valid contact email.'),
			phone: optionalText(80), address: optionalText(2_000), footerNote: optionalText(500),
		}).strict().parse({ email: formData.get('email') || undefined, phone: formData.get('phone') || undefined, address: formData.get('address') || undefined, footerNote: formData.get('footerNote') || undefined })
		const poe = z.object({ url: webUrl }).strict().parse({ url: formData.get('poeUrl') })
		const socials = socialSchema.parse(jsonField(formData.get('socialLinks'), 'Social links'))
		const callsToAction = ctaSchema.parse(jsonField(formData.get('callsToAction'), 'Calls to action'))
		if (new Set(socials.map((item) => item.platform)).size !== socials.length) return { error: 'Each social platform can appear only once.' }
		if (new Set(callsToAction.map((item) => item.key)).size !== callsToAction.length) return { error: 'Each call-to-action key must be unique.' }
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const rows = [
			{ key: 'contact_footer', value: contact, description: 'Global contact and footer details.', is_public: true, updated_by: profile.id },
			{ key: 'social_links', value: { items: socials }, description: 'Approved global social profile links.', is_public: true, updated_by: profile.id },
			{ key: 'poe_external_link', value: poe, description: 'External POE website link.', is_public: true, updated_by: profile.id },
			{ key: 'approved_calls_to_action', value: { items: callsToAction }, description: 'Reusable code-owned calls to action with localized labels.', is_public: true, updated_by: profile.id },
		]
		const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' })
		if (error) return { error: `Could not save site settings: ${error.message}` }
		revalidateTag(PUBLIC_GLOBAL_CACHE_TAG, 'max'); revalidatePath('/[locale]', 'page'); revalidatePath('/admin/settings'); revalidatePath('/admin'); return { success: 'Global site settings saved.' }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not save site settings.' } }
}
