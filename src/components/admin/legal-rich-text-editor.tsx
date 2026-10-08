'use client'

import { Node, type JSONContent } from '@tiptap/core'
import Link from '@tiptap/extension-link'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, CornerDownLeft, Heading2, Heading3, Italic, Link2, List, ListOrdered } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fromEditorDocument, LEGAL_DOCUMENT_VERSION, legalLinkIssue, type LegalDocument } from '@/lib/legal-document.mjs'

// The legal document root carries its contract version (platform doc §11.4).
const LegalDocumentNode = Node.create({
	name: 'doc',
	topNode: true,
	content: 'block*',
	addAttributes() { return { schemaVersion: { default: LEGAL_DOCUMENT_VERSION } } },
})

// Built from CatalogueRichTextEditor with the legal additions: hard breaks
// (Shift+Enter, or the toolbar) and links that may be internal site paths.
// Quotations are not offered: TipTap nests paragraphs in them, which the
// shared contract does not accept, and the legal texts do not use them. The
// hidden field holds the document without TipTap's editor-only attributes.
export function LegalRichTextEditor({ describedBy, id, initialValue, invalid = false, label, name = 'content' }: { describedBy?: string; id: string; initialValue: LegalDocument; invalid?: boolean; label: string; name?: string }) {
	const [value, setValue] = useState<LegalDocument>(initialValue)
	const [notice, setNotice] = useState('')
	const dialogRef = useRef<HTMLDialogElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const [href, setHref] = useState('')
	const [hrefError, setHrefError] = useState<string | null>(null)
	const dialogId = useId()

	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			LegalDocumentNode,
			StarterKit.configure({ blockquote: false, code: false, codeBlock: false, document: false, horizontalRule: false, link: false, strike: false, underline: false, heading: { levels: [2, 3] } }),
			Link.configure({
				autolink: false,
				linkOnPaste: false,
				openOnClick: false,
				HTMLAttributes: { rel: null, target: null },
				isAllowedUri: (url) => legalLinkIssue(url.trim()) === null,
			}),
		],
		content: initialValue as JSONContent,
		onUpdate: ({ editor: current }) => setValue(fromEditorDocument(current.getJSON()) as LegalDocument),
	})
	const active = useEditorState({
		editor,
		selector: ({ editor: current }) => ({
			bold: current?.isActive('bold') ?? false,
			bulletList: current?.isActive('bulletList') ?? false,
			h2: current?.isActive('heading', { level: 2 }) ?? false,
			h3: current?.isActive('heading', { level: 3 }) ?? false,
			italic: current?.isActive('italic') ?? false,
			link: current?.isActive('link') ?? false,
			orderedList: current?.isActive('orderedList') ?? false,
		}),
	})

	// Accessible name, description and error state live on the editable region.
	useEffect(() => {
		editor?.setOptions({ editorProps: { attributes: {
			id,
			role: 'textbox',
			'aria-multiline': 'true',
			'aria-label': label,
			...(describedBy ? { 'aria-describedby': describedBy } : {}),
			...(invalid ? { 'aria-invalid': 'true' } : {}),
		} } })
	}, [describedBy, editor, id, invalid, label])

	function openLinkDialog() {
		if (!editor) return
		if (editor.state.selection.empty && !editor.isActive('link')) {
			setNotice('Select the words to link first, then choose Link.')
			return
		}
		setNotice('')
		setHref(String(editor.getAttributes('link').href ?? ''))
		setHrefError(null)
		dialogRef.current?.showModal()
		inputRef.current?.focus()
	}

	function closeLinkDialog() {
		dialogRef.current?.close()
		editor?.commands.focus()
	}

	function applyLink() {
		const value = href.trim()
		const issue = value ? legalLinkIssue(value) : 'Enter a site path such as /cookie-use, or a full https:// address.'
		if (issue) {
			setHrefError(issue)
			inputRef.current?.focus()
			return
		}
		editor?.chain().focus().extendMarkRange('link').setLink({ href: value }).run()
		dialogRef.current?.close()
	}

	function removeLink() {
		editor?.chain().focus().extendMarkRange('link').unsetLink().run()
		dialogRef.current?.close()
	}

	return (
		<div className={`mt-1.5 overflow-hidden rounded-md border bg-white shadow-xs ${invalid ? 'border-red-500 ring-1 ring-red-500' : 'border-input'}`}>
			<input name={name} type="hidden" value={JSON.stringify(value)} />
			<div aria-label="Formatting" className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-1.5" role="toolbar">
				<ToolButton active={active?.bold ?? false} disabled={!editor} label="Bold" onClick={() => editor?.chain().focus().toggleBold().run()}><Bold /></ToolButton>
				<ToolButton active={active?.italic ?? false} disabled={!editor} label="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic /></ToolButton>
				<ToolButton active={active?.h2 ?? false} disabled={!editor} label="Section heading" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 /></ToolButton>
				<ToolButton active={active?.h3 ?? false} disabled={!editor} label="Subheading" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 /></ToolButton>
				<ToolButton active={active?.bulletList ?? false} disabled={!editor} label="Bulleted list" onClick={() => editor?.chain().focus().toggleBulletList().run()}><List /></ToolButton>
				<ToolButton active={active?.orderedList ?? false} disabled={!editor} label="Numbered list" onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered /></ToolButton>
				<ToolButton active={false} disabled={!editor} label="Line break (Shift+Enter)" onClick={() => editor?.chain().focus().setHardBreak().run()}><CornerDownLeft /></ToolButton>
				<ToolButton active={active?.link ?? false} disabled={!editor} label={active?.link ? 'Edit link' : 'Link'} onClick={openLinkDialog}><Link2 /></ToolButton>
			</div>
			<p aria-live="polite" className="px-3 pt-1 text-xs text-slate-600 empty:hidden">{notice}</p>
			<EditorContent className="profile-rich-text min-h-72 px-3 py-2 text-sm leading-6 text-slate-800" editor={editor} />
			<dialog
				aria-labelledby={`${dialogId}-title`}
				className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-slate-200 p-5 shadow-xl backdrop:bg-slate-950/40"
				onClose={() => editor?.commands.focus()}
				ref={dialogRef}
			>
				<h2 className="font-robo text-xl text-slate-950" id={`${dialogId}-title`}>{active?.link ? 'Edit link' : 'Add link'}</h2>
				{/* Not a <form>: the dialog sits inside the translation form. */}
				<label className="mt-4 grid gap-1.5 text-sm font-medium text-slate-700" htmlFor={`${dialogId}-href`}>Link address</label>
				<Input
					aria-describedby={`${dialogId}-hint${hrefError ? ` ${dialogId}-error` : ''}`}
					aria-invalid={hrefError ? true : undefined}
					className="mt-1.5"
					id={`${dialogId}-href`}
					onChange={(event) => { setHref(event.target.value); setHrefError(null) }}
					onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyLink() } }}
					placeholder="/cookie-use or https://…"
					ref={inputRef}
					value={href}
				/>
				<p className="mt-1.5 text-xs text-slate-600" id={`${dialogId}-hint`}>A page of this website as a path without the language, such as <code>/cookie-use</code> (visitors keep their language), or a full <code>https://</code> address.</p>
				{hrefError ? <p className="mt-2 text-sm text-red-700" id={`${dialogId}-error`}>{hrefError}</p> : null}
				<div className="mt-5 flex flex-wrap justify-end gap-2">
					{active?.link ? <Button onClick={removeLink} type="button" variant="ghost">Remove link</Button> : null}
					<Button onClick={closeLinkDialog} type="button" variant="outline">Cancel</Button>
					<Button onClick={applyLink} type="button">Apply</Button>
				</div>
			</dialog>
		</div>
	)
}

function ToolButton({ active, children, disabled, label, onClick }: { active: boolean; children: React.ReactNode; disabled: boolean; label: string; onClick: () => void }) {
	return <Button aria-label={label} aria-pressed={active} className={active ? 'bg-[#27335a] text-white hover:bg-[#1e294c]' : ''} disabled={disabled} onClick={onClick} size="icon" title={label} type="button" variant="ghost">{children}</Button>
}
