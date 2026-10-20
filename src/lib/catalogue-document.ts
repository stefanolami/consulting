import { parseCatalogueRichText } from '@/lib/rich-text-contracts.mjs'
import type { Json } from '@/types/database.generated'

// The catalogue contract lives in rich-text-contracts.mjs, on the rules it
// shares with the article and legal contracts (rich-text-rules.mjs). Errors
// name the failing block.
export function parseCatalogueDocument(value: unknown): Json {
	return parseCatalogueRichText(value) as unknown as Json
}

/** Whether a stored body has any visible text, so empty bodies skip their section. */
export function hasCatalogueContent(value: Json): boolean {
	const hasText = (node: unknown): boolean => {
		if (!node || typeof node !== 'object' || Array.isArray(node)) return false
		const { content, text } = node as { content?: unknown; text?: unknown }
		if (typeof text === 'string' && text.trim()) return true
		return Array.isArray(content) && content.some(hasText)
	}
	return hasText(value)
}

export function emptyCatalogueDocument(): Json {
	return { type: 'doc', content: [] }
}
