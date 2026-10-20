'use client'

import { ExternalLink, FileText, ImageIcon, ImageOff, RefreshCw, Search, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useId, useMemo, useState, type SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'

import type { UploadedMedia } from '@/app/(admin)/admin/media/actions'
import { FieldGroup, FieldSlot } from '@/components/admin/form/admin-form'
import { LOCALE_NAMES } from '@/components/admin/form/locale-tabs'
import { MediaUploader } from '@/components/admin/media-uploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AppLocale } from '@/i18n/routing'
import { MEDIA_KIND_LABELS, MEDIA_KINDS, type MediaKind } from '@/lib/media-rules.mjs'
import { cn } from '@/lib/utils'

/** One library asset as the picker shows it (src/lib/media-choices.ts). */
export type MediaPickerAsset = {
	id: string
	filename: string
	mimeType: string
	url: string
	width: number | null
	height: number | null
	createdAt: string
	/** Portrait, icon, …: from the asset's uses and its upload path. */
	kinds: MediaKind[]
	/** How many CMS records use it. */
	uses: number
	/** Library alt text by locale (only locales that have one). */
	alts: Record<string, string>
}

type Filter = 'all' | MediaKind

function fromUpload(asset: UploadedMedia): MediaPickerAsset {
	return { alts: asset.altText ? { en: asset.altText } : {}, createdAt: asset.createdAt, filename: asset.filename, height: asset.height, id: asset.assetId, kinds: asset.kind ? [asset.kind] : [], mimeType: asset.mimeType, url: asset.url, uses: 0, width: asset.width }
}

/** Assets uploaded through any picker on the page, so every picker lists them. */
function useLibrary(media: readonly MediaPickerAsset[], extra: readonly MediaPickerAsset[]) {
	return useMemo(() => [...extra.filter((item) => !media.some((asset) => asset.id === item.id)), ...media], [extra, media])
}

function Thumbnail({ asset, className }: { asset: MediaPickerAsset | null; className?: string }) {
	if (!asset) return <div className={cn('flex items-center justify-center rounded-md bg-slate-100 text-slate-400', className)}><ImageOff aria-hidden="true" className="size-6" /></div>
	if (!asset.mimeType.startsWith('image/')) return <div className={cn('flex items-center justify-center rounded-md bg-slate-100 text-slate-500', className)}><FileText aria-hidden="true" className="size-6" /></div>
	return <div className={cn('relative overflow-hidden rounded-md border border-slate-200 bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-size-[16px_16px]', className)}><Image alt="" className="object-contain" fill sizes="10rem" src={asset.url} /></div>
}

/**
 * The shared image picker (audit X-10, slice 4): the chosen image with its
 * thumbnail, and a dialog with every library asset as a thumbnail, search,
 * a filter by kind, a "No image" choice and an upload that selects the new
 * file without leaving the form. A selected asset stays visible whatever the
 * filter. Controlled by the editor (slice 1); `name` submits the id with the
 * surrounding form. The dialog is rendered outside the form, so nothing in
 * it can submit or edit the form.
 */
export function MediaPicker({ allowPdf = false, hint, kind, label, media, name, noneLabel = 'No image', onUploaded, onValueChange, uploads = [], value }: {
	allowPdf?: boolean
	hint?: React.ReactNode
	/** The filter the dialog opens with, and the kind of a new upload. */
	kind?: MediaKind
	label: string
	media: readonly MediaPickerAsset[]
	/** The form field; omit for a picker that is not a form field (inline article images). */
	name?: string
	noneLabel?: string
	/** Called with every asset uploaded here, so the editor can share it with its other pickers. */
	onUploaded?: (asset: MediaPickerAsset) => void
	onValueChange: (id: string | null) => void
	/** Assets uploaded in this editor, from onUploaded. */
	uploads?: readonly MediaPickerAsset[]
	value: string | null
}) {
	const [open, setOpen] = useState(false)
	const [ownUploads, setOwnUploads] = useState<MediaPickerAsset[]>([])
	const library = useLibrary(media, onUploaded ? uploads : ownUploads)
	const selected = value ? library.find((asset) => asset.id === value) ?? null : null
	const id = useId()
	const field = (
		<div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-3">
			<Thumbnail asset={selected} className="size-20 shrink-0" />
			<div className="min-w-0 flex-1 text-sm">
				{selected ? <><p className="truncate font-medium text-slate-900">{selected.filename}</p><p className="mt-0.5 text-xs text-slate-500">{describe(selected)}</p></> : value ? <p className="text-amber-800">The selected file is no longer in the library.</p> : <p className="text-slate-500">{noneLabel}</p>}
				<div className="mt-2 flex flex-wrap gap-2">
					<Button aria-describedby={`${id}-current`} aria-haspopup="dialog" onClick={() => setOpen(true)} size="sm" type="button" variant="outline"><ImageIcon />{value ? 'Change…' : 'Choose…'}</Button>
					{value ? <Button onClick={() => onValueChange(null)} size="sm" type="button" variant="ghost"><X />Remove</Button> : null}
				</div>
				<span className="sr-only" id={`${id}-current`}>{selected ? `Selected: ${selected.filename}` : noneLabel}</span>
			</div>
		</div>
	)
	return (
		<>
			{name ? <FieldGroup hint={hint} label={label} name={name}><input name={name} type="hidden" value={value ?? ''} />{field}</FieldGroup> : <div className="grid gap-1.5 text-sm"><span className="font-medium text-slate-700">{label}</span>{field}</div>}
			{open ? <PickerDialog allowPdf={allowPdf} kind={kind} label={label} library={library} noneLabel={noneLabel} onClose={() => setOpen(false)} onSelect={(next) => { onValueChange(next); setOpen(false) }} onUploaded={(asset) => { const item = fromUpload(asset); if (onUploaded) onUploaded(item); else setOwnUploads((current) => [item, ...current]); onValueChange(item.id); setOpen(false) }} value={value} /> : null}
		</>
	)
}

/** Shares uploads between the pickers of one editor. */
export function useMediaUploads() {
	const [uploads, setUploads] = useState<MediaPickerAsset[]>([])
	const onUploaded = useCallback((asset: MediaPickerAsset) => setUploads((current) => [asset, ...current]), [])
	return { onUploaded, uploads }
}

function describe(asset: MediaPickerAsset) {
	const parts = [asset.mimeType.replace('image/', '').replace('svg+xml', 'svg').toUpperCase()]
	if (asset.width && asset.height) parts.push(`${asset.width} × ${asset.height}`)
	parts.push(asset.uses ? `used ${asset.uses}×` : 'not used yet')
	return parts.join(' · ')
}

// Events inside the dialog still bubble to the form through React's tree;
// stop the ones the form listens to (edits, submit).
function stop(event: SyntheticEvent) { event.stopPropagation() }

function PickerDialog({ allowPdf, kind, label, library, noneLabel, onClose, onSelect, onUploaded, value }: { allowPdf: boolean; kind?: MediaKind; label: string; library: readonly MediaPickerAsset[]; noneLabel: string; onClose: () => void; onSelect: (id: string | null) => void; onUploaded: (asset: UploadedMedia) => void; value: string | null }) {
	const id = useId()
	const usable = useMemo(() => library.filter((asset) => allowPdf || asset.mimeType.startsWith('image/')), [allowPdf, library])
	const counts = useMemo(() => Object.fromEntries(MEDIA_KINDS.map((option) => [option, usable.filter((asset) => asset.kinds.includes(option)).length])) as Record<MediaKind, number>, [usable])
	// Open on the field's kind, unless no asset has that kind yet.
	const [filter, setFilter] = useState<Filter>(kind && counts[kind] ? kind : 'all')
	const [query, setQuery] = useState('')
	const [uploading, setUploading] = useState(false)
	const needle = query.trim().toLocaleLowerCase()
	const matches = usable.filter((asset) => (filter === 'all' || asset.kinds.includes(filter)) && (!needle || [asset.filename, ...Object.values(asset.alts)].some((text) => text.toLocaleLowerCase().includes(needle))))
	const selected = value ? usable.find((asset) => asset.id === value) : undefined
	const shown = selected && !matches.includes(selected) ? [selected, ...matches] : matches
	const dialogRef = useCallback((dialog: HTMLDialogElement | null) => { if (dialog && !dialog.open) dialog.showModal() }, [])

	return createPortal(
		<dialog
			aria-labelledby={`${id}-title`}
			className="m-auto flex max-h-[min(48rem,calc(100vh-2rem))] w-[min(60rem,calc(100vw-2rem))] flex-col rounded-xl border border-slate-200 p-0 shadow-xl backdrop:bg-slate-950/40"
			onChange={stop}
			onClose={onClose}
			onInput={stop}
			onSubmit={stop}
			ref={dialogRef}
		>
			<div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
				<h2 className="font-robo text-xl text-slate-950" id={`${id}-title`}>{label}</h2>
				<Button aria-label="Close" onClick={onClose} size="icon" type="button" variant="ghost"><X /></Button>
			</div>
			<div className="grid gap-3 border-b border-slate-200 px-5 py-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<label className="relative block flex-1"><span className="sr-only">Search the library</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" /><Input autoFocus className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="File name or alt text…" type="search" value={query} /></label>
					<Button aria-expanded={uploading} onClick={() => setUploading((current) => !current)} type="button" variant={uploading ? 'default' : 'outline'}><Upload />Upload new</Button>
				</div>
				<div aria-label="Filter by kind" className="flex flex-wrap gap-2" role="group">
					{(['all', ...MEDIA_KINDS] as const).map((option) => (
						<Button aria-pressed={filter === option} key={option} onClick={() => setFilter(option)} size="sm" type="button" variant={filter === option ? 'default' : 'outline'}>
							{option === 'all' ? 'All' : MEDIA_KIND_LABELS[option]} <span className="opacity-70">{option === 'all' ? usable.length : counts[option]}</span>
						</Button>
					))}
				</div>
				{uploading ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><MediaUploader imagesOnly={!allowPdf} kind={kind ?? null} kindChoice={!kind} onUploaded={onUploaded} submitLabel="Upload and select" /></div> : null}
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
				<ul aria-label="Library images" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
					<li>
						<button aria-pressed={!value} className={tileClass(!value)} onClick={() => onSelect(null)} type="button">
							<div className="flex aspect-[4/3] w-full items-center justify-center rounded-md bg-slate-100 text-slate-500"><ImageOff aria-hidden="true" className="size-7" /></div>
							<span className="mt-2 block text-sm font-medium text-slate-900">{noneLabel}</span>
						</button>
					</li>
					{shown.map((asset) => (
						<li key={asset.id}>
							<button aria-label={`${asset.filename}${asset.alts.en ? `: ${asset.alts.en}` : ''}`} aria-pressed={asset.id === value} className={tileClass(asset.id === value)} onClick={() => onSelect(asset.id)} type="button">
								<Thumbnail asset={asset} className="aspect-[4/3] w-full" />
								<span className="mt-2 block truncate text-sm font-medium text-slate-900">{asset.filename}</span>
								<span className="block truncate text-xs text-slate-500">{asset.id === value && !matches.includes(asset) ? 'Selected · not in this filter' : describe(asset)}</span>
							</button>
						</li>
					))}
				</ul>
				{!matches.length ? <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{usable.length ? 'No images match this search and filter. Try “All”, or upload a new one.' : 'The library has no images yet. Upload one above.'}</p> : null}
			</div>
		</dialog>,
		document.body,
	)
}

function tileClass(active: boolean) {
	return cn('block w-full rounded-lg border p-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27335a]', active ? 'border-[#27335a] bg-[#f4f6fa] ring-2 ring-[#27335a]' : 'border-slate-200 hover:border-slate-400')
}

/**
 * The library alt text of the chosen image in one locale, read-only (X-09):
 * record forms do not write it, so saving a record cannot change another
 * record's image description. Shows a link to edit it in the Media library
 * (a new tab, so the form keeps its edits) and a button to read it again.
 * `field` receives the publish check's error.
 */
export function LibraryAltNote({ asset, assetId, field, label, locale, whenMissing }: { asset: MediaPickerAsset | null | undefined; assetId: string | null; field: string; label: string; locale: AppLocale; whenMissing?: string }) {
	const router = useRouter()
	if (!assetId) return null
	const alt = asset?.alts[locale]
	const language = LOCALE_NAMES[locale] ?? locale
	return (
		<FieldSlot className="grid content-start gap-1.5 text-sm" name={field}>
			<span className="font-medium text-slate-700">{label} ({language})</span>
			<div className={cn('rounded-md border px-3 py-2', alt ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-amber-200 bg-amber-50 text-amber-900')}>
				{alt ? <p>“{alt}”</p> : <p>No {language} alt text in the Media library yet. {whenMissing ?? `Published ${language} content needs it.`}</p>}
				<p className="mt-1 text-xs text-slate-500">From the Media library: every record that shows this image uses it.</p>
				<div className="mt-2 flex flex-wrap gap-3 text-xs">
					<a className="inline-flex items-center gap-1 font-medium text-[#27335a] underline-offset-4 hover:underline" href={`/admin/media?asset=${assetId}&locale=${locale}`} rel="noopener" target="_blank"><ExternalLink aria-hidden="true" className="size-3.5" />Edit in the Media library (new tab)</a>
					<button className="inline-flex items-center gap-1 font-medium text-[#27335a] underline-offset-4 hover:underline" onClick={() => router.refresh()} type="button"><RefreshCw aria-hidden="true" className="size-3.5" />Check again</button>
				</div>
			</div>
		</FieldSlot>
	)
}
