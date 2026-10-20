// Pure helpers behind the shared admin form layer (audit slice 1): the
// server actions turn validation failures into field errors with them
// (src/lib/admin-action.ts), and the client form layer
// (src/components/admin/form) uses them for dirty tracking, its summaries and
// the language tabs. Plain JavaScript with a declaration file so the node test
// runner can import it (the rich-text-rules.mjs pattern).

// Zod's built-in messages ("Too small: expected string to have >=2
// characters", "Invalid input: expected string, received null"). Messages
// written in the schemas are shown as they are.
const BUILT_IN_MESSAGE = /^(Invalid|Too small|Too big|Unrecognized key|Expected )/

/** A readable sentence for one Zod issue. */
export function issueMessage(issue) {
	if (!issue || typeof issue !== 'object') return 'Enter a valid value.'
	if (issue.code === 'unrecognized_keys' && Array.isArray(issue.keys)) {
		return `Unsupported ${issue.keys.length === 1 ? 'property' : 'properties'}: ${issue.keys.join(', ')}.`
	}
	const message = typeof issue.message === 'string' ? issue.message.trim() : ''
	if (message && !BUILT_IN_MESSAGE.test(message)) return message
	const minimum = Number(issue.minimum)
	const maximum = Number(issue.maximum)
	switch (issue.code) {
		case 'too_small':
			if (issue.origin === 'string') return minimum <= 1 ? 'This field is required.' : `Enter at least ${minimum} characters.`
			if (issue.origin === 'array' || issue.origin === 'set') return minimum <= 1 ? 'Add at least one.' : `Add at least ${minimum}.`
			return `Enter ${minimum} or more.`
		case 'too_big':
			if (issue.origin === 'string') return `Use ${maximum} characters or fewer.`
			if (issue.origin === 'array' || issue.origin === 'set') return `Use no more than ${maximum}.`
			return `Enter ${maximum} or less.`
		case 'invalid_type':
			return /received (undefined|null)/.test(message) ? 'This field is required.' : 'Enter a valid value.'
		case 'invalid_value':
			return 'Choose one of the listed options.'
		case 'invalid_format':
			if (issue.format === 'email') return 'Enter a valid email address.'
			if (issue.format === 'uuid' || issue.format === 'guid') return 'Choose a valid option.'
			if (issue.format === 'url') return 'Enter a complete web address.'
			return 'Use the expected format.'
		default:
			return 'Enter a valid value.'
	}
}

/**
 * Groups Zod issues by form field: the first path segment names the field
 * (the schemas use the form's field names). Issues inside a list are prefixed
 * with the item, for example "Role 2: This field is required.", using
 * `itemLabels` (`{ roles: 'Role' }`). Issues without a field name go to
 * `formError`. Only the first issue per field is kept.
 */
export function issuesToErrors(issues, options = {}) {
	const fieldErrors = {}
	const formErrors = []
	const itemLabels = options.itemLabels ?? {}
	for (const issue of Array.isArray(issues) ? issues : []) {
		const path = Array.isArray(issue?.path) ? issue.path : []
		const [field, ...rest] = path
		const message = issueMessage(issue)
		if (typeof field !== 'string' || !field) {
			if (!formErrors.includes(message)) formErrors.push(message)
			continue
		}
		if (fieldErrors[field]) continue
		const index = rest.findIndex((segment) => typeof segment === 'number')
		if (index === -1) {
			fieldErrors[field] = message
			continue
		}
		const detail = rest.slice(index + 1).filter((segment) => typeof segment === 'string')
		fieldErrors[field] = `${itemLabels[field] ?? 'Item'} ${Number(rest[index]) + 1}${detail.length ? ` (${detail.join(' ')})` : ''}: ${message}`
	}
	return { fieldErrors, formError: formErrors.length ? formErrors.join(' ') : undefined }
}

function looksLikeJson(message) {
	const trimmed = message.trim()
	return trimmed.startsWith('[') || trimmed.startsWith('{')
}

/**
 * The failed result for an error thrown inside a server action. A field error
 * (an Error with a string `field`) targets its field; a ZodError, or a
 * message that is a serialized list of Zod issues, becomes field errors; any
 * other Error keeps its message. Raw JSON is never returned.
 */
export function toActionFailure(error, fallback, options = {}) {
	if (error instanceof Error && typeof error.field === 'string' && error.field) {
		return { ok: false, fieldErrors: { [error.field]: error.message || fallback } }
	}
	let issues = error && typeof error === 'object' && Array.isArray(error.issues) ? error.issues : null
	if (!issues && error instanceof Error && looksLikeJson(error.message)) {
		try {
			const parsed = JSON.parse(error.message)
			if (Array.isArray(parsed)) issues = parsed
		} catch {
			// Not JSON after all; handled below.
		}
		if (!issues) return { ok: false, formError: fallback }
	}
	if (issues) {
		const { fieldErrors, formError } = issuesToErrors(issues, options)
		const hasFieldErrors = Object.keys(fieldErrors).length > 0
		if (!hasFieldErrors && !formError) return { ok: false, formError: fallback }
		return { ok: false, ...(hasFieldErrors ? { fieldErrors } : {}), ...(formError ? { formError } : {}) }
	}
	if (error instanceof Error && error.message.trim()) return { ok: false, formError: error.message.trim() }
	return { ok: false, formError: fallback }
}

/**
 * A comparable snapshot of a form's entries (`[...new FormData(form)]`).
 * Files compare by name, size and modification time; an empty file input
 * (which FormData reports as a nameless, empty file stamped with the current
 * time) compares as empty. The order of entries is kept, because repeated
 * names are ordered lists.
 */
export function formSnapshot(entries) {
	const normalized = []
	for (const [name, value] of entries) {
		if (typeof value === 'string') normalized.push([name, value])
		else if (value && typeof value === 'object') normalized.push([name, !value.name && !value.size ? '\u0000file:' : `\u0000file:${value.name ?? ''}:${value.size ?? 0}:${value.lastModified ?? 0}`])
	}
	return JSON.stringify(normalized)
}

/** The sentence shown next to the save button after a failed save. */
export function failureSummary(result, renderedFields = []) {
	if (!result || result.ok) return null
	const fields = Object.keys(result.fieldErrors ?? {})
	const marked = fields.filter((field) => renderedFields.includes(field))
	const unmarked = fields.filter((field) => !renderedFields.includes(field)).map((field) => result.fieldErrors[field])
	const lines = []
	if (result.formError) lines.push(result.formError)
	if (marked.length) lines.push(marked.length === 1 ? 'Nothing was saved. Check the field marked above.' : `Nothing was saved. Check the ${marked.length} fields marked above.`)
	lines.push(...unmarked)
	if (!lines.length) lines.push('Nothing was saved. Try again.')
	return lines
}

/** WAI-ARIA tabs: the tab index that a key moves to, or null for other keys. */
export function nextTabIndex(key, index, count) {
	if (count < 1) return null
	switch (key) {
		case 'ArrowLeft': return (index - 1 + count) % count
		case 'ArrowRight': return (index + 1) % count
		case 'Home': return 0
		case 'End': return count - 1
		default: return null
	}
}
