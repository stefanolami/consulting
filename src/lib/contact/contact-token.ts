import { createFormToken, FORM_TOKEN_COOKIE, MAX_FORM_AGE_MS } from '@/lib/contact/contact-guard.mjs'
import { readContactFormSecret } from '@/lib/contact/contact-mail.mjs'

// The contact-form token secret and cookie, shared by the proxy (which issues
// the cookie) and the Server Action (which checks it). Kept free of the mail
// transport so the proxy stays light.

// Development only, so the form works without setup; a known value is
// harmless because production refuses to use it.
const DEVELOPMENT_SECRET = 'development-only-contact-form-secret-never-used-in-production'

/** The signing secret, or null in production when CONTACT_FORM_SECRET is missing or too short. */
export function contactFormSecret() {
	return readContactFormSecret(process.env) ?? (process.env.NODE_ENV === 'production' ? null : DEVELOPMENT_SECRET)
}

/** The cookie that carries a freshly issued token. */
export function contactFormTokenCookie(secret: string) {
	return {
		name: FORM_TOKEN_COOKIE,
		value: createFormToken(Date.now(), secret),
		options: { httpOnly: true, maxAge: MAX_FORM_AGE_MS / 1_000, path: '/', sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' },
	}
}
