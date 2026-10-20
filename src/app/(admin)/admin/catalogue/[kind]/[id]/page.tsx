import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CatalogueEditor } from '@/components/admin/catalogue-editor'
import { loadMediaChoices } from '@/lib/media-choices'
import { editorialState } from '@/lib/publication.mjs'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database.generated'

type EntryPageProps = { params: Promise<{ kind: string; id: string }> }

export default async function CatalogueEntryPage({ params }: EntryPageProps) {
	const { kind, id } = await params
	if (kind !== 'services' && kind !== 'sectors') notFound()
	const supabase = await createClient()
	const table = kind
	const [{ data: entry, error: entryError }, { data: translations, error: translationError }, { data: relations, error: relationError }, { data: articleRelations, error: articleRelationError }, { data: people, error: peopleError }, { data: articles, error: articlesError }, { data: articleTranslations, error: articleTranslationsError }, media] = await Promise.all([
		supabase.from(table).select('id, stable_key, display_order, is_active, icon_media_id').eq('id', id).maybeSingle(),
		kind === 'services' ? supabase.from('service_translations').select('locale, slug, name, summary, content, seo_title, seo_description, status, published_at, scheduled_for').eq('service_id', id).order('locale') : supabase.from('sector_translations').select('locale, slug, name, summary, content, seo_title, seo_description, status, published_at, scheduled_for').eq('sector_id', id).order('locale'),
		kind === 'services' ? supabase.from('service_people').select('person_id, display_order, relationship').eq('service_id', id).eq('relationship', 'contact').order('display_order') : supabase.from('sector_people').select('person_id, display_order, relationship').eq('sector_id', id).eq('relationship', 'contact').order('display_order'),
		kind === 'services' ? supabase.from('article_services').select('article_id').eq('service_id', id) : supabase.from('article_sectors').select('article_id').eq('sector_id', id),
		supabase.from('people').select('id, display_name').eq('is_active', true).eq('is_team_member', true).order('display_name'),
		supabase.from('articles').select('id, stable_key').order('stable_key'),
		supabase.from('article_translations').select('article_id, locale, title').eq('locale', 'en'),
		loadMediaChoices(),
	])
	if (entryError || translationError || relationError || articleRelationError || peopleError || articlesError || articleTranslationsError) throw new Error(`Unable to load catalogue entry: ${entryError?.message ?? translationError?.message ?? relationError?.message ?? articleRelationError?.message ?? peopleError?.message ?? articlesError?.message ?? articleTranslationsError?.message}`)
	if (!entry) notFound()
	return <div className="mx-auto max-w-5xl"><Link className="text-sm font-semibold text-[#53617f] underline-offset-4 hover:underline" href="/admin/catalogue">← Services and sectors</Link><div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Catalogue administration</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950">{(translations ?? []).find((item) => item.locale === 'en')?.name ?? entry.stable_key}</h1><p className="mt-2 text-slate-600">Manage shared identity and relations separately from the localized editorial content.</p></div><div className="mt-9"><CatalogueEditor articles={(articles ?? []).map((article) => ({ id: article.id, label: (articleTranslations ?? []).find((translation) => translation.article_id === article.id)?.title ?? article.stable_key }))} contacts={(people ?? []).map((person) => ({ id: person.id, label: person.display_name }))} entry={{ id: entry.id, stableKey: entry.stable_key, displayOrder: entry.display_order, isActive: entry.is_active, iconMediaId: entry.icon_media_id }} kind={kind} media={media} selectedArticleIds={(articleRelations ?? []).map((item) => item.article_id)} selectedContactIds={(relations ?? []).map((item) => item.person_id)} translations={(translations ?? []).map((item) => ({ locale: item.locale as 'en' | 'de' | 'it' | 'pt-BR' | 'pt-PT', slug: item.slug, name: item.name, summary: item.summary, content: item.content as Json, seoTitle: item.seo_title, seoDescription: item.seo_description, status: editorialState(item).status, publication: editorialState(item) }))} /></div></div>
}
