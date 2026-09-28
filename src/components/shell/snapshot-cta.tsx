import { FileDown } from 'lucide-react'

import { SNAPSHOT_PDF_HREF } from './navigation'

type SnapshotCtaProps = {
	fileHint: string
	label: string
}

// Full-width "download a snapshot" band above the footer (Figma 5550:192 on
// Who We Are). One link: the underlined sentence and the round icon below it.
// PLACEHOLDER icon and PDF: see docs/figma-asset-needs.md.
export function SnapshotCta({ fileHint, label }: SnapshotCtaProps) {
	return (
		<section className="bg-tp-blue-muted px-gutter py-[clamp(3rem,2rem+4vw,5.5rem)] text-on-brand">
			<a
				className="group mx-auto flex max-w-[71rem] flex-col items-center gap-[clamp(1.25rem,1rem+1vw,2rem)] rounded-control text-center focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-focus-on-dark"
				download
				href={SNAPSHOT_PDF_HREF}
			>
				<span className="font-serif text-[clamp(1.125rem,0.85rem+1.15vw,1.875rem)] font-black uppercase italic leading-[1.5] underline decoration-1 underline-offset-[0.2em] group-hover:decoration-2">
					{label}
					<span className="sr-only"> ({fileHint})</span>
				</span>
				<span aria-hidden="true" className="grid size-[clamp(4.5rem,3.5rem+4vw,8.3125rem)] place-items-center rounded-pill bg-on-brand text-tp-blue-muted transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none">
					<FileDown className="size-1/2" strokeWidth={1.5} />
				</span>
			</a>
		</section>
	)
}
