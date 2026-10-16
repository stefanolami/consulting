'use client'

import { geoPath } from 'd3-geo'
import type { Feature, Geometry } from 'geojson'
import { LocateFixed } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'

import {
	clampPan,
	easeInOutCubic,
	featureNumericCode,
	featureReach,
	fitFrame,
	interpolateFrame,
	isSmallBounds,
	markerPoint,
	mayBeVisible,
	panFrame,
	projectFrame,
	REGION_CONTEXT,
	regionFrame,
	type Extent,
	type MapFrame,
	type Point,
} from '@/lib/outreach/outreach-geo.mjs'
import type { OutreachOverviewCountry, OutreachOverviewRegion } from '@/lib/outreach/outreach-overview'
import type { OutreachView } from '@/lib/outreach/outreach-state.mjs'
import { cn } from '@/lib/utils'

import { DESKTOP_QUERY, LEGEND_RESERVE, panelInset, TOPOLOGY_URL } from './outreach-layout'
import { MapSkeleton } from './outreach-map-skeleton'

type CountryTopology = Topology<{ countries: GeometryCollection }>
type CountryFeature = Feature<Geometry | null>
type Size = { height: number; viewport: number; width: number }
type Hover = { code: string; x: number; y: number }
type Drag = { dragging: boolean; pointerId: number; x: number; y: number }

export type OutreachMapProps = {
	countries: OutreachOverviewCountry[]
	errorMessage: string
	hint: string
	onSelect: (code: string) => void
	recenterLabel: string
	regions: OutreachOverviewRegion[]
	view: OutreachView
}

const PADDING = 24
/** Extra room around a region frame, as a share of the map's shorter side. */
const REGION_MARGIN = 0.06
const DURATION_MS = 700
const MARKER_RADIUS = 4
const HIT_RADIUS = 12
/** Pointer travel (px) before a press becomes a drag rather than a click. */
const DRAG_THRESHOLD = 4

// The Our Outreach map (control tower §15.12.3): Natural Earth, re-projected
// for each view so a zoomed region sits in the middle of the projection.
// Covered countries are blue, the selected one navy with a white outline and
// a ripple; small and missing countries get a marker. It is a pointer-only
// mirror of the region list, so the drawing is hidden from assistive
// technology and never takes focus. A mouse or pen can drag the map; touch
// keeps scrolling the page, and nothing zooms or pinches.
export default function OutreachMap({ countries, errorMessage, hint, onSelect, recenterLabel, regions, view }: OutreachMapProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [size, setSize] = useState<Size | null>(null)
	const [features, setFeatures] = useState<CountryFeature[] | null>(null)
	const [failed, setFailed] = useState(false)
	const [hover, setHover] = useState<Hover | null>(null)
	const desktop = useMediaQuery(DESKTOP_QUERY)
	const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

	useEffect(() => {
		const element = containerRef.current
		if (!element) return
		const observer = new ResizeObserver(([entry]) => {
			const { height, width } = entry.contentRect
			if (width > 0 && height > 0) setSize({ height, viewport: window.innerWidth, width })
		})
		observer.observe(element)
		return () => observer.disconnect()
	}, [])

	useEffect(() => {
		const controller = new AbortController()
		fetch(TOPOLOGY_URL, { signal: controller.signal })
			.then((response) => {
				if (!response.ok) throw new Error(`Map request failed with ${response.status}`)
				return response.json() as Promise<CountryTopology>
			})
			.then((topology) => setFeatures(feature(topology, topology.objects.countries).features))
			.catch((error: unknown) => {
				if ((error as { name?: string }).name !== 'AbortError') setFailed(true)
			})
		return () => controller.abort()
	}, [])

	const reaches = useMemo(() => (features ?? []).map(featureReach), [features])
	const byNumeric = useMemo(() => new Map(countries.flatMap((country) => (country.numericCode ? [[country.numericCode, country]] : []))), [countries])

	// Covered features and their marker points, computed once.
	const covered = useMemo(() => {
		const result = new Map<string, { feature: CountryFeature; point: Point | null }>()
		for (const item of features ?? []) {
			const code = featureNumericCode(item)
			const country = code ? byNumeric.get(code) : undefined
			if (country) result.set(country.code, { feature: item, point: markerPoint(item) })
		}
		return result
	}, [byNumeric, features])

	// Frames keep clear of the legend (bottom left) and, while a summary is
	// open on wide screens, of the floating panel.
	const summaryOpen = Boolean(view.country)
	const target = useMemo(() => {
		if (!size || !features) return null
		const bottom = size.height - PADDING - LEGEND_RESERVE
		const world = fitFrame(features, [[PADDING, PADDING], [size.width - PADDING, bottom]])
		const region = view.region ? regions.find((entry) => entry.key === view.region) : undefined
		if (!region) return { frame: world, size }
		const inset = desktop && summaryOpen ? panelInset(size.viewport) : 0
		const margin = Math.round(Math.min(size.width, size.height) * REGION_MARGIN)
		const extent: Extent = [[PADDING + margin, PADDING + margin], [Math.max(size.width - inset - PADDING - margin, size.width * 0.4), bottom - margin]]
		const shapes = region.countryCodes.flatMap((code): CountryFeature[] => {
			const match = covered.get(code)
			if (match) return [match.feature]
			const marker = countries.find((country) => country.code === code)?.marker
			return marker ? [{ geometry: { coordinates: marker, type: 'Point' }, properties: {}, type: 'Feature' }] : []
		})
		const context = Object.hasOwn(REGION_CONTEXT, region.key) ? REGION_CONTEXT[region.key] : null
		return { frame: regionFrame({ config: region.mapConfig, context, extent, features: shapes, worldScale: world.scale }) ?? world, size }
	}, [countries, covered, desktop, features, regions, size, summaryOpen, view.region])

	// The drawn frame moves to the target over DURATION_MS, or at once under
	// reduced motion, on the first draw and after a resize. In between, the
	// country paths are rewritten directly (no React render per frame, no
	// adaptive resampling) and the markers and ring are hidden; React draws
	// the final frame. `recentre` replays the move after a drag.
	const [frame, setFrame] = useState<MapFrame | null>(null)
	const [moving, setMoving] = useState(false)
	const [recentre, setRecentre] = useState(0)
	const frameRef = useRef<MapFrame | null>(null)
	const sizeRef = useRef<Size | null>(null)
	const layersRef = useRef<SVGGElement>(null)
	useEffect(() => {
		if (!target || !features) return
		const from = frameRef.current
		const animate = Boolean(from) && !reducedMotion && sizeRef.current === target.size
		sizeRef.current = target.size
		let request = 0
		const start = performance.now()
		const finish = () => {
			frameRef.current = target.frame
			setFrame(target.frame)
			setMoving(false)
		}
		const step = (now: number) => {
			const t = Math.min((now - start) / DURATION_MS, 1)
			if (t >= 1 || !from) return finish()
			const next = interpolateFrame(from, target.frame, easeInOutCubic(t))
			frameRef.current = next
			const projection = projectFrame(next, target.size).precision(0)
			const path = geoPath(projection).digits(1)
			for (const element of layersRef.current?.querySelectorAll<SVGPathElement>('path[data-feature]') ?? []) {
				const index = Number(element.dataset.feature)
				element.setAttribute('d', mayBeVisible(projection, reaches[index], target.size) ? path(features[index]) ?? '' : '')
			}
			request = requestAnimationFrame(step)
		}
		request = requestAnimationFrame(animate ? (now) => { setMoving(true); setHover(null); step(now) } : finish)
		return () => cancelAnimationFrame(request)
	}, [features, reaches, recentre, reducedMotion, target])

	const drawing = useMemo(() => {
		if (!frame || !size || !features) return null
		const projection = projectFrame(frame, size)
		const path = geoPath(projection)
		const project = (point: Point | null) => {
			const projected = point ? projection(point) : null
			return projected && projected.every(Number.isFinite) ? (projected as Point) : null
		}
		const small = new Set<string>()
		const shapes = features.map((item, index) => {
			const code = featureNumericCode(item)
			const country = code ? byNumeric.get(code) : undefined
			if (country && isSmallBounds(path.bounds(item))) small.add(country.code)
			return { code: country?.code ?? null, d: path(item) ?? '', index, key: `${code ?? 'x'}:${index}` }
		})
		// Markers for covered countries drawn too small, and for those the topology lacks.
		const markers = countries.flatMap((country) => {
			const match = covered.get(country.code)
			const point = project(match ? match.point : country.marker)
			return (!match || small.has(country.code)) && point ? [{ code: country.code, point }] : []
		})
		const selected = view.country ? project(covered.get(view.country)?.point ?? countries.find((country) => country.code === view.country)?.marker ?? null) : null
		return { globe: geoPath(projectFrame(frame)).bounds({ type: 'Sphere' }), markers, selected, shapes }
	}, [byNumeric, countries, covered, features, frame, size, view.country])

	// Dragging (mouse and pen): the drawing slides as it is while the pointer
	// moves, and is re-projected once on release. A press that travels less
	// than DRAG_THRESHOLD stays a click.
	const drag = useRef<Drag | null>(null)
	const [dragging, setDragging] = useState(false)
	const panned = Boolean(frame && target && frame !== target.frame && !moving)

	function dragDelta(event: PointerEvent): Point | null {
		const state = drag.current
		if (!state || !drawing || !size) return null
		return clampPan(drawing.globe, [event.clientX - state.x, event.clientY - state.y], size)
	}

	function onPointerDown(event: PointerEvent<SVGSVGElement>) {
		if (event.pointerType === 'touch' || event.button !== 0 || moving) return
		drag.current = { dragging: false, pointerId: event.pointerId, x: event.clientX, y: event.clientY }
	}

	function onPointerMoveMap(event: PointerEvent<SVGSVGElement>) {
		const state = drag.current
		if (!state || state.pointerId !== event.pointerId) return
		// A press released outside the window never reaches the map before the
		// pointer is captured; a later move without the button is not a drag.
		if (!state.dragging && (event.buttons & 1) === 0) {
			drag.current = null
			return
		}
		if (!state.dragging) {
			if (Math.hypot(event.clientX - state.x, event.clientY - state.y) < DRAG_THRESHOLD) return
			state.dragging = true
			event.currentTarget.setPointerCapture(event.pointerId)
			setDragging(true)
			setHover(null)
		}
		const delta = dragDelta(event)
		if (delta) layersRef.current?.setAttribute('transform', `translate(${delta[0]} ${delta[1]})`)
	}

	function onPointerEnd(event: PointerEvent<SVGSVGElement>) {
		const state = drag.current
		if (!state || state.pointerId !== event.pointerId) return
		const delta = dragDelta(event)
		drag.current = null
		if (!state.dragging) return
		layersRef.current?.removeAttribute('transform')
		setDragging(false)
		if (delta && frameRef.current && event.type === 'pointerup') {
			const next = panFrame(frameRef.current, delta)
			frameRef.current = next
			setFrame(next)
		}
	}

	function onPointerMove(event: PointerEvent, code: string) {
		if (event.pointerType !== 'mouse' || drag.current?.dragging) return
		const bounds = containerRef.current?.getBoundingClientRect()
		if (bounds) setHover({ code, x: event.clientX - bounds.left, y: event.clientY - bounds.top })
	}

	const hovered = hover ? countries.find((country) => country.code === hover.code) : undefined
	const interactive = (code: string) => ({
		onClick: () => onSelect(code),
		onPointerLeave: () => setHover(null),
		onPointerMove: (event: PointerEvent) => onPointerMove(event, code),
	})

	return (
		<div className="absolute inset-0" ref={containerRef}>
			{failed ? (
				<p aria-hidden="true" className="absolute inset-x-gutter top-1/2 -translate-y-1/2 text-center font-label text-body text-tp-navy">{errorMessage}</p>
			) : !drawing || !size ? (
				<MapSkeleton />
			) : (
				<svg
					aria-hidden="true"
					className={cn('absolute inset-0 size-full select-none', dragging ? 'cursor-grabbing' : 'cursor-grab')}
					focusable="false"
					onLostPointerCapture={onPointerEnd}
					onPointerCancel={onPointerEnd}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMoveMap}
					onPointerUp={onPointerEnd}
					viewBox={`0 0 ${size.width} ${size.height}`}
				>
					<g ref={layersRef}>
						<g strokeLinejoin="round">
							{drawing.shapes.map((shape) => shape.code ? (
								<path
									className={cn('stroke-white transition-[fill] duration-150 motion-reduce:transition-none', !dragging && 'cursor-pointer', shape.code === view.country ? 'fill-tp-navy' : hover?.code === shape.code ? 'fill-tp-azure' : 'fill-tp-blue-muted')}
									d={shape.d}
									data-feature={shape.index}
									key={shape.key}
									strokeWidth={0.75}
									{...interactive(shape.code)}
								/>
							) : (
								<path className="fill-tp-stone stroke-white" d={shape.d} data-feature={shape.index} key={shape.key} strokeWidth={0.5} />
							))}
						</g>
						{moving ? null : (
							<>
								{/* Drawn again on top so its outline is not covered by neighbours. */}
								<g>
									{drawing.shapes.filter((shape) => shape.code && shape.code === view.country).map((shape) => (
										<path className="pointer-events-none fill-tp-navy stroke-white" d={shape.d} key={`selected:${shape.key}`} strokeWidth={2} />
									))}
								</g>
								<g>
									{drawing.markers.map(({ code, point }) => (
										<g className={cn(!dragging && 'cursor-pointer')} key={code} transform={`translate(${point[0]} ${point[1]})`} {...interactive(code)}>
											<circle className="fill-transparent" r={HIT_RADIUS} />
											<circle className={cn('stroke-white', code === view.country ? 'fill-tp-navy' : hover?.code === code ? 'fill-tp-azure' : 'fill-tp-blue-muted')} r={MARKER_RADIUS} strokeWidth={1.5} />
										</g>
									))}
								</g>
								{drawing.selected ? (
									<g className="pointer-events-none" transform={`translate(${drawing.selected[0]} ${drawing.selected[1]})`}>
										{/* "animated ripple gif for selected point"; a still ring under reduced motion. */}
										<circle className="fill-none stroke-tp-azure" r={10} strokeWidth={2} />
										<circle className="origin-center fill-none stroke-tp-azure transform-fill motion-safe:animate-ping" r={10} strokeWidth={2} />
									</g>
								) : null}
							</>
						)}
					</g>
				</svg>
			)}
			{panned ? (
				<button
					className="absolute top-3 left-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control bg-white/95 px-3 font-label text-label font-bold text-tp-navy shadow-md hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
					onClick={() => setRecentre((count) => count + 1)}
					type="button"
				>
					<LocateFixed aria-hidden="true" className="size-4" />
					{recenterLabel}
				</button>
			) : null}
			{hover && hovered && !dragging ? (
				<div
					aria-hidden="true"
					className="pointer-events-none absolute z-10 -translate-x-1/2 translate-y-5 rounded-[0.375rem] bg-tp-blue px-3 py-1.5 font-label text-label font-bold whitespace-nowrap text-on-brand shadow-md [@media(hover:none)]:hidden"
					style={{ left: hover.x, top: hover.y }}
				>
					{hovered.name}
					<span className="font-normal"> · {hint}</span>
				</div>
			) : null}
		</div>
	)
}

function useMediaQuery(query: string) {
	return useSyncExternalStore(
		(onChange) => {
			const list = window.matchMedia(query)
			list.addEventListener('change', onChange)
			return () => list.removeEventListener('change', onChange)
		},
		() => window.matchMedia(query).matches,
		() => false,
	)
}
