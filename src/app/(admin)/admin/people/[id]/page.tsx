import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PersonEditor } from '@/components/admin/person-editor'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database.generated'

type PersonPageProps = { params: Promise<{ id: string }> }

export default async function PersonPage({ params }: PersonPageProps) {
	const { id } = await params
	const supabase = await createClient()
	const { data: person, error: personError } = await supabase
		.from('people')
		.select('id, display_name, stable_key, email, phone, website_url, is_team_member, is_author, is_active, display_order, portrait_media_id')
		.eq('id', id)
		.maybeSingle()
	if (personError) throw new Error(`Unable to load this profile: ${personError.message}`)
	if (!person) notFound()

	const [{ data: translations, error: translationError }, { data: portrait, error: portraitError }] = await Promise.all([
		supabase.from('people_translations').select('locale, slug, job_title, short_bio, content, seo_title, seo_description, status').eq('person_id', person.id).order('locale'),
		person.portrait_media_id ? supabase.from('media_assets').select('object_path').eq('id', person.portrait_media_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
	])
	if (translationError || portraitError) throw new Error(`Unable to load profile content: ${translationError?.message ?? portraitError?.message}`)

	return <div className="mx-auto max-w-5xl">
		<Link className="text-sm font-semibold text-[#53617f] underline-offset-4 hover:underline" href="/admin/people">← Team directory</Link>
		<div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">People and team</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950">{person.display_name}</h1><p className="mt-2 text-slate-600">Edit the shared profile, localized public content and portrait.</p></div>
		<div className="mt-9"><PersonEditor person={{ id: person.id, displayName: person.display_name, stableKey: person.stable_key, email: person.email, phone: person.phone, websiteUrl: person.website_url, isTeamMember: person.is_team_member, isAuthor: person.is_author, isActive: person.is_active, displayOrder: person.display_order, portraitPath: portrait?.object_path ?? null }} translations={(translations ?? []).map((translation) => ({ locale: translation.locale as 'en' | 'de' | 'it' | 'pt-BR' | 'pt-PT', slug: translation.slug, jobTitle: translation.job_title, shortBio: translation.short_bio, biography: documentToText(translation.content), seoTitle: translation.seo_title, seoDescription: translation.seo_description, status: translation.status }))} /></div>
	</div>
}

function documentToText(content: Json): string {
	if (!content || typeof content !== 'object' || Array.isArray(content)) return ''
	const blocks = (content as { content?: unknown }).content
	if (!Array.isArray(blocks)) return ''
	return blocks.map((block) => {
		if (!block || typeof block !== 'object' || Array.isArray(block)) return ''
		const children = (block as { content?: unknown }).content
		if (!Array.isArray(children)) return ''
		return children.map((child) => child && typeof child === 'object' && !Array.isArray(child) && typeof (child as { text?: unknown }).text === 'string' ? (child as { text: string }).text : '').join('')
	}).filter(Boolean).join('\n\n')
}
