'use client'

import { Download, ExternalLink, FileText, HardDrive, ImageIcon, PencilLine, Search, Trash2, Upload } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useMemo, useState } from 'react'

import { checkMediaStorageAction, deleteMediaAssetAction, replaceMediaAssetAction, saveMediaMetadataAction, saveMediaTranslationAction } from '@/app/(admin)/admin/media/actions'
import { AdminForm, CommandButton, CommandNotice, Field, FormActions, useAdminCommand, useAdminForm } from '@/components/admin/form/admin-form'
import { useConfirm } from '@/components/admin/form/confirm-dialog'
import { LOCALE_NAMES, LocaleTabs } from '@/components/admin/form/locale-tabs'
import { useUnsavedChanges } from '@/components/admin/form/unsaved-changes'
import { MediaUploader } from '@/components/admin/media-uploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AppLocale } from '@/i18n/routing'
import { acceptAttribute, formatBytes, MEDIA_KIND_LABELS, MEDIA_KINDS, mediaFileProblem, type MediaKind } from '@/lib/media-rules.mjs'

type Translation = { locale: string; altText: string; caption: string | null }
type Reference = { type: string; label: string; href: string | null }
type Asset = {
	id: string; objectPath: string; url: string; originalFilename: string | null; mimeType: string | null; fileSizeBytes: number | null
	width: number | null; height: number | null; uploadedBy: string | null; uploadedByName: string | null
	createdAt: string; updatedAt: string; translations: Translation[]; references: Reference[]; kinds: MediaKind[]
}
type KindFilter = 'all' | 'unused' | MediaKind
type TypeFilter = 'all' | 'images' | 'pdf'

export function MediaLibrary({ assets, initialAssetId, initialLocale, locales }: { assets: Asset[]; initialAssetId: string | null; initialLocale: string | null; locales: { code: string; label: string }[] }) {
	const router = useRouter()
	const [query, setQuery] = useState('')
	const [kind, setKind] = useState<KindFilter>('all')
	const [type, setType] = useState<TypeFilter>('all')
	const [selectedId, setSelectedId] = useState<string | null>(initialAssetId && assets.some((asset) => asset.id === initialAssetId) ? initialAssetId : assets[0]?.id ?? null)
	const [activeLocale, setActiveLocale] = useState(initialLocale && locales.some((locale) => locale.code === initialLocale) ? initialLocale : locales[0]?.code ?? 'en')
	const unsaved = useUnsavedChanges()
	const inspectorScope = useId()
	const matchingAssets = useMemo(() => {
		const needle = query.trim().toLocaleLowerCase()
		return assets.filter((asset) => {
			if (kind === 'unused' ? asset.references.length > 0 : kind !== 'all' && !asset.kinds.includes(kind)) return false
			if (type === 'images' && !asset.mimeType?.startsWith('image/')) return false
			if (type === 'pdf' && asset.mimeType !== 'application/pdf') return false
			return !needle || [asset.originalFilename, asset.objectPath, asset.mimeType, ...asset.translations.flatMap((translation) => [translation.altText, translation.caption])].some((value) => value?.toLocaleLowerCase().includes(needle))
		})
	}, [assets, kind, query, type])
	const selectedAsset = assets.find((asset) => asset.id === selectedId) ?? matchingAssets[0] ?? null

	// Selecting another asset replaces the inspector's forms.
	async function select(id: string) {
		if (id === selectedAsset?.id) return
		if (unsaved && !(await unsaved.confirmDiscard({ reason: 'close', scope: inspectorScope }))) return
		setSelectedId(id)
	}

	return <div className="space-y-8">
		<div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
			<div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Media library</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950">Public media</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">Upload and maintain the images and documents used across the CMS. Each file’s alt text is written here, once per language; every record that shows the file uses it, unless the record has its own (partner logos and article images).</p></div>
			<div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700"><span className="font-semibold">{assets.length}</span> asset{assets.length === 1 ? '' : 's'} · <span className="font-semibold">{assets.filter((asset) => !asset.references.length).length}</span> unused</div>
		</div>

		<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div><h2 className="font-robo text-2xl text-slate-950">Upload</h2><p className="mt-1 text-sm text-slate-600">Each file is checked here before it is sent, and again on the server (type, size and contents).</p></div><div className="mt-5 max-w-2xl"><MediaUploader kindChoice multiple onUploaded={(asset) => { setSelectedId(asset.assetId); setKind('all'); setType('all'); setQuery(''); router.refresh() }} showCaption submitLabel="Upload to library" /></div></section>

		<section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(23rem,0.9fr)]"><div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-robo text-2xl text-slate-950">Browse</h2><p className="mt-1 text-sm text-slate-600">Unused files stay until someone deletes them; nothing is cleaned up automatically.</p></div><label className="relative block sm:w-72"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" /><span className="sr-only">Search media</span><Input className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Name, path, alt text, caption…" type="search" value={query} /></label></div>
			<div className="mt-4 flex flex-wrap items-center gap-2">
				<div aria-label="Filter by use" className="flex flex-wrap gap-2" role="group">{(['all', ...MEDIA_KINDS, 'unused'] as const).map((option) => <Button aria-pressed={kind === option} key={option} onClick={() => setKind(option)} size="sm" type="button" variant={kind === option ? 'default' : 'outline'}>{option === 'all' ? 'All' : option === 'unused' ? 'Unused' : MEDIA_KIND_LABELS[option]}</Button>)}</div>
				<label className="ml-auto flex items-center gap-2 text-sm text-slate-600">Type<select className="input-select h-8 w-auto" onChange={(event) => setType(event.target.value as TypeFilter)} value={type}><option value="all">All files</option><option value="images">Images</option><option value="pdf">PDFs</option></select></label>
			</div>
			<div className="mt-5 grid gap-3 sm:grid-cols-2">{matchingAssets.map((asset) => <AssetCard asset={asset} key={asset.id} onSelect={() => void select(asset.id)} selected={asset.id === selectedAsset?.id} />)}</div>{!matchingAssets.length && <p className="mt-6 rounded-lg bg-slate-50 p-5 text-sm text-slate-600">No assets match this search and filter.</p>}
		</div>
			<div>{selectedAsset ? <AssetInspector activeLocale={activeLocale} asset={selectedAsset} key={selectedAsset.id} locales={locales} onDeleted={() => setSelectedId(null)} onLocaleChange={setActiveLocale} scope={inspectorScope} /> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">Select an asset to inspect its metadata, translations, and CMS usage.</div>}</div>
		</section>

		<StorageCheck />
	</div>
}

function AssetCard({ asset, selected, onSelect }: { asset: Asset; selected: boolean; onSelect: () => void }) {
	const image = asset.mimeType?.startsWith('image/') ?? false
	return <button aria-pressed={selected} className={`flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition ${selected ? 'border-[#27335a] bg-[#f4f6fa]' : 'border-slate-200 hover:border-slate-400'}`} onClick={onSelect} type="button"><div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-slate-500">{image ? <Image alt="" className="size-full object-cover" height={56} src={asset.url} width={56} /> : <FileText aria-hidden="true" className="size-6" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{asset.originalFilename ?? asset.objectPath}</p><p className="mt-1 truncate text-xs text-slate-500">{asset.mimeType ?? 'Unknown type'} · {formatBytes(asset.fileSizeBytes)}{asset.kinds.length ? ` · ${asset.kinds.map((item) => MEDIA_KIND_LABELS[item].toLowerCase()).join(', ')}` : ''}</p><p className={`mt-2 text-xs font-medium ${asset.references.length ? 'text-[#53617f]' : 'text-amber-700'}`}>{asset.references.length ? `${asset.references.length} CMS use${asset.references.length === 1 ? '' : 's'}` : 'Unused'}</p></div></button>
}

// Keyed by asset: every form starts from the selected asset's saved values.
function AssetInspector({ asset, locales, activeLocale, onDeleted, onLocaleChange, scope }: { asset: Asset; locales: { code: string; label: string }[]; activeLocale: string; onDeleted: () => void; onLocaleChange: (locale: string) => void; scope: string }) {
	const image = asset.mimeType?.startsWith('image/') ?? false
	const translation = asset.translations.find((item) => item.locale === activeLocale)
	const name = asset.originalFilename ?? asset.objectPath
	const metadata = useAdminForm({ action: saveMediaMetadataAction, label: 'the filename', scope })
	const replacement = useAdminForm({ action: replaceMediaAssetAction, label: 'the replacement file', resetOnSuccess: true, scope })
	const [replacementProblem, setReplacementProblem] = useState<string | null>(null)
	const remove = useAdminCommand(deleteMediaAssetAction, { onSuccess: onDeleted })
	const { confirm, dialog } = useConfirm()
	async function deleteAsset() {
		const confirmed = await confirm({ title: `Delete “${name}”?`, body: <><p>The file is removed from Storage and from the library, with its alt text and captions in every language.</p><p>This cannot be undone.</p></>, confirmLabel: 'Delete permanently' })
		if (confirmed) remove.run({ assetId: asset.id })
	}
	return <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Asset details</p><h2 className="mt-2 truncate font-robo text-2xl text-slate-950">{name}</h2></div>{image ? <ImageIcon aria-hidden="true" className="mt-1 size-6 shrink-0 text-[#53617f]" /> : <FileText aria-hidden="true" className="mt-1 size-6 shrink-0 text-[#53617f]" />}</div>
		<div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">{image ? <PreviewImage alt={translation?.altText || ''} key={asset.url} src={asset.url} /> : <div className="flex h-36 flex-col items-center justify-center gap-3 text-sm text-slate-600"><FileText aria-hidden="true" className="size-9" /><div className="flex gap-3"><a className="inline-flex items-center gap-1 font-medium text-[#27335a] hover:underline" href={asset.url} rel="noreferrer" target="_blank"><ExternalLink className="size-4" />Open file</a><a className="inline-flex items-center gap-1 font-medium text-[#27335a] hover:underline" download href={asset.url}><Download className="size-4" />Download</a></div></div>}</div>
		<dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2"><Info label="Storage path" value={asset.objectPath} /><Info label="Type" value={asset.mimeType ?? 'Unknown'} /><Info label="Size" value={formatBytes(asset.fileSizeBytes)} /><Info label="Dimensions" value={asset.width && asset.height ? `${asset.width} × ${asset.height}px` : 'Not applicable / unavailable'} /><Info label="Uploaded" value={`${formatDate(asset.createdAt)}${asset.uploadedByName ? ` by ${asset.uploadedByName}` : ''}`} /><Info label="Last metadata update" value={formatDate(asset.updatedAt)} /></dl>
		<AdminForm className="grid gap-3 border-t border-slate-200 pt-5" form={metadata}><input name="assetId" type="hidden" value={asset.id} /><Field hint="Storage path, type, byte size, and dimensions are derived from the uploaded file and cannot be edited by hand." label="Original filename" name="originalFilename" required><Input defaultValue={asset.originalFilename ?? ''} name="originalFilename" required /></Field><FormActions form={metadata} label={<><PencilLine />Save filename</>} /></AdminForm>
		<div className="border-t border-slate-200 pt-5"><h3 className="font-semibold text-slate-900">Alt text and caption</h3><p className="mt-1 text-sm text-slate-600">{asset.references.length ? `Shown wherever this file is used (${asset.references.length} use${asset.references.length === 1 ? '' : 's'} below), unless that record has its own alt text.` : 'Shown wherever this file will be used.'}</p><LocaleTabs active={activeLocale as AppLocale} label="Description languages" locales={locales.map((locale) => locale.code as AppLocale)} onChange={onLocaleChange} scope={scope}><TranslationForm asset={asset} key={activeLocale} label={locales.find((locale) => locale.code === activeLocale)?.label ?? activeLocale} locale={activeLocale} scope={scope} translation={translation} /></LocaleTabs></div>
		<div className="border-t border-slate-200 pt-5"><h3 className="font-semibold text-slate-900">Replace file</h3><p className="mt-1 text-sm leading-6 text-slate-600">The new file gets a new Storage path; this asset keeps its ID, its alt text and captions, and every CMS use.{image ? ' An image can only be replaced by an image.' : ''}</p><AdminForm className="mt-3 grid gap-3" form={replacement}><input name="assetId" type="hidden" value={asset.id} /><Field hint={replacementProblem ? undefined : 'GIF, JPEG, PNG, SVG or WebP' + (image ? '' : ', or PDF') + ', up to 15 MiB.'} label="New file" name="file" required><Input accept={acceptAttribute(image)} name="file" onChange={(event) => { const file = event.target.files?.[0]; const problem = file ? mediaFileProblem(file, { imagesOnly: image }) : null; setReplacementProblem(problem); if (problem) event.target.value = '' }} required type="file" /></Field>{replacementProblem ? <p className="text-sm text-red-700" role="alert">{replacementProblem}</p> : null}<FormActions form={replacement} label={<><Upload />Replace file</>} pendingLabel="Uploading…" /></AdminForm></div>
		<div className="border-t border-slate-200 pt-5"><h3 className="font-semibold text-slate-900">CMS usage</h3>{asset.references.length ? <ul className="mt-3 space-y-2 text-sm">{asset.references.map((reference, index) => <li className="flex items-center gap-2" key={`${reference.type}-${reference.label}-${index}`}><span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{reference.type}</span>{reference.href ? <Link className="font-medium text-[#27335a] hover:underline" href={reference.href}>{reference.label}</Link> : <span className="text-slate-700">{reference.label}</span>}</li>)}</ul> : <p className="mt-2 text-sm leading-6 text-amber-800">No record uses this asset. It stays available for reuse; nothing removes it automatically.</p>}</div>
		<div className="grid gap-3 border-t border-slate-200 pt-5"><div><h3 className="font-semibold text-slate-900">Delete permanently</h3><p className="mt-1 text-sm leading-6 text-slate-600">Only unused assets can be deleted. Every use, including images inside articles, is checked again when you confirm.</p></div><div><CommandButton disabled={asset.references.length > 0} onClick={() => void deleteAsset()} pending={remove.pending} pendingLabel="Deleting…" variant="destructive"><Trash2 />Delete asset</CommandButton></div>{asset.references.length > 0 && <p className="text-xs text-amber-800">Remove or replace the uses listed above before deleting this asset.</p>}<CommandNotice command={remove} /></div>
		{dialog}
	</div>
}

function TranslationForm({ asset, label, locale, scope, translation }: { asset: Asset; label: string; locale: string; scope: string; translation?: Translation }) {
	const form = useAdminForm({ action: saveMediaTranslationAction, label: `the ${LOCALE_NAMES[locale as AppLocale] ?? label} description`, scope })
	return <AdminForm className="mt-4 grid gap-4" form={form}><input name="assetId" type="hidden" value={asset.id} /><input name="locale" type="hidden" value={locale} /><Field label={`${label} alt text`} name="altText"><Input defaultValue={translation?.altText ?? ''} maxLength={320} name="altText" /></Field><Field label="Caption" name="caption"><textarea className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm shadow-xs" defaultValue={translation?.caption ?? ''} maxLength={2000} name="caption" /></Field><FormActions form={form} label={`Save ${locale} alt text and caption`} /></AdminForm>
}

/**
 * Lists Storage files no asset points to (orphans, left by a replace or
 * delete that stopped between its two steps) and assets whose file is
 * missing. Read-only; `npm run media:orphans -- --remove` removes old orphans.
 */
function StorageCheck() {
	const check = useAdminCommand(checkMediaStorageAction)
	const drift = check.result?.ok ? check.result.values : null
	return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
		<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h2 className="font-robo text-2xl text-slate-950">Storage check</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Compares the files in Storage with the library. Replacing or deleting removes the old file after the library has changed, so an interruption can leave an orphaned file, but never an asset without its file.</p></div><CommandButton onClick={() => check.run({})} pending={check.pending} pendingLabel="Checking…" variant="outline"><HardDrive />Check Storage</CommandButton></div>
		<CommandNotice className="mt-4" command={{ result: check.result, savedAt: null }} />
		{drift ? <div className="mt-4 grid gap-4 text-sm">
			<div><h3 className="font-semibold text-slate-900">Orphaned files ({drift.orphans.length})</h3>{drift.orphans.length ? <ul className="mt-2 space-y-1">{drift.orphans.map((orphan) => <li className="break-all text-slate-700" key={orphan.path}><code>{orphan.path}</code> · {formatBytes(orphan.size)}{orphan.createdAt ? ` · ${formatDate(orphan.createdAt)}` : ''}{orphan.recent ? ' · less than a day old (may still be uploading)' : ''}</li>)}</ul> : <p className="mt-1 text-slate-600">None.</p>}</div>
			<div><h3 className="font-semibold text-slate-900">Assets without a file ({drift.missing.length})</h3>{drift.missing.length ? <ul className="mt-2 space-y-1">{drift.missing.map((item) => <li className="break-all text-slate-700" key={item.id}>{item.originalFilename ?? item.id}: <code>{item.path}</code></li>)}</ul> : <p className="mt-1 text-slate-600">None.</p>}</div>
		</div> : null}
	</section>
}

// Keyed by the file URL: another asset, or a replaced file, starts empty with
// a loading note instead of showing the previous image until the new one has
// loaded (audit MED-07).
function PreviewImage({ alt, src }: { alt: string; src: string }) {
	const [loaded, setLoaded] = useState(false)
	return <div className="relative h-56">{loaded ? null : <p aria-live="polite" className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">Loading preview…</p>}<Image alt={alt} className={`h-56 w-full object-contain transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`} height={224} onLoad={() => setLoaded(true)} src={src} width={420} /></div>
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-all text-slate-800">{value}</dd></div> }
function formatDate(value: string) { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
