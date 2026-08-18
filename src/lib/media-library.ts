import 'server-only'

export const MEDIA_BUCKET = 'public-media'
export const MAX_MEDIA_FILE_SIZE = 15 * 1024 * 1024

export const allowedMediaTypes = [
	'image/gif',
	'image/jpeg',
	'image/png',
	'image/svg+xml',
	'image/webp',
	'application/pdf',
] as const

export type AllowedMediaType = (typeof allowedMediaTypes)[number]

const extensionByMimeType: Record<AllowedMediaType, string> = {
	'image/gif': 'gif',
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/svg+xml': 'svg',
	'image/webp': 'webp',
	'application/pdf': 'pdf',
}

export type ValidatedMediaFile = {
	bytes: Uint8Array
	mimeType: AllowedMediaType
	originalFilename: string
	fileSizeBytes: number
	width: number | null
	height: number | null
	extension: string
}

function startsWith(bytes: Uint8Array, values: number[]) {
	return values.every((value, index) => bytes[index] === value)
}

function readUint32BigEndian(bytes: Uint8Array, offset: number) {
	return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset)
}

function readUint16LittleEndian(bytes: Uint8Array, offset: number) {
	return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true)
}

function readUint16BigEndian(bytes: Uint8Array, offset: number) {
	return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset)
}

function parseJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
	let offset = 2
	while (offset + 9 < bytes.length) {
		if (bytes[offset] !== 0xff) { offset += 1; continue }
		const marker = bytes[offset + 1]
		offset += 2
		if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue
		if (offset + 2 > bytes.length) return null
		const length = readUint16BigEndian(bytes, offset)
		if (length < 2 || offset + length > bytes.length) return null
		if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
			return { height: readUint16BigEndian(bytes, offset + 3), width: readUint16BigEndian(bytes, offset + 5) }
		}
		offset += length
	}
	return null
}

function parseWebpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
	if (bytes.length < 30 || !startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) || !startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])) return null
	const chunk = new TextDecoder().decode(bytes.slice(12, 16))
	if (chunk === 'VP8X' && bytes.length >= 30) return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) }
	if (chunk === 'VP8 ' && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return { width: readUint16LittleEndian(bytes, 26) & 0x3fff, height: readUint16LittleEndian(bytes, 28) & 0x3fff }
	if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
		const packed = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)
		return { width: (packed & 0x3fff) + 1, height: ((packed >> 14) & 0x3fff) + 1 }
	}
	return null
}

function dimensionsFor(mimeType: AllowedMediaType, bytes: Uint8Array) {
	if (mimeType === 'image/png') return bytes.length >= 24 ? { width: readUint32BigEndian(bytes, 16), height: readUint32BigEndian(bytes, 20) } : { width: null, height: null }
	if (mimeType === 'image/gif') return bytes.length >= 10 ? { width: readUint16LittleEndian(bytes, 6), height: readUint16LittleEndian(bytes, 8) } : { width: null, height: null }
	if (mimeType === 'image/jpeg') return parseJpegDimensions(bytes) ?? { width: null, height: null }
	if (mimeType === 'image/webp') return parseWebpDimensions(bytes) ?? { width: null, height: null }
	return { width: null, height: null }
}

function validateContent(mimeType: AllowedMediaType, bytes: Uint8Array) {
	if (mimeType === 'image/gif' && startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) return
	if (mimeType === 'image/jpeg' && startsWith(bytes, [0xff, 0xd8, 0xff])) return
	if (mimeType === 'image/png' && startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return
	if (mimeType === 'image/webp' && startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])) return
	if (mimeType === 'application/pdf' && startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return
	if (mimeType === 'image/svg+xml') {
		const document = new TextDecoder().decode(bytes.slice(0, 100_000)).replace(/^\uFEFF/, '').trimStart()
		if (/^<svg(?:\s|>)/i.test(document) && !/<(?:script|foreignObject)\b/i.test(document)) return
	}
	throw new Error('The file contents do not match the selected file type.')
}

export async function validateMediaFile(file: File): Promise<ValidatedMediaFile> {
	if (!allowedMediaTypes.includes(file.type as AllowedMediaType)) throw new Error('Choose a GIF, JPEG, PNG, SVG, WebP, or PDF file.')
	if (file.size <= 0) throw new Error('Choose a non-empty file.')
	if (file.size > MAX_MEDIA_FILE_SIZE) throw new Error('Files must be 15 MiB or smaller.')
	const originalFilename = file.name.replace(/[\\/\u0000-\u001f]/g, '_').trim().slice(0, 512)
	if (!originalFilename) throw new Error('The file needs a valid filename.')
	const bytes = new Uint8Array(await file.arrayBuffer())
	const mimeType = file.type as AllowedMediaType
	validateContent(mimeType, bytes)
	const dimensions = dimensionsFor(mimeType, bytes)
	if ((dimensions.width !== null && dimensions.width <= 0) || (dimensions.height !== null && dimensions.height <= 0)) throw new Error('The image dimensions are invalid.')
	return { bytes, mimeType, originalFilename, fileSizeBytes: file.size, ...dimensions, extension: extensionByMimeType[mimeType] }
}

export function mediaObjectPath(extension: string) {
	const date = new Date()
	return `library/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${extension}`
}
