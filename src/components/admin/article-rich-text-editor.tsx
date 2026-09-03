'use client'

import Link from '@tiptap/extension-link'
import { Node, type JSONContent, type NodeViewProps } from '@tiptap/core'
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Quote, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { ARTICLE_DOCUMENT_VERSION, ARTICLE_IMAGE_LAYOUTS, type ArticleImageLayout } from '@/lib/article-document'
import type { Json } from '@/types/database.generated'

export type ArticleEditorMedia = { id: string; label: string; mimeType: string; path: string }

const ArticleDocumentNode = Node.create({
	name: 'doc',
	topNode: true,
	content: 'block*',
	addAttributes() { return { schemaVersion: { default: ARTICLE_DOCUMENT_VERSION } } },
})

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

export function ArticleRichTextEditor({ initialValue, media }: { initialValue: Json; media: ArticleEditorMedia[] }) {
	const imageMedia = useMemo(() => media.filter((item) => item.mimeType.startsWith('image/')), [media])
	const [value, setValue] = useState<Json>(initialValue)
	const extensions = useMemo(() => [
		ArticleDocumentNode,
		StarterKit.configure({ code: false, codeBlock: false, document: false, horizontalRule: false, link: false, strike: false, heading: { levels: [2, 3] } }),
		Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
		articleImageNode(imageMedia),
	], [imageMedia])
	const editor = useEditor({
		immediatelyRender: false,
		extensions,
		content: initialValue as JSONContent,
		onUpdate: ({ editor: current }) => setValue(current.getJSON() as Json),
	})
	const serialized = JSON.stringify(value)
	useEffect(() => {
		if (editor && JSON.stringify(editor.getJSON()) !== serialized) editor.commands.setContent(value as JSONContent)
	}, [editor, serialized, value])

	function addLink() {
		const href = window.prompt('Link URL (https://...)')?.trim()
		if (!href || !editor) return
		try {
			const protocol = new URL(href).protocol
			if (protocol !== 'http:' && protocol !== 'https:') throw new Error()
		} catch {
			window.alert('Enter a complete URL beginning with https:// or http://.')
			return
		}
		editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
	}

	function addImage() {
		if (!editor || !imageMedia.length) return
		editor.chain().focus().insertContent({ type: 'articleImage', attrs: { mediaId: imageMedia[0].id, alt: '', caption: null, layout: 'content' } }).run()
	}

	return <div className="mt-1.5 overflow-hidden rounded-md border border-input bg-white shadow-xs"><input name="content" type="hidden" value={serialized} /><div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-1.5"><ToolButton active={editor?.isActive('bold') ?? false} disabled={!editor} label="Bold" onClick={() => editor?.chain().focus().toggleBold().run()}><Bold /></ToolButton><ToolButton active={editor?.isActive('italic') ?? false} disabled={!editor} label="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic /></ToolButton><ToolButton active={editor?.isActive('heading', { level: 2 }) ?? false} disabled={!editor} label="Heading level 2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 /></ToolButton><ToolButton active={editor?.isActive('heading', { level: 3 }) ?? false} disabled={!editor} label="Heading level 3" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 /></ToolButton><ToolButton active={editor?.isActive('bulletList') ?? false} disabled={!editor} label="Bulleted list" onClick={() => editor?.chain().focus().toggleBulletList().run()}><List /></ToolButton><ToolButton active={editor?.isActive('orderedList') ?? false} disabled={!editor} label="Numbered list" onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered /></ToolButton><ToolButton active={editor?.isActive('blockquote') ?? false} disabled={!editor} label="Block quote" onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote /></ToolButton><ToolButton active={editor?.isActive('link') ?? false} disabled={!editor} label="Add link" onClick={addLink}><Link2 /></ToolButton><ToolButton active={false} disabled={!editor || !imageMedia.length} label="Add managed image block" onClick={addImage}><ImagePlus /></ToolButton></div>{!imageMedia.length ? <p className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Upload an image to the media library before adding an inline image block.</p> : null}<EditorContent aria-label="Article content" className="profile-rich-text min-h-44 px-3 py-2 text-sm leading-6 text-slate-800" editor={editor} /></div>
}

function ArticleImageNodeView({ deleteNode, media, node, updateAttributes }: NodeViewProps & { media: ArticleEditorMedia[] }) {
	const attributes = node.attrs as { alt?: string; caption?: string | null; layout?: ArticleImageLayout; mediaId?: string }
	return <NodeViewWrapper as="figure" className="my-5 rounded-lg border border-blue-200 bg-blue-50 p-4" contentEditable={false}><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-blue-950">Managed inline image</p><p className="mt-1 text-xs text-blue-800">The public renderer controls dimensions and layout. Alt text and caption belong to this article locale.</p></div><Button aria-label="Remove inline image" onClick={deleteNode} size="icon" type="button" variant="ghost"><Trash2 /></Button></div><div className="mt-4 grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-xs font-medium text-slate-700"><span>Media asset</span><select className="input-select" onChange={(event) => updateAttributes({ mediaId: event.target.value })} value={attributes.mediaId ?? ''}>{media.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="grid gap-1 text-xs font-medium text-slate-700"><span>Layout preset</span><select className="input-select" onChange={(event) => updateAttributes({ layout: event.target.value })} value={attributes.layout ?? 'content'}>{ARTICLE_IMAGE_LAYOUTS.map((layout) => <option key={layout} value={layout}>{layout}</option>)}</select></label><label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-2"><span>Localized alternative text (required)</span><input className="h-9 rounded-md border border-input bg-white px-3 text-sm" maxLength={320} onChange={(event) => updateAttributes({ alt: event.target.value })} required value={attributes.alt ?? ''} /></label><label className="grid gap-1 text-xs font-medium text-slate-700 md:col-span-2"><span>Localized caption (optional)</span><textarea className="input-textarea" maxLength={2000} onChange={(event) => updateAttributes({ caption: event.target.value || null })} rows={2} value={attributes.caption ?? ''} /></label></div></NodeViewWrapper>
}

function ToolButton({ active, children, disabled, label, onClick }: { active: boolean; children: React.ReactNode; disabled: boolean; label: string; onClick: () => void }) {
	return <Button aria-label={label} className={active ? 'bg-[#27335a] text-white hover:bg-[#1e294c]' : ''} disabled={disabled} onClick={onClick} size="icon" type="button" variant="ghost">{children}</Button>
}
