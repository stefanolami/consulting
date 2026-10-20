import assert from 'node:assert/strict'
import test from 'node:test'

import { deleteMediaAsset, findMediaStorageDrift, listStorageFiles, replaceMediaAsset } from '../src/lib/media-operations.mjs'

const BUCKET = 'public-media'
const ASSET = '1f04c1aa-48f5-4838-82fd-e3497a464474'

/**
 * A mock Supabase client. `rpc` answers from `rpcResults` (a function per
 * name), Storage keeps a set of files, and `log` records every call in
 * order so the tests can check the sequence.
 */
function mockClient({ rpc = {}, files = [], failRemove = false, failUpload = false, rows = [] } = {}) {
	const log = []
	const stored = new Map(files.map((file) => [file.path, file]))
	const client = {
		log,
		stored,
		rpc: async (name, args) => {
			log.push(['rpc', name, args])
			return rpc[name] ? rpc[name](args) : { data: null, error: { message: `no mock for ${name}` } }
		},
		storage: {
			from: (bucket) => ({
				upload: async (path, _bytes, options) => {
					log.push(['upload', bucket, path, options.upsert])
					if (failUpload) return { data: null, error: { message: 'The object exceeded the maximum allowed size' } }
					stored.set(path, { path, created_at: new Date().toISOString() })
					return { data: { path }, error: null }
				},
				remove: async (paths) => {
					log.push(['remove', bucket, ...paths])
					if (failRemove) return { data: null, error: { message: 'Storage is unavailable' } }
					for (const path of paths) stored.delete(path)
					return { data: paths.map((name) => ({ name })), error: null }
				},
				list: async (prefix, { limit, offset }) => {
					const depth = prefix ? prefix.split('/').length : 0
					const entries = new Map()
					for (const path of stored.keys()) {
						if (prefix && !path.startsWith(`${prefix}/`)) continue
						const parts = path.split('/')
						const name = parts[depth]
						const isFolder = parts.length > depth + 1
						entries.set(name, isFolder ? { name, id: null, metadata: null } : { name, id: `id-${path}`, created_at: stored.get(path).created_at, metadata: { size: 10 } })
					}
					const page = [...entries.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(offset, offset + limit)
					return { data: page, error: null }
				},
			}),
		},
		from: (table) => {
			assert.equal(table, 'media_assets')
			let range = [0, rows.length]
			const query = {
				select: () => query, eq: () => query, order: () => query,
				range: (from, to) => { range = [from, to + 1]; return query },
				then: (resolve) => resolve({ data: rows.slice(...range), error: null }),
			}
			return query
		},
	}
	return client
}

const OLD_FUNCTION_ERROR = { code: '42501', message: 'Direct deletion from storage tables is not allowed. Use the Storage API instead.' }

test('delete removes the row first, then the file', async () => {
	const client = mockClient({
		files: [{ path: 'library/2026/10/a.png' }],
		rpc: { delete_media_asset: () => ({ data: { deleted_media_asset_id: ASSET, bucket_id: BUCKET, object_path: 'library/2026/10/a.png' }, error: null }) },
	})
	const result = await deleteMediaAsset(client, ASSET)
	assert.deepEqual(result, { ok: true, orphan: null })
	assert.deepEqual(client.log.map((entry) => entry.slice(0, 2)), [['rpc', 'delete_media_asset'], ['remove', BUCKET]])
	assert.equal(client.stored.size, 0)
})

test('a refused delete (asset in use) removes no file', async () => {
	const client = mockClient({
		files: [{ path: 'library/2026/10/a.png' }],
		rpc: { delete_media_asset: () => ({ data: null, error: { code: 'P0001', message: 'Cannot delete media while it is referenced by sectors: energy.' } }) },
	})
	const result = await deleteMediaAsset(client, ASSET)
	assert.deepEqual(result, { ok: false, message: 'Cannot delete media while it is referenced by sectors: energy.' })
	assert.equal(client.log.some(([kind]) => kind === 'remove'), false)
	assert.equal(client.stored.size, 1)
})

test('when the file cannot be removed after the row is gone, it is reported as an orphan', async () => {
	const client = mockClient({
		failRemove: true,
		files: [{ path: 'library/2026/10/a.png' }],
		rpc: { delete_media_asset: () => ({ data: { bucket_id: BUCKET, object_path: 'library/2026/10/a.png' }, error: null }) },
	})
	const result = await deleteMediaAsset(client, ASSET)
	assert.deepEqual(result, { ok: true, orphan: { bucket: BUCKET, path: 'library/2026/10/a.png', reason: 'Storage is unavailable' } })
})

test('the old database functions are explained, not shown as a raw Postgres error', async () => {
	const client = mockClient({ rpc: { delete_media_asset: () => ({ data: null, error: OLD_FUNCTION_ERROR }) } })
	const result = await deleteMediaAsset(client, ASSET)
	assert.equal(result.ok, false)
	assert.match(result.message, /old media functions/)
	assert.match(result.message, /20261020180000_media_storage_api_operations\.sql/)
})

test('replace uploads the new file, switches the row, then removes the old file', async () => {
	const client = mockClient({
		files: [{ path: 'library/2026/10/old.png' }],
		rpc: { replace_media_asset: () => ({ data: { media_asset_id: ASSET, bucket_id: BUCKET, previous_object_path: 'library/2026/10/old.png' }, error: null }) },
	})
	const file = { bytes: new Uint8Array([1]), mimeType: 'image/png', originalFilename: 'new.png', fileSizeBytes: 1, width: 10, height: 10 }
	const result = await replaceMediaAsset(client, { assetId: ASSET, bucket: BUCKET, path: 'library/logo/2026/10/new.png', file })
	assert.deepEqual(result, { ok: true, orphan: null })
	assert.deepEqual(client.log.map(([kind, name]) => `${kind}:${name}`), [`upload:${BUCKET}`, 'rpc:replace_media_asset', `remove:${BUCKET}`])
	assert.equal(client.log[0][3], false, 'never overwrites an existing object')
	assert.deepEqual(client.log[1][2], { p_media_asset_id: ASSET, p_object_path: 'library/logo/2026/10/new.png', p_original_filename: 'new.png', p_mime_type: 'image/png', p_file_size_bytes: 1, p_width: 10, p_height: 10 })
	assert.deepEqual(client.log[2].slice(2), ['library/2026/10/old.png'])
	assert.deepEqual([...client.stored.keys()], ['library/logo/2026/10/new.png'])
})

test('a refused replace removes the uploaded replacement and keeps the old file', async () => {
	const client = mockClient({
		files: [{ path: 'library/2026/10/old.png' }],
		rpc: { replace_media_asset: () => ({ data: null, error: OLD_FUNCTION_ERROR }) },
	})
	const file = { bytes: new Uint8Array([1]), mimeType: 'image/png', originalFilename: 'new.png', fileSizeBytes: 1, width: null, height: null }
	const result = await replaceMediaAsset(client, { assetId: ASSET, bucket: BUCKET, path: 'library/2026/10/new.png', file })
	assert.equal(result.ok, false)
	assert.equal(result.orphan, null)
	assert.deepEqual([...client.stored.keys()], ['library/2026/10/old.png'])
})

test('a failed upload changes nothing', async () => {
	const client = mockClient({ failUpload: true, files: [{ path: 'library/2026/10/old.png' }] })
	const file = { bytes: new Uint8Array([1]), mimeType: 'image/png', originalFilename: 'new.png', fileSizeBytes: 1, width: null, height: null }
	const result = await replaceMediaAsset(client, { assetId: ASSET, bucket: BUCKET, path: 'library/2026/10/new.png', file })
	assert.equal(result.ok, false)
	assert.match(result.message, /could not be uploaded/)
	assert.equal(client.log.some(([kind]) => kind === 'rpc'), false)
})

test('when the old file cannot be removed after the switch, it is the orphan (the row points to the new file)', async () => {
	const client = mockClient({
		failRemove: true,
		files: [{ path: 'library/2026/10/old.png' }],
		rpc: { replace_media_asset: () => ({ data: { bucket_id: BUCKET, previous_object_path: 'library/2026/10/old.png' }, error: null }) },
	})
	const file = { bytes: new Uint8Array([1]), mimeType: 'image/png', originalFilename: 'new.png', fileSizeBytes: 1, width: null, height: null }
	const result = await replaceMediaAsset(client, { assetId: ASSET, bucket: BUCKET, path: 'library/2026/10/new.png', file })
	assert.deepEqual(result, { ok: true, orphan: { bucket: BUCKET, path: 'library/2026/10/old.png', reason: 'Storage is unavailable' } })
})

test('listing walks folders and pages', async () => {
	const paths = ['library/2026/10/a.png', 'library/2026/10/b.png', 'library/2026/11/c.png', 'people/p/d.jpg', 'root.svg']
	const client = mockClient({ files: paths.map((path) => ({ path, created_at: '2026-10-01T00:00:00Z' })) })
	const files = await listStorageFiles(client, BUCKET, { pageSize: 1 })
	assert.deepEqual(files.map((file) => file.path).sort(), [...paths].sort())
})

test('drift lists orphaned files (marking recent ones) and rows whose file is missing', async () => {
	const now = new Date('2026-10-20T12:00:00Z')
	const client = mockClient({
		files: [
			{ path: 'library/2026/10/kept.png', created_at: '2026-10-01T00:00:00Z' },
			{ path: 'library/2026/10/orphan.png', created_at: '2026-10-01T00:00:00Z' },
			{ path: 'library/2026/10/uploading.png', created_at: '2026-10-20T11:59:00Z' },
		],
		rows: [
			{ id: 'a', object_path: 'library/2026/10/kept.png', original_filename: 'kept.png' },
			{ id: 'b', object_path: 'library/2026/10/gone.png', original_filename: 'gone.png' },
		],
	})
	const drift = await findMediaStorageDrift(client, { bucket: BUCKET, now })
	assert.equal(drift.files, 3)
	assert.equal(drift.records, 2)
	assert.deepEqual(drift.orphans.map(({ path, recent }) => [path, recent]), [['library/2026/10/orphan.png', false], ['library/2026/10/uploading.png', true]])
	assert.deepEqual(drift.missing, [{ id: 'b', path: 'library/2026/10/gone.png', originalFilename: 'gone.png' }])
})
