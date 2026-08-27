'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireActiveStaff } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'

const locales = ['en', 'de', 'it', 'pt-BR', 'pt-PT'] as const
const sourcePath = z.string().trim().min(1).max(2_048).superRefine((value, context) => {
	if (!value.startsWith('/') || value.startsWith('//')) context.addIssue({ code: 'custom', message: 'The source must be a single-leading-slash site path.' })
	if (/[\\?#\s]/.test(value)) context.addIssue({ code: 'custom', message: 'The source cannot contain a backslash, query, fragment or whitespace.' })
	if (value === '/admin' || value.startsWith('/admin/') || value === '/auth' || value.startsWith('/auth/')) context.addIssue({ code: 'custom', message: 'Admin and authentication routes cannot be redirect sources.' })
})
const destinationPath = z.string().trim().min(1).max(2_048).superRefine((value, context) => {
	if (value.startsWith('/')) {
		if (value.startsWith('//') || /[\\\s]/.test(value)) context.addIssue({ code: 'custom', message: 'Internal destinations must be valid single-leading-slash paths.' })
		return
	}
	try {
		const url = new URL(value)
		if (url.protocol !== 'https:') context.addIssue({ code: 'custom', message: 'External destinations must use HTTPS.' })
		if (url.username || url.password) context.addIssue({ code: 'custom', message: 'External destinations cannot contain credentials.' })
	} catch { context.addIssue({ code: 'custom', message: 'Use an internal path or complete HTTPS URL.' }) }
})
const redirectSchema = z.object({ id: z.string().uuid().optional(), locale: z.union([z.enum(locales), z.literal('')]).transform((value) => value || null), sourcePath, destinationPath, statusCode: z.coerce.number().refine((value): value is 301 | 308 => value === 301 || value === 308, 'Use a permanent 301 or 308 redirect.') })

export type RedirectActionState = { error?: string; success?: string }

function fromForm(formData: FormData, includeId = true) {
	const parsed = redirectSchema.parse({ id: includeId ? formData.get('id') || undefined : undefined, locale: formData.get('locale') || '', sourcePath: formData.get('sourcePath'), destinationPath: formData.get('destinationPath'), statusCode: formData.get('statusCode') })
	if (parsed.destinationPath.startsWith('/') && parsed.sourcePath === parsed.destinationPath) throw new Error('The source and destination cannot be the same.')
	return parsed
}

async function validateNoLoop(supabase: Awaited<ReturnType<typeof createClient>>, candidate: { id?: string; locale: string | null; sourcePath: string; destinationPath: string; isActive: boolean }) {
	if (!candidate.isActive || !candidate.destinationPath.startsWith('/')) return
	const { data, error } = await supabase.from('redirects').select('id, locale, source_path, destination_path, is_active').eq('is_active', true)
	if (error) throw new Error(`Could not validate redirect chains: ${error.message}`)
	const records = (data ?? []).filter((item) => item.id !== candidate.id)
	const nextFor = (path: string) => {
		const exact = records.find((item) => item.locale === candidate.locale && item.source_path === path)
		const global = records.find((item) => item.locale === null && item.source_path === path)
		return (exact ?? global)?.destination_path ?? null
	}
	const visited = new Set([candidate.sourcePath]); let destination: string | null = candidate.destinationPath
	for (let depth = 0; destination?.startsWith('/') && depth < 100; depth += 1) {
		if (visited.has(destination)) throw new Error('This enabled redirect would create a redirect loop.')
		visited.add(destination); destination = nextFor(destination)
	}
	if (destination?.startsWith('/')) throw new Error('This redirect chain is too long to validate safely.')
}

function refreshRedirects() { revalidatePath('/admin/redirects'); revalidatePath('/admin') }

export async function createRedirectAction(_: RedirectActionState, formData: FormData): Promise<RedirectActionState> {
	try {
		const parsed = fromForm(formData, false); const enabled = formData.get('enabled') === 'on'
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		await validateNoLoop(supabase, { locale: parsed.locale, sourcePath: parsed.sourcePath, destinationPath: parsed.destinationPath, isActive: enabled })
		const { error } = await supabase.from('redirects').insert({ locale: parsed.locale, source_path: parsed.sourcePath, destination_path: parsed.destinationPath, status_code: parsed.statusCode, is_active: enabled, created_by: profile.id, updated_by: profile.id })
		if (error) return { error: `Could not create the redirect: ${error.message}` }
		refreshRedirects(); return { success: enabled ? 'Permanent redirect created and enabled in the registry.' : 'Permanent redirect created in a disabled state.' }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not create the redirect.' } }
}

export async function updateRedirectAction(_: RedirectActionState, formData: FormData): Promise<RedirectActionState> {
	try {
		const parsed = fromForm(formData); if (!parsed.id) return { error: 'Invalid redirect.' }
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const { data: current, error: currentError } = await supabase.from('redirects').select('is_active').eq('id', parsed.id).maybeSingle()
		if (currentError || !current) return { error: `Could not load the redirect: ${currentError?.message ?? 'Redirect not found.'}` }
		await validateNoLoop(supabase, { id: parsed.id, locale: parsed.locale, sourcePath: parsed.sourcePath, destinationPath: parsed.destinationPath, isActive: current.is_active })
		const { error } = await supabase.from('redirects').update({ locale: parsed.locale, source_path: parsed.sourcePath, destination_path: parsed.destinationPath, status_code: parsed.statusCode, updated_by: profile.id }).eq('id', parsed.id)
		if (error) return { error: `Could not save the redirect: ${error.message}` }
		refreshRedirects(); return { success: 'Redirect details saved.' }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not save the redirect.' } }
}

export async function setRedirectEnabledAction(_: RedirectActionState, formData: FormData): Promise<RedirectActionState> {
	try {
		const id = z.string().uuid().parse(formData.get('id')); const enabled = z.enum(['true', 'false']).parse(formData.get('enabled')) === 'true'
		const { profile } = await requireActiveStaff(); const supabase = await createClient()
		const { data: current, error: currentError } = await supabase.from('redirects').select('locale, source_path, destination_path').eq('id', id).maybeSingle()
		if (currentError || !current) return { error: `Could not load the redirect: ${currentError?.message ?? 'Redirect not found.'}` }
		await validateNoLoop(supabase, { id, locale: current.locale, sourcePath: current.source_path, destinationPath: current.destination_path, isActive: enabled })
		const { error } = await supabase.from('redirects').update({ is_active: enabled, updated_by: profile.id }).eq('id', id)
		if (error) return { error: `Could not ${enabled ? 'enable' : 'disable'} the redirect: ${error.message}` }
		refreshRedirects(); return { success: enabled ? 'Redirect enabled in the registry.' : 'Redirect safely disabled.' }
	} catch (error) { return { error: error instanceof Error ? error.message : 'Could not update the redirect.' } }
}
