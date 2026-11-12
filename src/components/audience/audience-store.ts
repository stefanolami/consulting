'use client'

import { useSyncExternalStore } from 'react'

import {
	AUDIENCE_ATTRIBUTE,
	AUDIENCE_EVENT,
	AUDIENCE_STORAGE_KEY,
	parseAudience,
	type Audience,
} from '@/lib/audiences.mjs'

// The applied audience is the `data-audience` attribute on <html>, set before
// the first paint by the inline script in the locale layout. Everything that
// only looks different per audience (theme colours, highlighted tiles, the
// header label) is CSS on that attribute, so it never flashes. Components
// that need the value in JavaScript (pressed states, the menu's checked
// item, the Services URL) read it through this store.

export function readAudience(): Audience | null {
	return parseAudience(document.documentElement.getAttribute(AUDIENCE_ATTRIBUTE))
}

function applyAudience(audience: Audience | null) {
	if (audience) document.documentElement.setAttribute(AUDIENCE_ATTRIBUTE, audience)
	else document.documentElement.removeAttribute(AUDIENCE_ATTRIBUTE)
	window.dispatchEvent(new Event(AUDIENCE_EVENT))
}

/** Applies and remembers the audience (null for none). Storage failures only lose the memory. */
export function setAudience(audience: Audience | null) {
	try {
		if (audience) window.localStorage.setItem(AUDIENCE_STORAGE_KEY, audience)
		else window.localStorage.removeItem(AUDIENCE_STORAGE_KEY)
	} catch {
		// Private mode or blocked site data: the choice lasts for this page only.
	}
	applyAudience(audience)
}

function subscribe(onChange: () => void) {
	// Another tab changed the stored choice: follow it.
	const onStorage = (event: StorageEvent) => {
		if (event.key === AUDIENCE_STORAGE_KEY) applyAudience(parseAudience(event.newValue))
	}
	window.addEventListener(AUDIENCE_EVENT, onChange)
	window.addEventListener('storage', onStorage)
	return () => {
		window.removeEventListener(AUDIENCE_EVENT, onChange)
		window.removeEventListener('storage', onStorage)
	}
}

// The server (and the hydration pass) render "none"; React then re-renders
// with the attribute's value without a hydration mismatch.
export function useAudience(): Audience | null {
	return useSyncExternalStore(subscribe, readAudience, () => null)
}
