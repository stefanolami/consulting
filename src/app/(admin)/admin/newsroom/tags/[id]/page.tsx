import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { TagEditor } from '@/components/admin/tag-editor'
import { adminRecordTitle } from '@/lib/admin-titles'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { editorialState } from '@/lib/publication.mjs'
import { createClient } from '@/lib/supabase/server'

type TagPageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
	return { title: await adminRecordTitle('tag', (await params).id) }
}

export default async function TagPage({ params }: TagPageProps) {
	await requireActiveStaff(); const { id } = await params
	if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
	const supabase = await createClient()
	const [{ data: tag, error: tagError }, { data: translations, error: translationError }, { count, error: countError }] = await Promise.all([
		supabase.from('tags').select('id, stable_key, display_order, is_active').eq('id', id).maybeSingle(),
		supabase.from('tag_translations').select('locale, name, slug, status, published_at, scheduled_for').eq('tag_id', id),
		supabase.from('article_tags').select('article_id', { count: 'exact', head: true }).eq('tag_id', id),
	])
	if (tagError || translationError || countError) throw new Error(`Unable to load the tag: ${tagError?.message ?? translationError?.message ?? countError?.message}`)
	if (!tag) notFound()
	return (
		<div className="mx-auto max-w-5xl">
			<Link className="text-sm font-semibold text-[#53617f] underline-offset-4 hover:underline" href="/admin/newsroom/tags">← Tags</Link>
			<div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Newsroom administration</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950">{(translations ?? []).find((item) => item.locale === 'en')?.name ?? tag.stable_key}</h1><p className="mt-2 text-slate-600">Edit the tag’s key and order, its label in each language, and whether it is offered at all.</p></div>
			<TagEditor tag={{ id: tag.id, stableKey: tag.stable_key, displayOrder: tag.display_order, isActive: tag.is_active, articleCount: count ?? 0 }} translations={(translations ?? []).map((item) => ({ locale: item.locale as 'en' | 'de' | 'it' | 'pt-BR' | 'pt-PT', name: item.name, slug: item.slug, status: editorialState(item).status, publication: editorialState(item) }))} />
		</div>
	)
}
