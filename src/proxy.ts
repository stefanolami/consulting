import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'
import { isAdminDemoMode } from '@/lib/admin-demo'
import { updateSession } from '@/lib/supabase/proxy'

const intlMiddleware = createMiddleware(routing)

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
	return response
}

export const config = {
	// Match all pathnames except for:
	// - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
	// - … the ones containing a dot (e.g. `favicon.ico`)
	matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
}
