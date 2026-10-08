import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LegalEditor, type LegalEditorTranslation } from '@/components/admin/legal-editor'
import { LEGAL_PAGE_NAMES } from '@/components/admin/legal-status'
import { routing } from '@/i18n/routing'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { emptyLegalDocument, safeParseLegalDocument } from '@/lib/legal-document.mjs'
import { isLegalPageKey, legalPath } from '@/lib/legal-pages'
import { createClient } from '@/lib/supabase/server'

type LegalPageEditorProps = { params: Promise<{ key: string }> }

export async function generateMetadata({ params }: LegalPageEditorProps): Promise<Metadata> {
	const { key } = await params
	return { title: isLegalPageKey(key) ? LEGAL_PAGE_NAMES[key] : 'Legal page' }
}

export default async function LegalPageEditor({ params }: LegalPageEditorProps) {
	const { key } = await params
	if (!isLegalPageKey(key)) notFound()
	const { profile } = await requireActiveStaff()
	const supabase = await createClient()
	const { data: page, error: pageError } = await supabase.from('legal_pages').select('id, is_active').eq('stable_key', key).maybeSingle()
	if (pageError) throw new Error(`Unable to load the legal page: ${pageError.message}`)
	if (!page) notFound()
	const { data: translations, error } = await supabase
		.from('legal_page_translations')
		.select('locale, title, content, last_updated_on, seo_title, seo_description, status, scheduled_for, updated_at, updated_by')
		.eq('legal_page_id', page.id)
	if (error) throw new Error(`Unable to load the legal translations: ${error.message}`)
	// Editors may read only their own profile and admins every profile, so a
	// name that cannot be read is left out.
	const editorIds = [...new Set((translations ?? []).flatMap((item) => (item.updated_by ? [item.updated_by] : [])))]
	const { data: profiles } = editorIds.length ? await supabase.from('profiles').select('id, display_name, email').in('id', editorIds) : { data: [] }
	const nameOf = (id: string | null) => {
		const match = (profiles ?? []).find((item) => item.id === id)
		return match ? match.display_name || match.email : null
	}

	const editorTranslations: LegalEditorTranslation[] = (translations ?? []).flatMap((item) => {
		const locale = routing.locales.find((entry) => entry === item.locale)
		if (!locale) return []
		// Stored content is validated on every save; anything else opens empty
		// rather than breaking the editor.
		const content = safeParseLegalDocument(item.content)
		return [{
			content: content.success ? content.data : emptyLegalDocument(),
			lastUpdatedOn: item.last_updated_on,
			locale,
			scheduledFor: item.scheduled_for,
			seoDescription: item.seo_description,
			seoTitle: item.seo_title,
			status: item.status,
			title: item.title,
			updatedAt: item.updated_at,
			updatedByName: nameOf(item.updated_by),
		}]
	})

	return (
		<div className="mx-auto max-w-5xl">
			<Link className="text-sm font-semibold text-[#53617f] underline-offset-4 hover:underline" href="/admin/legal">← Legal pages</Link>
			<div className="mt-5">
				<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Legal administration</p>
				<h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950">{LEGAL_PAGE_NAMES[key]}</h1>
				<p className="mt-2 text-slate-600">Public at <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">{legalPath(key, routing.defaultLocale)}</code> and its language versions. The page itself is fixed by the website; only its text is edited here.</p>
				{!page.is_active ? <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">This page is switched off by an operator and is not public in any language. Translations can still be edited.</p> : null}
			</div>
			<div className="mt-9">
				<LegalEditor canDelete={profile.role === 'admin'} stableKey={key} translations={editorTranslations} />
			</div>
		</div>
	)
}
