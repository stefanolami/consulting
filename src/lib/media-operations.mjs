// Media replace and delete (admin audit MED-01, MED-02, slice 4).
//
// Supabase refuses SQL that deletes from storage.objects; files must be
// removed through the Storage API. The database functions therefore change
// only the media_assets row (after their reference checks) and return where
// the file is; these helpers then remove the file through the Storage API.
//
// The order guarantees that a media_assets row never points to a missing
// file. A failure or crash between the two steps leaves an orphaned file (a
// Storage object no row points to), which findMediaStorageDrift lists:
// - replace: upload the new file → switch the row to it (SQL) → remove the
//   old file. Before the switch the new file is the orphan (it is removed
//   when the switch fails); after it, the old one.
// - delete: delete the row (SQL, refused while the asset is in use) → remove
//   the file.
//
// `supabase` is a Supabase client (the staff session's, so RLS and the
// Storage policies apply). Plain JavaScript so node:test can run it with a
// mock client.

// The functions return jsonb, which the generated types leave untyped
// (Json): the file location is read from it here and checked to be a path.
function text(value) {
	return typeof value === 'string' && value ? value : null
}

async function removeFile(supabase, bucket, path) {
	try {
		const { error } = await supabase.storage.from(bucket).remove([path])
		return error ? error.message ?? 'Unknown Storage error.' : null
	} catch (error) {
		return error instanceof Error ? error.message : 'Unknown Storage error.'
	}
}

/**
 * Deletes an unreferenced asset: the row first (delete_media_asset refuses
 * an asset in use), then its file.
 * Returns { ok: false, message } when nothing was deleted, or
 * { ok: true, orphan } where orphan is { bucket, path, reason } when the row
 * is gone but the file could not be removed.
 */
export async function deleteMediaAsset(supabase, assetId) {
	const { data, error } = await supabase.rpc('delete_media_asset', { p_media_asset_id: assetId })
	if (error) return { ok: false, message: error.message }
	const bucket = text(data?.bucket_id)
	const path = text(data?.object_path)
	if (!bucket || !path) return { ok: true, orphan: { bucket: bucket ?? null, path: path ?? null, reason: 'The database did not return the file location.' } }
	const removeError = await removeFile(supabase, bucket, path)
	return { ok: true, orphan: removeError ? { bucket, path, reason: removeError } : null }
}

/**
 * Replaces an asset's file, keeping its id, its translations and every
 * reference. `file` is { bytes, mimeType, originalFilename, fileSizeBytes,
 * width, height }; `path` is the new Storage path (never the current one).
 * Returns { ok: false, message, orphan } when the asset still uses its old
 * file (orphan: the uploaded replacement, if it could not be removed again),
 * or { ok: true, orphan } (orphan: the old file, if it could not be removed).
 */
export async function replaceMediaAsset(supabase, { assetId, bucket, path, file, cacheControl = '31536000' }) {
	const storage = supabase.storage.from(bucket)
	const { error: uploadError } = await storage.upload(path, file.bytes, { cacheControl, contentType: file.mimeType, upsert: false })
	if (uploadError) return { ok: false, message: `The replacement file could not be uploaded: ${uploadError.message}`, orphan: null }
	const { data, error } = await supabase.rpc('replace_media_asset', {
		p_media_asset_id: assetId, p_object_path: path, p_original_filename: file.originalFilename,
		p_mime_type: file.mimeType, p_file_size_bytes: file.fileSizeBytes, p_width: file.width, p_height: file.height,
	})
	if (error) {
		const cleanupError = await removeFile(supabase, bucket, path)
		return { ok: false, message: error.message, orphan: cleanupError ? { bucket, path, reason: cleanupError } : null }
	}
	const previousPath = text(data?.previous_object_path)
	const previousBucket = text(data?.bucket_id) ?? bucket
	if (!previousPath) return { ok: true, orphan: { bucket: previousBucket, path: null, reason: 'The database did not return the previous file location.' } }
	if (previousPath === path) return { ok: true, orphan: null }
	const removeError = await removeFile(supabase, previousBucket, previousPath)
	return { ok: true, orphan: removeError ? { bucket: previousBucket, path: previousPath, reason: removeError } : null }
}

/** Every file in `bucket`, walking folders through the Storage API. */
export async function listStorageFiles(supabase, bucket, { pageSize = 1000 } = {}) {
	const files = []
	const folders = ['']
	while (folders.length) {
		const prefix = folders.shift()
		for (let offset = 0; ; offset += pageSize) {
			const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } })
			if (error) throw new Error(`Could not list Storage folder “${prefix || '/'}”: ${error.message}`)
			for (const entry of data ?? []) {
				const path = prefix ? `${prefix}/${entry.name}` : entry.name
				// Folders have no id; the placeholder Supabase writes into empty folders is not a file.
				if (entry.id === null || entry.id === undefined) folders.push(path)
				else if (entry.name !== '.emptyFolderPlaceholder') files.push({ path, size: entry.metadata?.size ?? null, createdAt: entry.created_at ?? null })
			}
			if ((data ?? []).length < pageSize) break
		}
	}
	return files
}

/**
 * Compares the bucket with media_assets:
 * - orphans: files no row points to (safe to remove once they are older
 *   than an upload in progress could be: `recent` marks those younger than
 *   minAgeMs);
 * - missing: rows whose file does not exist (what the order above prevents).
 */
export async function findMediaStorageDrift(supabase, { bucket, minAgeMs = 24 * 60 * 60 * 1000, now = new Date(), pageSize = 1000 } = {}) {
	const files = await listStorageFiles(supabase, bucket, { pageSize })
	const rows = []
	for (let offset = 0; ; offset += pageSize) {
		const { data, error } = await supabase.from('media_assets').select('id, object_path, original_filename').eq('bucket_id', bucket).order('id').range(offset, offset + pageSize - 1)
		if (error) throw new Error(`Could not load media records: ${error.message}`)
		rows.push(...(data ?? []))
		if ((data ?? []).length < pageSize) break
	}
	const recorded = new Set(rows.map((row) => row.object_path))
	const present = new Set(files.map((file) => file.path))
	const orphans = files.filter((file) => !recorded.has(file.path)).map((file) => ({ ...file, recent: file.createdAt ? now.getTime() - new Date(file.createdAt).getTime() < minAgeMs : true }))
	const missing = rows.filter((row) => !present.has(row.object_path)).map((row) => ({ id: row.id, path: row.object_path, originalFilename: row.original_filename }))
	return { files: files.length, records: rows.length, orphans, missing }
}
