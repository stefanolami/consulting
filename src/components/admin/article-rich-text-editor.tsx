'use client'

import { Node, type NodeViewProps } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type Editor } from '@tiptap/react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { RichTextEditor, ToolButton } from '@/components/admin/rich-text-editor'
import { Button } from '@/components/ui/button'
import { ARTICLE_IMAGE_LAYOUTS, type ArticleImageLayout } from '@/lib/article-document'
import type { Json } from '@/types/database.generated'

export type ArticleEditorMedia = { id: string; label: string; mimeType: string; path: string }

function articleImageNode(media: ArticleEditorMedia[]) {
	return Node.create({
		name: 'articleImage',
		group: 'block',
		atom: true,
		selectable: true,
		addAttributes() {
			return {
				mediaId: { default: media[0]?.id ?? null },
				alt: { default: '' },
				caption: { default: null },
				layout: { default: 'content' },
			}
		},
		parseHTML() { return [{ tag: 'figure[data-article-image]' }] },
		renderHTML({ node }) {
			return ['figure', { 'data-article-image': '', 'data-layout': node.attrs.layout, 'data-media-id': node.attrs.mediaId }]
		},
		addNodeView() {
			return ReactNodeViewRenderer((props: NodeViewProps) => <ArticleImageNodeView {...props} media={media} />)
		},
	})
}

// The shared editor with the article contract, plus managed image blocks.
export function ArticleRichTextEditor({ initialValue, media }: { initialValue: Json; media: ArticleEditorMedia[] }) {
	const imageMedia = useMemo(() => media.filter((item) => item.mimeType.startsWith('image/')), [media])
	const [extensions] = useState(() => [articleImageNode(imageMedia)])
	function addImage(editor: Editor | null) {
		if (!editor || !imageMedia.length) return
		editor.chain().focus().insertContent({ type: 'articleImage', attrs: { mediaId: imageMedia[0].id, alt: '', caption: null, layout: 'content' } }).run()
	}
	return (
		<RichTextEditor
			extensions={extensions}
			initialValue={initialValue}
			kind="article"
			label="Article content"
			name="content"
			notice={!imageMedia.length ? <p className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Upload an image to the media library before adding an inline image block.</p> : null}
			toolbar={(editor) => <ToolButton active={false} disabled={!editor || !imageMedia.length} label="Add managed image block" onClick={() => addImage(editor)}><ImagePlus /></ToolButton>}
		/>
	)
}

function ArticleImageNodeView({ deleteNode, media, node, updateAttributes }: NodeViewProps & { media: ArticleEditorMedia[] }) {
	const attributes = node.attrs as { alt?: string; caption?: string | null; layout?: ArticleImageLayout; mediaId?: string }
	return <NodeViewWrapper as="figure" className="my-5 rounded-lg border border-blue-200 bg-blue-50 p-4" contentEditable={false}><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-blue-950">Managed inline image</p><p className="mt-1 text-xs text-blue-800">The public renderer controls dimensions and layout. Alt text and caption belong to this article locale.</p></div><Button aria-label="Remove inline image" onClick={deleteNode} size="icon" type="button" variant="ghost"><Trash2 /></Button></div><div className="mt-4 grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-xs font-medium text-slate-700"><span>Media asset</span><select className="input-select" onChange={(event) => updateAttributes({ mediaId: event.target.value })} value={attributes.mediaId ?? ''}>{media.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="grid gap-1 text-xs font-medium text-slate-700"><span>Layout preset</span><select className="input-select" onChange={(event) => updateAttributes({ layout: event.target.value })} value={attributes.layout ?? 'content'}>{ARTICLE_IMAGE_LAYOUTS.map((layout) => <option key={layout} value={layout}>{layout}</option>)}</select></label><label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-2"><span>Localized alternative text (required)</span><input className="h-9 rounded-md border border-input bg-white px-3 text-sm" maxLength={320} onChange={(event) => updateAttributes({ alt: event.target.value })} required value={attributes.alt ?? ''} /></label><label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-2"><span>Localized caption (optional)</span><textarea className="input-textarea" maxLength={2000} onChange={(event) => updateAttributes({ caption: event.target.value || null })} rows={2} value={attributes.caption ?? ''} /></label></div></NodeViewWrapper>
}
