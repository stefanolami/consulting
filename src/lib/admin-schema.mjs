// Optional fields for the admin Server Action schemas (audit X-03). Every
// optional field accepts "nothing" in any of the forms a client sends it:
// a missing key, `undefined`, `null`, an empty string or only whitespace. All
// of them become `null`, the value stored for "not set". This is the one place
// where empty input is normalized; the actions pass form values through as
// they are. Plain JavaScript with a `.d.mts` declaration so the node:test
// suites can import it (the rich-text-rules.mjs pattern).
import { z } from 'zod'

/** Whether a value means "not set": missing, null, or a blank string. */
export function isBlank(value) {
	return value === undefined || value === null || (typeof value === 'string' && !value.trim())
}

/** Makes `schema` optional: blank input becomes `null`, anything else must match `schema`. */
export function optional(schema) {
	return z.preprocess((value) => (isBlank(value) ? null : value), schema.nullable())
}

const HTTP_URL_MESSAGE = 'Use a complete http or https URL.'

/** A complete http or https URL, trimmed. */
export function httpUrl(message = HTTP_URL_MESSAGE) {
	return z.string().trim().max(2_048).superRefine((value, context) => {
		try {
			const protocol = new URL(value).protocol
			if (protocol !== 'http:' && protocol !== 'https:') context.addIssue({ code: 'custom', message })
		} catch {
			context.addIssue({ code: 'custom', message })
		}
	})
}

/** Optional trimmed text of at most `maximum` characters. */
export function optionalText(maximum, message) {
	return optional(z.string().trim().max(maximum, message))
}

/** An optional record id. */
export const optionalUuid = optional(z.string().trim().uuid('Choose a valid option.'))

/** An optional number, from a number or a numeric string. */
export const optionalNumber = optional(z.union([z.number(), z.string().trim()]).transform((value) => Number(value)))

/** An optional complete http or https URL. */
export function optionalHttpUrl(message = HTTP_URL_MESSAGE) {
	return optional(httpUrl(message))
}

/** An optional email address. */
export function optionalEmail(message = 'Enter a valid email address.') {
	return optional(z.string().trim().max(320).email(message))
}

/** A stable key or slug: lowercase letters, numbers and single hyphens. */
export const requiredKey = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.')

// Items of the lists that editors send as JSON. Their optional fields use the
// helpers above, so an empty input in a row never blocks a save.

/** A People role (`roles`). */
export const profileRoleSchema = z.object({
	id: optionalUuid.optional(),
	title: z.string().trim().min(1).max(160),
	cardLabel: optionalText(100),
	isCardRole: z.boolean(),
})

/** A service assigned to a country (`serviceAssignments`). */
export const countryServiceAssignmentSchema = z.object({ serviceId: z.string().uuid(), coverageLevel: optionalText(120) }).strict()

/** A country statistic (`statistics`). */
export const countryStatisticSchema = z.object({
	id: optionalUuid.optional(),
	metricKey: requiredKey,
	numericValue: optionalNumber.refine((value) => value === null || Number.isFinite(value), 'Statistic value must be a number.'),
	unit: optionalText(120),
	statisticYear: optionalNumber.refine((value) => value === null || (Number.isInteger(value) && value >= 1900 && value <= 2200), 'Statistic year must be between 1900 and 2200.'),
	sourceUrl: optionalHttpUrl('Use a complete http or https source URL.'),
	displayOrder: z.coerce.number().int().min(0).max(100_000),
}).strict()

/** Localized copy of a country's service (`serviceCopies`). */
export const countryServiceCopySchema = z.object({ serviceId: z.string().uuid(), summary: optionalText(2_000), content: z.unknown() }).strict()

/** A localized statistic label (`statisticLabels`). */
export const countryStatisticLabelSchema = z.object({ statisticId: z.string().uuid(), label: z.string().trim().min(1).max(160), displayValue: optionalText(320) }).strict()

/** A call to action (`callsToAction`): English is required, every other label is optional. */
export const callToActionSchema = z.object({
	key: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'CTA keys use lowercase letters, numbers and hyphens.'),
	href: z.string().trim().max(2_048).refine((value) => value.startsWith('/') || httpUrl().safeParse(value).success, 'Calls to action need an internal path or complete web URL.'),
	labels: z.object({ en: z.string().trim().min(1).max(120), de: optionalText(120), it: optionalText(120), 'pt-BR': optionalText(120), 'pt-PT': optionalText(120) }).strict(),
}).strict()
