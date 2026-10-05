'use client'

import { CircleAlert, CircleCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useRef, useState, type FormEvent } from 'react'

import { Link } from '@/i18n/navigation'
import { submitContactForm, type ContactFormState } from '@/lib/contact/contact-action'
import { CONTACT_FIELDS, CONTACT_LIMITS, HONEYPOT_FIELD, parseContactSubmission, type ContactField, type ContactFieldErrors } from '@/lib/contact/contact-rules.mjs'
import { cn } from '@/lib/utils'

import { useHydrated } from './use-hydrated'

const INITIAL_STATE: ContactFormState = { status: 'idle' }
const fieldId = (field: ContactField) => `contact-${field}`
const errorId = (field: ContactField) => `contact-${field}-error`

const FIELD_CLASS = 'mt-2 block w-full rounded-control border-[3px] border-tp-blue bg-white px-3 py-2 font-label text-body text-tp-navy placeholder:text-tp-navy/70 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-on-dark aria-invalid:border-error-on-brand'

// The contact form (Figma 5408:348; legacy contact-form.jsx). It posts to a
// Server Action, so it works without JavaScript: the browser's own checks
// apply, and the page is re-rendered with the result. With JavaScript the
// shared rules run before sending, errors appear next to their fields, focus
// moves to the first invalid field or to the result, and the result is
// announced.
export function ContactForm({ locale }: { locale: string }) {
	const t = useTranslations('Contact.form')
	const hydrated = useHydrated()
	const [state, formAction, pending] = useActionState(submitContactForm, INITIAL_STATE)
	const [clientErrors, setClientErrors] = useState<ContactFieldErrors | null>(null)
	const statusRef = useRef<HTMLDivElement>(null)
	const formRef = useRef<HTMLFormElement>(null)

	const errors: ContactFieldErrors = clientErrors ?? (state.status === 'invalid' ? state.errors : {})
	const values = 'values' in state ? state.values : undefined
	const errorCount = Object.keys(errors).length

	useEffect(() => {
		if (clientErrors) focusFirstInvalid(formRef.current, clientErrors)
	}, [clientErrors])

	useEffect(() => {
		if (state.status === 'invalid') focusFirstInvalid(formRef.current, state.errors)
		else if (state.status !== 'idle') statusRef.current?.focus()
	}, [state])

	function checkBeforeSending(event: FormEvent<HTMLFormElement>) {
		const data = new FormData(event.currentTarget)
		const result = parseContactSubmission(Object.fromEntries(CONTACT_FIELDS.map((field) => [field, data.get(field)])))
		if (result.success) {
			setClientErrors(null)
			return
		}
		event.preventDefault()
		setClientErrors(result.errors)
	}

	function errorMessage(field: ContactField) {
		const code = errors[field]
		if (!code) return null
		return t(`errors.${code}`, { min: CONTACT_LIMITS[field].min, max: CONTACT_LIMITS[field].max })
	}

	const status = errorCount
		? { tone: 'error' as const, text: t('status.invalid', { count: errorCount }) }
		: state.status === 'success'
			? { tone: 'success' as const, text: t('status.success') }
			: state.status === 'error'
				? { tone: 'error' as const, text: t(`status.${state.reason}`) }
				: null

	return (
		<form action={formAction} className="mt-[clamp(1.5rem,1rem+2vw,2.5rem)]" noValidate={hydrated} onSubmit={checkBeforeSending} ref={formRef}>
			<div aria-live="polite" ref={statusRef} role="status" tabIndex={-1} className="outline-none focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus-on-dark">
				{status ? (
					<p className={cn('mb-6 flex items-start gap-3 rounded-control bg-white px-4 py-3 font-label text-body font-semibold', status.tone === 'error' ? 'text-error' : 'text-tp-navy')}>
						{status.tone === 'error' ? <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" /> : <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />}
						<span>{status.text}</span>
					</p>
				) : null}
			</div>
			<p className="font-label text-body">{t('requiredNote')}</p>
			<input name="locale" type="hidden" value={locale} />
			{/* Honeypot: hidden from people and assistive technology; simple bots fill it. */}
			<div aria-hidden="true" className="absolute -left-[10000px] size-px overflow-hidden">
				<label htmlFor="contact-website">{t('honeypot')}</label>
				<input autoComplete="off" defaultValue="" id="contact-website" name={HONEYPOT_FIELD} tabIndex={-1} type="text" />
			</div>
			<div className="mt-5 grid gap-5 sm:grid-cols-2">
				<Field autoComplete="name" defaultValue={values?.name} error={errorMessage('name')} field="name" label={t('name')} />
				<Field autoComplete="email" defaultValue={values?.email} error={errorMessage('email')} field="email" inputMode="email" label={t('email')} type="email" />
				<Field className="sm:col-span-2" defaultValue={values?.subject} error={errorMessage('subject')} field="subject" label={t('subject')} />
				<Field className="sm:col-span-2" defaultValue={values?.message} error={errorMessage('message')} field="message" hint={t('messageHint', { max: CONTACT_LIMITS.message.max })} label={t('message')} multiline placeholder={t('messagePlaceholder')} />
			</div>
			<p className="mt-5 font-label text-body">
				{t.rich('privacy', {
					link: (chunks) => <Link className="font-bold underline decoration-1 underline-offset-[0.2em] hover:decoration-2 focus-visible:rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-on-dark" href="/privacy-policy">{chunks}</Link>,
				})}
			</p>
			<button
				className="mt-6 ml-auto block min-w-40 cursor-pointer rounded-control bg-white px-8 py-3 font-label text-body-lg font-bold uppercase text-tp-navy shadow-md transition-colors hover:bg-tp-mist focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus-on-dark disabled:cursor-wait disabled:opacity-80 motion-reduce:transition-none"
				disabled={pending}
				type="submit"
			>
				{pending ? t('sending') : t('submit')}
			</button>
		</form>
	)
}

function focusFirstInvalid(form: HTMLFormElement | null, errors: ContactFieldErrors) {
	const first = CONTACT_FIELDS.find((field) => errors[field])
	if (first) form?.querySelector<HTMLElement>(`#${fieldId(first)}`)?.focus()
}

type FieldProps = {
	autoComplete?: string
	className?: string
	defaultValue?: string
	error: string | null
	field: ContactField
	hint?: string
	inputMode?: 'email'
	label: string
	multiline?: boolean
	placeholder?: string
	type?: 'email' | 'text'
}

// A labelled field. Required is announced by the control itself and marked
// visually with an asterisk; the hint and error are linked by aria-describedby.
function Field({ autoComplete, className, defaultValue = '', error, field, hint, inputMode, label, multiline = false, placeholder, type = 'text' }: FieldProps) {
	const hintId = `contact-${field}-hint`
	const describedBy = [hint ? hintId : null, error ? errorId(field) : null].filter(Boolean).join(' ') || undefined
	const { min, max } = CONTACT_LIMITS[field]
	const shared = {
		'aria-describedby': describedBy,
		'aria-invalid': error ? true : undefined,
		autoComplete,
		className: cn(FIELD_CLASS, multiline && 'min-h-56 resize-y'),
		defaultValue,
		id: fieldId(field),
		maxLength: max,
		minLength: min,
		name: field,
		placeholder,
		required: true,
	}
	return (
		<div className={className}>
			<label className="font-label text-body font-bold" htmlFor={fieldId(field)}>
				{label}<span aria-hidden="true"> *</span>
			</label>
			{hint ? <p className="mt-1 font-label text-label" id={hintId}>{hint}</p> : null}
			{multiline ? <textarea {...shared} rows={8} /> : <input {...shared} inputMode={inputMode} type={type} />}
			{error ? (
				<p className="mt-2 flex items-start gap-2 font-label text-body font-semibold text-error-on-brand" id={errorId(field)}>
					<CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
					<span>{error}</span>
				</p>
			) : null}
		</div>
	)
}
