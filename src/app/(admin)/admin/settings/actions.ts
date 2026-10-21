'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'

import { adminAction, failed, FieldError, jsonField, succeeded, type AdminActionResult } from '@/lib/admin-action'
import { callToActionSchema, httpUrl, optionalEmail, optionalText, socialLinkSchema } from '@/lib/admin-schema.mjs'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { PUBLIC_GLOBAL_CACHE_TAG } from '@/lib/cache-tags'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database.generated'

// The four global settings are independent rows of site_settings, each saved
// by its own form (audit SET-05): an error in one never blocks the others,
// and every save is a single upsert.

const contactSchema = z.object({
	email: optionalEmail('Enter a valid contact email.'),
	phone: optionalText(80), address: optionalText(2_000), footerNote: optionalText(500),
})
const poeSchema = z.object({ poeUrl: httpUrl() })
const socialSchema = z.object({ socialLinks: z.array(socialLinkSchema).max(10) })
const ctaSchema = z.object({ callsToAction: z.array(callToActionSchema).max(30) })

async function saveSetting(key: string, value: Json, description: string) {
	const { profile } = await requireActiveStaff(); const supabase = await createClient()
	const { error } = await supabase.from('site_settings').upsert({ key, value, description, is_public: true, updated_by: profile.id }, { onConflict: 'key' })
	if (error) return failed(`Could not save: ${error.message}`)
	updateTag(PUBLIC_GLOBAL_CACHE_TAG); revalidatePath('/[locale]', 'page'); revalidatePath('/admin/settings'); revalidatePath('/admin')
	return null
}

export async function saveContactSettingsAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save the contact details.', async () => {
		const parsed = contactSchema.parse({ email: formData.get('email'), phone: formData.get('phone'), address: formData.get('address'), footerNote: formData.get('footerNote') })
		return await saveSetting('contact_footer', parsed, 'Global contact and footer details.') ?? succeeded('Contact and footer details saved.')
	})
}

export async function savePoeSettingsAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save the POE link.', async () => {
		const parsed = poeSchema.parse({ poeUrl: formData.get('poeUrl') })
		return await saveSetting('poe_external_link', { url: parsed.poeUrl }, 'External POE website link.') ?? succeeded('POE link saved.')
	})
}

export async function saveSocialSettingsAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save the social links.', async () => {
		const { socialLinks } = socialSchema.parse({ socialLinks: jsonField(formData, 'socialLinks', 'Social links') })
		if (new Set(socialLinks.map((item) => item.platform)).size !== socialLinks.length) throw new FieldError('socialLinks', 'Each social platform can appear only once.')
		return await saveSetting('social_links', { items: socialLinks }, 'Approved global social profile links.') ?? succeeded('Social links saved.')
	}, { itemLabels: { socialLinks: 'Social link' } })
}

export async function saveCallsToActionAction(formData: FormData): Promise<AdminActionResult> {
	return adminAction('Could not save the calls to action.', async () => {
		const { callsToAction } = ctaSchema.parse({ callsToAction: jsonField(formData, 'callsToAction', 'Calls to action') })
		if (new Set(callsToAction.map((item) => item.key)).size !== callsToAction.length) throw new FieldError('callsToAction', 'Each call-to-action key must be unique.')
		return await saveSetting('approved_calls_to_action', { items: callsToAction }, 'Reusable code-owned calls to action with localized labels.') ?? succeeded('Calls to action saved.')
	}, { itemLabels: { callsToAction: 'Call to action' } })
}
