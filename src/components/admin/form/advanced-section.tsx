'use client'

import { ChevronRight } from 'lucide-react'
import { useLayoutEffect, useRef, type ReactNode } from 'react'

import { useFormFieldErrors } from '@/components/admin/form/admin-form'
import { cn } from '@/lib/utils'

/**
 * Technical fields (stable keys, ordering, map focus) in a section titled
 * “Advanced”, closed by default, at the bottom of their form just above its
 * save button (editorial simplification §3.1). The fields stay in the form,
 * so they are submitted and saved as before. When the last save rejected a
 * field inside, the section opens itself: a layout effect, so it is open
 * before the form's own effect moves focus to that field.
 */
export function AdvancedSection({ children, className, description = 'Keys, ordering and other technical settings. Everyday edits do not need them.' }: { children: ReactNode; className?: string; description?: ReactNode }) {
	const ref = useRef<HTMLDetailsElement>(null)
	const fieldErrors = useFormFieldErrors()
	useLayoutEffect(() => {
		const details = ref.current
		if (details && !details.open && details.querySelector('[data-field-invalid]')) details.open = true
	}, [fieldErrors])
	return (
		<details className={cn('group rounded-lg border border-slate-200 bg-white', className)} ref={ref}>
			<summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg px-4 py-3 text-sm hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
				<span className="inline-flex items-center gap-2 font-semibold text-slate-900"><ChevronRight aria-hidden="true" className="size-4 self-center transition-transform group-open:rotate-90" />Advanced</span>
				<span className="text-slate-500">{description}</span>
			</summary>
			<div className="grid gap-5 border-t border-slate-200 p-4 md:grid-cols-2">{children}</div>
		</details>
	)
}
