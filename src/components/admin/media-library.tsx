'use client'

import { Download, ExternalLink, FileText, ImageIcon, PencilLine, Search, Trash2, Upload } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useId, useMemo, useState } from 'react'

import { deleteMediaAssetAction, replaceMediaAssetAction, saveMediaMetadataAction, saveMediaTranslationAction, uploadMediaAssetAction } from '@/app/(admin)/admin/media/actions'
import { AdminForm, CommandButton, CommandNotice, Field, FormActions, useAdminCommand, useAdminForm } from '@/components/admin/form/admin-form'
import { LOCALE_NAMES, LocaleTabs } from '@/components/admin/form/locale-tabs'
import { useUnsavedChanges } from '@/components/admin/form/unsaved-changes'
import { Input } from '@/components/ui/input'
import type { AppLocale } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'

type Translation = { locale: string; altText: string; caption: string | null }
type Reference = { type: string; label: string; href: string | null }
type Asset = {
	id: string; objectPath: string; originalFilename: string | null; mimeType: string | null; fileSizeBytes: number | null
	width: number | null; height: number | null; uploadedBy: string | null; uploadedByName: string | null
	createdAt: string; updatedAt: string; translations: Translation[]; references: Reference[]
}

export function MediaLibrary({ assets, locales }: { assets: Asset[]; locales: { code: string; label: string }[] }) {
	const [query, setQuery] = useState('')
	const [selectedId, setSelectedId] = useState<string | null>(assets[0]?.id ?? null)
	const [activeLocale, setActiveLocale] = useState(locales[0]?.code ?? 'en')
	const unsaved = useUnsavedChanges()
	const inspectorScope = useId()
	const upload = useAdminForm({ action: uploadMediaAssetAction, label: 'the new upload', onSuccess: ({ values }) => { if (values) setSelectedId(values.assetId) }, resetOnSuccess: true })
	const matchingAssets = useMemo(() => {
		const needle = query.trim().toLocaleLowerCase()
		if (!needle) return assets
		return assets.filter((asset) => [asset.originalFilename, asset.objectPath, asset.mimeType, ...asset.translations.flatMap((translation) => [translation.altText, translation.caption])].some((value) => value?.toLocaleLowerCase().includes(needle)))
	}, [assets, query])
	const selectedAsset = assets.find((asset) => asset.id === selectedId) ?? matchingAssets[0] ?? null

	// Selecting another asset replaces the inspector's forms.
	async function select(id: string) {
		if (id === selectedAsset?.id) return
		if (unsaved && !(await unsaved.confirmDiscard({ reason: 'close', scope: inspectorScope }))) return
		setSelectedId(id)
	}

	return <div className="space-y-8">
		<div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
			<div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Media library</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950">Public media</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">Upload and maintain editorial assets used across the CMS. Files stay public in Storage; this library keeps their canonical metadata, localized descriptions, and usage visible.</p></div>
			<div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700"><span className="font-semibold">{assets.length}</span> asset{assets.length === 1 ? '' : 's'} · <span className="font-semibold">{assets.filter((asset) => !asset.references.length).length}</span> unreferenced</div>
		</div>

		<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div><h2 className="font-robo text-2xl text-slate-950">Upload an asset</h2><p className="mt-1 text-sm text-slate-600">GIF, JPEG, PNG, SVG, WebP, and PDF up to 15 MiB. The server validates the declared type and file contents before it records the asset.</p></div><AdminForm className="mt-5 grid gap-5 md:grid-cols-2" form={upload}><Field label="File" name="file" required><Input accept="image/gif,image/jpeg,image/png,image/svg+xml,image/webp,application/pdf" name="file" required type="file" /></Field><Field label="English alternative text (recommended for images)" name="altText"><Input maxLength={320} name="altText" placeholder="Describe the image for readers who cannot see it" /></Field><Field className="md:col-span-2" label="English caption (optional)" name="caption"><textarea className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm shadow-xs" maxLength={2000} name="caption" /></Field><FormActions className="md:col-span-2" form={upload} label={<><Upload />Upload to library</>} pendingLabel="Uploading…" /></AdminForm></section>

		<section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(23rem,0.9fr)]"><div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-robo text-2xl text-slate-950">Browse assets</h2><p className="mt-1 text-sm text-slate-600">Unreferenced files are retained until a colleague explicitly removes them; the library does not run cleanup automatically.</p></div><label className="relative block sm:w-72"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" /><Input aria-label="Search media" className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Name, path, alt text, caption…" value={query} /></label></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{matchingAssets.map((asset) => <AssetCard asset={asset} key={asset.id} onSelect={() => void select(asset.id)} selected={asset.id === selectedAsset?.id} />)}</div>{!matchingAssets.length && <p className="mt-6 rounded-lg bg-slate-50 p-5 text-sm text-slate-600">No assets match that search.</p>}</div>
			<div>{selectedAsset ? <AssetInspector activeLocale={activeLocale} asset={selectedAsset} key={selectedAsset.id} locales={locales} onDeleted={() => setSelectedId(null)} onLocaleChange={setActiveLocale} scope={inspectorScope} /> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">Select an asset to inspect its metadata, translations, and CMS usage.</div>}</div>
		</section>
	</div>
}

function AssetCard({ asset, selected, onSelect }: { asset: Asset; selected: boolean; onSelect: () => void }) {
	const image = asset.mimeType?.startsWith('image/') ?? false
	const url = createClient().storage.from('public-media').getPublicUrl(asset.objectPath).data.publicUrl
	const englishAlt = asset.translations.find((translation) => translation.locale === 'en')?.altText || asset.originalFilename || 'Media asset'
	return <button aria-pressed={selected} className={`flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition ${selected ? 'border-[#27335a] bg-[#f4f6fa]' : 'border-slate-200 hover:border-slate-400'}`} onClick={onSelect} type="button"><div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-slate-500">{image ? <Image alt={englishAlt} className="size-full object-cover" height={56} src={url} width={56} /> : <FileText aria-hidden="true" className="size-6" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{asset.originalFilename ?? asset.objectPath}</p><p className="mt-1 truncate text-xs text-slate-500">{asset.mimeType ?? 'Unknown type'} · {formatBytes(asset.fileSizeBytes)}</p><p className={`mt-2 text-xs font-medium ${asset.references.length ? 'text-[#53617f]' : 'text-amber-700'}`}>{asset.references.length ? `${asset.references.length} CMS reference${asset.references.length === 1 ? '' : 's'}` : 'Unreferenced'}</p></div></button>
}

// Keyed by asset: every form starts from the selected asset's saved values.
function AssetInspector({ asset, locales, activeLocale, onDeleted, onLocaleChange, scope }: { asset: Asset; locales: { code: string; label: string }[]; activeLocale: string; onDeleted: () => void; onLocaleChange: (locale: string) => void; scope: string }) {
	const image = asset.mimeType?.startsWith('image/') ?? false
	const url = createClient().storage.from('public-media').getPublicUrl(asset.objectPath).data.publicUrl
	const translation = asset.translations.find((item) => item.locale === activeLocale)
	const metadata = useAdminForm({ action: saveMediaMetadataAction, label: 'the filename', scope })
	const replacement = useAdminForm({ action: replaceMediaAssetAction, label: 'the replacement file', resetOnSuccess: true, scope })
	const remove = useAdminCommand(deleteMediaAssetAction, { onSuccess: onDeleted })
	function deleteAsset() {
		if (!window.confirm(`Delete “${asset.originalFilename ?? asset.objectPath}” permanently? This cannot be undone.`)) return
		remove.run({ assetId: asset.id })
	}
	return <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Asset details</p><h2 className="mt-2 truncate font-robo text-2xl text-slate-950">{asset.originalFilename ?? asset.objectPath}</h2></div>{image ? <ImageIcon aria-hidden="true" className="mt-1 size-6 shrink-0 text-[#53617f]" /> : <FileText aria-hidden="true" className="mt-1 size-6 shrink-0 text-[#53617f]" />}</div>
		<div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">{image ? <Image alt={translation?.altText || asset.originalFilename || 'Media asset'} className="h-56 w-full object-contain" height={224} src={url} width={420} /> : <div className="flex h-36 flex-col items-center justify-center gap-3 text-sm text-slate-600"><FileText aria-hidden="true" className="size-9" /><div className="flex gap-3"><a className="inline-flex items-center gap-1 font-medium text-[#27335a] hover:underline" href={url} rel="noreferrer" target="_blank"><ExternalLink className="size-4" />Open file</a><a className="inline-flex items-center gap-1 font-medium text-[#27335a] hover:underline" download href={url}><Download className="size-4" />Download</a></div></div>}</div>
		<dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2"><Info label="Storage path" value={asset.objectPath} /><Info label="Type" value={asset.mimeType ?? 'Unknown'} /><Info label="Size" value={formatBytes(asset.fileSizeBytes)} /><Info label="Dimensions" value={asset.width && asset.height ? `${asset.width} × ${asset.height}px` : 'Not applicable / unavailable'} /><Info label="Uploaded" value={`${formatDate(asset.createdAt)}${asset.uploadedByName ? ` by ${asset.uploadedByName}` : ''}`} /><Info label="Last metadata update" value={formatDate(asset.updatedAt)} /></dl>
		<AdminForm className="grid gap-3 border-t border-slate-200 pt-5" form={metadata}><input name="assetId" type="hidden" value={asset.id} /><Field hint="Storage path, type, byte size, and dimensions are derived from the uploaded file and cannot be edited by hand." label="Original filename" name="originalFilename" required><Input defaultValue={asset.originalFilename ?? ''} name="originalFilename" required /></Field><FormActions form={metadata} label={<><PencilLine />Save filename</>} /></AdminForm>
		<div className="border-t border-slate-200 pt-5"><h3 className="font-semibold text-slate-900">Localized description</h3><LocaleTabs active={activeLocale as AppLocale} label="Description languages" locales={locales.map((locale) => locale.code as AppLocale)} onChange={onLocaleChange} scope={scope}><TranslationForm asset={asset} key={activeLocale} label={locales.find((locale) => locale.code === activeLocale)?.label ?? activeLocale} locale={activeLocale} scope={scope} translation={translation} /></LocaleTabs></div>
		<div className="border-t border-slate-200 pt-5"><h3 className="font-semibold text-slate-900">Replace file</h3><p className="mt-1 text-sm leading-6 text-slate-600">A replacement gets a fresh Storage path while retaining this asset’s ID, localized text, and all existing CMS references.</p><AdminForm className="mt-3 grid gap-3" form={replacement}><input name="assetId" type="hidden" value={asset.id} /><Field label="New file" name="file" required><Input accept="image/gif,image/jpeg,image/png,image/svg+xml,image/webp,application/pdf" name="file" required type="file" /></Field><FormActions form={replacement} label={<><Upload />Replace file</>} pendingLabel="Uploading…" /></AdminForm></div>
		<div className="border-t border-slate-200 pt-5"><h3 className="font-semibold text-slate-900">CMS usage</h3>{asset.references.length ? <ul className="mt-3 space-y-2 text-sm">{asset.references.map((reference, index) => <li className="flex items-center gap-2" key={`${reference.type}-${reference.label}-${index}`}><span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{reference.type}</span>{reference.href ? <Link className="font-medium text-[#27335a] hover:underline" href={reference.href}>{reference.label}</Link> : <span className="text-slate-700">{reference.label}</span>}</li>)}</ul> : <p className="mt-2 text-sm leading-6 text-amber-800">This asset is currently unreferenced. It remains available for reuse; no automatic cleanup runs.</p>}</div>
		<div className="grid gap-3 border-t border-slate-200 pt-5"><div><h3 className="font-semibold text-slate-900">Delete permanently</h3><p className="mt-1 text-sm leading-6 text-slate-600">Deletion is available only for unreferenced assets. The system checks all current direct CMS media links again when you confirm.</p></div><div><CommandButton disabled={asset.references.length > 0} onClick={deleteAsset} pending={remove.pending} pendingLabel="Deleting…" variant="destructive"><Trash2 />Delete asset</CommandButton></div>{asset.references.length > 0 && <p className="text-xs text-amber-800">Remove or replace the listed CMS references before deleting this asset.</p>}<CommandNotice command={remove} /></div>
	</div>
}

function TranslationForm({ asset, label, locale, scope, translation }: { asset: Asset; label: string; locale: string; scope: string; translation?: Translation }) {
	const form = useAdminForm({ action: saveMediaTranslationAction, label: `the ${LOCALE_NAMES[locale as AppLocale] ?? label} description`, scope })
	return <AdminForm className="mt-4 grid gap-4" form={form}><input name="assetId" type="hidden" value={asset.id} /><input name="locale" type="hidden" value={locale} /><Field label={`${label} alt text`} name="altText"><Input defaultValue={translation?.altText ?? ''} maxLength={320} name="altText" /></Field><Field label="Caption" name="caption"><textarea className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm shadow-xs" defaultValue={translation?.caption ?? ''} maxLength={2000} name="caption" /></Field><FormActions form={form} label={`Save ${locale} metadata`} /></AdminForm>
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-all text-slate-800">{value}</dd></div> }
function formatBytes(value: number | null) { if (value === null) return 'Unknown'; if (value < 1024) return `${value} B`; if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`; return `${(value / (1024 * 1024)).toFixed(1)} MiB` }
function formatDate(value: string) { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
