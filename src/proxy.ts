import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'
import { isAdminDemoMode } from '@/lib/admin-demo'
import { checkFormToken, FORM_TOKEN_COOKIE, isContactPagePath } from '@/lib/contact/contact-guard.mjs'
import { contactFormSecret, contactFormTokenCookie } from '@/lib/contact/contact-token'
import { updateSession } from '@/lib/supabase/proxy'

const intlMiddleware = createMiddleware(routing)

// The Contact form's anti-spam token (control tower §15.10): a signed
// timestamp cookie, issued on the first request for the page and kept while it
// is valid, so prefetches and reloads do not restart the minimum fill time.
function withContactFormToken(request: NextRequest, response: NextResponse) {
	if (request.method !== 'GET' || !isContactPagePath(request.nextUrl.pathname, routing.locales)) return response
	const secret = contactFormSecret()
	if (!secret) return response
	const current = checkFormToken(request.cookies.get(FORM_TOKEN_COOKIE)?.value, Date.now(), secret, { minFillMs: 0 })
	if (current === 'ok') return response
	const cookie = contactFormTokenCookie(secret)
	response.cookies.set(cookie.name, cookie.value, cookie.options)
	return response
}

export default async function proxy(request: NextRequest) {
	const isNonLocalizedRoute =
		request.nextUrl.pathname.startsWith('/admin') ||
		request.nextUrl.pathname.startsWith('/auth')

	if (isNonLocalizedRoute) {
		if (
			isAdminDemoMode() &&
			request.nextUrl.pathname.startsWith('/admin')
		) {
			return NextResponse.next({ request })
		}

		const { response, user } = await updateSession(
			request,
			NextResponse.next({ request }),
		)

		if (request.nextUrl.pathname.startsWith('/admin') && !user) {
			const signInUrl = request.nextUrl.clone()
			signInUrl.pathname = '/auth/sign-in'
			signInUrl.search = ''
			signInUrl.searchParams.set(
				'next',
				`${request.nextUrl.pathname}${request.nextUrl.search}`,
			)

			const redirectResponse = NextResponse.redirect(signInUrl)

			response.cookies
				.getAll()
				.forEach((cookie) => redirectResponse.cookies.set(cookie))

			return redirectResponse
		}

		return response
	}

	const intlResponse = intlMiddleware(request)
	const { response } = await updateSession(request, intlResponse)
	return withContactFormToken(request, response)
}

export const config = {
	// Match all pathnames except for:
	// - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
	// - … the ones containing a dot (e.g. `favicon.ico`)
	matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
}
