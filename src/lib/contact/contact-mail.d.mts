import type { ContactSubmission } from './contact-rules.mjs'

type Env = Record<string, string | undefined>

export type ContactMailConfig =
	| { kind: 'json'; from: string; to: string }
	| { kind: 'smtp'; host: string; port: number; user: string; password: string; from: string; to: string }

export type ContactMail = {
	from: { name: string; address: string }
	to: string
	replyTo: { name: string; address: string }
	subject: string
	text: string
}

export declare function readContactMailConfig(env: Env): { ok: true; config: ContactMailConfig } | { ok: false; problems: string[] }
export declare function readContactFormSecret(env: Env): string | null
export declare function sanitizeHeaderText(text: unknown, maxLength?: number): string
export declare function buildContactMail(input: {
	submission: ContactSubmission
	from: string
	to: string
	locale: string
	receivedAt: Date
}): ContactMail
