'use client'

import { Node, type AnyExtension, type JSONContent } from '@tiptap/core'
import Link from '@tiptap/extension-link'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, CornerDownLeft, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fromEditorDocument, toEditorDocument } from '@/lib/editor-document.mjs'
import { LEGAL_DOCUMENT_VERSION, legalLinkIssue } from '@/lib/legal-document.mjs'
import { ARTICLE_DOCUMENT_VERSION, articleLinkIssue, catalogueLinkIssue, profileLinkIssue } from '@/lib/rich-text-contracts.mjs'

/*
 * The one rich-text editor of the admin (audit X-04), configured per content
 * type so that it offers exactly what that type's document contract stores:
 * - catalogue and country: headings, lists, quotations, bold, italic and
 *   http(s) links (rich-text-contracts.mjs);
 * - article: the same plus managed image blocks, added by
 *   ArticleRichTextEditor;
 * - profile: paragraphs, lists, line breaks, bold, italic and links;
 * - legal: headings, lists, quotations, line breaks, bold, italic, and links
 *   that may be site paths (legal-document.mjs).
 * Stored documents are loaded through toEditorDocument, and every change is
 * saved as fromEditorDocument(editor.getJSON()), which removes TipTap's
 * editor-only attributes and stores quotations as text. The server validates
 * the result against the same contract.
 */

export type RichTextKind = 'catalogue' | 'country' | 'article' | 'profile' | 'legal'

type Config = {
	headings: boolean
	quotations: boolean
	lineBreaks: boolean
	/** The root's `attrs.schemaVersion`, for contracts that store one. */
	schemaVersion?: number
	linkIssue: (href: string) => string | null
	linkPlaceholder: string
	linkHint: ReactNode
}

const WEB_LINK = { linkPlaceholder: 'https://…', linkHint: <>A full web address, starting with <code>https://</code> or <code>http://</code>.</> }
const CATALOGUE: Config = { headings: true, quotations: true, lineBreaks: false, linkIssue: catalogueLinkIssue, ...WEB_LINK }

export const RICH_TEXT_CONFIGS: Record<RichTextKind, Config> = {
	catalogue: CATALOGUE,
	country: CATALOGUE,
	article: { headings: true, quotations: true, lineBreaks: false, schemaVersion: ARTICLE_DOCUMENT_VERSION, linkIssue: articleLinkIssue, ...WEB_LINK },
	profile: { headings: false, quotations: false, lineBreaks: true, linkIssue: profileLinkIssue, ...WEB_LINK },
	legal: {
		headings: true,
		quotations: true,
		lineBreaks: true,
		schemaVersion: LEGAL_DOCUMENT_VERSION,
		linkIssue: legalLinkIssue,
		linkPlaceholder: '/cookie-use or https://…',
		linkHint: <>A page of this website as a path without the language, such as <code>/cookie-use</code> (visitors keep their language), or a full <code>https://</code> address.</>,
	},
}

// No contract should store script links; the profile contract's URL rule
// would, so the editor refuses them for every type.
const SCRIPT_SCHEME = /^\s*(javascript|data|vbscript):/i

function linkIssueFor(config: Config, href: string) {
	if (SCRIPT_SCHEME.test(href)) return 'This kind of link is not allowed. Use a web address starting with https://.'
	return config.linkIssue(href)
}

// Whether a URL that TipTap finds while typing or pasting may become a link.
// TipTap passes the text as typed ("www.example.com", "name@example.com")
// and stores it with the scheme linkify adds, so the check uses that form.
function autoLinkAllowed(config: Config, url: string) {
	const value = url.trim()
	const href = /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('/') ? value : value.includes('@') && !value.includes('/') ? `mailto:${value}` : `http://${value}`
	return linkIssueFor(config, href) === null
}

function documentNode(schemaVersion: number) {
	return Node.create({
		name: 'doc',
		topNode: true,
		content: 'block*',
		addAttributes() { return { schemaVersion: { default: schemaVersion } } },
	})
}

function editorExtensions(config: Config, extra: AnyExtension[]): AnyExtension[] {
	return [
		...(config.schemaVersion === undefined ? [] : [documentNode(config.schemaVersion)]),
		StarterKit.configure({
			blockquote: config.quotations ? {} : false,
			code: false,
			codeBlock: false,
			document: config.schemaVersion === undefined ? undefined : false,
			hardBreak: config.lineBreaks ? {} : false,
			heading: config.headings ? { levels: [2, 3] } : false,
			horizontalRule: false,
			link: false,
			strike: false,
			underline: false,
		}),
		Link.configure({
			autolink: true,
			linkOnPaste: true,
			openOnClick: false,
			HTMLAttributes: { class: null, rel: null, target: null },
			isAllowedUri: (url) => autoLinkAllowed(config, url),
		}),
		...extra,
	]
}

// A stable comparison of two documents, whatever the order of their keys and
// whether an empty block lists its (empty) content.
function canonical(value: unknown): string {
	return JSON.stringify(value, (key, item) => {
		if ((key === 'content' || key === 'marks') && Array.isArray(item) && !item.length) return undefined
		return item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item
	})
}

const HEIGHTS = { compact: '[&_.ProseMirror]:min-h-36', default: '[&_.ProseMirror]:min-h-44', tall: '[&_.ProseMirror]:min-h-72' }

export function RichTextEditor<T>({
	describedBy,
	extensions: extra = [],
	id,
	initialValue,
	invalid = false,
	kind,
	label,
	height = 'default',
	name,
	notice: extraNotice,
	onChange,
	toolbar,
}: {
	describedBy?: string
	/** Extensions beyond the contract's text blocks (article image blocks). */
	extensions?: AnyExtension[]
	id?: string
	initialValue: T
	invalid?: boolean
	kind: RichTextKind
	label: string
	height?: keyof typeof HEIGHTS
	/** The hidden form field that carries the document as JSON. */
	name?: string
	/** Shown under the toolbar, for example when image blocks need media first. */
	notice?: ReactNode
	onChange?: (value: T) => void
	/** Extra toolbar buttons, given the editor. */
	toolbar?: (editor: Editor | null) => ReactNode
}) {
	const config = RICH_TEXT_CONFIGS[kind]
	const [value, setValue] = useState<T>(initialValue)
	const valueKey = useRef(canonical(initialValue))
	const onChangeRef = useRef(onChange)
	useEffect(() => { onChangeRef.current = onChange })
	const [notice, setNotice] = useState('')
	const dialogRef = useRef<HTMLDialogElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const [href, setHref] = useState('')
	const [hrefError, setHrefError] = useState<string | null>(null)
	const dialogId = useId()

	// Created once: a new extension list or content would not reach the
	// running editor.
	const [extensions] = useState(() => editorExtensions(config, extra))
	const [content] = useState(() => toEditorDocument(initialValue) as JSONContent)
	const editorProps = useMemo(() => ({ attributes: {
		...(id ? { id } : {}),
		role: 'textbox',
		'aria-multiline': 'true',
		'aria-label': label,
		...(describedBy ? { 'aria-describedby': describedBy } : {}),
		...(invalid ? { 'aria-invalid': 'true' } : {}),
	} }), [describedBy, id, invalid, label])

	const editor = useEditor({
		immediatelyRender: false,
		extensions,
		content,
		editorProps,
		onUpdate: ({ editor: current }) => {
			const next = fromEditorDocument(current.getJSON()) as T
			// TipTap reorders keys and adds a trailing paragraph on focus; only a
			// real change of the stored form counts as an edit.
			const key = canonical(next)
			if (key === valueKey.current) return
			valueKey.current = key
			setValue(next)
			onChangeRef.current?.(next)
		},
	})
	const active = useEditorState({
		editor,
		selector: ({ editor: current }) => ({
			blockquote: current?.isActive('blockquote') ?? false,
			bold: current?.isActive('bold') ?? false,
			bulletList: current?.isActive('bulletList') ?? false,
			h2: current?.isActive('heading', { level: 2 }) ?? false,
			h3: current?.isActive('heading', { level: 3 }) ?? false,
			italic: current?.isActive('italic') ?? false,
			link: current?.isActive('link') ?? false,
			orderedList: current?.isActive('orderedList') ?? false,
		}),
	})

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

	function applyLink() {
		const target = href.trim()
		const issue = target ? linkIssueFor(config, target) : `Enter the link address, such as ${config.linkPlaceholder}`
		if (issue) {
			setHrefError(issue)
			inputRef.current?.focus()
			return
		}
		// The cursor ends up after the link, so typing carries on rather than
		// replacing the linked words.
		if (editor) {
			editor.chain().extendMarkRange('link').setLink({ href: target }).run()
			editor.commands.setTextSelection(editor.state.selection.to)
		}
		dialogRef.current?.close()
	}

	function removeLink() {
		editor?.chain().extendMarkRange('link').unsetLink().run()
		dialogRef.current?.close()
	}

	const run = (command: (current: Editor) => void) => () => { if (editor) command(editor) }

	return (
		<div className={`overflow-hidden rounded-md border bg-white shadow-xs focus-within:ring-2 focus-within:ring-[#27335a]/50 ${invalid ? 'border-red-500 ring-1 ring-red-500' : 'border-input'}`}>
			{name ? <input name={name} type="hidden" value={JSON.stringify(value)} /> : null}
			<div aria-label={`${label} formatting`} className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-1.5" role="toolbar">
				<ToolButton active={active?.bold ?? false} disabled={!editor} label="Bold" onClick={run((current) => current.chain().focus().toggleBold().run())}><Bold /></ToolButton>
				<ToolButton active={active?.italic ?? false} disabled={!editor} label="Italic" onClick={run((current) => current.chain().focus().toggleItalic().run())}><Italic /></ToolButton>
				{config.headings ? <>
					<ToolButton active={active?.h2 ?? false} disabled={!editor} label="Heading" onClick={run((current) => current.chain().focus().toggleHeading({ level: 2 }).run())}><Heading2 /></ToolButton>
					<ToolButton active={active?.h3 ?? false} disabled={!editor} label="Subheading" onClick={run((current) => current.chain().focus().toggleHeading({ level: 3 }).run())}><Heading3 /></ToolButton>
				</> : null}
				<ToolButton active={active?.bulletList ?? false} disabled={!editor} label="Bulleted list" onClick={run((current) => current.chain().focus().toggleBulletList().run())}><List /></ToolButton>
				<ToolButton active={active?.orderedList ?? false} disabled={!editor} label="Numbered list" onClick={run((current) => current.chain().focus().toggleOrderedList().run())}><ListOrdered /></ToolButton>
				{config.quotations ? <ToolButton active={active?.blockquote ?? false} disabled={!editor} label="Quotation" onClick={run((current) => current.chain().focus().toggleBlockquote().run())}><Quote /></ToolButton> : null}
				{config.lineBreaks ? <ToolButton active={false} disabled={!editor} label="Line break (Shift+Enter)" onClick={run((current) => current.chain().focus().setHardBreak().run())}><CornerDownLeft /></ToolButton> : null}
				<ToolButton active={active?.link ?? false} disabled={!editor} label={active?.link ? 'Edit link' : 'Link'} onClick={openLinkDialog}><Link2 /></ToolButton>
				{toolbar?.(editor)}
			</div>
			{extraNotice}
			<p aria-live="polite" className="px-3 pt-1 text-xs text-slate-600 empty:hidden">{notice}</p>
			{/* The editable element fills the whole box, so a click anywhere in it
			    places the cursor; clicks on the wrapper itself go to the end. */}
			<EditorContent
				className={`${EDITING_AREA_CLASS} ${HEIGHTS[height]}`}
				editor={editor}
				onMouseDown={(event) => {
					if (event.target !== event.currentTarget || !editor) return
					event.preventDefault()
					editor.commands.focus('end')
				}}
			/>
			<dialog
				aria-labelledby={`${dialogId}-title`}
				className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-slate-200 p-5 shadow-xl backdrop:bg-slate-950/40"
				// Closing returns focus to the Link button; the close event comes
				// after that, so the text takes it back here.
				onClose={() => editor?.view.focus()}
				ref={dialogRef}
			>
				<h2 className="font-robo text-xl text-slate-950" id={`${dialogId}-title`}>{active?.link ? 'Edit link' : 'Add link'}</h2>
				{/* Not a <form>: the dialog sits inside the editor's form. */}
				<label className="mt-4 grid gap-1.5 text-sm font-medium text-slate-700" htmlFor={`${dialogId}-href`}>Link address</label>
				<Input
					aria-describedby={`${dialogId}-hint${hrefError ? ` ${dialogId}-error` : ''}`}
					aria-invalid={hrefError ? true : undefined}
					className="mt-1.5"
					id={`${dialogId}-href`}
					onChange={(event) => { setHref(event.target.value); setHrefError(null) }}
					onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyLink() } }}
					placeholder={config.linkPlaceholder}
					ref={inputRef}
					value={href}
				/>
				<p className="mt-1.5 text-xs text-slate-600" id={`${dialogId}-hint`}>{config.linkHint}</p>
				{hrefError ? <p className="mt-2 text-sm text-red-700" id={`${dialogId}-error`}>{hrefError}</p> : null}
				<div className="mt-5 flex flex-wrap justify-end gap-2">
					{active?.link ? <Button onClick={removeLink} type="button" variant="ghost">Remove link</Button> : null}
					<Button onClick={() => dialogRef.current?.close()} type="button" variant="outline">Cancel</Button>
					<Button onClick={applyLink} type="button">Apply</Button>
				</div>
			</dialog>
		</div>
	)
}

// Shows the document structure while editing: headings stand out, lists keep
// their markers, quotations are set off and links are underlined. The public
// templates style the content themselves.
const EDITING_AREA_CLASS = [
	'text-sm leading-6 text-slate-800',
	'[&_.ProseMirror]:cursor-text [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror]:outline-none',
	'[&_.ProseMirror>*+*]:mt-3',
	'[&_h2]:pt-3 [&_h2]:font-robo [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-7 [&_h2]:text-slate-950',
	'[&_h3]:pt-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900',
	'[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:mt-1 [&_li]:marker:text-slate-500',
	'[&_blockquote]:border-l-4 [&_blockquote]:border-[#27335a]/40 [&_blockquote]:bg-slate-50 [&_blockquote]:py-1 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-700',
	'[&_a]:text-[#1d4ed8] [&_a]:underline [&_a]:underline-offset-2',
	'[&_strong]:font-semibold [&_em]:italic',
].join(' ')

// A press keeps the focus (and the selection) in the text; keyboard users
// reach the buttons with Tab and the command returns them to the text.
export function ToolButton({ active, children, disabled, label, onClick }: { active: boolean; children: ReactNode; disabled: boolean; label: string; onClick: () => void }) {
	return <Button aria-label={label} aria-pressed={active} className={active ? 'bg-[#27335a] text-white hover:bg-[#1e294c]' : ''} disabled={disabled} onClick={onClick} onMouseDown={(event) => event.preventDefault()} size="icon" title={label} type="button" variant="ghost">{children}</Button>
}
