'use client'

import { CatalogueRichTextEditor } from '@/components/admin/catalogue-rich-text-editor'
import type { Json } from '@/types/database.generated'

export function ArticleRichTextEditor({ initialValue }: { initialValue: Json }) {
	return <CatalogueRichTextEditor initialValue={initialValue} />
}
