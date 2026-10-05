// Contact-form delivery configuration and message construction (control
// tower §15.10). Pure functions over an environment object, tested by
// scripts/contact-guard.test.mjs. Problems are reported by variable name
// only; values are never echoed.

const HEADER_FORBIDDEN = /[\x00-\x1f\x7f-\x9f\p{Zl}\p{Zp}]+/gu
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/
const SENDER_NAME = 'Time&Place Consulting website'

const value = (env, name) => (typeof env[name] === 'string' ? env[name].trim() : '')

/**
 * Where submissions go. `CONTACT_MAIL_TRANSPORT=json` selects nodemailer's
 * jsonTransport (nothing is sent) and is honoured outside production only.
 * Otherwise SMTP needs host, port, user, password and the recipient; mail is
 * sent from the authenticated mailbox.
 */
export function readContactMailConfig(env) {
	const isProduction = value(env, 'NODE_ENV') === 'production'
	if (value(env, 'CONTACT_MAIL_TRANSPORT') === 'json' && !isProduction) {
		return {
			ok: true,
			config: {
				kind: 'json',
				from: EMAIL.test(value(env, 'CONTACT_SMTP_USER')) ? value(env, 'CONTACT_SMTP_USER') : 'contact-form@example.invalid',
				to: EMAIL.test(value(env, 'CONTACT_TO_EMAIL')) ? value(env, 'CONTACT_TO_EMAIL') : 'inbox@example.invalid',
			},
		}
	}

	const problems = []
	for (const name of ['CONTACT_SMTP_HOST', 'CONTACT_SMTP_PORT', 'CONTACT_SMTP_USER', 'CONTACT_SMTP_PASSWORD', 'CONTACT_TO_EMAIL']) {
		if (!value(env, name)) problems.push(`${name} is not set`)
	}
	const portText = value(env, 'CONTACT_SMTP_PORT')
	const port = Number(portText)
	if (portText && !(Number.isInteger(port) && port > 0 && port < 65_536)) problems.push('CONTACT_SMTP_PORT is not a valid port number')
	if (value(env, 'CONTACT_SMTP_USER') && !EMAIL.test(value(env, 'CONTACT_SMTP_USER'))) problems.push('CONTACT_SMTP_USER is not an email address (it is also the sender)')
	if (value(env, 'CONTACT_TO_EMAIL') && !EMAIL.test(value(env, 'CONTACT_TO_EMAIL'))) problems.push('CONTACT_TO_EMAIL is not an email address')
	if (problems.length) return { ok: false, problems }

	return {
		ok: true,
		config: {
			kind: 'smtp',
			host: value(env, 'CONTACT_SMTP_HOST'),
			port,
			user: value(env, 'CONTACT_SMTP_USER'),
			password: value(env, 'CONTACT_SMTP_PASSWORD'),
			from: value(env, 'CONTACT_SMTP_USER'),
			to: value(env, 'CONTACT_TO_EMAIL'),
		},
	}
}

/**
 * The form-token signing secret. Production requires `CONTACT_FORM_SECRET`
 * (at least 32 characters); elsewhere `null` lets the caller fall back to a
 * per-process secret.
 */
export function readContactFormSecret(env) {
	const secret = value(env, 'CONTACT_FORM_SECRET')
	return secret.length >= 32 ? secret : null
}

/** Visitor text made safe for a header: no control characters or line breaks, collapsed spaces, bounded length. */
export function sanitizeHeaderText(text, maxLength = 200) {
	return String(text ?? '').replace(HEADER_FORBIDDEN, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

/**
 * The nodemailer message for a validated submission. The configured mailbox
 * is the sender; the visitor is only the Reply-To. The body is plain text.
 */
export function buildContactMail({ submission, from, to, locale, receivedAt }) {
	const name = sanitizeHeaderText(submission.name, 100)
	return {
		from: { name: SENDER_NAME, address: from },
		to,
		replyTo: { name, address: sanitizeHeaderText(submission.email, 254) },
		subject: `Website contact: ${sanitizeHeaderText(submission.subject, 150)}`,
		text: [
			`Name: ${name}`,
			`Email: ${sanitizeHeaderText(submission.email, 254)}`,
			`Subject: ${sanitizeHeaderText(submission.subject, 150)}`,
			`Page language: ${sanitizeHeaderText(locale, 10)}`,
			`Received: ${receivedAt.toISOString()}`,
			'',
			submission.message,
		].join('\n'),
	}
}
