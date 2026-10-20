import assert from 'node:assert/strict'
import test from 'node:test'

import { z } from 'zod'

import { failureSummary, formSnapshot, issueMessage, issuesToErrors, nextTabIndex, toActionFailure } from '../src/lib/admin-form-state.mjs'

const issuesOf = (schema, value) => {
	const result = schema.safeParse(value)
	assert.equal(result.success, false)
	return result.error.issues
}

test('built-in Zod messages become sentences; schema messages are kept', () => {
	const schema = z.object({
		title: z.string().trim().min(2).max(5),
		name: z.string().trim().min(1),
		slug: z.string().regex(/^[a-z]+$/, 'Use lowercase letters only.'),
		status: z.enum(['draft', 'published']),
		personId: z.string().uuid(),
		email: z.string().email(),
		roles: z.array(z.string()).min(1),
		order: z.number().int().max(10),
	}).strict()
	const { fieldErrors } = issuesToErrors(issuesOf(schema, { title: 'a', name: '', slug: 'A', status: 'gone', personId: 'x', email: 'no', roles: [], order: 11 }))
	assert.deepEqual(fieldErrors, {
		title: 'Enter at least 2 characters.',
		name: 'This field is required.',
		slug: 'Use lowercase letters only.',
		status: 'Choose one of the listed options.',
		personId: 'Choose a valid option.',
		email: 'Enter a valid email address.',
		roles: 'Add at least one.',
		order: 'Enter 10 or less.',
	})
	assert.equal(issueMessage(issuesOf(z.string().max(3), 'abcd')[0]), 'Use 3 characters or fewer.')
	assert.equal(issueMessage(issuesOf(z.object({ a: z.string() }), {})[0]), 'This field is required.')
	assert.equal(issueMessage(issuesOf(z.object({ a: z.string() }), { a: null })[0]), 'This field is required.')
	assert.equal(issueMessage(issuesOf(z.object({}).strict(), { type: 1, target: 2 })[0]), 'Unsupported properties: type, target.')
})

test('list issues name the item and nested key; issues without a field are form errors', () => {
	const schema = z.object({ roles: z.array(z.object({ title: z.string().min(1), labels: z.object({ it: z.string() }) })) })
	const { fieldErrors, formError } = issuesToErrors(issuesOf(schema, { roles: [{ title: 'ok', labels: { it: 'x' } }, { title: '', labels: { it: 'y' } }] }), { itemLabels: { roles: 'Role' } })
	assert.deepEqual(fieldErrors, { roles: 'Role 2 (title): This field is required.' })
	assert.equal(formError, undefined)
	assert.deepEqual(issuesToErrors(issuesOf(schema, { roles: [{ title: 'a', labels: {} }] })).fieldErrors, { roles: 'Item 1 (labels it): This field is required.' })
	assert.deepEqual(issuesToErrors(issuesOf(z.array(z.string()), [1])), { fieldErrors: {}, formError: 'Enter a valid value.' })
	// Only the first issue per field is kept.
	assert.deepEqual(issuesToErrors(issuesOf(z.object({ a: z.string().min(3).regex(/x/, 'Needs an x.') }), { a: 'b' })).fieldErrors, { a: 'Enter at least 3 characters.' })
})

test('thrown errors become failed results without raw JSON', () => {
	const fieldError = Object.assign(new Error('Choose a future time.'), { field: 'scheduledFor' })
	assert.deepEqual(toActionFailure(fieldError, 'Could not save.'), { ok: false, fieldErrors: { scheduledFor: 'Choose a future time.' } })

	const zodError = z.object({ slug: z.string().min(1) }).safeParse({ slug: '' }).error
	assert.deepEqual(toActionFailure(zodError, 'Could not save.'), { ok: false, fieldErrors: { slug: 'This field is required.' } })

	// A ZodError rethrown as `new Error(error.message)` is a JSON list of issues.
	const rethrown = new Error(z.object({}).strict().safeParse({ type: 'x' }).error.message)
	assert.match(rethrown.message, /^\s*\[/)
	assert.deepEqual(toActionFailure(rethrown, 'Could not save.'), { ok: false, formError: 'Unsupported property: type.' })
	assert.deepEqual(toActionFailure(new Error('{"broken": '), 'Could not save.'), { ok: false, formError: 'Could not save.' })
	assert.deepEqual(toActionFailure(new Error('{"a": 1}'), 'Could not save.'), { ok: false, formError: 'Could not save.' })

	assert.deepEqual(toActionFailure(new Error('Could not save the profile: duplicate key.'), 'Could not save.'), { ok: false, formError: 'Could not save the profile: duplicate key.' })
	assert.deepEqual(toActionFailure('boom', 'Could not save.'), { ok: false, formError: 'Could not save.' })
	assert.deepEqual(toActionFailure(new Error('  '), 'Could not save.'), { ok: false, formError: 'Could not save.' })
})

test('form snapshots compare values in order and files by identity', () => {
	const file = { name: 'a.png', size: 10, lastModified: 1 }
	assert.equal(formSnapshot([['title', 'A'], ['file', file]]), formSnapshot([['title', 'A'], ['file', { ...file }]]))
	assert.notEqual(formSnapshot([['title', 'A']]), formSnapshot([['title', 'B']]))
	assert.notEqual(formSnapshot([['id', '1'], ['id', '2']]), formSnapshot([['id', '2'], ['id', '1']]))
	assert.notEqual(formSnapshot([['file', file]]), formSnapshot([['file', { ...file, size: 11 }]]))
	// An empty file input and a text value of the same name differ.
	assert.notEqual(formSnapshot([['file', { name: '', size: 0, lastModified: 0 }]]), formSnapshot([['file', '']]))
	// An untouched file input is reported with the current time; it stays equal.
	assert.equal(formSnapshot([['file', { name: '', size: 0, lastModified: 1 }]]), formSnapshot([['file', { name: '', size: 0, lastModified: 2 }]]))
})

test('the failure summary counts marked fields and repeats unmarked ones', () => {
	assert.equal(failureSummary(null), null)
	assert.equal(failureSummary({ ok: true, success: 'Saved.' }), null)
	assert.deepEqual(failureSummary({ ok: false, formError: 'Could not save this translation.' }), ['Could not save this translation.'])
	assert.deepEqual(failureSummary({ ok: false, fieldErrors: { slug: 'x' } }, ['slug']), ['Nothing was saved. Check the field marked above.'])
	assert.deepEqual(failureSummary({ ok: false, fieldErrors: { slug: 'x', title: 'y', roles: 'Role 1: z' } }, ['slug', 'title']), ['Nothing was saved. Check the 2 fields marked above.', 'Role 1: z'])
	assert.deepEqual(failureSummary({ ok: false }), ['Nothing was saved. Try again.'])
})

test('tab keys wrap around and ignore other keys', () => {
	assert.equal(nextTabIndex('ArrowRight', 4, 5), 0)
	assert.equal(nextTabIndex('ArrowLeft', 0, 5), 4)
	assert.equal(nextTabIndex('Home', 3, 5), 0)
	assert.equal(nextTabIndex('End', 1, 5), 4)
	assert.equal(nextTabIndex('Enter', 1, 5), null)
	assert.equal(nextTabIndex('ArrowRight', 0, 0), null)
})
