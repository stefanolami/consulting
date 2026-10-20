'use client'

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

/*
 * The admin's in-page confirmation (audit MED-03, LEG-02, slice 4): a modal
 * <dialog> instead of window.confirm, so it is styled, keyboard-accessible
 * (focus starts on the safe choice, Escape cancels) and does not block the
 * page. The unsaved-changes guard (slice 1) uses the same dialog.
 */
export function ConfirmDialog({ cancelLabel = 'Cancel', children, confirmLabel, onResolve, open, title, tone = 'destructive' }: {
	cancelLabel?: string
	children?: ReactNode
	confirmLabel: string
	onResolve: (confirmed: boolean) => void
	open: boolean
	title: ReactNode
	tone?: 'destructive' | 'default'
}) {
	const dialogRef = useRef<HTMLDialogElement>(null)
	const id = useId()
	useEffect(() => {
		const dialog = dialogRef.current
		if (!dialog) return
		if (open && !dialog.open) dialog.showModal()
		if (!open && dialog.open) dialog.close()
	}, [open])
	return (
		<dialog
			aria-describedby={children ? `${id}-description` : undefined}
			aria-labelledby={`${id}-title`}
			className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-slate-200 p-5 shadow-xl backdrop:bg-slate-950/40"
			// Escape closes the dialog: that is a cancel.
			onClose={() => { if (open) onResolve(false) }}
			ref={dialogRef}
		>
			<h2 className="font-robo text-xl text-slate-950" id={`${id}-title`}>{title}</h2>
			{children ? <div className="mt-2 space-y-2 text-sm leading-6 text-slate-600" id={`${id}-description`}>{children}</div> : null}
			<div className="mt-5 flex flex-wrap justify-end gap-2">
				<Button autoFocus onClick={() => onResolve(false)} type="button" variant="outline">{cancelLabel}</Button>
				<Button onClick={() => onResolve(true)} type="button" variant={tone === 'destructive' ? 'destructive' : 'default'}>{confirmLabel}</Button>
			</div>
		</dialog>
	)
}

type Request = { title: ReactNode; body?: ReactNode; confirmLabel: string; cancelLabel?: string; tone?: 'destructive' | 'default' }

/**
 * `confirm(request)` opens the dialog and resolves true when the editor
 * confirms; render `dialog` once in the component.
 */
export function useConfirm() {
	const [request, setRequest] = useState<Request | null>(null)
	const resolver = useRef<((confirmed: boolean) => void) | null>(null)
	const confirm = useCallback((next: Request) => {
		resolver.current?.(false)
		return new Promise<boolean>((resolve) => {
			resolver.current = resolve
			setRequest(next)
		})
	}, [])
	const resolve = useCallback((confirmed: boolean) => {
		const done = resolver.current
		resolver.current = null
		setRequest(null)
		done?.(confirmed)
	}, [])
	// A pending request resolves as cancelled if the component goes away.
	useEffect(() => () => { resolver.current?.(false) }, [])
	const dialog = (
		<ConfirmDialog cancelLabel={request?.cancelLabel} confirmLabel={request?.confirmLabel ?? 'Confirm'} onResolve={resolve} open={Boolean(request)} title={request?.title ?? ''} tone={request?.tone}>
			{request?.body}
		</ConfirmDialog>
	)
	return { confirm, dialog }
}
