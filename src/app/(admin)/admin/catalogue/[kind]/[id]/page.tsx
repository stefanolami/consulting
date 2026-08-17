import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CatalogueEditor } from '@/components/admin/catalogue-editor'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database.generated'

type EntryPageProps = { params: Promise<{ kind: string; id: string }> }

export default async function CatalogueEntryPage({ params }: EntryPageProps) {
	const { kind, id } = await params
	if (kind !== 'services' && kind !== 'sectors') notFound()
	const supabase = await createClient()
	const table = kind
	const [{ data: entry, error: entryError }, { data: translations, error: translationError }, { data: relations, error: relationError }, { data: articleRelations, error: articleRelationError }, { data: people, error: peopleError }, { data: articles, error: articlesError }, { data: articleTranslations, error: articleTranslationsError }, { data: media, error: mediaError }] = await Promise.all([
		supabase.from(table).select('id, stable_key, display_order, is_active, icon_media_id').eq('id', id).maybeSingle(),
		kind === 'services' ? supabase.from('service_translations').select('locale, slug, name, summary, content, seo_title, seo_description, status, scheduled_for').eq('service_id', id).order('locale') : supabase.from('sector_translations').select('locale, slug, name, summary, content, seo_title, seo_description, status, scheduled_for').eq('sector_id', id).order('locale'),
		kind === 'services' ? supabase.from('service_people').select('person_id, display_order, relationship').eq('service_id', id).eq('relationship', 'contact').order('display_order') : supabase.from('sector_people').select('person_id, display_order, relationship').eq('sector_id', id).eq('relationship', 'contact').order('display_order'),
		kind === 'services' ? supabase.from('article_services').select('article_id').eq('service_id', id) : supabase.from('article_sectors').select('article_id').eq('sector_id', id),
		supabase.from('people').select('id, display_name').eq('is_active', true).eq('is_team_member', true).order('display_name'),
		supabase.from('articles').select('id, stable_key').order('stable_key'),
		supabase.from('article_translations').select('article_id, locale, title').eq('locale', 'en'),
		supabase.from('media_assets').select('id, object_path, original_filename, mime_type').order('created_at', { ascending: false }).limit(200),
	])
	if (entryError || translationError || relationError || articleRelationError || peopleError || articlesError || articleTranslationsError || mediaError) throw new Error(`Unable to load catalogue entry: ${entryError?.message ?? translationError?.message ?? relationError?.message ?? articleRelationError?.message ?? peopleError?.message ?? articlesError?.message ?? articleTranslationsError?.message ?? mediaError?.message}`)
	if (!entry) notFound()
	const { data: icon, error: iconError } = entry.icon_media_id ? await supabase.from('media_assets').select('object_path').eq('id', entry.icon_media_id).maybeSingle() : { data: null, error: null }
	const { data: iconAltTexts, error: altError } = entry.icon_media_id ? await supabase.from('media_asset_translations').select('locale, alt_text').eq('media_asset_id', entry.icon_media_id) : { data: [], error: null }
	if (iconError || altError) throw new Error(`Unable to load icon metadata: ${iconError?.message ?? altError?.message}`)
	return <div className="mx-auto max-w-5xl"><Link className="text-sm font-semibold text-[#53617f] underline-offset-4 hover:underline" href="/admin/catalogue">← Services and sectors</Link><div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Catalogue administration</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950">{(translations ?? []).find((item) => item.locale === 'en')?.name ?? entry.stable_key}</h1><p className="mt-2 text-slate-600">Manage shared identity and relations separately from the localized editorial content.</p></div><div className="mt-9"><CatalogueEditor articles={(articles ?? []).map((article) => ({ id: article.id, label: (articleTranslations ?? []).find((translation) => translation.article_id === article.id)?.title ?? article.stable_key }))} contacts={(people ?? []).map((person) => ({ id: person.id, label: person.display_name }))} entry={{ id: entry.id, stableKey: entry.stable_key, displayOrder: entry.display_order, isActive: entry.is_active, iconMediaId: entry.icon_media_id, iconPath: icon?.object_path ?? null }} kind={kind} media={(media ?? []).map((item) => ({ id: item.id, path: item.object_path, label: `${item.original_filename} (${item.mime_type})` }))} selectedArticleIds={(articleRelations ?? []).map((item) => item.article_id)} selectedContactIds={(relations ?? []).map((item) => item.person_id)} translations={(translations ?? []).map((item) => ({ locale: item.locale as 'en' | 'de' | 'it' | 'pt-BR' | 'pt-PT', slug: item.slug, name: item.name, summary: item.summary, content: item.content as Json, seoTitle: item.seo_title, seoDescription: item.seo_description, status: item.status, scheduledFor: item.scheduled_for, iconAltText: (iconAltTexts ?? []).find((alt) => alt.locale === item.locale)?.alt_text ?? null }))} /></div></div>
}
