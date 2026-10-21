import { LIST_LOCALES, type ListLocale } from '@/lib/admin-list-query.mjs'
import { editorialState, type EditorStatus, type StoredPublication } from '@/lib/publication.mjs'

export type LocaleStates = Record<ListLocale, EditorStatus | null>

/** Each locale's state as the admin shows it (scheduled derived from the date), or null when there is no translation. */
export function localeStates(translations: readonly (StoredPublication & { locale: string })[], now = new Date()): LocaleStates {
	return Object.fromEntries(LIST_LOCALES.map((locale) => {
		const translation = translations.find((item) => item.locale === locale)
		return [locale, translation ? editorialState(translation, now).status : null]
	})) as LocaleStates
}
