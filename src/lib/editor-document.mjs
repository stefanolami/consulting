// Converts between the controlled rich-text documents that are stored (the
// contracts in rich-text-contracts.mjs and legal-document.mjs) and the JSON
// that the TipTap editor reads and writes (audit X-04). The shared admin
// editor (src/components/admin/rich-text-editor.tsx) loads stored documents
// through toEditorDocument and saves fromEditorDocument(editor.getJSON()); the
// server validates the result against the strict contract. Plain JavaScript
// with a `.d.mts` declaration so the node:test suites can import it.

const isNode = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const isInline = (node) => isNode(node) && (node.type === 'text' || node.type === 'hardBreak')
const isEmptyParagraph = (node) => isNode(node) && node.type === 'paragraph' && !(Array.isArray(node.content) && node.content.length)

function cleanNode(value) {
	if (!isNode(value)) return value
	const node = { ...value }
	if (node.type === 'link' && isNode(node.attrs)) node.attrs = { href: node.attrs.href }
	if (node.type === 'orderedList' && isNode(node.attrs)) {
		if (node.attrs.start === undefined || node.attrs.start === null) delete node.attrs
		else node.attrs = { start: node.attrs.start }
	}
	if (node.type === 'paragraph') delete node.attrs
	if (node.type === 'hardBreak') { delete node.marks; delete node.attrs }
	if (node.type === 'text' && Array.isArray(node.marks) && !node.marks.length) delete node.marks
	if (Array.isArray(node.marks)) node.marks = node.marks.map(cleanNode)
	if (Array.isArray(node.content)) node.content = node.content.flatMap(cleanChild)
	return node
}

// TipTap nests paragraphs in a quotation; the contracts store a quotation as
// one block of text. A quotation of N paragraphs becomes N quotations, in
// order (empty paragraphs are dropped). A quotation that holds anything else,
// such as a list, is left as it is for the validator to explain.
function cleanChild(value) {
	const node = cleanNode(value)
	if (!isNode(node) || node.type !== 'blockquote' || !Array.isArray(node.content)) return [node]
	if (!node.content.length || node.content.every(isInline)) return [node]
	if (!node.content.every((child) => isNode(child) && child.type === 'paragraph')) return [node]
	const paragraphs = node.content.filter((child) => !isEmptyParagraph(child))
	if (!paragraphs.length) return [{ type: 'blockquote' }]
	return paragraphs.map((paragraph) => ({ type: 'blockquote', content: paragraph.content }))
}

/**
 * The stored form of TipTap's JSON. Removes the attributes the editor adds but
 * the contracts do not store (link `target`, `rel`, `class` and `title`; the
 * ordered-list `type`; paragraph attributes; marks that a hard break inherits;
 * empty mark lists) and turns quotations of paragraphs into quotations of
 * text. Everything else, including empty paragraphs, is kept as the editor
 * wrote it, and anything unsupported is left for the validator to reject.
 */
export function fromEditorDocument(value) {
	return Array.isArray(value) ? value.flatMap(cleanChild) : cleanNode(value)
}

/** The editor form of a stored document: quotations of text get the paragraph TipTap expects. */
export function toEditorDocument(value) {
	if (Array.isArray(value)) return value.map(toEditorDocument)
	if (!isNode(value)) return value
	const node = { ...value }
	if (node.type === 'blockquote' && (!Array.isArray(node.content) || node.content.every(isInline))) {
		return { type: 'blockquote', content: [Array.isArray(node.content) && node.content.length ? { type: 'paragraph', content: node.content } : { type: 'paragraph' }] }
	}
	if (Array.isArray(node.content)) node.content = node.content.map(toEditorDocument)
	return node
}
