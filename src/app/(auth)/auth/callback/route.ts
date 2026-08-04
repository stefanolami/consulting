import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

import { getSafeRedirectPath } from '@/lib/auth/redirects'
import { createClient } from '@/lib/supabase/server'

const otpTypes = new Set<EmailOtpType>([
	'signup',
	'invite',
	'magiclink',
	'recovery',
	'email_change',
	'email',
])

function errorRedirect(request: NextRequest) {
	return NextResponse.redirect(
		new URL('/auth/sign-in?authError=invalid-link', request.url),
	)
}

export async function GET(request: NextRequest) {
	const { searchParams } = request.nextUrl
	const code = searchParams.get('code')
	const tokenHash = searchParams.get('token_hash')
	const rawType = searchParams.get('type')
	const nextPath = getSafeRedirectPath(searchParams.get('next'))
	const supabase = await createClient()

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code)

		if (!error) {
			return NextResponse.redirect(new URL(nextPath, request.url))
		}
	}

	if (tokenHash && rawType && otpTypes.has(rawType as EmailOtpType)) {
		const { error } = await supabase.auth.verifyOtp({
			token_hash: tokenHash,
			type: rawType as EmailOtpType,
		})

		if (!error) {
			return NextResponse.redirect(new URL(nextPath, request.url))
		}
	}

	return errorRedirect(request)
}
