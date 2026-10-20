'use client'

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

type Entry = { isDirty: () => boolean; label: string; scope?: string }
type Reason = 'close' | 'leave' | 'switch'
type UnsavedChanges = {
	/** Registers a form; returns the cleanup. */
	register: (entry: Entry) => () => void
	/** Labels of the forms with unsaved changes, optionally in one scope. */
	dirtyLabels: (scope?: string) => string[]
	/** Resolves true when nothing is unsaved or the editor chooses to discard. */
	confirmDiscard: (options?: { reason?: Reason; scope?: string }) => Promise<boolean>
}

const UnsavedChangesContext = createContext<UnsavedChanges | null>(null)

export function useUnsavedChanges() {
	return useContext(UnsavedChangesContext)
}

/**
 * Guards edited admin forms (audit X-06, X-08): an in-page dialog before an
 * in-app link or a language tab discards unsaved changes, and the browser's
 * own prompt (beforeunload) before the tab is closed or reloaded. Forms
 * register through useAdminForm. Back and forward buttons are not
 * intercepted.
 */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
	const router = useRouter()
	const entries = useRef(new Set<Entry>())
	const resolver = useRef<((discard: boolean) => void) | null>(null)
	const dialogRef = useRef<HTMLDialogElement>(null)
	const [request, setRequest] = useState<{ labels: string[]; reason: Reason } | null>(null)
	const id = useId()

	const dirtyLabels = useCallback((scope?: string) => [...entries.current].filter((entry) => (scope === undefined || entry.scope === scope) && entry.isDirty()).map((entry) => entry.label), [])
	const register = useCallback((entry: Entry) => {
		entries.current.add(entry)
		return () => { entries.current.delete(entry) }
	}, [])
	const confirmDiscard = useCallback((options: { reason?: Reason; scope?: string } = {}) => {
		const labels = dirtyLabels(options.scope)
		if (!labels.length) return Promise.resolve(true)
		resolver.current?.(false)
		return new Promise<boolean>((resolve) => {
			resolver.current = resolve
			setRequest({ labels, reason: options.reason ?? 'leave' })
		})
	}, [dirtyLabels])

	useEffect(() => {
		if (request && !dialogRef.current?.open) dialogRef.current?.showModal()
	}, [request])

	function settle(discard: boolean) {
		const resolve = resolver.current
		resolver.current = null
		setRequest(null)
		if (dialogRef.current?.open) dialogRef.current.close()
		resolve?.(discard)
	}

	useEffect(() => {
		// Capture on window runs before React's own listeners, so a Next.js
		// Link does not start navigating while the dialog is open.
		function onClick(event: MouseEvent) {
			if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
			const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
			if (!(anchor instanceof HTMLAnchorElement) || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return
			const url = new URL(anchor.href, window.location.href)
			// Other sites are covered by beforeunload; same-page anchors keep the form.
			if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return
			if (!dirtyLabels().length) return
			event.preventDefault()
			event.stopPropagation()
			void confirmDiscard({ reason: 'leave' }).then((discard) => { if (discard) router.push(`${url.pathname}${url.search}${url.hash}`) })
		}
		function onBeforeUnload(event: BeforeUnloadEvent) {
			if (!dirtyLabels().length) return
			event.preventDefault()
			event.returnValue = ''
		}
		window.addEventListener('click', onClick, true)
		window.addEventListener('beforeunload', onBeforeUnload)
		return () => {
			window.removeEventListener('click', onClick, true)
			window.removeEventListener('beforeunload', onBeforeUnload)
		}
	}, [confirmDiscard, dirtyLabels, router])

	const value = useMemo(() => ({ confirmDiscard, dirtyLabels, register }), [confirmDiscard, dirtyLabels, register])
	const labels = request?.labels ?? []
	const where = labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}` : labels[0]

	return (
		<UnsavedChangesContext.Provider value={value}>
			{children}
			<dialog
				aria-describedby={`${id}-description`}
				aria-labelledby={`${id}-title`}
				className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-slate-200 p-5 shadow-xl backdrop:bg-slate-950/40"
				onClose={() => { if (resolver.current) settle(false) }}
				ref={dialogRef}
			>
				<h2 className="font-robo text-xl text-slate-950" id={`${id}-title`}>Discard unsaved changes?</h2>
				<p className="mt-2 text-sm leading-6 text-slate-600" id={`${id}-description`}>
					{where ? <>You have unsaved changes in {where}. </> : null}
					{request?.reason === 'switch' ? 'Switching language discards them.' : request?.reason === 'close' ? 'Continuing discards them.' : 'Leaving this page discards them.'}
				</p>
				<div className="mt-5 flex flex-wrap justify-end gap-2">
					<Button autoFocus onClick={() => settle(false)} type="button" variant="outline">Keep editing</Button>
					<Button onClick={() => settle(true)} type="button" variant="destructive">Discard changes</Button>
				</div>
			</dialog>
		</UnsavedChangesContext.Provider>
	)
}

/** The shell's sign-out form, which asks before discarding unsaved changes. */
export function SignOutForm({ action, children }: { action: () => Promise<void>; children: ReactNode }) {
	const unsaved = useUnsavedChanges()
	const confirmed = useRef(false)
	function onSubmit(event: FormEvent<HTMLFormElement>) {
		if (confirmed.current || !unsaved?.dirtyLabels().length) return
		event.preventDefault()
		const form = event.currentTarget
		void unsaved.confirmDiscard({ reason: 'leave' }).then((discard) => {
			if (!discard) return
			confirmed.current = true
			form.requestSubmit()
		})
	}
	return <form action={action} onSubmit={onSubmit}>{children}</form>
}
