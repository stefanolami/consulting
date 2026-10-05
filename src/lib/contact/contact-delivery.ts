import 'server-only'

import nodemailer from 'nodemailer'

import { createRateLimiter } from '@/lib/contact/contact-guard.mjs'
import { buildContactMail, readContactMailConfig } from '@/lib/contact/contact-mail.mjs'
import type { ContactSubmission } from '@/lib/contact/contact-rules.mjs'

// Server-only delivery for the contact form: the per-process rate limiter and
// the nodemailer transport. Credentials come from
// the CONTACT_* environment variables (README) and never reach the client.

// One limiter per server process (see the serverless caveat in contact-guard.mjs).
export const contactRateLimiter = createRateLimiter()

export type DeliveryResult = { ok: true } | { ok: false; reason: 'notConfigured' | 'failed' }

export async function deliverContactSubmission(submission: ContactSubmission, locale: string): Promise<DeliveryResult> {
	const configuration = readContactMailConfig(process.env)
	if (!configuration.ok) {
		console.error(`[contact] Contact form mail is not configured: ${configuration.problems.join('; ')}. See README "Contact form".`)
		return { ok: false, reason: 'notConfigured' }
	}
	const { config } = configuration
	const message = buildContactMail({ submission, from: config.from, to: config.to, locale, receivedAt: new Date() })

	if (config.kind === 'json') {
		// Development only (readContactMailConfig ignores it in production):
		// nothing is sent; the generated message is printed for inspection.
		const info = await nodemailer.createTransport({ jsonTransport: true }).sendMail(message)
		console.info('[contact] jsonTransport message (not sent):', info.message)
		return { ok: true }
	}

	// TLS certificates are verified (nodemailer's default); port 465 uses
	// implicit TLS and any other port must upgrade with STARTTLS.
	const transport = nodemailer.createTransport({
		host: config.host,
		port: config.port,
		secure: config.port === 465,
		requireTLS: config.port !== 465,
		auth: { user: config.user, pass: config.password },
		connectionTimeout: 10_000,
		greetingTimeout: 10_000,
		socketTimeout: 20_000,
	})
	try {
		await transport.sendMail(message)
		return { ok: true }
	} catch (error) {
		const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown'
		console.error(`[contact] Sending the contact form mail failed (${code}).`)
		return { ok: false, reason: 'failed' }
	}
}
