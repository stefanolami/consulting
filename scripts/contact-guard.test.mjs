import assert from 'node:assert/strict'
import test from 'node:test'

import {
	checkFormToken,
	clientAddress,
	createFormToken,
	createRateLimiter,
	isContactPagePath,
	isHoneypotTripped,
	MAX_FORM_AGE_MS,
	MIN_FILL_MS,
} from '../src/lib/contact/contact-guard.mjs'
import { buildContactMail, readContactFormSecret, readContactMailConfig, sanitizeHeaderText } from '../src/lib/contact/contact-mail.mjs'

const SECRET = 'test-secret-that-is-long-enough-1234567890'
const ISSUED = 1_800_000_000_000

test('the honeypot is tripped by any value but an empty one', () => {
	assert.equal(isHoneypotTripped(null), false)
	assert.equal(isHoneypotTripped(undefined), false)
	assert.equal(isHoneypotTripped(''), false)
	assert.equal(isHoneypotTripped('   '), false)
	assert.equal(isHoneypotTripped('https://spam.example'), true)
	assert.equal(isHoneypotTripped({ name: 'file' }), true)
})

test('a form token passes between the minimum fill time and the maximum age', () => {
	const token = createFormToken(ISSUED, SECRET)
	assert.match(token, /^\d+\.[A-Za-z0-9_-]{43}$/)
	assert.equal(checkFormToken(token, ISSUED + MIN_FILL_MS, SECRET), 'ok')
	assert.equal(checkFormToken(token, ISSUED + MAX_FORM_AGE_MS, SECRET), 'ok')
})

test('a submission faster than the minimum fill time is "tooFast", also from the future', () => {
	const token = createFormToken(ISSUED, SECRET)
	assert.equal(checkFormToken(token, ISSUED, SECRET), 'tooFast')
	assert.equal(checkFormToken(token, ISSUED + MIN_FILL_MS - 1, SECRET), 'tooFast')
	assert.equal(checkFormToken(token, ISSUED - 60_000, SECRET), 'tooFast')
})

test('an old token is "expired"', () => {
	assert.equal(checkFormToken(createFormToken(ISSUED, SECRET), ISSUED + MAX_FORM_AGE_MS + 1, SECRET), 'expired')
})

test('missing, malformed, forged or re-dated tokens are "invalid"', () => {
	const token = createFormToken(ISSUED, SECRET)
	const now = ISSUED + 10_000
	for (const bad of [null, undefined, '', 42, 'abc', `${ISSUED}`, `${ISSUED}.short`, `${token}x`, `x${token}`, 'a'.repeat(200)]) {
		assert.equal(checkFormToken(bad, now, SECRET), 'invalid', JSON.stringify(bad))
	}
	assert.equal(checkFormToken(createFormToken(ISSUED, 'another-secret-also-long-enough-0987654321'), now, SECRET), 'invalid')
	const [, signature] = token.split('.')
	assert.equal(checkFormToken(`${ISSUED - 3_600_000}.${signature}`, now, SECRET), 'invalid', 'an earlier timestamp with the same signature')
})

test('the rate limiter allows the limit per window and then refuses until the oldest hit expires', () => {
	const limiter = createRateLimiter({ limit: 3, windowMs: 1_000 })
	assert.equal(limiter.consume('1.2.3.4', 0).allowed, true)
	assert.equal(limiter.consume('1.2.3.4', 100).allowed, true)
	assert.equal(limiter.consume('1.2.3.4', 200).allowed, true)
	assert.deepEqual(limiter.consume('1.2.3.4', 300), { allowed: false, retryAfterMs: 700 })
	assert.equal(limiter.consume('5.6.7.8', 300).allowed, true, 'other addresses are independent')
	assert.equal(limiter.consume('1.2.3.4', 999).allowed, false)
	assert.equal(limiter.consume('1.2.3.4', 1_000).allowed, true, 'the first hit has left the window')
	assert.equal(limiter.consume('1.2.3.4', 1_001).allowed, false)
})

test('refused attempts do not extend the window', () => {
	const limiter = createRateLimiter({ limit: 1, windowMs: 1_000 })
	limiter.consume('a', 0)
	for (let time = 100; time < 1_000; time += 100) assert.equal(limiter.consume('a', time).allowed, false)
	assert.equal(limiter.consume('a', 1_000).allowed, true)
})

test('the rate limiter stays bounded in memory', () => {
	const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, maxKeys: 3 })
	for (const key of ['a', 'b', 'c', 'd', 'e']) limiter.consume(key, 0)
	assert.equal(limiter.size, 3)
	assert.equal(limiter.consume('e', 1).allowed, false, 'recent keys are kept')
	assert.equal(limiter.consume('a', 1).allowed, true, 'the oldest keys were dropped')
	limiter.consume('z', 5_000)
	assert.equal(limiter.size, 1, 'expired keys are pruned once the map is full')
})

test('the proxy issues the token cookie only on the Contact page paths', () => {
	const locales = ['en', 'de', 'it', 'pt-BR', 'pt-PT']
	for (const path of ['/contact', '/contact/', '/de/contact', '/pt-BR/contact', '/en/contact']) assert.equal(isContactPagePath(path, locales), true, path)
	for (const path of ['/', '/contacts', '/fr/contact', '/de/contact/x', '/newsroom/contact', '/de']) assert.equal(isContactPagePath(path, locales), false, path)
})

test('an existing cookie is kept while valid, regardless of the fill time', () => {
	const token = createFormToken(ISSUED, SECRET)
	assert.equal(checkFormToken(token, ISSUED, SECRET, { minFillMs: 0 }), 'ok')
	assert.equal(checkFormToken(token, ISSUED + MAX_FORM_AGE_MS + 1, SECRET, { minFillMs: 0 }), 'expired')
})

test('the client address is the first forwarded address, else x-real-ip, else "unknown"', () => {
	const headers = (values) => (name) => values[name] ?? null
	assert.equal(clientAddress(headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })), '203.0.113.7')
	assert.equal(clientAddress(headers({ 'x-forwarded-for': '2001:db8::1' })), '2001:db8::1')
	assert.equal(clientAddress(headers({ 'x-real-ip': '198.51.100.4' })), '198.51.100.4')
	assert.equal(clientAddress(headers({})), 'unknown')
	assert.equal(clientAddress(headers({ 'x-forwarded-for': '<script>' })), 'unknown')
})

const SMTP_ENV = {
	CONTACT_SMTP_HOST: 'smtp.example.com',
	CONTACT_SMTP_PORT: '465',
	CONTACT_SMTP_USER: 'website@example.com',
	CONTACT_SMTP_PASSWORD: 'not-a-real-password',
	CONTACT_TO_EMAIL: 'info@example.com',
}

test('SMTP configuration needs every variable and reports problems by name only', () => {
	const result = readContactMailConfig({ NODE_ENV: 'production' })
	assert.equal(result.ok, false)
	assert.deepEqual(result.problems, ['CONTACT_SMTP_HOST', 'CONTACT_SMTP_PORT', 'CONTACT_SMTP_USER', 'CONTACT_SMTP_PASSWORD', 'CONTACT_TO_EMAIL'].map((name) => `${name} is not set`))
	const bad = readContactMailConfig({ ...SMTP_ENV, CONTACT_SMTP_PORT: '99999', CONTACT_TO_EMAIL: 'nobody' })
	assert.deepEqual(bad.problems, ['CONTACT_SMTP_PORT is not a valid port number', 'CONTACT_TO_EMAIL is not an email address'])
	assert.ok(!JSON.stringify(bad).includes('not-a-real-password'))
	assert.deepEqual(readContactMailConfig(SMTP_ENV), { ok: true, config: { kind: 'smtp', host: 'smtp.example.com', port: 465, user: 'website@example.com', password: 'not-a-real-password', from: 'website@example.com', to: 'info@example.com' } })
})

test('jsonTransport is available outside production only', () => {
	assert.deepEqual(readContactMailConfig({ NODE_ENV: 'development', CONTACT_MAIL_TRANSPORT: 'json' }), { ok: true, config: { kind: 'json', from: 'contact-form@example.invalid', to: 'inbox@example.invalid' } })
	assert.equal(readContactMailConfig({ NODE_ENV: 'production', CONTACT_MAIL_TRANSPORT: 'json' }).ok, false)
	assert.equal(readContactMailConfig({ ...SMTP_ENV, NODE_ENV: 'production', CONTACT_MAIL_TRANSPORT: 'json' }).config.kind, 'smtp')
})

test('the form secret needs at least 32 characters', () => {
	assert.equal(readContactFormSecret({}), null)
	assert.equal(readContactFormSecret({ CONTACT_FORM_SECRET: 'short' }), null)
	assert.equal(readContactFormSecret({ CONTACT_FORM_SECRET: SECRET }), SECRET)
})

test('header text loses control characters and line breaks', () => {
	assert.equal(sanitizeHeaderText('Hello\r\nBcc: victim@example.com'), 'Hello Bcc: victim@example.com')
	assert.equal(sanitizeHeaderText(`a${String.fromCharCode(0x2028)}b\u0000c`), 'a b c')
	assert.equal(sanitizeHeaderText('x'.repeat(300)).length, 200)
})

test('the mail is sent from the configured mailbox with the visitor as Reply-To', () => {
	const mail = buildContactMail({
		submission: { name: 'Ada\r\nBcc: x@evil.test', email: 'ada@example.com', subject: 'Hi\nCc: y@evil.test', message: 'Line one\nLine two' },
		from: 'website@example.com',
		to: 'info@example.com',
		locale: 'de',
		receivedAt: new Date('2026-10-05T12:00:00Z'),
	})
	assert.deepEqual(mail.from, { name: 'Time&Place Consulting website', address: 'website@example.com' })
	assert.equal(mail.to, 'info@example.com')
	assert.deepEqual(mail.replyTo, { name: 'Ada Bcc: x@evil.test', address: 'ada@example.com' })
	assert.equal(mail.subject, 'Website contact: Hi Cc: y@evil.test')
	for (const header of [mail.from.name, mail.replyTo.name, mail.replyTo.address, mail.subject]) assert.doesNotMatch(header, /[\r\n]/)
	assert.match(mail.text, /^Name: Ada Bcc: x@evil\.test\nEmail: ada@example\.com\nSubject: Hi Cc: y@evil\.test\nPage language: de\nReceived: 2026-10-05T12:00:00\.000Z\n\nLine one\nLine two$/)
	assert.equal('html' in mail, false)
})
