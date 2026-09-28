import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const LOCALES = ['en', 'de', 'it', 'pt-BR', 'pt-PT']

async function load(locale) {
	return JSON.parse(await readFile(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8'))
}

function keys(value, prefix = '') {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
	return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key))
}

test('every locale defines exactly the English message keys', async () => {
	const english = await load('en')
	const expected = keys(english).sort()
	for (const locale of LOCALES.slice(1)) {
		const { _meta, ...messages } = await load(locale)
		assert.deepEqual(keys(messages).sort(), expected, `${locale} keys differ from en`)
		if (_meta) assert.ok(Array.isArray(_meta.provisionalNamespaces), `${locale} _meta.provisionalNamespaces must be a list`)
	}
})

test('English is the source locale and carries no provisional marker', async () => {
	assert.equal((await load('en'))._meta, undefined)
})
