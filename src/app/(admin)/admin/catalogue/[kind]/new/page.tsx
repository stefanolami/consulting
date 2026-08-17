import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CatalogueEditor } from '@/components/admin/catalogue-editor'
import { createClient } from '@/lib/supabase/server'

type NewPageProps = { params: Promise<{ kind: string }> }

export default async function NewCataloguePage({ params }: NewPageProps) {
	const { kind } = await params
	if (kind !== 'services' && kind !== 'sectors') notFound()
	const options = await loadOptions()
	return <div className="mx-auto max-w-5xl"><Link className="text-sm font-semibold text-[#53617f] underline-offset-4 hover:underline" href="/admin/catalogue">← Services and sectors</Link><div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Catalogue administration</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950">New {kind === 'services' ? 'service' : 'sector'}</h1><p className="mt-2 text-slate-600">Create the canonical record and the first English translation. Add other locales independently after saving.</p></div><CatalogueEditor articles={options.articles} contacts={options.contacts} kind={kind} media={options.media} /></div>
}

async function loadOptions() {
	const supabase = await createClient()
	const [{ data: people, error: peopleError }, { data: articles, error: articleError }, { data: articleTranslations, error: articleTranslationError }, { data: media, error: mediaError }] = await Promise.all([
		supabase.from('people').select('id, display_name').eq('is_active', true).eq('is_team_member', true).order('display_name'),
		supabase.from('articles').select('id, stable_key').order('stable_key'),
		supabase.from('article_translations').select('article_id, locale, title').eq('locale', 'en'),
		supabase.from('media_assets').select('id, object_path, original_filename, mime_type').order('created_at', { ascending: false }).limit(200),
	])
	if (peopleError || articleError || articleTranslationError || mediaError) throw new Error(`Unable to load catalogue options: ${peopleError?.message ?? articleError?.message ?? articleTranslationError?.message ?? mediaError?.message}`)
	return { contacts: (people ?? []).map((person) => ({ id: person.id, label: person.display_name })), articles: (articles ?? []).map((article) => ({ id: article.id, label: (articleTranslations ?? []).find((translation) => translation.article_id === article.id)?.title ?? article.stable_key })), media: (media ?? []).map((item) => ({ id: item.id, path: item.object_path, label: `${item.original_filename} (${item.mime_type})` })) }
}
