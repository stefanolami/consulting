// Restores published_at for the translations listed in
// scripts/lib/published-at-repair.mjs (audit X-05, slice 3).
//
//   npm run publication:repair              # dry run: reads only
//   npm run publication:repair -- --apply   # writes the restorations
//
// Idempotent: a row that already holds its original time is left alone. Only
// published_at is written (updated_at changes through the table trigger);
// status and content are not touched.
import { createClient } from '@supabase/supabase-js'

import { formatRepairReport, planRepairs, PUBLISHED_AT_REPAIRS } from './lib/published-at-repair.mjs'

const allowedArguments = new Set(['--apply', '--dry-run', '--help'])
const unknownArguments = process.argv.slice(2).filter((argument) => !allowedArguments.has(argument))

if (process.argv.includes('--help')) {
	console.log(`Usage: npm run publication:repair -- [--dry-run | --apply]

Dry-run is the default: it reads the listed translations and prints what it
would restore. --apply writes published_at for the rows that differ from
their recorded original.`)
	process.exit(0)
}

if (unknownArguments.length || (process.argv.includes('--apply') && process.argv.includes('--dry-run'))) {
	console.error(unknownArguments.length ? `Unknown argument(s): ${unknownArguments.join(', ')}` : 'Choose either --dry-run or --apply, not both.')
	process.exit(1)
}

const applyMode = process.argv.includes('--apply')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !secretKey) {
	console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required in .env.local. No credentials were printed.')
	process.exit(1)
}

const supabase = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } })

function matching(query, key) {
	return Object.entries(key).reduce((current, [column, value]) => current.eq(column, value), query)
}

const stored = new Map()
for (const repair of PUBLISHED_AT_REPAIRS) {
	const { data, error } = await matching(supabase.from(repair.table).select('status, published_at'), repair.key).maybeSingle()
	if (error) throw new Error(`Could not read ${repair.label}: ${error.message}`)
	if (data) stored.set(repair.label, data)
}

const plan = planRepairs(PUBLISHED_AT_REPAIRS, stored)

if (applyMode) {
	for (const item of plan.filter((entry) => entry.action === 'restore')) {
		const { error } = await matching(supabase.from(item.table).update({ published_at: item.original }), item.key)
		if (error) throw new Error(`Could not restore ${item.label}: ${error.message}`)
	}
}

console.log(formatRepairReport(plan, { applyMode }))
