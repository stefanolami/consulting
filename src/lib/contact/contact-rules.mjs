// Contact form rules shared by the Server Action and the client form, so both
// apply the same checks (control tower §15.10). Plain JavaScript with a
// `.d.mts` declaration so the node:test suites can import it directly.
import { z } from 'zod'

export const CONTACT_FIELDS = /** @type {const} */ (['name', 'email', 'subject', 'message'])

// Name of the hidden honeypot input (checked in contact-guard.mjs).
export const HONEYPOT_FIELD = 'website'

// Lengths count UTF-16 code units, as the HTML `maxLength` attribute does.
export const CONTACT_LIMITS = Object.freeze({
	name: Object.freeze({ min: 2, max: 100 }),
	email: Object.freeze({ min: 3, max: 254 }),
	subject: Object.freeze({ min: 2, max: 150 }),
	message: Object.freeze({ min: 10, max: 5000 }),
})

// C0 and C1 control characters, DEL, and the Unicode line and paragraph
// separators. Single-line fields allow none of them; the message allows line
// feeds and tabs.
const SINGLE_LINE_FORBIDDEN = /[\x00-\x1f\x7f-\x9f\p{Zl}\p{Zp}]/u
const MESSAGE_FORBIDDEN = /[\x00-\x08\x0b-\x1f\x7f-\x9f\p{Zl}\p{Zp}]/u

const asText = (value) => (typeof value === 'string' ? value : '')

function boundedText(field, forbidden, normalize = (value) => value.trim()) {
	const { min, max } = CONTACT_LIMITS[field]
	return z.preprocess(
		(value) => normalize(asText(value)),
		z.string()
			.min(1, 'required')
			.min(min, 'tooShort')
			.max(max, 'tooLong')
			.refine((value) => !forbidden.test(value), 'invalidCharacters'),
	)
}

const contactSchema = z.object({
	name: boundedText('name', SINGLE_LINE_FORBIDDEN),
	email: boundedText('email', SINGLE_LINE_FORBIDDEN).refine((value) => z.email().safeParse(value).success, 'invalidEmail'),
	subject: boundedText('subject', SINGLE_LINE_FORBIDDEN),
	// Line endings are normalized before the checks so CRLF counts once.
	message: boundedText('message', MESSAGE_FORBIDDEN, (value) => value.replace(/\r\n?/g, '\n').trim()),
})

/**
 * Validates and normalizes a submission. Errors are codes (one per field, the
 * first that applies), which the interface localizes.
 */
export function parseContactSubmission(input) {
	const source = input ?? {}
	const result = contactSchema.safeParse(Object.fromEntries(CONTACT_FIELDS.map((field) => [field, source[field]])))
	if (result.success) return { success: true, data: result.data }
	const errors = {}
	for (const issue of result.error.issues) {
		const field = issue.path[0]
		if (typeof field === 'string' && !(field in errors)) errors[field] = issue.message
	}
	return { success: false, errors }
}

/**
 * A `tel:` URI for a displayed phone number: digits and a leading `+` only,
 * with the national trunk prefix "(0)" of international numbers removed
 * ("+32 (0) 485 38 22 21" → "tel:+32485382221"). Null when nothing usable
 * remains.
 */
export function telHref(phone) {
	if (typeof phone !== 'string') return null
	const withoutTrunk = phone.replace(/\(\s*0\s*\)/g, '')
	const digits = withoutTrunk.replace(/\D/g, '')
	if (digits.length < 3 || digits.length > 15) return null
	return `tel:${withoutTrunk.trim().startsWith('+') ? '+' : ''}${digits}`
}
