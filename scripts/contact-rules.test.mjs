import assert from 'node:assert/strict'
import test from 'node:test'

import { CONTACT_FIELDS, CONTACT_LIMITS, parseContactSubmission, telHref } from '../src/lib/contact/contact-rules.mjs'

const valid = { name: 'Ada Lovelace', email: 'ada@example.com', subject: 'Partnership', message: 'We would like to talk about a project.' }

test('a valid submission is trimmed and returned', () => {
	const result = parseContactSubmission({ name: '  Ada Lovelace ', email: ' ada@example.com ', subject: ' Partnership ', message: '\n Hello there, a project. \n' })
	assert.deepEqual(result, { success: true, data: { name: 'Ada Lovelace', email: 'ada@example.com', subject: 'Partnership', message: 'Hello there, a project.' } })
})

test('extra keys are ignored', () => {
	const result = parseContactSubmission({ ...valid, website: 'spam', formToken: 'x' })
	assert.deepEqual(Object.keys(result.data).sort(), [...CONTACT_FIELDS].sort())
})

test('missing, blank and non-string values are "required"', () => {
	assert.deepEqual(parseContactSubmission({}), { success: false, errors: { name: 'required', email: 'required', subject: 'required', message: 'required' } })
	assert.deepEqual(parseContactSubmission(null).errors.name, 'required')
	assert.deepEqual(parseContactSubmission({ ...valid, name: '   ' }).errors, { name: 'required' })
	assert.deepEqual(parseContactSubmission({ ...valid, subject: 42 }).errors, { subject: 'required' })
})

test('every field enforces its minimum and maximum length after trimming', () => {
	for (const field of CONTACT_FIELDS.filter((name) => name !== 'email')) {
		const { min, max } = CONTACT_LIMITS[field]
		assert.equal(parseContactSubmission({ ...valid, [field]: 'x'.repeat(min - 1) }).errors[field], 'tooShort', `${field} min`)
		assert.equal(parseContactSubmission({ ...valid, [field]: ` ${'x'.repeat(min)} ` }).success, true, `${field} at min`)
		assert.equal(parseContactSubmission({ ...valid, [field]: 'x'.repeat(max) }).success, true, `${field} at max`)
		assert.equal(parseContactSubmission({ ...valid, [field]: 'x'.repeat(max + 1) }).errors[field], 'tooLong', `${field} max`)
	}
	const longEmail = `${'a'.repeat(250)}@example.com`
	assert.equal(parseContactSubmission({ ...valid, email: longEmail }).errors.email, 'tooLong')
})

test('the email must be a valid address', () => {
	for (const email of ['ada', 'ada@', '@example.com', 'ada@example', 'ada example@x.com', 'ada@example.com\nBcc: x@y.com']) {
		const { errors } = parseContactSubmission({ ...valid, email })
		assert.ok(errors.email === 'invalidEmail' || errors.email === 'invalidCharacters', `${JSON.stringify(email)} → ${errors.email}`)
	}
})

test('single-line fields reject line breaks and control characters', () => {
	for (const bad of ['line\nbreak', 'carriage\rreturn', 'tab\there', 'nul\u0000', 'del\u007f', 'c1\u0085', `ls${String.fromCharCode(0x2028)}x`, `ps${String.fromCharCode(0x2029)}x`]) {
		assert.equal(parseContactSubmission({ ...valid, name: bad }).errors.name, 'invalidCharacters', JSON.stringify(bad))
		assert.equal(parseContactSubmission({ ...valid, subject: bad }).errors.subject, 'invalidCharacters', JSON.stringify(bad))
	}
})

test('the message keeps line breaks and tabs, normalizes CRLF, and rejects other controls', () => {
	const result = parseContactSubmission({ ...valid, message: 'First line\r\nSecond\tline\rThird line' })
	assert.equal(result.data.message, 'First line\nSecond\tline\nThird line')
	assert.equal(parseContactSubmission({ ...valid, message: 'Hello there\u0007 bell' }).errors.message, 'invalidCharacters')
	assert.equal(parseContactSubmission({ ...valid, message: 'Hello there\u001b[31m escape' }).errors.message, 'invalidCharacters')
})

test('only the first error per field is reported', () => {
	assert.deepEqual(parseContactSubmission({ ...valid, name: '' }).errors, { name: 'required' })
})

test('telHref keeps digits and the leading plus, dropping the "(0)" trunk prefix', () => {
	assert.equal(telHref('+32 (0) 485 38 22 21'), 'tel:+32485382221')
	assert.equal(telHref('+351 22 123 4567'), 'tel:+351221234567')
	assert.equal(telHref('022 123 4567'), 'tel:0221234567')
	assert.equal(telHref('call us'), null)
	assert.equal(telHref(null), null)
	assert.equal(telHref('1'.repeat(16)), null)
})
