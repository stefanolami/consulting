export type RichTextNode = { type: string; attrs?: { [key: string]: string | number | null }; content?: RichTextNode[]; marks?: RichTextNode[]; text?: string }

export declare const MAX_LIST_DEPTH: 3

export declare function httpLinkIssue(href: string): string | null

export declare function createRichTextRules(options: {
	unsupportedBlockMessage: string
	allowHardBreak?: boolean
	linkIssue?: (href: string) => string | null
}): {
	validateBlock: (value: unknown, depth?: number) => RichTextNode
	validateInline: (value: unknown) => RichTextNode
}

export declare function validationMessage(error: unknown): string
