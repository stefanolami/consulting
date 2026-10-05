'use server'

import { hasLocale } from 'next-intl'
import { cookies, headers } from 'next/headers'

import { routing } from '@/i18n/routing'
import { contactRateLimiter, deliverContactSubmission } from '@/lib/contact/contact-delivery'
import { checkFormToken, clientAddress, FORM_TOKEN_COOKIE, HONEYPOT_FIELD, isHoneypotTripped } from '@/lib/contact/contact-guard.mjs'
import { contactFormSecret, contactFormTokenCookie } from '@/lib/contact/contact-token'
import { CONTACT_FIELDS, CONTACT_LIMITS, parseContactSubmission, type ContactField, type ContactFieldErrors } from '@/lib/contact/contact-rules.mjs'

export type ContactFormValues = Record<ContactField, string>

export type ContactFormState =
	| { status: 'idle' }
	| { status: 'success' }
	| { status: 'invalid'; errors: ContactFieldErrors; values: ContactFormValues }
	| { status: 'error'; reason: 'verification' | 'rateLimited' | 'unavailable'; values: ContactFormValues }

// What the visitor typed, bounded, so the form can be refilled after an error
// (also without JavaScript, where the page is re-rendered with this state).
function echoValues(formData: FormData): ContactFormValues {
	return Object.fromEntries(CONTACT_FIELDS.map((field) => {
		const raw = formData.get(field)
		return [field, typeof raw === 'string' ? raw.slice(0, CONTACT_LIMITS[field].max + 100) : '']
	})) as ContactFormValues
}

// Bots are answered as if the message had been sent, so the response does not
// teach them which check stopped them. Only the reason is logged, never the
// submission.
function silentlyDrop(reason: string): ContactFormState {
	console.warn(`[contact] Submission dropped: ${reason}.`)
	return { status: 'success' }
}

export async function submitContactForm(_: ContactFormState, formData: FormData): Promise<ContactFormState> {
	const values = echoValues(formData)
	const localeValue = formData.get('locale')
	const locale = typeof localeValue === 'string' && hasLocale(routing.locales, localeValue) ? localeValue : routing.defaultLocale

	if (isHoneypotTripped(formData.get(HONEYPOT_FIELD))) return silentlyDrop('honeypot field filled')

	const secret = contactFormSecret()
	if (!secret) {
		console.error('[contact] CONTACT_FORM_SECRET is not set (at least 32 characters); the contact form cannot accept submissions. See README "Contact form".')
		return { status: 'error', reason: 'unavailable', values }
	}
	const cookieStore = await cookies()
	const token = checkFormToken(cookieStore.get(FORM_TOKEN_COOKIE)?.value, Date.now(), secret)
	if (token === 'tooFast') return silentlyDrop('submitted faster than the minimum fill time')
	if (token !== 'ok') {
		// Missing (cookies blocked, or a client that never loaded the page),
		// forged or expired: issue a new token and ask the visitor to send
		// again. Cookie-less bots keep getting this answer.
		const fresh = contactFormTokenCookie(secret)
		cookieStore.set(fresh.name, fresh.value, fresh.options)
		console.warn(`[contact] Submission refused: ${token === 'expired' ? 'expired' : 'missing or invalid'} form token; a new token was issued.`)
		return { status: 'error', reason: 'verification', values }
	}

	const parsed = parseContactSubmission(Object.fromEntries(CONTACT_FIELDS.map((field) => [field, formData.get(field)])))
	if (!parsed.success) return { status: 'invalid', errors: parsed.errors, values }

	const requestHeaders = await headers()
	const rate = contactRateLimiter.consume(clientAddress((name) => requestHeaders.get(name)), Date.now())
	if (!rate.allowed) {
		console.warn('[contact] Submission refused: rate limit reached for this address.')
		return { status: 'error', reason: 'rateLimited', values }
	}

	const delivery = await deliverContactSubmission(parsed.data, locale)
	if (!delivery.ok) return { status: 'error', reason: 'unavailable', values }
	return { status: 'success' }
}
