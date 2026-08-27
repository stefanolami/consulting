import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { publicEnv } from '@/lib/env'
import type { Database } from '@/types/database.generated'

/**
 * Anonymous client for cacheable public content. Keeping staff cookies out of
 * these reads makes the public RLS contract identical for every visitor.
 */
export function createPublicClient() {
	return createSupabaseClient<Database>(
		publicEnv.NEXT_PUBLIC_SUPABASE_URL,
		publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			auth: {
				autoRefreshToken: false,
				detectSessionInUrl: false,
				persistSession: false,
			},
		},
	)
}
