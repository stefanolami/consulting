'use client'

import { LoaderCircle } from 'lucide-react'
import {
	cloneElement,
	createContext,
	isValidElement,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	useTransition,
	type FormEvent,
	type FormHTMLAttributes,
	type ReactElement,
	type ReactNode,
} from 'react'

import { useUnsavedChanges } from '@/components/admin/form/unsaved-changes'
import { Button, type ButtonProps } from '@/components/ui/button'
import { failureSummary, formSnapshot, type AdminActionResult, type FieldErrors } from '@/lib/admin-form-state.mjs'
import { cn } from '@/lib/utils'

/*
 * The shared admin form layer (audit slice 1, built from the legal editor in
 * control tower §15.11):
 * - forms are dispatched from onSubmit with preventDefault, so React's form
 *   action and the form reset that follows it never run: after a save the
 *   fields keep exactly what was saved, and after a failed save everything
 *   typed stays;
 * - the action's field errors appear next to their fields (aria-invalid,
 *   aria-describedby) with focus on the first one, and one summary appears
 *   next to the button;
 * - the submit button is disabled with a spinner while saving, and a second
 *   submit is ignored;
 * - every form registers with the unsaved-changes guard.
 */

type Action<V> = (formData: FormData) => Promise<AdminActionResult<V>>
type Outcome<V> = { result: AdminActionResult<V> | null; savedAt: Date | null; fieldErrors: FieldErrors; unmarked: string[] }

const NETWORK_ERROR = 'The save did not reach the server. Your changes are still here; check the connection and try again.'
const FOCUSABLE = 'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), [contenteditable="true"], button:not(:disabled), [tabindex]:not([tabindex="-1"])'

type FormContext = { fieldErrors: FieldErrors }
const AdminFormContext = createContext<FormContext | null>(null)

export type AdminFormApi<V> = {
	/** The form element's callback ref. */
	attach: (form: HTMLFormElement | null) => void
	pending: boolean
	outcome: Outcome<V>
	context: FormContext
	submit: (event: FormEvent<HTMLFormElement>) => void
	onEdit: (event: FormEvent<HTMLFormElement>) => void
	captureBaseline: () => void
	/** Whether the fields differ from the last save (or from the first edit). */
	isDirty: () => boolean
	/** Treats the current values as saved, for example after an upload set a field. */
	resetBaseline: () => void
}

function snapshotOf(form: HTMLFormElement | null) {
	return form ? formSnapshot(new FormData(form) as unknown as Iterable<[string, FormDataEntryValue]>) : null
}

function focusInvalidField(form: HTMLFormElement | null) {
	const field = form?.querySelector<HTMLElement>('[data-field-invalid]')
	if (!field) return
	// The marked control, else the first input, editor or other control inside
	// (not one in a closed dialog, such as a rich-text editor's link dialog).
	const target = field.querySelector<HTMLElement>('[aria-invalid="true"]')
		?? field.querySelector<HTMLElement>('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not(:disabled):not(dialog *), select:not(:disabled):not(dialog *), textarea:not(:disabled):not(dialog *)')
		?? field.querySelector<HTMLElement>('[contenteditable="true"]')
		?? field.querySelector<HTMLElement>(FOCUSABLE)
	target?.focus()
}

export function useAdminForm<V = undefined>({ action, guard = true, label, onSuccess, resetOnSuccess = false, scope }: {
	action: Action<V>
	/** Register with the unsaved-changes guard (default true). */
	guard?: boolean
	/** How the unsaved-changes dialog names this form, for example "the German translation". */
	label: string
	onSuccess?: (result: AdminActionResult<V>) => void
	/** Empty the form after a successful save (upload and create-another forms). */
	resetOnSuccess?: boolean
	/** Groups forms for the language-tab check (LocaleTabs `scope`). */
	scope?: string
}): AdminFormApi<V> {
	const formRef = useRef<HTMLFormElement>(null)
	const baseline = useRef<string | null>(null)
	const inFlight = useRef(false)
	const submitter = useRef<HTMLElement | null>(null)
	const onSuccessRef = useRef(onSuccess)
	const [pending, startTransition] = useTransition()
	const [outcome, setOutcome] = useState<Outcome<V>>({ result: null, savedAt: null, fieldErrors: {}, unmarked: [] })
	const unsaved = useUnsavedChanges()

	useEffect(() => { onSuccessRef.current = onSuccess })

	// The baseline is taken when the editor first focuses or presses inside
	// the form, after rich-text editors have settled their initial content.
	const captureBaseline = useCallback(() => {
		if (baseline.current === null) baseline.current = snapshotOf(formRef.current)
	}, [])
	const isDirty = useCallback(() => {
		if (baseline.current === null) return false
		const current = snapshotOf(formRef.current)
		return current !== null && current !== baseline.current
	}, [])
	const resetBaseline = useCallback(() => { baseline.current = null }, [])
	const attach = useCallback((form: HTMLFormElement | null) => { formRef.current = form }, [])

	useEffect(() => {
		if (!guard || !unsaved) return
		return unsaved.register({ isDirty, label, scope })
	}, [guard, isDirty, label, scope, unsaved])

	// After a failed save, move focus to the first field marked invalid. The
	// disabled submit button loses focus while saving; give it back after a
	// save so keyboard users stay where they were.
	// Only a new result moves focus; clearing an error while typing does not.
	const { result } = outcome
	useEffect(() => {
		if (!result) return
		if (!result.ok && Object.keys(result.fieldErrors ?? {}).length) {
			focusInvalidField(formRef.current)
			return
		}
		if (!document.activeElement || document.activeElement === document.body) submitter.current?.focus()
	}, [result])

	const submit = useCallback((event: FormEvent<HTMLFormElement>) => {
		// Preventing the default skips React's form action and its reset.
		event.preventDefault()
		if (inFlight.current) return
		const form = event.currentTarget
		const formData = new FormData(form)
		const submitted = snapshotOf(form)
		submitter.current = (event.nativeEvent as SubmitEvent).submitter ?? null
		inFlight.current = true
		startTransition(async () => {
			let result: AdminActionResult<V>
			try {
				result = await action(formData)
			} catch {
				result = { ok: false, formError: NETWORK_ERROR }
			}
			inFlight.current = false
			const fieldErrors = result.ok ? {} : result.fieldErrors ?? {}
			// Errors for fields that have no marked field are repeated in the summary.
			const unmarked = Object.keys(fieldErrors).filter((name) => !formRef.current?.querySelector(`[data-field="${CSS.escape(name)}"]`))
			startTransition(() => {
				setOutcome({ result, savedAt: result.ok ? new Date() : null, fieldErrors, unmarked })
				if (!result.ok) return
				if (resetOnSuccess) {
					formRef.current?.reset()
					baseline.current = null
				} else {
					baseline.current = submitted
				}
				onSuccessRef.current?.(result)
			})
		})
	}, [action, resetOnSuccess])

	// Editing clears the success notice and the error of the edited field.
	const onEdit = useCallback((event: FormEvent<HTMLFormElement>) => {
		const field = event.target instanceof Element ? event.target.closest('[data-field]')?.getAttribute('data-field') : null
		setOutcome((current) => {
			if (!current.result) return current
			if (current.result.ok) return { result: null, savedAt: null, fieldErrors: {}, unmarked: [] }
			if (!field || !(field in current.fieldErrors)) return current
			const fieldErrors = { ...current.fieldErrors }
			delete fieldErrors[field]
			return { ...current, fieldErrors }
		})
	}, [])

	const context = useMemo(() => ({ fieldErrors: outcome.fieldErrors }), [outcome.fieldErrors])

	return { attach, captureBaseline, context, isDirty, onEdit, outcome, pending, resetBaseline, submit }
}

// A submit before hydration goes nowhere: React renders a function action as
// a no-op URL, and after hydration onSubmit prevents it from running.
function blockedAction() {}

export function AdminForm<V>({ children, className, form, ...props }: { children: ReactNode; className?: string; form: AdminFormApi<V> } & Omit<FormHTMLAttributes<HTMLFormElement>, 'action' | 'onSubmit' | 'children' | 'className'>) {
	const { attach, captureBaseline, context, onEdit, pending, submit } = form
	return (
		<AdminFormContext.Provider value={context}>
			<form
				{...props}
				action={blockedAction}
				aria-busy={pending || undefined}
				className={className}
				noValidate
				onChange={onEdit}
				onFocusCapture={captureBaseline}
				onInput={onEdit}
				onPointerDownCapture={captureBaseline}
				onSubmit={submit}
				ref={attach}
			>
				{children}
			</form>
		</AdminFormContext.Provider>
	)
}

function useFieldError(name: string | undefined) {
	const context = useContext(AdminFormContext)
	return name ? context?.fieldErrors[name] : undefined
}

function RequiredMark() {
	return <><span aria-hidden="true" className="text-red-700"> *</span><span className="sr-only"> (required)</span></>
}

type ControlProps = { id?: string; className?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean | 'true' | 'false' }

/**
 * A labelled form control. The single child receives the id, and while the
 * last save rejected the field named `name`, aria-invalid and an
 * aria-describedby that points at the error shown below it.
 */
export function Field({ addon, children, className, hint, label, name, required = false }: { addon?: ReactNode; children: ReactElement<ControlProps>; className?: string; hint?: ReactNode; label: ReactNode; name?: string; required?: boolean }) {
	const generated = useId()
	const error = useFieldError(name)
	const child = isValidElement(children) ? children : null
	const id = child?.props.id ?? generated
	const hintId = hint ? `${id}-hint` : undefined
	const errorId = error ? `${id}-error` : undefined
	const describedBy = [child?.props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined
	const control = child ? cloneElement(child, { id, 'aria-describedby': describedBy, ...(error ? { 'aria-invalid': true, className: cn(child.props.className, 'border-red-500 ring-1 ring-red-500') } : {}) }) : children
	return (
		<div className={cn('grid content-start gap-1.5 text-sm', className)} data-field={name} data-field-invalid={error ? '' : undefined}>
			<label className="font-medium text-slate-700" htmlFor={id}>{label}{required ? <RequiredMark /> : null}</label>
			{addon ? <div className="flex gap-2">{control}{addon}</div> : control}
			{hint ? <span className="text-xs text-slate-500" id={hintId}>{hint}</span> : null}
			{error ? <p className="text-sm text-red-700" id={errorId}>{error}</p> : null}
		</div>
	)
}

/**
 * A labelled group of controls (a rich-text editor, a picker, a list of rows)
 * that is validated as one field `name`.
 */
export function FieldGroup({ children, className, hint, id: givenId, label, name, required = false }: { children: ReactNode; className?: string; hint?: ReactNode; id?: string; label: ReactNode; name?: string; required?: boolean }) {
	const generated = useId()
	// With an id, the hint and error ids are `${id}-hint` and `${id}-error`,
	// so a control inside can point at them.
	const id = givenId ?? generated
	const error = useFieldError(name)
	const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
	return (
		<div aria-describedby={describedBy} aria-labelledby={`${id}-label`} className={cn('grid content-start gap-1.5 text-sm', className)} data-field={name} data-field-invalid={error ? '' : undefined} role="group">
			<span className="font-medium text-slate-700" id={`${id}-label`}>{label}{required ? <RequiredMark /> : null}</span>
			{hint ? <span className="text-sm text-slate-600" id={`${id}-hint`}>{hint}</span> : null}
			{children}
			{error ? <p className="text-sm text-red-700" id={`${id}-error`}>{error}</p> : null}
		</div>
	)
}

/**
 * Marks controls that the editor lays out itself (a roles list, a structured
 * document) as the field `name`: its error appears below them and focus goes
 * to the first control inside.
 */
export function FieldSlot({ children, className, name }: { children: ReactNode; className?: string; name: string }) {
	const error = useFieldError(name)
	const id = useId()
	return (
		<div aria-describedby={error ? id : undefined} className={className} data-field={name} data-field-invalid={error ? '' : undefined}>
			{children}
			{error ? <p className="mt-2 text-sm text-red-700" id={id}>{error}</p> : null}
		</div>
	)
}

export function SubmitButton({ children, pending, pendingLabel = 'Saving…', ...props }: ButtonProps & { pending: boolean; pendingLabel?: string }) {
	return (
		<Button {...props} disabled={pending || props.disabled} type="submit">
			{pending ? <><LoaderCircle aria-hidden="true" className="animate-spin" />{pendingLabel}</> : children}
		</Button>
	)
}

function savedTime(date: Date) {
	return new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' }).format(date)
}

/** Success or failure of the last action, shown next to the button that ran it. */
export function ResultNotice({ className, renderedFieldsMarked = true, result, savedAt, unmarked = [] }: { className?: string; renderedFieldsMarked?: boolean; result: AdminActionResult<unknown> | null; savedAt: Date | null; unmarked?: string[] }) {
	if (!result) return null
	if (result.ok) {
		return (
			<p className={cn('rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800', className)} role="status">
				{result.success ?? 'Saved.'}{savedAt ? <span className="text-emerald-700"> Last saved at {savedTime(savedAt)}.</span> : null}
			</p>
		)
	}
	const fieldErrors = result.fieldErrors ?? {}
	const marked = renderedFieldsMarked ? Object.keys(fieldErrors).filter((name) => !unmarked.includes(name)) : []
	const lines = failureSummary({ ...result, fieldErrors }, marked) ?? []
	return (
		<div className={cn('space-y-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800', className)} role="alert">
			{lines.map((line, index) => <p key={index}>{line}</p>)}
		</div>
	)
}

/** The submit button, any secondary buttons, and the notice for this form. */
export function FormActions<V>({ children, className, form, label, pendingLabel }: { children?: ReactNode; className?: string; form: AdminFormApi<V>; label: ReactNode; pendingLabel?: string }) {
	const { outcome } = form
	// Field errors that were cleared by editing are no longer counted.
	const result = outcome.result && !outcome.result.ok ? { ...outcome.result, fieldErrors: outcome.fieldErrors } : outcome.result
	return (
		<div className={cn('grid gap-3', className)}>
			<div className="flex flex-wrap items-center gap-3">
				<SubmitButton pending={form.pending} pendingLabel={pendingLabel}>{label}</SubmitButton>
				{children}
			</div>
			<ResultNotice result={result && !result.ok && !result.formError && !Object.keys(result.fieldErrors ?? {}).length ? null : result} savedAt={outcome.savedAt} unmarked={outcome.unmarked} />
		</div>
	)
}

/**
 * An action run by a button rather than a form (archive, restore, reorder,
 * enable). `run` sends the given values; a second run while one is pending
 * is ignored. `key` tells which of several buttons is pending.
 */
export function useAdminCommand<V = undefined>(action: Action<V>, options: { onSuccess?: (result: AdminActionResult<V>) => void } = {}) {
	const [pending, startTransition] = useTransition()
	const [state, setState] = useState<{ key: string | null; result: AdminActionResult<V> | null; savedAt: Date | null }>({ key: null, result: null, savedAt: null })
	const inFlight = useRef(false)
	const onSuccessRef = useRef(options.onSuccess)
	useEffect(() => { onSuccessRef.current = options.onSuccess })
	const run = useCallback((values: Record<string, string>, key: string | null = null) => {
		if (inFlight.current) return
		inFlight.current = true
		const formData = new FormData()
		for (const [name, value] of Object.entries(values)) formData.set(name, value)
		setState({ key, result: null, savedAt: null })
		startTransition(async () => {
			let result: AdminActionResult<V>
			try {
				result = await action(formData)
			} catch {
				result = { ok: false, formError: NETWORK_ERROR }
			}
			inFlight.current = false
			startTransition(() => {
				setState({ key, result, savedAt: result.ok ? new Date() : null })
				if (result.ok) onSuccessRef.current?.(result)
			})
		})
	}, [action])
	const clear = useCallback(() => setState({ key: null, result: null, savedAt: null }), [])
	return { clear, key: state.key, pending, result: state.result, run, savedAt: state.savedAt }
}

export function CommandNotice({ className, command }: { className?: string; command: { result: AdminActionResult<unknown> | null; savedAt: Date | null } }) {
	return <ResultNotice className={className} renderedFieldsMarked={false} result={command.result} savedAt={command.savedAt} />
}

/** A button that runs a command, with its own pending state. */
export function CommandButton({ children, pending, pendingLabel = 'Saving…', ...props }: ButtonProps & { pending: boolean; pendingLabel?: string }) {
	return (
		<Button type="button" {...props} disabled={pending || props.disabled}>
			{pending ? <><LoaderCircle aria-hidden="true" className="animate-spin" />{pendingLabel}</> : children}
		</Button>
	)
}
