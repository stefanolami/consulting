import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'
import { updateSession } from '@/lib/supabase/proxy'

const intlMiddleware = createMiddleware(routing)

export default async function proxy(request: NextRequest) {
	const isNonLocalizedRoute =
		request.nextUrl.pathname.startsWith('/admin') ||
		request.nextUrl.pathname.startsWith('/auth')

	if (isNonLocalizedRoute) {
		const { response } = await updateSession(
			request,
			NextResponse.next({ request }),
		)
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
