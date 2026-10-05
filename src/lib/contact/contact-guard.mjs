// Server-side spam protection for the contact form (control tower §15.10):
// a honeypot field, a signed form token that enforces a minimum fill time,
// and an in-memory per-IP rate limit. Pure functions, tested by
// scripts/contact-guard.test.mjs; the proxy and the Server Action supply the
// clock, secret, cookies and headers.
import { createHmac, timingSafeEqual } from 'node:crypto'

export { HONEYPOT_FIELD } from './contact-rules.mjs'

// The form token travels in a cookie that the proxy sets when the Contact page
// is requested, because streamed markup is not inserted without JavaScript
// and the form must work without it. It holds a timestamp and its signature,
// nothing personal.
export const FORM_TOKEN_COOKIE = 'tp_contact_form'

export const MIN_FILL_MS = 3_000
export const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1_000
export const RATE_LIMIT = Object.freeze({ limit: 5, windowMs: 15 * 60 * 1_000 })

/** A filled honeypot: people never see the field, simple bots fill every input. */
export function isHoneypotTripped(value) {
	if (value === null || value === undefined) return false
	return typeof value !== 'string' || value.trim() !== ''
}

function sign(issuedAt, secret) {
	return createHmac('sha256', secret).update(`contact-form:${issuedAt}`).digest('base64url')
}

/** `<issued-at ms>.<HMAC>`: issued when the Contact page is first requested. */
export function createFormToken(issuedAtMs, secret) {
	const issuedAt = String(Math.trunc(issuedAtMs))
	return `${issuedAt}.${sign(issuedAt, secret)}`
}

/**
 * `ok`, `invalid` (missing, malformed or forged), `tooFast` (submitted sooner
 * than a person could fill the form) or `expired` (issued too long ago).
 */
export function checkFormToken(token, nowMs, secret, { minFillMs = MIN_FILL_MS, maxAgeMs = MAX_FORM_AGE_MS } = {}) {
	if (typeof token !== 'string' || token.length > 128) return 'invalid'
	const match = /^(\d{1,16})\.([A-Za-z0-9_-]{43})$/.exec(token)
	if (!match) return 'invalid'
	const [, issuedAt, signature] = match
	const expected = Buffer.from(sign(issuedAt, secret))
	const actual = Buffer.from(signature)
	if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return 'invalid'
	const elapsed = nowMs - Number(issuedAt)
	// A token from the future can only be forged or the result of clock skew
	// between instances; treat it like a too-fast submission.
	if (elapsed < minFillMs) return 'tooFast'
	if (elapsed > maxAgeMs) return 'expired'
	return 'ok'
}

/** Whether a pathname is the Contact page: `/contact` or `/<locale>/contact`. */
export function isContactPagePath(pathname, locales) {
	const match = /^\/(?:([^/]+)\/)?contact\/?$/.exec(pathname)
	return Boolean(match) && (match[1] === undefined || locales.includes(match[1]))
}

/**
 * Sliding-window limiter kept in this process's memory. On serverless
 * hosting each instance has its own window and a cold start resets it, so
 * this only slows down a single client hitting one instance; it is not a
 * shared quota (control tower §19).
 */
export function createRateLimiter({ limit = RATE_LIMIT.limit, windowMs = RATE_LIMIT.windowMs, maxKeys = 10_000 } = {}) {
	const hits = new Map()

	function prune(now) {
		for (const [key, times] of hits) {
			const recent = times.filter((time) => now - time < windowMs)
			if (recent.length) hits.set(key, recent)
			else hits.delete(key)
		}
	}

	return {
		consume(key, now) {
			const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs)
			if (recent.length >= limit) {
				hits.set(key, recent)
				return { allowed: false, retryAfterMs: recent[0] + windowMs - now }
			}
			recent.push(now)
			hits.delete(key)
			hits.set(key, recent)
			if (hits.size > maxKeys) {
				prune(now)
				// Still full: drop the least recently used keys (Map keeps insertion order).
				for (const oldest of hits.keys()) {
					if (hits.size <= maxKeys) break
					hits.delete(oldest)
				}
			}
			return { allowed: true, retryAfterMs: 0 }
		},
		get size() { return hits.size },
	}
}

/**
 * The client address from the proxy headers: the first `x-forwarded-for`
 * entry, else `x-real-ip`. These are only trustworthy behind a proxy that
 * overwrites them (as Vercel does); elsewhere a client can vary them.
 */
export function clientAddress(getHeader) {
	const forwarded = getHeader('x-forwarded-for')?.split(',')[0]?.trim()
	const candidate = forwarded || getHeader('x-real-ip')?.trim() || ''
	return /^[0-9A-Fa-f:.]{2,45}$/.test(candidate) ? candidate : 'unknown'
}
