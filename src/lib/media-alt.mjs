// Alt text per use (admin audit X-09, slice 4).
//
// An image has one description in the Media library per locale
// (media_asset_translations.alt_text, "library alt"). A record that shows the
// image may carry its own description of that use ("per-use alt"): today
// partner_translations.alt_text for a partner logo, and the `alt` attribute of
// an inline article image. A record form writes only its own per-use alt and
// never the library alt, so saving one record cannot change what another
// record shows. Everywhere else the library alt is the description.

/** Trimmed text, or null when empty. */
export function cleanAlt(value) {
	return typeof value === 'string' && value.trim() ? value.trim() : null
}

/**
 * The library alt of `assetId` in `locale`, from media_asset_translations
 * rows; with `fallbackLocale`, that locale's text when the first is empty.
 */
export function libraryAlt(rows, assetId, locale, { fallbackLocale } = {}) {
	if (!assetId) return null
	const textIn = (code) => cleanAlt((rows ?? []).find((row) => row.media_asset_id === assetId && row.locale === code)?.alt_text)
	return textIn(locale) ?? (fallbackLocale && fallbackLocale !== locale ? textIn(fallbackLocale) : null)
}

/**
 * The alt text a use shows: its own when set, otherwise the library's.
 * `source` says which, for the admin's hints; `alt` is null when neither
 * exists (renderers then leave the image out, as before).
 */
export function resolveAlt({ useAlt, libraryAlt: library }) {
	const own = cleanAlt(useAlt)
	if (own) return { alt: own, source: 'use' }
	const shared = cleanAlt(library)
	if (shared) return { alt: shared, source: 'library' }
	return { alt: null, source: null }
}
