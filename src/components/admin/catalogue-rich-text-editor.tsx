'use client'

import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import type { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import type { Json } from '@/types/database.generated'

export function CatalogueRichTextEditor({ initialValue, name = 'content', label = 'Catalogue content', onChange }: { initialValue: Json; name?: string; label?: string; onChange?: (value: Json) => void }) {
	const [value, setValue] = useState<Json>(initialValue)
	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({ code: false, codeBlock: false, horizontalRule: false, link: false, strike: false, heading: { levels: [2, 3] } }),
			Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
		],
		content: initialValue as JSONContent,
		onUpdate: ({ editor: current }) => { const next = current.getJSON() as Json; setValue(next); onChange?.(next) },
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

	return <div className="mt-1.5 overflow-hidden rounded-md border border-input bg-white shadow-xs"><input name={name} type="hidden" value={serialized} /><div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-1.5"><ToolButton active={editor?.isActive('bold') ?? false} disabled={!editor} label="Bold" onClick={() => editor?.chain().focus().toggleBold().run()}><Bold /></ToolButton><ToolButton active={editor?.isActive('italic') ?? false} disabled={!editor} label="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic /></ToolButton><ToolButton active={editor?.isActive('heading', { level: 2 }) ?? false} disabled={!editor} label="Heading level 2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 /></ToolButton><ToolButton active={editor?.isActive('heading', { level: 3 }) ?? false} disabled={!editor} label="Heading level 3" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 /></ToolButton><ToolButton active={editor?.isActive('bulletList') ?? false} disabled={!editor} label="Bulleted list" onClick={() => editor?.chain().focus().toggleBulletList().run()}><List /></ToolButton><ToolButton active={editor?.isActive('orderedList') ?? false} disabled={!editor} label="Numbered list" onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered /></ToolButton><ToolButton active={editor?.isActive('blockquote') ?? false} disabled={!editor} label="Block quote" onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote /></ToolButton><ToolButton active={editor?.isActive('link') ?? false} disabled={!editor} label="Add link" onClick={addLink}><Link2 /></ToolButton></div><EditorContent aria-label={label} className="profile-rich-text min-h-44 px-3 py-2 text-sm leading-6 text-slate-800" editor={editor} /></div>
}

function ToolButton({ active, children, disabled, label, onClick }: { active: boolean; children: React.ReactNode; disabled: boolean; label: string; onClick: () => void }) {
	return <Button aria-label={label} className={active ? 'bg-[#27335a] text-white hover:bg-[#1e294c]' : ''} disabled={disabled} onClick={onClick} size="icon" type="button" variant="ghost">{children}</Button>
}
