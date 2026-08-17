import type { Metadata } from 'next'

import { CatalogueList } from '@/components/admin/catalogue-list'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Services and sectors' }

export default async function CataloguePage() {
	const supabase = await createClient()
	const [{ data: services, error: serviceError }, { data: sectors, error: sectorError }, { data: serviceTranslations, error: serviceTranslationError }, { data: sectorTranslations, error: sectorTranslationError }] = await Promise.all([
		supabase.from('services').select('id, stable_key, display_order, is_active').order('display_order').order('stable_key'),
		supabase.from('sectors').select('id, stable_key, display_order, is_active').order('display_order').order('stable_key'),
		supabase.from('service_translations').select('service_id, locale, name, status'),
		supabase.from('sector_translations').select('sector_id, locale, name, status'),
	])
	if (serviceError || sectorError || serviceTranslationError || sectorTranslationError) throw new Error(`Unable to load catalogue records: ${serviceError?.message ?? sectorError?.message ?? serviceTranslationError?.message ?? sectorTranslationError?.message}`)
	const items = [
		...(services ?? []).map((service) => { const translations = (serviceTranslations ?? []).filter((item) => item.service_id === service.id); const english = translations.find((item) => item.locale === 'en'); return { id: service.id, kind: 'services' as const, stableKey: service.stable_key, name: english?.name ?? null, displayOrder: service.display_order, isActive: service.is_active, locales: translations.map((item) => item.locale), status: english?.status ?? null } }),
		...(sectors ?? []).map((sector) => { const translations = (sectorTranslations ?? []).filter((item) => item.sector_id === sector.id); const english = translations.find((item) => item.locale === 'en'); return { id: sector.id, kind: 'sectors' as const, stableKey: sector.stable_key, name: english?.name ?? null, displayOrder: sector.display_order, isActive: sector.is_active, locales: translations.map((item) => item.locale), status: english?.status ?? null } }),
	]
	return <div className="mx-auto max-w-6xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Catalogue administration</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950 sm:text-5xl">Services and sectors</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Manage the canonical catalogue, independent translations and publication, icon metadata, ordered team contacts, and article taxonomy links. Public service and sector templates remain deferred.</p><section className="mt-9"><CatalogueList items={items} /></section></div>
}
