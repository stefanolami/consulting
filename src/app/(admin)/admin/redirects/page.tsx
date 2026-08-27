import type { Metadata } from 'next'

import { RedirectRegistry } from '@/components/admin/redirect-registry'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Redirect registry' }

export default async function RedirectsPage() { await requireActiveStaff(); const supabase = await createClient(); const { data, error } = await supabase.from('redirects').select('id, locale, source_path, destination_path, status_code, is_active, updated_at').order('source_path'); if (error) throw new Error(`Unable to load redirects: ${error.message}`); return <div className="mx-auto max-w-6xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">URL migration</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950 sm:text-5xl">Redirect registry</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Prepare validated permanent redirects for legacy and changed URLs. Records can be disabled safely and are not yet connected to public request routing.</p><RedirectRegistry redirects={(data ?? []).map((item) => ({ id: item.id, locale: item.locale, sourcePath: item.source_path, destinationPath: item.destination_path, statusCode: item.status_code, isActive: item.is_active, updatedAt: item.updated_at }))} /></div> }
