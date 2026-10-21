import type { Metadata } from 'next'
import Link from 'next/link'

import { PartnerEditor } from '@/components/admin/partner-records'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { loadMediaChoices } from '@/lib/media-choices'

export const metadata: Metadata = { title: 'New partner or client' }

export default async function NewPartnerPage() { await requireActiveStaff(); const media = await loadMediaChoices(); return <div className="mx-auto max-w-5xl"><Link className="text-sm font-semibold text-[#53617f] hover:underline" href="/admin/partners">← Partners and endorsements</Link><p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Relationship content</p><h1 className="mt-2 font-robo text-4xl tracking-tight">New partner or client</h1><PartnerEditor media={media} /></div> }
