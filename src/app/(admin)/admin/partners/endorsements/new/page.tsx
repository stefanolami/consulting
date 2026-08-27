import Link from 'next/link'

import { EndorsementEditor } from '@/components/admin/partner-records'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'

export default async function NewEndorsementPage() { await requireActiveStaff(); const supabase = await createClient(); const [{ data: media, error: mediaError }, { data: partners, error: partnerError }] = await Promise.all([supabase.from('media_assets').select('id, original_filename, mime_type').like('mime_type', 'image/%').order('created_at', { ascending: false }).limit(300), supabase.from('partners').select('id, name').order('name')]); if (mediaError || partnerError) throw new Error(`Unable to load endorsement options: ${mediaError?.message ?? partnerError?.message}`); return <div className="mx-auto max-w-5xl"><Link className="text-sm font-semibold text-[#53617f] hover:underline" href="/admin/partners">← Partners and endorsements</Link><p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Relationship content</p><h1 className="mt-2 font-robo text-4xl tracking-tight">New endorsement</h1><EndorsementEditor media={(media ?? []).map((item) => ({ id: item.id, label: `${item.original_filename} (${item.mime_type})` }))} partners={(partners ?? []).map((item) => ({ id: item.id, label: item.name }))} /></div> }
