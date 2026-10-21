import type { Metadata } from 'next'
import { adminRecordTitle } from '@/lib/admin-titles'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { EndorsementEditor } from '@/components/admin/partner-records'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { loadMediaChoices } from '@/lib/media-choices'
import { editorialState } from '@/lib/publication.mjs'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({ params }: { params: Promise<Record<string, string>> }): Promise<Metadata> {
	const values = await params
	return { title: await adminRecordTitle('endorsement', values.id) }
}

export default async function EditEndorsementPage({ params }: { params: Promise<{ id: string }> }) { await requireActiveStaff(); const { id } = await params; const supabase = await createClient(); const [{ data: entry, error: entryError }, { data: translations, error: translationError }, media, { data: partners, error: partnerError }] = await Promise.all([supabase.from('endorsements').select('id, stable_key, attribution_name, partner_id, portrait_media_id, display_order, is_active').eq('id', id).maybeSingle(), supabase.from('endorsement_translations').select('locale, quote, attribution_title, status, published_at, scheduled_for').eq('endorsement_id', id), loadMediaChoices(), supabase.from('partners').select('id, name').order('name')]); if (entryError || translationError || partnerError) throw new Error(`Unable to load endorsement: ${entryError?.message ?? translationError?.message ?? partnerError?.message}`); if (!entry) notFound(); return <div className="mx-auto max-w-5xl"><Link className="text-sm font-semibold text-[#53617f] hover:underline" href="/admin/partners?kind=endorsements">← Partners and endorsements</Link><p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Relationship content</p><h1 className="mt-2 font-robo text-4xl tracking-tight">{entry.attribution_name}</h1><EndorsementEditor entry={{ id: entry.id, stableKey: entry.stable_key, attributionName: entry.attribution_name, partnerId: entry.partner_id, portraitMediaId: entry.portrait_media_id, displayOrder: entry.display_order, isActive: entry.is_active }} media={media} partners={(partners ?? []).map((item) => ({ id: item.id, label: item.name }))} translations={(translations ?? []).map((item) => ({ locale: item.locale as 'en' | 'de' | 'it' | 'pt-BR' | 'pt-PT', quote: item.quote, attributionTitle: item.attribution_title, status: editorialState(item).status, publication: editorialState(item) }))} /></div> }
