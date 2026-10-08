import type { Metadata } from 'next'
import Link from 'next/link'

import { LEGAL_PAGE_NAMES, LegalStatusBadge } from '@/components/admin/legal-status'
import { routing } from '@/i18n/routing'
import { LEGAL_PAGE_KEYS, legalPath } from '@/lib/legal-pages'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Legal pages' }

// Exactly the three code-owned pages (platform doc §11.2): no create, delete
// or archive-page controls. Each locale's translation is edited separately.
export default async function LegalPagesAdminPage() {
	const supabase = await createClient()
	const [{ data: pages, error: pagesError }, { data: translations, error: translationsError }] = await Promise.all([
		supabase.from('legal_pages').select('id, stable_key, is_active'),
		supabase.from('legal_page_translations').select('legal_page_id, locale, title, status, last_updated_on'),
	])
	if (pagesError || translationsError) throw new Error(`Unable to load the legal pages: ${pagesError?.message ?? translationsError?.message}`)

	return (
		<div className="mx-auto max-w-6xl">
			<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Legal administration</p>
			<h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950 sm:text-5xl">Legal pages</h1>
			<p className="mt-3 max-w-3xl leading-7 text-slate-600">
				The privacy policy, terms and conditions and cookie use pages are fixed by the website. Edit and publish their text in each language; pages cannot be added or removed here. A language without a published translation shows visitors a notice that links to the English page.
			</p>
			<ul className="mt-9 grid gap-5">
				{LEGAL_PAGE_KEYS.map((key) => {
					const page = (pages ?? []).find((item) => item.stable_key === key)
					const pageTranslations = page ? (translations ?? []).filter((item) => item.legal_page_id === page.id) : []
					const englishPublished = pageTranslations.some((item) => item.locale === routing.defaultLocale && item.status === 'published')
					return (
						<li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" key={key}>
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div>
									<h2 className="font-robo text-2xl text-slate-950">{LEGAL_PAGE_NAMES[key]}</h2>
									<p className="mt-1 text-sm text-slate-600">Public path <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">{legalPath(key, routing.defaultLocale)}</code>, prefixed with the language outside English.</p>
								</div>
								{page ? (
									<Link aria-label={`Edit ${LEGAL_PAGE_NAMES[key]}`} className="inline-flex h-9 items-center rounded-md bg-[#27335a] px-4 text-sm font-medium text-white hover:bg-[#1e294c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27335a]" href={`/admin/legal/${key}`}>Edit</Link>
								) : null}
							</div>
							{!page ? (
								<p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">This page is missing from the database. Apply the legal pages migration.</p>
							) : (
								<>
									{!page.is_active ? <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">This page is switched off by an operator and is not public in any language.</p> : null}
									{page.is_active && !englishPublished ? <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">English is not published, so this page returns “not found” in every language. Publishing it is required before launch.</p> : null}
									<dl className="mt-4 grid gap-2 sm:grid-cols-5">
										{routing.locales.map((locale) => {
											const translation = pageTranslations.find((item) => item.locale === locale)
											return (
												<div className="rounded-lg bg-slate-50 px-3 py-2" key={locale}>
													<dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{locale}</dt>
													<dd className="mt-1"><LegalStatusBadge status={translation?.status ?? null} /></dd>
												</div>
											)
										})}
									</dl>
								</>
							)}
						</li>
					)
				})}
			</ul>
		</div>
	)
}
