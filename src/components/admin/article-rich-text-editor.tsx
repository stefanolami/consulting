'use client'

import { Node, type NodeViewProps } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type Editor } from '@tiptap/react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { createContext, useContext, useState } from 'react'

import { MediaPicker, type MediaPickerAsset, type useMediaUploads } from '@/components/admin/form/media-picker'
import { RichTextEditor, ToolButton } from '@/components/admin/rich-text-editor'
import { Button } from '@/components/ui/button'
import { ARTICLE_IMAGE_LAYOUTS, type ArticleImageLayout } from '@/lib/article-document'
import type { Json } from '@/types/database.generated'

type Uploads = ReturnType<typeof useMediaUploads>

const LAYOUT_LABELS: Record<ArticleImageLayout, string> = { content: 'Text width', wide: 'Wide', fullBleed: 'Full width (edge to edge)' }

// The node view is rendered by TipTap inside the editor, so the library
// (including files uploaded since the page loaded) reaches it through context.
const ArticleMediaContext = createContext<{ media: readonly MediaPickerAsset[]; uploads?: Uploads }>({ media: [] })

const articleImageNode = Node.create({
	name: 'articleImage',
	group: 'block',
	atom: true,
	selectable: true,
	addAttributes() {
		return {
			mediaId: { default: null },
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
		return ReactNodeViewRenderer(ArticleImageNodeView)
	},
})

// The shared editor with the article contract, plus managed image blocks.
export function ArticleRichTextEditor({ initialValue, media, uploads }: { initialValue: Json; media: readonly MediaPickerAsset[]; uploads?: Uploads }) {
	const [extensions] = useState(() => [articleImageNode])
	function addImage(editor: Editor | null) {
		if (!editor) return
		editor.chain().focus().insertContent({ type: 'articleImage', attrs: { mediaId: null, alt: '', caption: null, layout: 'content' } }).run()
	}
	return (
		<ArticleMediaContext.Provider value={{ media, uploads }}>
			<RichTextEditor
				extensions={extensions}
				initialValue={initialValue}
				kind="article"
				label="Article content"
				name="content"
				toolbar={(editor) => <ToolButton active={false} disabled={!editor} label="Add an image block" onClick={() => addImage(editor)}><ImagePlus /></ToolButton>}
			/>
		</ArticleMediaContext.Provider>
	)
}

function ArticleImageNodeView({ deleteNode, node, updateAttributes }: NodeViewProps) {
	const { media, uploads } = useContext(ArticleMediaContext)
	const attributes = node.attrs as { alt?: string; caption?: string | null; layout?: ArticleImageLayout; mediaId?: string | null }
	return <NodeViewWrapper as="figure" className="my-5 rounded-lg border border-blue-200 bg-blue-50 p-4" contentEditable={false}>
		<div className="flex items-start justify-between gap-4"><p className="font-semibold text-blue-950">Image block</p><Button aria-label="Remove image block" onClick={deleteNode} size="icon" type="button" variant="ghost"><Trash2 /></Button></div>
		<div className="mt-3 grid gap-3 md:grid-cols-2">
			<div className="md:col-span-2"><MediaPicker kind="cover" label="Image" media={media} noneLabel="No image chosen yet" onValueChange={(mediaId) => updateAttributes({ mediaId })} value={attributes.mediaId ?? null} {...uploads} /></div>
			<label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2"><span>Alt text for this image in this article (required)</span><input className="h-9 rounded-md border border-input bg-white px-3 text-sm font-normal" maxLength={320} onChange={(event) => updateAttributes({ alt: event.target.value })} required value={attributes.alt ?? ''} /></label>
			<label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2"><span>Caption (optional)</span><textarea className="input-textarea font-normal" maxLength={2000} onChange={(event) => updateAttributes({ caption: event.target.value || null })} rows={2} value={attributes.caption ?? ''} /></label>
			<label className="grid gap-1 text-sm font-medium text-slate-700"><span>Size on the page</span><select className="input-select font-normal" onChange={(event) => updateAttributes({ layout: event.target.value })} value={attributes.layout ?? 'content'}>{ARTICLE_IMAGE_LAYOUTS.map((layout) => <option key={layout} value={layout}>{LAYOUT_LABELS[layout]}</option>)}</select></label>
		</div>
		<p className="mt-3 text-xs text-blue-800">The alt text and caption belong to this language of this article; the website sets the image’s dimensions.</p>
	</NodeViewWrapper>
}
