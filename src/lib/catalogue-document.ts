import { z } from 'zod'

import { createRichTextRules } from '@/lib/rich-text-rules.mjs'
import type { Json } from '@/types/database.generated'

// The catalogue rules live in rich-text-rules.mjs so the legal document
// contract reuses them (platform doc §11.4); these options reproduce the
// catalogue contract unchanged.
const { validateBlock } = createRichTextRules({ unsupportedBlockMessage: 'The catalogue body contains an unsupported rich-text block.' })

export function parseCatalogueDocument(value: unknown): Json {
	const document = z.object({ type: z.literal('doc'), content: z.array(z.unknown()).max(200) }).strict().parse(value)
	return { type: 'doc', content: document.content.map((block) => validateBlock(block)) as Json[] }
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
