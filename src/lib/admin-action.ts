import { unstable_rethrow } from 'next/navigation'

import { issueMessage, toActionFailure, type AdminActionResult } from '@/lib/admin-form-state.mjs'
import { validationMessage } from '@/lib/rich-text-rules.mjs'

export type { AdminActionResult, FieldErrors } from '@/lib/admin-form-state.mjs'

/** A validation failure that belongs to one form field (its `name`). */
export class FieldError extends Error {
	override name = 'FieldError'
	constructor(readonly field: string, message: string) {
		super(message)
	}
}

/**
 * Runs an admin Server Action body and turns anything it throws into a failed
 * result for the shared form layer (src/components/admin/form): field errors
 * for `FieldError`s and Zod issues, readable sentences otherwise. Next.js
 * control flow (redirect, notFound) is rethrown. Validation stays on the
 * server; the form only presents the result.
 */
export async function adminAction<V = undefined>(
	fallback: string,
	run: () => Promise<AdminActionResult<V>>,
	options?: { itemLabels?: Record<string, string> },
): Promise<AdminActionResult<V>> {
	try {
		return await run()
	} catch (error) {
		unstable_rethrow(error)
		return toActionFailure(error, fallback, options)
	}
}

export function succeeded<V = undefined>(success: string, values?: V, extra?: { redirectTo?: string }): AdminActionResult<V> {
	return { ok: true, success, ...(values === undefined ? {} : { values }), ...extra }
}

export function failed(formError: string): AdminActionResult<never> {
	return { ok: false, formError }
}

/** Runs a document validator and reports its error on `field`. */
export function documentField<T>(field: string, parse: () => T): T {
	try {
		return parse()
	} catch (error) {
		const issues = error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues) ? error.issues : null
		throw new FieldError(field, issues?.length ? issueMessage(issues[0]) : validationMessage(error))
	}
}

/** Parses a JSON form field; an unreadable value is reported on `field`. */
export function jsonField(formData: FormData, field: string, label: string): unknown {
	const value = formData.get(field)
	if (typeof value !== 'string' || !value) throw new FieldError(field, `${label} could not be read. Reload the page and try again.`)
	try {
		return JSON.parse(value)
	} catch {
		throw new FieldError(field, `${label} could not be read. Reload the page and try again.`)
	}
}
