'use client'

import { ArrowDown, ArrowUp, LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Move up and down buttons for an ordered list (audit PPL-09). A button is
 * disabled where the move is not possible: archived rows, the first and
 * last active rows, and every row while a search hides part of the list
 * (the list then says why).
 */
export function ReorderControls({ canDown, canUp, name, onMove, pendingDirection, busy }: {
	canDown: boolean
	canUp: boolean
	name: string
	onMove: (direction: 'up' | 'down') => void
	pendingDirection: 'up' | 'down' | null
	busy: boolean
}) {
	return (
		<>
			{(['up', 'down'] as const).map((direction) => {
				const allowed = direction === 'up' ? canUp : canDown
				return (
					<Button aria-label={`Move ${name} ${direction}`} disabled={busy || !allowed} key={direction} onClick={() => onMove(direction)} size="icon" title={allowed ? `Move ${direction}` : undefined} type="button" variant="ghost">
						{pendingDirection === direction ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : direction === 'up' ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
					</Button>
				)
			})}
		</>
	)
}

/** Says why the order cannot be changed right now, or how it works. */
export function ReorderNote({ searching, children }: { searching: boolean; children: React.ReactNode }) {
	return (
		<div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950" role="note">
			{searching ? <><strong className="font-semibold">Reordering is off while searching.</strong> Clear the search to move records: the order applies to the whole list, and moving within a filtered view would jump over hidden records. </> : null}
			{children}
		</div>
	)
}
