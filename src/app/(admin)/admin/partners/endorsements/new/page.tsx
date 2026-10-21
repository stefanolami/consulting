import type { Metadata } from 'next'
import Link from 'next/link'

import { EndorsementEditor } from '@/components/admin/partner-records'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { loadMediaChoices } from '@/lib/media-choices'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'New endorsement' }

export default async function NewEndorsementPage() { await requireActiveStaff(); const supabase = await createClient(); const [media, { data: partners, error: partnerError }] = await Promise.all([loadMediaChoices(), supabase.from('partners').select('id, name').order('name')]); if (partnerError) throw new Error(`Unable to load endorsement options: ${partnerError.message}`); return <div className="mx-auto max-w-5xl"><Link className="text-sm font-semibold text-[#53617f] hover:underline" href="/admin/partners?kind=endorsements">← Partners and endorsements</Link><p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Relationship content</p><h1 className="mt-2 font-robo text-4xl tracking-tight">New endorsement</h1><EndorsementEditor media={media} partners={(partners ?? []).map((item) => ({ id: item.id, label: item.name }))} /></div> }
