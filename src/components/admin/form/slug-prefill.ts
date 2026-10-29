'use client'

import { useState, type ChangeEvent } from 'react'

import { slugify } from '@/lib/slug.mjs'

type InputChange = ChangeEvent<HTMLInputElement>

/**
 * Stable keys and slugs prefilled from a title or name (editorial
 * simplification §3.2). Spread `source` on the title input and
 * `target(name)` on each key or slug input: a target follows the title as
 * the editor types until it is edited by hand, and then keeps what was
 * typed. Only for create forms and new translations; existing keys and
 * slugs keep their uncontrolled saved values.
 */
export function useSlugPrefill() {
	const [source, setSource] = useState('')
	const [edited, setEdited] = useState<Record<string, string>>({})
	return {
		source: { onChange: (event: InputChange) => setSource(event.target.value) },
		target: (name: string) => ({
			onChange: (event: InputChange) => { const { value } = event.target; setEdited((current) => ({ ...current, [name]: value })) },
			value: name in edited ? edited[name] : slugify(source),
		}),
	}
}

export type SlugPrefill = ReturnType<typeof useSlugPrefill>
