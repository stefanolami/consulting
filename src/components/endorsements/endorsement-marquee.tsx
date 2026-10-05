'use client'

import { Pause, Play } from 'lucide-react'
import { useState, type ReactNode } from 'react'

type EndorsementMarqueeProps = {
	children: ReactNode
	labels: { pause: string; play: string }
}

// The only client piece of the endorsements section: the pause control that
// WCAG 2.2.2 requires for content that moves for more than five seconds. The
// rows themselves are server-rendered and animate in CSS (`animate-marquee`),
// reading `data-paused` here; hovering a row also pauses it. Without motion
// the rows do not move and the control is hidden.
export function EndorsementMarquee({ children, labels }: EndorsementMarqueeProps) {
	const [paused, setPaused] = useState(false)
	const Icon = paused ? Play : Pause
	return (
		<div className="group/marquee" data-paused={paused ? 'true' : undefined}>
			<div className="flex justify-center px-gutter motion-reduce:hidden">
				<button
					className="inline-flex items-center gap-2 rounded-pill border-2 border-tp-blue-muted px-4 py-2 font-label text-label font-bold uppercase text-tp-blue-muted transition-colors hover:bg-tp-blue-muted hover:text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
					onClick={() => setPaused((value) => !value)}
					type="button"
				>
					<Icon aria-hidden="true" className="size-4" />
					{paused ? labels.play : labels.pause}
				</button>
			</div>
			{children}
		</div>
	)
}
