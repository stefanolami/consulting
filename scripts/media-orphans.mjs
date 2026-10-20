// Lists Storage files that no media_assets row points to (orphans) and rows
// whose file is missing, in the public media bucket (admin audit slice 4).
//
//   npm run media:orphans               # report only: reads, changes nothing
//   npm run media:orphans -- --remove   # also removes orphans older than a day
//
// Orphans are what an interrupted replace or delete leaves behind: the
// library changes first and the old file is removed afterwards through the
// Storage API (src/lib/media-operations.mjs), so an interruption leaves a
// file without a row, never a row without its file. Files younger than a day
// are never removed: an upload in progress has its file before its row.
// Uses the server-only secret key from .env.local (it bypasses RLS; nothing
// is printed from it).
import { createClient } from '@supabase/supabase-js'

import { findMediaStorageDrift } from '../src/lib/media-operations.mjs'
import { MEDIA_BUCKET } from '../src/lib/media-rules.mjs'

const allowedArguments = new Set(['--remove', '--help'])
const unknownArguments = process.argv.slice(2).filter((argument) => !allowedArguments.has(argument))

if (process.argv.includes('--help')) {
	console.log(`Usage: npm run media:orphans -- [--remove]

Without arguments: prints the orphaned files and the assets whose file is
missing. --remove also removes the orphaned files older than one day.`)
	process.exit(0)
}
if (unknownArguments.length) {
	console.error(`Unknown argument(s): ${unknownArguments.join(', ')}`)
	process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
if (!url || !secret) {
	console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (npm run passes .env.local).')
	process.exit(1)
}

const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } })
const drift = await findMediaStorageDrift(supabase, { bucket: MEDIA_BUCKET })

console.log(`Bucket ${MEDIA_BUCKET}: ${drift.files} file(s) in Storage, ${drift.records} media asset(s).`)
console.log(`\nOrphaned files (${drift.orphans.length}):`)
for (const orphan of drift.orphans) console.log(`  ${orphan.path}  ${orphan.size ?? '?'} B  ${orphan.createdAt ?? 'unknown date'}${orphan.recent ? '  (less than a day old: kept)' : ''}`)
console.log(`\nAssets whose file is missing (${drift.missing.length}):`)
for (const item of drift.missing) console.log(`  ${item.id}  ${item.originalFilename ?? ''}  ${item.path}`)

if (process.argv.includes('--remove')) {
	const removable = drift.orphans.filter((orphan) => !orphan.recent).map((orphan) => orphan.path)
	if (!removable.length) {
		console.log('\nNothing to remove.')
	} else {
		const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(removable)
		if (error) {
			console.error(`\nCould not remove the orphaned files: ${error.message}`)
			process.exit(1)
		}
		console.log(`\nRemoved ${removable.length} orphaned file(s).`)
	}
} else if (drift.orphans.length) {
	console.log('\nReport only. Run with --remove to remove orphans older than a day.')
}
