// The Supabase client is typed loosely here: the helpers use only rpc,
// storage and one media_assets select, and the tests pass a mock.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any

export type MediaOrphan = { bucket: string | null; path: string | null; reason: string }
export type ReplacementFile = { bytes: Uint8Array | ArrayBuffer | Blob; mimeType: string; originalFilename: string; fileSizeBytes: number; width: number | null; height: number | null }

export declare function deleteMediaAsset(supabase: SupabaseLike, assetId: string): Promise<{ ok: false; message: string } | { ok: true; orphan: MediaOrphan | null }>

export declare function replaceMediaAsset(supabase: SupabaseLike, input: { assetId: string; bucket: string; path: string; file: ReplacementFile; cacheControl?: string }): Promise<{ ok: false; message: string; orphan: MediaOrphan | null } | { ok: true; orphan: MediaOrphan | null }>

export type StorageFile = { path: string; size: number | null; createdAt: string | null }
export declare function listStorageFiles(supabase: SupabaseLike, bucket: string, options?: { pageSize?: number }): Promise<StorageFile[]>

export type MediaStorageDrift = {
	files: number
	records: number
	orphans: (StorageFile & { recent: boolean })[]
	missing: { id: string; path: string; originalFilename: string | null }[]
}
export declare function findMediaStorageDrift(supabase: SupabaseLike, options: { bucket: string; minAgeMs?: number; now?: Date; pageSize?: number }): Promise<MediaStorageDrift>
