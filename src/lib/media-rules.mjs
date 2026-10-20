// Shared media rules (admin audit slice 4): the accepted file types and size,
// the messages for a file that cannot be uploaded, the Storage path of a new
// upload, and the kinds the image picker filters by. Used by the browser
// (checked before a file is sent) and by the server (checked again, with the
// file contents). Plain JavaScript so node:test can run it.

export const MEDIA_BUCKET = 'public-media'

/** The bucket's own limit (core migration): 15 MiB. */
export const MAX_MEDIA_FILE_BYTES = 15 * 1024 * 1024

export const IMAGE_MEDIA_TYPES = Object.freeze(['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'])
export const MEDIA_TYPES = Object.freeze([...IMAGE_MEDIA_TYPES, 'application/pdf'])

const TYPE_NAMES = { 'image/gif': 'GIF', 'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/svg+xml': 'SVG', 'image/webp': 'WebP', 'application/pdf': 'PDF' }
const EXTENSIONS = { 'image/gif': 'gif', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/svg+xml': 'svg', 'image/webp': 'webp', 'application/pdf': 'pdf' }

/**
 * What an image is used for. There is no kind column: an asset's kinds are
 * the uses it has now (mediaKinds) plus the kind chosen when it was
 * uploaded, which is kept in its Storage path (library/<kind>/…).
 */
export const MEDIA_KINDS = Object.freeze(['portrait', 'icon', 'cover', 'logo', 'flag'])
export const MEDIA_KIND_LABELS = Object.freeze({ portrait: 'Portraits', icon: 'Icons', cover: 'Covers and article images', logo: 'Logos', flag: 'Flags and outlines' })

// Paths written before slice 4 by the per-editor upload buttons.
const LEGACY_PATH_KINDS = [['people/', 'portrait'], ['catalogue/', 'icon'], ['newsroom/', 'cover']]

// MediaReference.type (src/lib/media-references.ts) → kind.
const REFERENCE_KINDS = {
	Person: 'portrait',
	Endorsement: 'portrait',
	Service: 'icon',
	Sector: 'icon',
	Article: 'cover',
	'Article inline image': 'cover',
	Partner: 'logo',
	'Country flag': 'flag',
	'Country outline': 'flag',
}

export function formatBytes(bytes) {
	if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return 'Unknown size'
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}

export function acceptedTypeNames(imagesOnly = false) {
	const names = (imagesOnly ? IMAGE_MEDIA_TYPES : MEDIA_TYPES).map((type) => TYPE_NAMES[type])
	return `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`
}

/** The `accept` attribute for a file input. */
export function acceptAttribute(imagesOnly = false) {
	return (imagesOnly ? IMAGE_MEDIA_TYPES : MEDIA_TYPES).join(',')
}

function describeType(type, name) {
	if (TYPE_NAMES[type]) return `a ${TYPE_NAMES[type]} file`
	const extension = /\.([a-z0-9]{1,8})$/i.exec(name ?? '')?.[1]
	if (extension) return `a .${extension.toLowerCase()} file`
	return 'a file of an unknown type'
}

/**
 * Why a file cannot be uploaded, as a sentence for the editor, or null when
 * its name, type and size are acceptable. The server also checks the
 * contents (src/lib/media-library.ts).
 */
export function mediaFileProblem(file, { imagesOnly = false } = {}) {
	const name = String(file?.name ?? '').trim() || 'This file'
	const quoted = name === 'This file' ? name : `“${name}”`
	const allowed = imagesOnly ? IMAGE_MEDIA_TYPES : MEDIA_TYPES
	if (!allowed.includes(file?.type)) {
		const what = imagesOnly ? 'an image' : 'an image or a PDF'
		return `${quoted} is ${describeType(file?.type, file?.name)}. Choose ${what}: ${acceptedTypeNames(imagesOnly)}.`
	}
	if (!(file.size > 0)) return `${quoted} is empty. Choose another file.`
	if (file.size > MAX_MEDIA_FILE_BYTES) {
		return `${quoted} is ${formatBytes(file.size)}. Files can be up to ${MAX_MEDIA_FILE_BYTES / (1024 * 1024)} MiB: export a smaller version (for photos, about 2,400 px on the long side is plenty) and upload that.`
	}
	return null
}

export function mediaExtension(type) {
	return EXTENSIONS[type] ?? null
}

/** library/<kind or "other">/YYYY/MM/<uuid>.<extension> */
export function mediaObjectPath(kind, type, { now = new Date(), uuid = globalThis.crypto.randomUUID() } = {}) {
	const extension = mediaExtension(type)
	if (!extension) throw new Error(`Unsupported media type: ${type}`)
	const folder = MEDIA_KINDS.includes(kind) ? kind : 'other'
	return `library/${folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${uuid}.${extension}`
}

export function kindFromPath(objectPath) {
	const path = String(objectPath ?? '')
	const library = /^library\/([a-z]+)\//.exec(path)?.[1]
	if (library && MEDIA_KINDS.includes(library)) return library
	return LEGACY_PATH_KINDS.find(([prefix]) => path.startsWith(prefix))?.[1] ?? null
}

/** The kinds an asset belongs to: its current uses, then its upload path. */
export function mediaKinds({ objectPath, references = [] }) {
	const kinds = new Set(references.map((reference) => REFERENCE_KINDS[reference.type]).filter(Boolean))
	const fromPath = kindFromPath(objectPath)
	if (fromPath) kinds.add(fromPath)
	return MEDIA_KINDS.filter((kind) => kinds.has(kind))
}
