export type MediaKind = 'portrait' | 'icon' | 'cover' | 'logo' | 'flag'
export type MediaType = 'image/gif' | 'image/jpeg' | 'image/png' | 'image/svg+xml' | 'image/webp' | 'application/pdf'

export declare const MEDIA_BUCKET: 'public-media'
export declare const MAX_MEDIA_FILE_BYTES: number
export declare const IMAGE_MEDIA_TYPES: readonly MediaType[]
export declare const MEDIA_TYPES: readonly MediaType[]
export declare const MEDIA_KINDS: readonly MediaKind[]
export declare const MEDIA_KIND_LABELS: Readonly<Record<MediaKind, string>>

export declare function formatBytes(bytes: number | null | undefined): string
export declare function acceptedTypeNames(imagesOnly?: boolean): string
export declare function acceptAttribute(imagesOnly?: boolean): string
export declare function mediaFileProblem(file: { name?: string; type?: string; size?: number } | null | undefined, options?: { imagesOnly?: boolean }): string | null
export declare const RESIZE_LONG_SIDE: number
export declare function needsBrowserResize(file: { type?: string; size: number } | null | undefined): boolean
export declare function resizedDimensions(width: number, height: number, longSide?: number): { width: number; height: number }
export declare function resizedType(type: string): 'image/jpeg' | 'image/webp'
export declare function resizedFileName(name: string | null | undefined, type: string): string
export declare function resizeNotice(name: string, from: { width: number; height: number; size: number }, to: { width: number; height: number; size: number }): string
export declare function mediaExtension(type: string): string | null
export declare function mediaObjectPath(kind: string | null | undefined, type: string, options?: { now?: Date; uuid?: string }): string
export declare function kindFromPath(objectPath: string | null | undefined): MediaKind | null
export declare function mediaKinds(input: { objectPath: string | null | undefined; references?: readonly { type: string }[] }): MediaKind[]
