// Read-only check that every stored rich-text document still satisfies its
// contract (audit slice 2). Loads every rich-text column with the service role
// (select only, nothing is written) and runs each value through the validator
// the admin and the public pages use. It also checks that a document survives
// the editor unchanged: loading it into the editor (toEditorDocument) and
// saving it again (fromEditorDocument) must validate to the same document.
//
//   npm run rich-text:validate
//
// Exits with status 1 when any document fails.
import { createClient } from '@supabase/supabase-js'

import { fromEditorDocument, toEditorDocument } from '../src/lib/editor-document.mjs'
import { parseLegalDocument } from '../src/lib/legal-document.mjs'
import { parseArticleRichText, parseCatalogueRichText, parseTeamProfileDocument } from '../src/lib/rich-text-contracts.mjs'
import { validationMessage } from '../src/lib/rich-text-rules.mjs'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_KEY
if (!url || !secretKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_KEY) are required.')
const supabase = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } })

// Each profile text goes through the editor on its own.
function profileThroughEditor(document) {
	if (!document || typeof document !== 'object') return document
	const text = (content) => fromEditorDocument(toEditorDocument(content))
	return {
		...document,
		intro: document.intro && typeof document.intro === 'object' ? { ...document.intro, content: text(document.intro.content) } : document.intro,
		sections: Array.isArray(document.sections) ? document.sections.map((section) => (section && typeof section === 'object' ? { ...section, content: text(section.content) } : section)) : document.sections,
	}
}

const COLUMNS = [
	{ table: 'service_translations', column: 'content', key: ['service_id', 'locale'], contract: 'catalogue', parse: parseCatalogueRichText },
	{ table: 'sector_translations', column: 'content', key: ['sector_id', 'locale'], contract: 'catalogue', parse: parseCatalogueRichText },
	{ table: 'country_translations', column: 'content', key: ['country_code', 'locale'], contract: 'catalogue (country)', parse: parseCatalogueRichText },
	{ table: 'country_service_translations', column: 'content', key: ['country_code', 'service_id', 'locale'], contract: 'catalogue (country service copy)', parse: parseCatalogueRichText, hasStatus: false },
	{ table: 'article_translations', column: 'content', key: ['article_id', 'locale'], contract: 'article', parse: parseArticleRichText },
	{ table: 'people_translations', column: 'profile_document', key: ['person_id', 'locale'], contract: 'team profile', parse: parseTeamProfileDocument, throughEditor: profileThroughEditor },
	{ table: 'legal_page_translations', column: 'content', key: ['legal_page_id', 'locale'], contract: 'legal', parse: parseLegalDocument },
]

// A comparison that ignores key order.
function canonical(value) {
	return JSON.stringify(value, (_key, item) => (item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item))
}

async function loadAll(table, columns) {
	const rows = []
	for (let from = 0; ; from += 1000) {
		const { data, error } = await supabase.from(table).select(columns).order(columns.split(',')[0].trim()).range(from, from + 999)
		if (error) throw new Error(`Could not read ${table}: ${error.message}`)
		rows.push(...data)
		if (data.length < 1000) return rows
	}
}

let failures = 0
const summary = []
for (const { table, column, key, contract, parse, hasStatus = true, throughEditor = (value) => fromEditorDocument(toEditorDocument(value)) } of COLUMNS) {
	const rows = await loadAll(table, [...key, column, ...(hasStatus ? ['status'] : [])].join(', '))
	const invalid = []
	const editorChanges = []
	let normalized = 0
	for (const row of rows) {
		const id = key.map((name) => `${name}=${row[name]}`).join(' ')
		let stored
		try {
			stored = parse(row[column])
		} catch (error) {
			invalid.push(`${id}${row.status ? ` (${row.status})` : ''}: ${validationMessage(error)}`)
			continue
		}
		if (canonical(stored) !== canonical(row[column])) normalized += 1
		try {
			if (canonical(parse(throughEditor(row[column]))) !== canonical(stored)) editorChanges.push(`${id}: the editor would change this document`)
		} catch (error) {
			editorChanges.push(`${id}: after the editor, ${validationMessage(error)}`)
		}
	}
	failures += invalid.length + editorChanges.length
	summary.push({ column: `${table}.${column}`, contract, rows: rows.length, valid: rows.length - invalid.length, invalid: invalid.length, 'stored ≠ normalized': normalized, 'editor round trip fails': editorChanges.length })
	for (const line of [...invalid, ...editorChanges]) console.log(`  ✗ ${table}: ${line}`)
}

console.table(summary)
const total = summary.reduce((sum, item) => sum + item.rows, 0)
console.log(failures ? `${failures} problem(s) in ${total} documents.` : `All ${total} stored documents validate and survive the editor unchanged.`)
process.exitCode = failures ? 1 : 0
