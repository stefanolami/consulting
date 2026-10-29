// Stable keys and URL slugs suggested from a title or name (editorial
// simplification §3.2): lowercase letters, numbers and single hyphens, the
// rule of `requiredKey` in admin-schema.mjs and of the database checks.
// Plain JavaScript with a `.d.mts` declaration so the node:test suites can
// import it.

// Letters that NFD does not split into a base letter and an accent.
const LETTERS = { ß: 'ss', æ: 'ae', œ: 'oe', ø: 'o', ł: 'l', đ: 'd', ð: 'd', þ: 'th', ı: 'i' }

/** A key or slug from `text`: accents removed, anything else between words becomes one hyphen. '' when nothing is left. */
export function slugify(text) {
	return String(text ?? '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/[ßæœøłđðþı]/g, (letter) => LETTERS[letter])
		.replace(/['’‘`]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}
