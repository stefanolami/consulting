import { parseTeamProfileDocument } from '@/lib/rich-text-contracts.mjs'
import type { Json } from '@/types/database.generated'

export const profileDocumentVersion = 1 as const

export type ProfileEndorsement = {
	quote: string
	attribution?: string
	role?: string
}

export type ProfileDocument = {
	version: typeof profileDocumentVersion
	intro: {
		content: Json
		endorsement?: ProfileEndorsement
	}
	sections: Array<{
		id: string
		title: string
		content: Json
		endorsement?: ProfileEndorsement
	}>
}

// The profile contract lives in rich-text-contracts.mjs. Errors name the part
// of the profile and, for the text, the failing block.
export function parseProfileDocument(value: unknown): ProfileDocument {
	return parseTeamProfileDocument(value) as unknown as ProfileDocument
}

export function emptyRichText(): Json {
	return { type: 'doc', content: [] }
}

export function emptyProfileDocument(): ProfileDocument {
	return { version: profileDocumentVersion, intro: { content: emptyRichText() }, sections: [] }
}

export function profileDocumentFromLegacy(intro: string | null, biography: string | null): ProfileDocument {
	const toRichText = (value: string | null): Json => value
		? { type: 'doc', content: value.split(/\n{2,}/).filter(Boolean).map((paragraph) => ({ type: 'paragraph', content: [{ type: 'text', text: paragraph.replace(/\n/g, ' ') }] })) }
		: emptyRichText()
	return {
		version: profileDocumentVersion,
		intro: { content: toRichText(intro) },
		sections: biography ? [{ id: crypto.randomUUID(), title: 'Biography', content: toRichText(biography) }] : [],
	}
}
