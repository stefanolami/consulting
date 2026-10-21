import type { Metadata } from 'next'
import { adminRecordTitle } from '@/lib/admin-titles'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ArticleEditor } from '@/components/admin/article-editor'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { editorialState } from '@/lib/publication.mjs'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database.generated'
import { newsroomOptions } from '@/app/(admin)/admin/newsroom/new/page'

export async function generateMetadata({ params }: { params: Promise<Record<string, string>> }): Promise<Metadata> {
	const values = await params
	return { title: await adminRecordTitle('article', values.id) }
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
	await requireActiveStaff(); const { id } = await params; const supabase = await createClient()
	const [{ data: article, error: articleError }, { data: translations, error: translationError }, { data: authorRelations, error: authorError }, { data: tagRelations, error: tagError }, { data: serviceRelations, error: serviceError }, { data: sectorRelations, error: sectorError }, { data: relatedRelations, error: relatedError }, options] = await Promise.all([supabase.from('articles').select('id, stable_key, kind, cover_media_id, external_media_url, is_featured, featured_order').eq('id', id).maybeSingle(), supabase.from('article_translations').select('locale, slug, title, excerpt, content, sources, seo_title, seo_description, status, published_at, scheduled_for').eq('article_id', id).order('locale'), supabase.from('article_authors').select('person_id, display_order').eq('article_id', id).order('display_order'), supabase.from('article_tags').select('tag_id').eq('article_id', id), supabase.from('article_services').select('service_id').eq('article_id', id), supabase.from('article_sectors').select('sector_id').eq('article_id', id), supabase.from('article_relations').select('related_article_id, display_order').eq('source_article_id', id).order('display_order'), newsroomOptions()])
	if (articleError || translationError || authorError || tagError || serviceError || sectorError || relatedError) throw new Error(`Unable to load article: ${articleError?.message ?? translationError?.message ?? authorError?.message ?? tagError?.message ?? serviceError?.message ?? sectorError?.message ?? relatedError?.message}`)
	if (!article) notFound()
	const english = (translations ?? []).find((item) => item.locale === 'en')
	return <div className="mx-auto max-w-5xl"><Link className="text-sm font-semibold text-[#53617f] underline-offset-4 hover:underline" href="/admin/newsroom">← Articles</Link><div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Newsroom administration</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950">{english?.title ?? article.stable_key}</h1><p className="mt-2 text-slate-600">Manage the shared record and relations separately from localized editorial content and publication.</p></div><div className="mt-9"><ArticleEditor {...options} entry={{ id: article.id, stableKey: article.stable_key, kind: article.kind, coverMediaId: article.cover_media_id, externalMediaUrl: article.external_media_url, isFeatured: article.is_featured, featuredOrder: article.featured_order, archived: articleIsArchived(translations ?? []) }} selectedAuthorIds={(authorRelations ?? []).map((item) => item.person_id)} selectedRelatedArticleIds={(relatedRelations ?? []).map((item) => item.related_article_id)} selectedSectorIds={(sectorRelations ?? []).map((item) => item.sector_id)} selectedServiceIds={(serviceRelations ?? []).map((item) => item.service_id)} selectedTagIds={(tagRelations ?? []).map((item) => item.tag_id)} translations={(translations ?? []).map((item) => ({ locale: item.locale as 'en' | 'de' | 'it' | 'pt-BR' | 'pt-PT', slug: item.slug, title: item.title, excerpt: item.excerpt, content: item.content as Json, sources: item.sources as { label: string; url: string }[], seoTitle: item.seo_title, seoDescription: item.seo_description, status: editorialState(item).status, publication: editorialState(item) }))} /></div></div>
}

// Archived: a translation is archived and none is published or scheduled
// (drafts are left alone by "Archive this article").
function articleIsArchived(translations: { status: string }[]) {
	return translations.some((item) => item.status === 'archived') && !translations.some((item) => item.status === 'published' || item.status === 'scheduled')
}
