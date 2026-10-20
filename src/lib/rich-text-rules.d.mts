export type RichTextNode = { type: string; attrs?: { [key: string]: string | number | null }; content?: RichTextNode[]; marks?: RichTextNode[]; text?: string }

export declare const MAX_LIST_DEPTH: 3

export declare function httpLinkIssue(href: string): string | null

export declare function createRichTextRules(options: {
	unsupportedBlockMessage: string
	allowHardBreak?: boolean
	linkIssue?: (href: string) => string | null
	listDepthMessage?: string
}): {
	validateBlock: (value: unknown, depth?: number) => RichTextNode
	validateInline: (value: unknown) => RichTextNode
}

export declare const BLOCK_LABELS: Record<string, string>

export declare function validateBlocks<T>(blocks: readonly unknown[], validateBlock: (value: unknown) => T): T[]

export declare function validationMessage(error: unknown): string
