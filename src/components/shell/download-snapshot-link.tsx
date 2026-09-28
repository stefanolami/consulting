import { FileDown } from 'lucide-react'

import { cn } from '@/lib/utils'

type DownloadSnapshotLinkProps = {
	className?: string
	download: string
	href: string
	title: string
}

// PLACEHOLDER icon: Figma uses a brand "Download me" icon (6393:70) that is not
// in the repository yet (see docs/figma-asset-needs.md).
export function DownloadSnapshotLink({ className, download, href, title }: DownloadSnapshotLinkProps) {
	return (
		<a
			className={cn(
				'group inline-flex flex-col items-center gap-1.5 rounded-control text-center font-display text-[0.9375rem] leading-tight text-on-brand',
				'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-on-dark',
				className,
			)}
			download
			href={href}
		>
			<span>{title}</span>
			<span aria-hidden="true" className="grid size-[2.8125rem] place-items-center rounded-pill bg-on-brand text-brand transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none">
				<FileDown className="size-6" strokeWidth={1.75} />
			</span>
			<span className="underline-offset-4 group-hover:underline">{download}</span>
		</a>
	)
}
