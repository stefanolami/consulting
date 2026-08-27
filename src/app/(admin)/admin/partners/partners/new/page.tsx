import Link from 'next/link'

import { PartnerEditor } from '@/components/admin/partner-records'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'

export default async function NewPartnerPage() { await requireActiveStaff(); const supabase = await createClient(); const { data, error } = await supabase.from('media_assets').select('id, original_filename, mime_type').like('mime_type', 'image/%').order('created_at', { ascending: false }).limit(300); if (error) throw new Error(`Unable to load media: ${error.message}`); return <div className="mx-auto max-w-5xl"><Link className="text-sm font-semibold text-[#53617f] hover:underline" href="/admin/partners">← Partners and endorsements</Link><p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Relationship content</p><h1 className="mt-2 font-robo text-4xl tracking-tight">New partner or client</h1><PartnerEditor media={(data ?? []).map((item) => ({ id: item.id, label: `${item.original_filename} (${item.mime_type})` }))} /></div> }
