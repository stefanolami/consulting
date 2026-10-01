'use client'

import Form from 'next/form'
import type { FormEvent, ReactNode } from 'react'

// The newsroom filter form navigates client-side with its values as URL
// search parameters (next/form). Empty fields are left out of the URL. The
// controls are server-rendered children; without JavaScript the form still
// submits as a plain GET form.
export function NewsroomFilterForm({ action, children, className }: { action: string; children: ReactNode; className?: string }) {
	function omitEmptyFields(event: FormEvent<HTMLFormElement>) {
		const empty = [...event.currentTarget.elements].filter((element): element is HTMLInputElement | HTMLSelectElement =>
			(element instanceof HTMLInputElement || element instanceof HTMLSelectElement) && Boolean(element.name) && !element.value.trim() && !element.disabled)
		for (const element of empty) element.disabled = true
		setTimeout(() => { for (const element of empty) element.disabled = false })
	}
	return <Form action={action} className={className} onSubmit={omitEmptyFields}>{children}</Form>
}
