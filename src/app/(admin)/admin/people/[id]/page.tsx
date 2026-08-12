import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PersonEditor } from '@/components/admin/person-editor'
import { emptyProfileDocument, parseProfileDocument, profileDocumentFromLegacy } from '@/lib/team-profile-document'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database.generated'

type PersonPageProps = { params: Promise<{ id: string }> }

export default async function PersonPage({ params }: PersonPageProps) {
	const { id } = await params
	const supabase = await createClient()
	const { data: person, error: personError } = await supabase.from('people').select('id, display_name, stable_key, email, phone, is_team_member, is_author, is_active, display_order, team_group, portrait_media_id').eq('id', id).maybeSingle()
	if (personError) throw new Error(`Unable to load this profile: ${personError.message}`)
	if (!person) notFound()

	const [{ data: translations, error: translationError }, { data: roles, error: rolesError }, { data: portrait, error: portraitError }] = await Promise.all([
		supabase.from('people_translations').select('locale, slug, card_name, profile_document, short_bio, content, seo_title, seo_description, status').eq('person_id', person.id).order('locale'),
		supabase.from('people_profile_roles').select('id, locale, title, card_label, display_order, is_card_role').eq('person_id', person.id).order('display_order'),
		person.portrait_media_id ? supabase.from('media_assets').select('object_path').eq('id', person.portrait_media_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
	])
	if (translationError || rolesError || portraitError) throw new Error(`Unable to load profile content: ${translationError?.message ?? rolesError?.message ?? portraitError?.message}`)
	const { data: portraitAltTexts, error: altTextError } = person.portrait_media_id ? await supabase.from('media_asset_translations').select('locale, alt_text').eq('media_asset_id', person.portrait_media_id) : { data: [], error: null }
	if (altTextError) throw new Error(`Unable to load portrait alt text: ${altTextError.message}`)

	return <div className="mx-auto max-w-5xl"><Link className="text-sm font-semibold text-[#53617f] underline-offset-4 hover:underline" href="/admin/people">← Team directory</Link><div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">People and team</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950">{person.display_name}</h1><p className="mt-2 text-slate-600">Edit the shared profile, localized cards, roles, profile document, and portrait.</p></div><div className="mt-9"><PersonEditor person={{ id: person.id, displayName: person.display_name, stableKey: person.stable_key, email: person.email, phone: person.phone, isTeamMember: person.is_team_member, isAuthor: person.is_author, isActive: person.is_active, displayOrder: person.display_order, teamGroup: person.team_group, portraitPath: portrait?.object_path ?? null }} translations={(translations ?? []).map((translation) => ({ locale: translation.locale as 'en' | 'de' | 'it' | 'pt-BR' | 'pt-PT', slug: translation.slug, cardName: translation.card_name, roles: (roles ?? []).filter((role) => role.locale === translation.locale).map((role) => ({ id: role.id, title: role.title, cardLabel: role.card_label, isCardRole: role.is_card_role })), profileDocument: coerceProfileDocument(translation.profile_document, translation.short_bio, translation.content), portraitAltText: (portraitAltTexts ?? []).find((altText) => altText.locale === translation.locale)?.alt_text ?? null, seoTitle: translation.seo_title, seoDescription: translation.seo_description, status: translation.status }))} /></div></div>
}

function coerceProfileDocument(profileDocument: Json | null, intro: string | null, legacyContent: Json): ReturnType<typeof emptyProfileDocument> {
	try { return profileDocument ? parseProfileDocument(profileDocument) : profileDocumentFromLegacy(intro, documentToText(legacyContent)) } catch { return emptyProfileDocument() }
}

function documentToText(content: Json): string {
	if (!content || typeof content !== 'object' || Array.isArray(content)) return ''
	const blocks = (content as { content?: unknown }).content
	if (!Array.isArray(blocks)) return ''
	return blocks.map((block) => block && typeof block === 'object' && !Array.isArray(block) && Array.isArray((block as { content?: unknown }).content) ? (block as { content: Array<{ text?: string }> }).content.map((child) => child.text ?? '').join('') : '').filter(Boolean).join('\n\n')
}
