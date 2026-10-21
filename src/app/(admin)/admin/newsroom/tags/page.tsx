import type { Metadata } from 'next'
import Link from 'next/link'

import { LocaleStates, LocaleStatesLegend } from '@/components/admin/locale-states'
import { TagCreator } from '@/components/admin/tag-editor'
import { localeStates } from '@/lib/admin-locale-states'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Newsroom tags' }

export default async function TagsPage() {
	await requireActiveStaff(); const supabase = await createClient()
	const [{ data: tags, error: tagError }, { data: translations, error: translationError }, { data: uses, error: useError }] = await Promise.all([
		supabase.from('tags').select('id, stable_key, display_order, is_active').order('display_order').order('stable_key'),
		supabase.from('tag_translations').select('tag_id, locale, name, status, published_at, scheduled_for'),
		supabase.from('article_tags').select('tag_id'),
	])
	if (tagError || translationError || useError) throw new Error(`Unable to load newsroom tags: ${tagError?.message ?? translationError?.message ?? useError?.message}`)
	return (
		<div className="mx-auto max-w-5xl">
			<Link className="text-sm font-semibold text-[#53617f] underline-offset-4 hover:underline" href="/admin/newsroom">← Articles</Link>
			<div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Newsroom administration</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950">Tags</h1><p className="mt-2 max-w-3xl text-slate-600">Tags classify articles and power the newsroom tag filter. Each language has its own label and URL slug; archived tags are hidden everywhere but stay on their articles.</p></div>
			<section aria-labelledby="tags-heading" className="mt-9 space-y-4">
				<h2 className="sr-only" id="tags-heading">Tag list</h2>
				<LocaleStatesLegend />
				<div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
					<table className="w-full text-left text-sm">
						<caption className="sr-only">Newsroom tags, by display order</caption>
						<thead className="border-b border-slate-200 bg-slate-50 text-slate-600"><tr><th className="px-5 py-3 font-medium" scope="col">Tag</th><th className="px-5 py-3 font-medium" scope="col">Languages</th><th className="px-5 py-3 font-medium" scope="col">Articles</th><th className="px-5 py-3 font-medium" scope="col">State</th></tr></thead>
						<tbody>
							{(tags ?? []).map((tag) => {
								const own = (translations ?? []).filter((item) => item.tag_id === tag.id)
								const count = (uses ?? []).filter((item) => item.tag_id === tag.id).length
								return (
									<tr className="border-b border-slate-100 last:border-0" key={tag.id}>
										<td className="px-5 py-4"><Link className="font-medium text-slate-950 underline-offset-4 hover:underline" href={`/admin/newsroom/tags/${tag.id}`}>{own.find((item) => item.locale === 'en')?.name ?? tag.stable_key}</Link><p className="mt-1 text-xs text-slate-500">{tag.stable_key}</p></td>
										<td className="px-5 py-4"><LocaleStates states={localeStates(own)} /></td>
										<td className="px-5 py-4 text-slate-600">{count}</td>
										<td className={tag.is_active ? 'px-5 py-4 text-emerald-700' : 'px-5 py-4 text-slate-500'}>{tag.is_active ? 'Active' : 'Archived'}</td>
									</tr>
								)
							})}
							{!(tags ?? []).length && <tr><td className="px-5 py-12 text-center text-slate-500" colSpan={4}>No tags yet. Create the first one below.</td></tr>}
						</tbody>
					</table>
				</div>
			</section>
			<div className="mt-9"><TagCreator /></div>
		</div>
	)
}
