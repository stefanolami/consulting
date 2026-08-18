import { emptyCatalogueDocument, parseCatalogueDocument } from '@/lib/catalogue-document'

// Articles use the same deliberately small TipTap subset as catalogue content.
// Keeping the validator separate gives the newsroom a stable contract if its
// approved block set needs to evolve independently later.
export const emptyArticleDocument = emptyCatalogueDocument
export const parseArticleDocument = parseCatalogueDocument
