'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'

import { adminAction, failed, FieldError, jsonField, succeeded, type AdminActionResult } from '@/lib/admin-action'
import { callToActionSchema, httpUrl, optionalEmail, optionalText } from '@/lib/admin-schema.mjs'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { PUBLIC_GLOBAL_CACHE_TAG } from '@/lib/cache-tags'
import { createClient } from '@/lib/supabase/server'

const webUrl = httpUrl()
const socialSchema = z.array(z.object({ platform: z.enum(['linkedin', 'instagram', 'facebook', 'youtube', 'x']), url: webUrl }).strict()).max(10)
const ctaSchema = z.array(callToActionSchema).max(30)
// One schema, so every issue names the form field it belongs to.
const settingsSchema = z.object({
	email: optionalEmail('Enter a valid contact email.'),
	phone: optionalText(80), address: optionalText(2_000), footerNote: optionalText(500),
	poeUrl: webUrl,
	socialLinks: socialSchema,
	callsToAction: ctaSchema,
})

export async function saveSiteSettingsAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save site settings.', async () => {
		const parsed = settingsSchema.parse({
			email: formData.get('email'), phone: formData.get('phone'), address: formData.get('address'), footerNote: formData.get('footerNote'),
			poeUrl: formData.get('poeUrl'),
			socialLinks: jsonField(formData, 'socialLinks', 'Social links'),
			callsToAction: jsonField(formData, 'callsToAction', 'Calls to action'),
		})
		const contact = { email: parsed.email, phone: parsed.phone, address: parsed.address, footerNote: parsed.footerNote }
		const poe = { url: parsed.poeUrl }
		const socials = parsed.socialLinks
		const callsToAction = parsed.callsToAction
		if (new Set(socials.map((item) => item.platform)).size !== socials.length) throw new FieldError('socialLinks', 'Each social platform can appear only once.')
		if (new Set(callsToAction.map((item) => item.key)).size !== callsToAction.length) throw new FieldError('callsToAction', 'Each call-to-action key must be unique.')
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const rows = [
			{ key: 'contact_footer', value: contact, description: 'Global contact and footer details.', is_public: true, updated_by: profile.id },
			{ key: 'social_links', value: { items: socials }, description: 'Approved global social profile links.', is_public: true, updated_by: profile.id },
			{ key: 'poe_external_link', value: poe, description: 'External POE website link.', is_public: true, updated_by: profile.id },
			{ key: 'approved_calls_to_action', value: { items: callsToAction }, description: 'Reusable code-owned calls to action with localized labels.', is_public: true, updated_by: profile.id },
		]
		const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' })
		if (error) return failed(`Could not save site settings: ${error.message}`)
		updateTag(PUBLIC_GLOBAL_CACHE_TAG); revalidatePath('/[locale]', 'page'); revalidatePath('/admin/settings'); revalidatePath('/admin'); return succeeded('Global site settings saved.')
	}, { itemLabels: { callsToAction: 'Call to action', socialLinks: 'Social link' } })
}
