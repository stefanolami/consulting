import type { Metadata } from 'next'

import { SiteSettingsEditor } from '@/components/admin/site-settings-editor'
import { requireActiveStaff } from '@/lib/auth/authorization'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database.generated'

export const metadata: Metadata = { title: 'Site settings' }

function record(value: Json | undefined): Record<string, Json | undefined> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, Json | undefined> : {} }
function text(value: Json | undefined) { return typeof value === 'string' ? value : null }

export default async function SettingsPage() {
	await requireActiveStaff(); const supabase = await createClient()
	const keys = ['contact_footer', 'social_links', 'poe_external_link', 'approved_calls_to_action']
	const { data, error } = await supabase.from('site_settings').select('key, value').in('key', keys)
	if (error) throw new Error(`Unable to load site settings: ${error.message}`)
	const values = new Map((data ?? []).map((item) => [item.key, item.value])); const contact = record(values.get('contact_footer')); const poe = record(values.get('poe_external_link')); const socialValue = record(values.get('social_links')); const ctaValue = record(values.get('approved_calls_to_action'))
	const socials = Array.isArray(socialValue.items) ? socialValue.items.filter((item): item is Record<string, Json | undefined> => Boolean(item && typeof item === 'object' && !Array.isArray(item))).flatMap((item) => typeof item.platform === 'string' && typeof item.url === 'string' ? [{ platform: item.platform as 'linkedin' | 'instagram' | 'facebook' | 'youtube' | 'x', url: item.url }] : []) : []
	const callsToAction = Array.isArray(ctaValue.items) ? ctaValue.items.filter((item): item is Record<string, Json | undefined> => Boolean(item && typeof item === 'object' && !Array.isArray(item))).flatMap((item) => { const labels = record(item.labels); return typeof item.key === 'string' && typeof item.href === 'string' && typeof labels.en === 'string' ? [{ key: item.key, href: item.href, labels: { en: labels.en, de: text(labels.de), it: text(labels.it), 'pt-BR': text(labels['pt-BR']), 'pt-PT': text(labels['pt-PT']) } }] : [] }) : []
	return <div className="mx-auto max-w-5xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Global content</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950 sm:text-5xl">Site settings</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Edit only the approved global data contract. Navigation, page composition, component choices and styling remain version-controlled in code.</p><SiteSettingsEditor callsToAction={callsToAction} contact={{ email: text(contact.email), phone: text(contact.phone), address: text(contact.address), footerNote: text(contact.footerNote) }} poeUrl={text(poe.url) ?? ''} socials={socials} /></div>
}
