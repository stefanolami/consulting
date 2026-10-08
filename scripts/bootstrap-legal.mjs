import { createClient } from '@supabase/supabase-js'

import { createLegalPlan, formatLegalReport, loadLegalSeed, validateLegalSeed } from './lib/legal-bootstrap.mjs'

const allowedArguments = new Set(['--apply', '--dry-run', '--help'])
const unknownArguments = process.argv.slice(2).filter((argument) => !allowedArguments.has(argument))

if (process.argv.includes('--help')) {
	console.log(`Usage: npm run legal:bootstrap -- [--dry-run | --apply]

Dry-run is the default. It validates scripts/data/legal-pages.json with the
shared legal document validator and reads the hosted legal pages without
changing Supabase. --apply inserts only the missing English translations as
drafts; it never updates, overwrites or publishes anything.`)
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

const seed = await loadLegalSeed(new URL('./data/legal-pages.json', import.meta.url))
const { issues, pages } = validateLegalSeed(seed)
const supabase = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false } })
const hosted = await fetchHostedState(supabase)
const plan = createLegalPlan(pages, hosted)

console.log(formatLegalReport({ applyMode, issues, plan, hosted }))

// exitCode rather than process.exit(), so open network handles close first.
if (!applyMode) {
	console.log('\nDRY RUN ONLY: no hosted records were changed.')
	process.exitCode = issues.length || plan.refused ? 2 : 0
} else if (issues.length || plan.refused) {
	console.error('\nApply refused because the dry run contains validation failures or the legal pages are missing.')
	process.exitCode = 2
} else {
	let created = 0
	for (const row of plan.creates) {
		// A plain insert, never an upsert: if a translation appeared since the
		// dry run, the primary key rejects this row and the existing one is kept.
		const { error } = await supabase.from('legal_page_translations').insert(row)
		if (error?.code === '23505') {
			console.log(`- skipped ${row.legal_page_id}: an English translation was created after the dry run.`)
			continue
		}
		if (error) throw new Error(`Unable to create an English legal draft: ${error.message}`)
		created += 1
	}
	console.log(`\nAPPLY COMPLETE: created ${created} English draft(s); nothing was updated or published.`)
}

async function fetchHostedState(client) {
	const [legalPages, translations] = await Promise.all([
		client.from('legal_pages').select('id, stable_key, is_active'),
		client.from('legal_page_translations').select('legal_page_id, locale, title, content, status').eq('locale', 'en'),
	])
	const failure = legalPages.error ?? translations.error
	if (failure) throw new Error(`Unable to read the hosted legal pages for the dry run: ${failure.message}`)
	return { legalPages: legalPages.data ?? [], translations: translations.data ?? [] }
}
