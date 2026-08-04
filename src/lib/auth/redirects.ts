const DEFAULT_AUTH_REDIRECT = '/admin'

export function getSafeRedirectPath(
	value: string | null | undefined,
	fallback = DEFAULT_AUTH_REDIRECT,
) {
	if (
		!value ||
		!value.startsWith('/') ||
		value.startsWith('//') ||
		value.includes('\\')
	) {
		return fallback
	}

	try {
		const url = new URL(value, 'https://local.invalid')

		if (url.origin !== 'https://local.invalid') {
			return fallback
		}

		return `${url.pathname}${url.search}${url.hash}`
	} catch {
		return fallback
	}
}
