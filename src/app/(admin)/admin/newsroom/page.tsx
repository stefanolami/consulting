import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { TagCreator } from '@/components/admin/tag-creator'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Newsroom' }

export default async function NewsroomPage() {
	await requireActiveStaff()
	const supabase = await createClient()
	const [{ data: articles, error: articleError }, { data: translations, error: translationError }, { data: authors, error: authorError }, { data: tags, error: tagError }, { data: tagTranslations, error: tagTranslationError }] = await Promise.all([
		supabase.from('articles').select('id, stable_key, kind, is_featured, featured_order, updated_at').order('updated_at', { ascending: false }),
		supabase.from('article_translations').select('article_id, locale, title, status, scheduled_for, updated_at'),
		supabase.from('article_authors').select('article_id, person_id, display_order').order('display_order'),
		supabase.from('tags').select('id, stable_key').eq('is_active', true).order('display_order'),
		supabase.from('tag_translations').select('tag_id, name').eq('locale', 'en'),
	])
	if (articleError || translationError || authorError || tagError || tagTranslationError) throw new Error(`Unable to load newsroom records: ${articleError?.message ?? translationError?.message ?? authorError?.message ?? tagError?.message ?? tagTranslationError?.message}`)
	return <div className="mx-auto max-w-6xl"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Newsroom administration</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950 sm:text-5xl">Articles</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Manage canonical article records, independent localized editorial content, publication, cover media, authors, taxonomy and explicit related content. Public newsroom templates remain deferred.</p></div><Button asChild><Link href="/admin/newsroom/new">New article</Link></Button></div><TagCreator tags={(tags ?? []).map((tag) => ({ id: tag.id, label: (tagTranslations ?? []).find((translation) => translation.tag_id === tag.id)?.name ?? tag.stable_key }))} /><section className="mt-9 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-slate-600"><tr><th className="px-5 py-3 font-medium">Article</th><th className="px-5 py-3 font-medium">English state</th><th className="px-5 py-3 font-medium">Locales</th><th className="px-5 py-3 font-medium">Feature</th><th className="px-5 py-3 font-medium">Updated</th><th className="px-5 py-3" /></tr></thead><tbody>{(articles ?? []).map((article) => { const items = (translations ?? []).filter((item) => item.article_id === article.id); const english = items.find((item) => item.locale === 'en'); const authorCount = (authors ?? []).filter((item) => item.article_id === article.id).length; return <tr className="border-b border-slate-100 last:border-0" key={article.id}><td className="px-5 py-4"><p className="font-medium text-slate-950">{english?.title ?? article.stable_key}</p><p className="mt-1 text-xs text-slate-500">{article.kind} · {authorCount} author{authorCount === 1 ? '' : 's'}</p></td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">{english?.status ?? 'No English translation'}</span></td><td className="px-5 py-4 text-slate-600">{items.map((item) => item.locale).join(', ') || '—'}</td><td className="px-5 py-4 text-slate-600">{article.is_featured ? `Yes · ${article.featured_order}` : 'No'}</td><td className="px-5 py-4 text-slate-600">{new Date(article.updated_at).toLocaleDateString('en-GB')}</td><td className="px-5 py-4 text-right"><Button asChild size="sm" variant="outline"><Link href={`/admin/newsroom/${article.id}`}>Edit</Link></Button></td></tr> })}{!(articles ?? []).length && <tr><td className="px-5 py-12 text-center text-slate-500" colSpan={6}>No newsroom articles yet. Create the first canonical record and English translation.</td></tr>}</tbody></table></div></section></div>
}
