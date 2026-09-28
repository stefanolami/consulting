export const MAIN_CONTENT_ID = 'main-content'

export function SkipLink({ label }: { label: string }) {
	return (
		<a
			className="sr-only z-[70] rounded-control bg-action px-4 py-3 font-serif text-body text-on-action focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
			href={`#${MAIN_CONTENT_ID}`}
		>
			{label}
		</a>
	)
}
