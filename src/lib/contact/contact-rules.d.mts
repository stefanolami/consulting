export type ContactField = 'name' | 'email' | 'subject' | 'message'
export type ContactErrorCode = 'required' | 'tooShort' | 'tooLong' | 'invalidEmail' | 'invalidCharacters'
export type ContactSubmission = Record<ContactField, string>
export type ContactFieldErrors = Partial<Record<ContactField, ContactErrorCode>>

export declare const HONEYPOT_FIELD: 'website'
export declare const CONTACT_FIELDS: readonly ContactField[]
export declare const CONTACT_LIMITS: Readonly<Record<ContactField, Readonly<{ min: number; max: number }>>>

export declare function parseContactSubmission(
	input: Partial<Record<string, unknown>> | null | undefined,
): { success: true; data: ContactSubmission } | { success: false; errors: ContactFieldErrors }

export declare function telHref(phone: string | null | undefined): string | null
