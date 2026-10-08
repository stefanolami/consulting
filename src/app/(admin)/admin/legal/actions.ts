'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'

import { routing } from '@/i18n/routing'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { PUBLIC_LEGAL_CACHE_TAG } from '@/lib/cache-tags'
import { safeParseLegalDocument } from '@/lib/legal-document.mjs'
import { LEGAL_PAGE_KEYS, legalPath, type LegalPageKey } from '@/lib/legal-pages'
import { createClient } from '@/lib/supabase/server'

export type LegalActionState = { error?: string; field?: LegalField; success?: string }
type LegalField = 'content' | 'lastUpdatedOn' | 'scheduledFor' | 'seoDescription' | 'seoTitle' | 'status' | 'title'

const statuses = ['draft', 'scheduled', 'published', 'archived'] as const
const optionalText = (maximum: number, label: string) => z.string().trim().max(maximum, `${label} must be ${maximum} characters or fewer.`).optional().transform((value) => value || null)

const translationSchema = z.object({
	stableKey: z.enum(LEGAL_PAGE_KEYS, 'Unknown legal page.'),
	locale: z.enum(routing.locales),
	title: z.string().trim().min(1, 'Enter a page title.').max(160, 'The title must be 160 characters or fewer.'),
	lastUpdatedOn: z.string().trim().optional().transform((value) => value || null),
	seoTitle: optionalText(160, 'The SEO title'),
	seoDescription: optionalText(320, 'The SEO description'),
	status: z.enum(statuses, 'Choose a publication status.'),
	scheduledFor: z.string().trim().optional().transform((value) => value || null),
})

const FIELD_BY_PATH: Partial<Record<string, LegalField>> = { title: 'title', seoTitle: 'seoTitle', seoDescription: 'seoDescription', status: 'status' }

// A calendar date (`YYYY-MM-DD`) that exists, on or after the column's lower
// bound.
function parseLastUpdated(value: string | null) {
	if (!value) return null
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new FieldError('lastUpdatedOn', 'Enter the "Last updated" date as a calendar date.')
	const date = new Date(`${value}T00:00:00Z`)
	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new FieldError('lastUpdatedOn', 'Enter a "Last updated" date that exists.')
	if (value < '2000-01-01') throw new FieldError('lastUpdatedOn', 'The "Last updated" date cannot be before 1 January 2000.')
	return value
}

class FieldError extends Error {
	constructor(readonly field: LegalField, message: string) {
		super(message)
	}
}

function translationFromForm(formData: FormData) {
	const parsed = translationSchema.safeParse({
		stableKey: formData.get('stableKey'),
		locale: formData.get('locale'),
		title: formData.get('title'),
		lastUpdatedOn: formData.get('lastUpdatedOn') || undefined,
		seoTitle: formData.get('seoTitle') || undefined,
		seoDescription: formData.get('seoDescription') || undefined,
		status: formData.get('status'),
		scheduledFor: formData.get('scheduledFor') || undefined,
	})
	if (!parsed.success) {
		const issue = parsed.error.issues[0]
		throw new FieldError(FIELD_BY_PATH[String(issue?.path[0])] ?? 'title', issue?.message ?? 'Check the translation fields.')
	}
	const data = parsed.data
	const lastUpdatedOn = parseLastUpdated(data.lastUpdatedOn)
	// The database requires the date to publish; a scheduled translation needs
	// it too, because it is meant to become published unchanged.
	if ((data.status === 'published' || data.status === 'scheduled') && !lastUpdatedOn) {
		throw new FieldError('lastUpdatedOn', `Set the "Last updated" date before ${data.status === 'published' ? 'publishing' : 'scheduling'}. It is shown to visitors.`)
	}
	const scheduledFor = data.scheduledFor ? new Date(data.scheduledFor) : null
	if (data.status === 'scheduled' && (!scheduledFor || Number.isNaN(scheduledFor.getTime()) || scheduledFor <= new Date())) {
		throw new FieldError('scheduledFor', 'Choose a future scheduled publication time.')
	}
	let content: unknown
	try {
		content = JSON.parse(String(formData.get('content') ?? ''))
	} catch {
		throw new FieldError('content', 'The page content could not be read. Reload the page and try again.')
	}
	const document = safeParseLegalDocument(content)
	if (!document.success) throw new FieldError('content', `The page content is not valid. ${document.error}`)
	if (data.status === 'published' && !document.data.content.length) throw new FieldError('content', 'Add the page text before publishing.')
	return {
		...data,
		content: document.data,
		lastUpdatedOn,
		scheduledFor: data.status === 'scheduled' && scheduledFor ? scheduledFor.toISOString() : null,
	}
}

// Every legal change invalidates the public reader (platform doc §11.8) and
// refreshes the admin and public paths of the page.
function refreshLegalPaths(stableKey: LegalPageKey) {
	revalidateTag(PUBLIC_LEGAL_CACHE_TAG, 'max')
	revalidatePath('/admin/legal')
	revalidatePath(`/admin/legal/${stableKey}`)
	for (const locale of routing.locales) revalidatePath(legalPath(stableKey, locale))
}

async function legalPageId(supabase: Awaited<ReturnType<typeof createClient>>, stableKey: LegalPageKey) {
	const { data, error } = await supabase.from('legal_pages').select('id').eq('stable_key', stableKey).maybeSingle()
	if (error) throw new Error(`Could not load the legal page: ${error.message}`)
	if (!data) throw new Error('This legal page does not exist. Check that the legal pages migration is applied.')
	return data.id
}

export async function saveLegalTranslationAction(_: LegalActionState, formData: FormData): Promise<LegalActionState> {
	try {
		const translation = translationFromForm(formData)
		await requireActiveStaff()
		const supabase = await createClient()
		const pageId = await legalPageId(supabase, translation.stableKey)
		// No created_by or updated_by: the audit trigger stamps both from the
		// signed-in user and keeps created_by on update (platform doc §11.6).
		const { error } = await supabase.from('legal_page_translations').upsert({
			legal_page_id: pageId,
			locale: translation.locale,
			title: translation.title,
			content: translation.content,
			last_updated_on: translation.lastUpdatedOn,
			seo_title: translation.seoTitle,
			seo_description: translation.seoDescription,
			status: translation.status,
			scheduled_for: translation.scheduledFor,
			published_at: translation.status === 'published' ? new Date().toISOString() : null,
		}, { onConflict: 'legal_page_id,locale' })
		if (error) return { error: `Could not save this translation: ${error.message}` }
		// Record the touch on the canonical row. Staff may update only
		// updated_by there, and the trigger replaces the value with the actor.
		const { error: touchError } = await supabase.from('legal_pages').update({ updated_by: null }).eq('id', pageId)
		refreshLegalPaths(translation.stableKey)
		if (touchError) return { success: `${translation.locale} translation saved, but the page's last editor could not be recorded: ${touchError.message}` }
		return { success: `${translation.locale} translation saved${translation.status === 'published' ? ' and published' : ''}.` }
	} catch (error) {
		if (error instanceof FieldError) return { error: error.message, field: error.field }
		return { error: error instanceof Error ? error.message : 'Could not save this translation.' }
	}
}

export async function deleteLegalTranslationAction(_: LegalActionState, formData: FormData): Promise<LegalActionState> {
	try {
		const stableKey = z.enum(LEGAL_PAGE_KEYS).parse(formData.get('stableKey'))
		const locale = z.enum(routing.locales).parse(formData.get('locale'))
		const { profile } = await requireActiveStaff()
		// RLS allows only active admins to delete; checking here gives editors a
		// clear message instead of a silent no-op.
		if (profile.role !== 'admin') return { error: 'Only administrators can delete a translation. Archive it instead.' }
		const supabase = await createClient()
		const pageId = await legalPageId(supabase, stableKey)
		const { data, error } = await supabase.from('legal_page_translations').delete().eq('legal_page_id', pageId).eq('locale', locale).select('locale')
		if (error) return { error: `Could not delete this translation: ${error.message}` }
		if (!data?.length) return { error: 'Nothing was deleted: the translation no longer exists or your account may not delete it.' }
		await supabase.from('legal_pages').update({ updated_by: null }).eq('id', pageId)
		refreshLegalPaths(stableKey)
		return { success: `${locale} translation deleted.` }
	} catch (error) {
		return { error: error instanceof Error ? error.message : 'Could not delete this translation.' }
	}
}
