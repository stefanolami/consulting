import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { publicEnv } from '@/lib/env'

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
	const cookieStore = await cookies()

	return createServerClient(
		publicEnv.NEXT_PUBLIC_SUPABASE_URL,
		publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options),
						)
					} catch {
						// Server Components cannot write cookies. The proxy refreshes
						// sessions for incoming requests.
					}
				},
			},
		},
	)
}
