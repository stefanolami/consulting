import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

import { NewsroomFilters } from '@/components/admin/list-filters'
import { Pagination } from '@/components/admin/list-controls'
import { LocaleStates, LocaleStatesLegend } from '@/components/admin/locale-states'
import { TagCreator } from '@/components/admin/tag-creator'
import { Button } from '@/components/ui/button'
import { hasListFilters, NEWSROOM_LIST, NEWSROOM_PAGE_SIZE, parseListQuery } from '@/lib/admin-list-query.mjs'
import { loadNewsroomList } from '@/lib/admin-lists'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'
import messages from '../../../../../messages/en.json'

export const metadata: Metadata = { title: 'Newsroom' }

type NewsroomPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

/** The article kinds the public newsroom labels (messages `Newsroom.kinds`; open decision 23.11). */
const KINDS = Object.keys(messages.Newsroom.kinds)

export default async function NewsroomPage({ searchParams }: NewsroomPageProps) {
	await requireActiveStaff()
	const supabase = await createClient()
	const [{ data: tags, error: tagError }, { data: tagTranslations, error: tagTranslationError }] = await Promise.all([
		supabase.from('tags').select('id, stable_key').eq('is_active', true).order('display_order'),
		supabase.from('tag_translations').select('tag_id, name').eq('locale', 'en'),
	])
	if (tagError || tagTranslationError) throw new Error(`Unable to load newsroom tags: ${tagError?.message ?? tagTranslationError?.message}`)
	return (
		<div className="mx-auto max-w-6xl">
			<div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Newsroom administration</p>
					<h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950 sm:text-5xl">Articles</h1>
					<p className="mt-3 max-w-3xl leading-7 text-slate-600">Manage canonical article records, independent localized editorial content, publication, cover media, authors, taxonomy and explicit related content. Public newsroom templates remain deferred.</p>
				</div>
				<Button asChild><Link href="/admin/newsroom/new">New article</Link></Button>
			</div>
			<TagCreator tags={(tags ?? []).map((tag) => ({ id: tag.id, label: (tagTranslations ?? []).find((translation) => translation.tag_id === tag.id)?.name ?? tag.stable_key }))} />
			<section aria-labelledby="articles-heading" className="mt-9 space-y-4">
				<h2 className="sr-only" id="articles-heading">Article list</h2>
				<NewsroomFilters kinds={KINDS} />
				<Suspense fallback={<div aria-busy="true" aria-label="Loading articles" className="h-96 animate-pulse rounded-xl bg-white" role="status" />}>
					<ArticleTable searchParams={searchParams} />
				</Suspense>
			</section>
		</div>
	)
}

async function ArticleTable({ searchParams }: NewsroomPageProps) {
	const state = parseListQuery(NEWSROOM_LIST, await searchParams)
	const list = await loadNewsroomList(state)
	const filtered = hasListFilters(NEWSROOM_LIST, state)
	return (
		<>
			<LocaleStatesLegend />
			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full min-w-190 text-left text-sm">
						<caption className="sr-only">Articles{filtered ? ' matching the search and filters' : ''}, most recently updated first</caption>
						<thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
							<tr>
								<th className="px-5 py-3 font-medium" scope="col">Article</th>
								<th className="px-5 py-3 font-medium" scope="col">Languages</th>
								<th className="px-5 py-3 font-medium" scope="col">Feature</th>
								<th className="px-5 py-3 font-medium" scope="col">Updated</th>
							</tr>
						</thead>
						<tbody>
							{list.items.map((article) => (
								<tr className="border-b border-slate-100 last:border-0" key={article.id}>
									<td className="px-5 py-4">
										<Link className="font-medium text-slate-950 underline-offset-4 hover:underline" href={`/admin/newsroom/${article.id}`}>{article.title ?? article.stableKey}</Link>
										<p className="mt-1 text-xs text-slate-500">{article.kind} · {article.authorCount} author{article.authorCount === 1 ? '' : 's'} · {article.stableKey}</p>
									</td>
									<td className="px-5 py-4"><LocaleStates states={article.states} /></td>
									<td className="px-5 py-4 text-slate-600">{article.isFeatured ? `Yes · ${article.featuredOrder}` : 'No'}</td>
									<td className="px-5 py-4 text-slate-600">{new Date(article.updatedAt).toLocaleDateString('en-GB')}</td>
								</tr>
							))}
							{!list.items.length && <tr><td className="px-5 py-12 text-center text-slate-500" colSpan={4}>{filtered ? 'No articles match this search and these filters.' : 'No newsroom articles yet. Create the first canonical record and English translation.'}</td></tr>}
						</tbody>
					</table>
				</div>
			</div>
			<Pagination label="Article pages" page={list.page} pageSize={NEWSROOM_PAGE_SIZE} spec={NEWSROOM_LIST} total={list.total} />
		</>
	)
}
