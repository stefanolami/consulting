import { createClient } from '@supabase/supabase-js'

const [rawEmail, rawOrigin = 'http://localhost:3000'] = process.argv.slice(2)

if (!rawEmail) {
	console.error(
		'Usage: npm run auth:bootstrap-admin -- <email> [application-origin]',
	)
	process.exit(1)
}

const email = rawEmail.trim().toLowerCase()

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
	console.error('Enter a valid administrator email address.')
	process.exit(1)
}

let applicationOrigin

try {
	const parsedOrigin = new URL(rawOrigin)

	if (
		!['http:', 'https:'].includes(parsedOrigin.protocol) ||
		parsedOrigin.pathname !== '/' ||
		parsedOrigin.search ||
		parsedOrigin.hash
	) {
		throw new Error('invalid origin')
	}

	applicationOrigin = parsedOrigin.origin
} catch {
	console.error(
		'The application origin must be an http(s) origin without a path, query, or hash.',
	)
	process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey =
	process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !secretKey) {
	console.error(
		'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required in .env.local.',
	)
	process.exit(1)
}

if (!process.env.SUPABASE_SECRET_KEY && process.env.SUPABASE_SERVICE_KEY) {
	console.warn(
		'SUPABASE_SERVICE_KEY is deprecated in this project. Rename it to SUPABASE_SECRET_KEY before implementing staff management.',
	)
}

const supabase = createClient(supabaseUrl, secretKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
})

const { count: activeAdminCount, error: countError } = await supabase
	.from('profiles')
	.select('id', { count: 'exact', head: true })
	.eq('role', 'admin')
	.eq('is_active', true)

if (countError) {
	console.error(`Unable to inspect staff profiles: ${countError.message}`)
	process.exit(1)
}

if ((activeAdminCount ?? 0) > 0) {
	console.error(
		'Bootstrap refused: an active administrator already exists. Use the protected staff-management workflow for additional invitations.',
	)
	process.exit(1)
}

const callbackUrl = new URL('/auth/callback', applicationOrigin)
callbackUrl.searchParams.set('next', '/auth/update-password')

const { data, error: inviteError } =
	await supabase.auth.admin.inviteUserByEmail(email, {
		redirectTo: callbackUrl.toString(),
	})

if (inviteError) {
	console.error(`Invitation failed: ${inviteError.message}`)
	process.exit(1)
}

const { error: profileError } = await supabase
	.from('profiles')
	.update({
		is_active: true,
		role: 'admin',
	})
	.eq('id', data.user.id)

if (profileError) {
	console.error(
		`The invitation was created, but profile activation failed: ${profileError.message}`,
	)
	console.error(
		'Activate this user manually with the bootstrap SQL in docs/supabase-content-platform.md.',
	)
	process.exit(1)
}

console.log(
	`Invitation sent and the first administrator profile activated for ${email}.`,
)
