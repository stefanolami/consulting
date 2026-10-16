// The map's loading shape, shared by the dynamic import, the map while its
// geometry loads and the page skeleton. Kept apart from outreach-map.tsx so
// importing it does not pull the map code into the page bundle.
export function MapSkeleton() {
	return <span aria-hidden="true" className="absolute inset-[6%] block rounded-panel bg-tp-mist/40 motion-safe:animate-pulse" />
}
