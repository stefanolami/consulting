'use client'

import { CheckCircle2, CircleAlert, LoaderCircle, Upload } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { uploadMediaAssetAction, type UploadedMedia } from '@/app/(admin)/admin/media/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { acceptAttribute, acceptedTypeNames, formatBytes, IMAGE_MEDIA_TYPES, MAX_MEDIA_FILE_BYTES, MEDIA_KINDS, mediaFileProblem, needsBrowserResize, resizedDimensions, resizedFileName, resizedType, resizeNotice, type MediaKind } from '@/lib/media-rules.mjs'

type Item = { key: string; file: File; problem: string | null; state: 'preparing' | 'waiting' | 'uploading' | 'done' | 'failed'; message: string | null; note: string | null }

const NETWORK_ERROR = 'The upload did not reach the server. Check the connection and try again.'
/**
 * Reduces an oversize JPEG, PNG or WebP to 2,400 px on its long side (audit
 * PPL-12; the rules are in media-rules.mjs). A browser that cannot encode the
 * preferred type gives another; any accepted image type within the limit is
 * used.
 */
async function reduceImage(file: File) {
	const bitmap = await createImageBitmap(file)
	try {
		const target = resizedDimensions(bitmap.width, bitmap.height)
		const canvas = document.createElement('canvas')
		canvas.width = target.width
		canvas.height = target.height
		const context = canvas.getContext('2d')
		if (!context) throw new Error('This browser cannot resize images.')
		context.imageSmoothingQuality = 'high'
		context.drawImage(bitmap, 0, 0, target.width, target.height)
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, resizedType(file.type), 0.9))
		if (!blob || !(IMAGE_MEDIA_TYPES as readonly string[]).includes(blob.type) || blob.size > MAX_MEDIA_FILE_BYTES) throw new Error('The reduced image is still too large.')
		const reduced = new File([blob], resizedFileName(file.name, blob.type), { type: blob.type, lastModified: Date.now() })
		return { file: reduced, note: resizeNotice(file.name, { width: bitmap.width, height: bitmap.height, size: file.size }, { ...target, size: reduced.size }) }
	} finally {
		bitmap.close()
	}
}

const KIND_SINGULAR: Record<MediaKind, string> = { portrait: 'Portrait', icon: 'Icon', cover: 'Cover or article image', logo: 'Logo', flag: 'Flag or outline' }

/**
 * Uploads files to the Media library (audit MED-04, MED-06, slice 4): every
 * file is checked in the browser first (type and size, with a sentence that
 * names the file), then sent one at a time with its own status, and checked
 * again on the server. Used by the Media library and by the image picker.
 * Not a <form>: inside the picker it must not submit the editor's form.
 */
export function MediaUploader({ imagesOnly = false, kind = null, kindChoice = false, multiple = false, onUploaded, showCaption = false, submitLabel = 'Upload' }: {
	imagesOnly?: boolean
	/** The kind kept in the Storage path (the picker's filter). */
	kind?: MediaKind | null
	/** Let the editor choose the kind. */
	kindChoice?: boolean
	multiple?: boolean
	onUploaded: (asset: UploadedMedia) => void
	showCaption?: boolean
	submitLabel?: string
}) {
	const id = useId()
	const fileInput = useRef<HTMLInputElement>(null)
	const [items, setItems] = useState<Item[]>([])
	const [altText, setAltText] = useState('')
	const [caption, setCaption] = useState('')
	const [chosenKind, setChosenKind] = useState<MediaKind | ''>(kind ?? '')
	const [busy, setBusy] = useState(false)
	const valid = items.filter((item) => !item.problem && item.state !== 'done' && item.state !== 'preparing')
	const preparing = items.some((item) => item.state === 'preparing')
	const single = items.length <= 1
	const sendable = items.filter((item) => !item.problem)
	const uploadingIndex = sendable.findIndex((item) => item.state === 'uploading')

	function choose(files: FileList | null) {
		const chosen = [...(files ?? [])].map((file, index): Item => {
			const resize = needsBrowserResize(file) && (!imagesOnly || file.type.startsWith('image/'))
			return { key: `${file.name}-${file.size}-${index}`, file, problem: resize ? null : mediaFileProblem(file, { imagesOnly }), state: resize ? 'preparing' : 'waiting', message: null, note: null }
		})
		setItems(chosen)
		// Oversize photos are reduced here instead of refused (audit PPL-12).
		for (const item of chosen.filter((entry) => entry.state === 'preparing')) {
			reduceImage(item.file).then(
				({ file, note }) => update(item.key, { file, note, problem: mediaFileProblem(file, { imagesOnly }), state: 'waiting' }),
				() => update(item.key, { problem: `${mediaFileProblem(item.file, { imagesOnly })} This browser could not reduce it automatically.`, state: 'waiting' }),
			)
		}
	}

	function update(key: string, change: Partial<Item>) {
		setItems((current) => current.map((item) => item.key === key ? { ...item, ...change } : item))
	}

	async function upload() {
		if (busy || preparing || !valid.length) return
		setBusy(true)
		const queue = valid
		let succeeded = 0
		for (const item of queue) {
			update(item.key, { state: 'uploading', message: null })
			const formData = new FormData()
			formData.set('file', item.file)
			if (single && altText.trim()) formData.set('altText', altText)
			if (single && showCaption && caption.trim()) formData.set('caption', caption)
			if (chosenKind) formData.set('kind', chosenKind)
			if (imagesOnly) formData.set('imagesOnly', 'true')
			try {
				const result = await uploadMediaAssetAction(formData)
				if (result.ok && result.values) {
					succeeded += 1
					update(item.key, { state: 'done', message: result.success ?? 'Uploaded.' })
					onUploaded(result.values)
				} else {
					update(item.key, { state: 'failed', message: result.fieldErrors?.file ?? result.formError ?? Object.values(result.fieldErrors ?? {})[0] ?? 'The upload failed.' })
				}
			} catch {
				update(item.key, { state: 'failed', message: NETWORK_ERROR })
			}
		}
		setBusy(false)
		// Once everything is in, empty the inputs (the list keeps the results).
		// Read the input from the ref, not from an event: the event is long
		// gone after the awaits (MED-04).
		if (succeeded === queue.length) {
			if (fileInput.current) fileInput.current.value = ''
			setAltText('')
			setCaption('')
		}
	}

	return (
		<div className="grid gap-4" onKeyDown={(event) => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.type !== 'file') { event.preventDefault(); void upload() } }}>
			<div className="grid gap-1.5 text-sm">
				<label className="font-medium text-slate-700" htmlFor={`${id}-file`}>{multiple ? 'Files' : 'File'}</label>
				<Input accept={acceptAttribute(imagesOnly)} aria-describedby={`${id}-rules`} disabled={busy} id={`${id}-file`} multiple={multiple} onChange={(event) => choose(event.target.files)} ref={fileInput} type="file" />
				<span className="text-xs text-slate-500" id={`${id}-rules`}>{acceptedTypeNames(imagesOnly)}, up to {MAX_MEDIA_FILE_BYTES / (1024 * 1024)} MiB each. Larger JPEG, PNG or WebP photos are reduced to 2,400 px on the long side before upload.{multiple ? ' You can choose several files.' : ''}</span>
			</div>
			{items.length ? (
				<ul aria-live="polite" className="grid gap-2 text-sm">
					{items.map((item) => (
						<li className={`flex items-start gap-2 rounded-md border px-3 py-2 ${item.problem || item.state === 'failed' ? 'border-red-200 bg-red-50 text-red-800' : item.state === 'done' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`} key={item.key}>
							{item.state === 'uploading' || item.state === 'preparing' ? <LoaderCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 animate-spin" /> : item.state === 'done' ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : item.problem || item.state === 'failed' ? <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <Upload aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
							<span className="min-w-0 wrap-break-word">{item.problem ?? item.message ?? (item.state === 'preparing' ? `“${item.file.name}” is over the size limit; reducing it to ${formatBytes(MAX_MEDIA_FILE_BYTES)} or less…` : `${item.file.name} · ${formatBytes(item.file.size)} · ${item.state === 'uploading' ? 'uploading…' : 'ready'}`)}{item.note && !item.problem ? <span className="mt-1 block text-xs text-slate-600">{item.note}</span> : null}</span>
						</li>
					))}
				</ul>
			) : null}
			{kindChoice ? (
				<div className="grid gap-1.5 text-sm">
					<label className="font-medium text-slate-700" htmlFor={`${id}-kind`}>Used as</label>
					<select className="input-select" disabled={busy} id={`${id}-kind`} onChange={(event) => setChosenKind(event.target.value as MediaKind | '')} value={chosenKind}>
						<option value="">Not specified</option>
						{MEDIA_KINDS.map((option) => <option key={option} value={option}>{KIND_SINGULAR[option]}</option>)}
					</select>
					<span className="text-xs text-slate-500">Image pickers use this to filter. Its uses in the CMS count too.</span>
				</div>
			) : null}
			<div className="grid gap-1.5 text-sm">
				<label className="font-medium text-slate-700" htmlFor={`${id}-alt`}>English alt text {imagesOnly ? '(needed to publish)' : '(recommended for images)'}</label>
				<Input aria-describedby={`${id}-alt-hint`} disabled={busy || !single} id={`${id}-alt`} maxLength={320} onChange={(event) => setAltText(event.target.value)} placeholder="Describe the image for readers who cannot see it" value={altText} />
				<span className="text-xs text-slate-500" id={`${id}-alt-hint`}>{single ? 'Stored in the Media library: every record that uses this image shows it unless the record has its own. Other languages are added in the Media library.' : 'With several files, add each file’s alt text in the Media library after the upload.'}</span>
			</div>
			{showCaption ? (
				<div className="grid gap-1.5 text-sm">
					<label className="font-medium text-slate-700" htmlFor={`${id}-caption`}>English caption (optional)</label>
					<textarea className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm shadow-xs" disabled={busy || !single} id={`${id}-caption`} maxLength={2000} onChange={(event) => setCaption(event.target.value)} value={caption} />
				</div>
			) : null}
			<div className="flex flex-wrap items-center gap-3">
				<Button disabled={busy || preparing || !valid.length} onClick={() => void upload()} type="button">
					{busy ? <><LoaderCircle aria-hidden="true" className="animate-spin" />{sendable.length > 1 ? `Uploading ${uploadingIndex + 1} of ${sendable.length}…` : 'Uploading…'}</> : <><Upload />{submitLabel}</>}
				</Button>
				{!busy && items.some((item) => item.problem) ? <span className="text-sm text-red-700">{valid.length ? 'Files marked in red will be skipped.' : 'Choose another file.'}</span> : null}
			</div>
		</div>
	)
}
