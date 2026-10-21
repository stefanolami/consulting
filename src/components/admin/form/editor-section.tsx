'use client'

import { EyeOff } from 'lucide-react'
import type { ReactNode } from 'react'

import { CommandButton, CommandNotice, type useAdminCommand } from '@/components/admin/form/admin-form'
import { useConfirm } from '@/components/admin/form/confirm-dialog'
import { cn } from '@/lib/utils'

/*
 * Shared editor layout (audit X-14, slice 5b): every editor groups its fields
 * in white sections with a Roboto Serif title and a short description, puts
 * each section's save button at its bottom, and ends with the archive panel.
 */

/** Hint for every SEO title field (audit LEG-03): the public layout adds the site name. */
export const SEO_TITLE_HINT = 'Optional. Leave out the site name: “ | Time&Place Consulting” is added automatically. The page title is used when empty.'

export function EditorSection({ action, children, className, description, title }: { action?: ReactNode; children: ReactNode; className?: string; description?: ReactNode; title: ReactNode }) {
	return (
		<section className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7', className)}>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h2 className="font-robo text-2xl text-slate-950">{title}</h2>
					{description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
				</div>
				{action}
			</div>
			<div className="mt-6">{children}</div>
		</section>
	)
}

/** A clear note that content edited here does not appear on the public site on its own (audit SET-03, PAR-05). */
export function NotShownNotice({ children, className, title = 'Not shown on the site yet' }: { children: ReactNode; className?: string; title?: string }) {
	return (
		<div className={cn('flex gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950', className)} role="note">
			<EyeOff aria-hidden="true" className="mt-1 size-4 shrink-0" />
			<div><strong className="font-semibold">{title}.</strong> {children}</div>
		</div>
	)
}

type Command = ReturnType<typeof useAdminCommand>

/**
 * Archive or restore a record (audit PPL-14, OUT-12). Archiving asks first in
 * the in-page dialog; restoring does not, because it is the safe direction.
 */
export function ArchivePanel({ archived, archiveLabel = 'Archive', command, description, name, onArchive, onRestore, restoreLabel = 'Restore', title }: {
	archived: boolean
	archiveLabel?: string
	command: Command
	description: { archive: ReactNode; restore: ReactNode }
	/** How the dialog names the record, for example “Flávia Guerra”. */
	name: string
	onArchive: () => void
	onRestore: () => void
	restoreLabel?: string
	title: { archive: string; restore: string }
}) {
	const { confirm, dialog } = useConfirm()
	async function archive() {
		if (await confirm({ title: `Archive “${name}”?`, body: <p>{description.archive}</p>, confirmLabel: archiveLabel })) onArchive()
	}
	return (
		<section className="grid gap-3">
			<div className="flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
				<div>
					<h2 className="font-semibold text-amber-950">{archived ? title.restore : title.archive}</h2>
					<p className="mt-1 text-sm text-amber-900">{archived ? description.restore : description.archive}</p>
				</div>
				<CommandButton onClick={() => (archived ? onRestore() : void archive())} pending={command.pending} pendingLabel={archived ? 'Restoring…' : 'Archiving…'} variant={archived ? 'default' : 'destructive'}>{archived ? restoreLabel : archiveLabel}</CommandButton>
			</div>
			<CommandNotice command={command} />
			{dialog}
		</section>
	)
}
