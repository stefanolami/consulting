export type FormTokenCheck = 'ok' | 'invalid' | 'tooFast' | 'expired'
export type RateLimiter = {
	consume(key: string, now: number): { allowed: boolean; retryAfterMs: number }
	readonly size: number
}

export { HONEYPOT_FIELD } from './contact-rules.mjs'
export declare const FORM_TOKEN_COOKIE: 'tp_contact_form'
export declare const MIN_FILL_MS: number
export declare const MAX_FORM_AGE_MS: number
export declare const RATE_LIMIT: Readonly<{ limit: number; windowMs: number }>

export declare function isHoneypotTripped(value: unknown): boolean
export declare function createFormToken(issuedAtMs: number, secret: string): string
export declare function checkFormToken(
	token: unknown,
	nowMs: number,
	secret: string,
	options?: { minFillMs?: number; maxAgeMs?: number },
): FormTokenCheck
export declare function createRateLimiter(options?: { limit?: number; windowMs?: number; maxKeys?: number }): RateLimiter
export declare function clientAddress(getHeader: (name: string) => string | null | undefined): string
export declare function isContactPagePath(pathname: string, locales: readonly string[]): boolean
