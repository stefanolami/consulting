import type { Metadata } from 'next'

import { PartnerRecordsList } from '@/components/admin/partner-records'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Partners and endorsements' }

export default async function PartnersPage() {
	await requireActiveStaff(); const supabase = await createClient()
	const [{ data: partners, error: partnerError }, { data: partnerTranslations, error: partnerTranslationError }, { data: endorsements, error: endorsementError }, { data: endorsementTranslations, error: endorsementTranslationError }] = await Promise.all([
		supabase.from('partners').select('id, stable_key, name, display_order, is_active').order('display_order').order('name'),
		supabase.from('partner_translations').select('partner_id, locale, status'),
		supabase.from('endorsements').select('id, stable_key, attribution_name, display_order, is_active').order('display_order').order('attribution_name'),
		supabase.from('endorsement_translations').select('endorsement_id, locale, status'),
	])
	if (partnerError || partnerTranslationError || endorsementError || endorsementTranslationError) throw new Error(`Unable to load partners and endorsements: ${partnerError?.message ?? partnerTranslationError?.message ?? endorsementError?.message ?? endorsementTranslationError?.message}`)
	const items = [
		...(partners ?? []).map((partner) => { const translations = (partnerTranslations ?? []).filter((item) => item.partner_id === partner.id); return { id: partner.id, kind: 'partners' as const, stableKey: partner.stable_key, title: partner.name, displayOrder: partner.display_order, isActive: partner.is_active, locales: translations.map((item) => item.locale), status: translations.find((item) => item.locale === 'en')?.status ?? null } }),
		...(endorsements ?? []).map((endorsement) => { const translations = (endorsementTranslations ?? []).filter((item) => item.endorsement_id === endorsement.id); return { id: endorsement.id, kind: 'endorsements' as const, stableKey: endorsement.stable_key, title: endorsement.attribution_name, displayOrder: endorsement.display_order, isActive: endorsement.is_active, locales: translations.map((item) => item.locale), status: translations.find((item) => item.locale === 'en')?.status ?? null } }),
	]
	return <div className="mx-auto max-w-6xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Relationship content</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950 sm:text-5xl">Partners and endorsements</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Manage ordered client logos, partner metadata and localized endorsements. Published content requires safe media-library selections and localized alternative text.</p><section className="mt-9"><PartnerRecordsList items={items} /></section></div>
}
