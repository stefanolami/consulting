// Our Outreach map geometry (control tower §15.12.3). Plain JavaScript so
// `node --test` can import it; types are in outreach-geo.d.mts. Everything
// here works on GeoJSON; converting the TopoJSON file is left to the callers.
//
// A view of the map is a "frame": the Natural Earth projection rotated so
// that `rotation` (a longitude) is the central meridian, at `scale`, with the
// geographic `center` drawn at the screen point `anchor`. Frames interpolate
// smoothly, so the map can move between views by re-projecting.

import { geoArea, geoBounds, geoCentroid, geoCircle, geoDistance, geoNaturalEarth1, geoPath } from 'd3-geo'

/** Polygons further than this from a country's largest polygon are left out of its shape. */
export const PRINCIPAL_RADIUS_DEGREES = 12
/** Region frames are between 1 and 8 times the world scale. */
export const MIN_ZOOM = 1
export const MAX_ZOOM = 8
/** A covered country drawn smaller than this (px, longer side) also gets a marker. */
export const SMALL_FEATURE_PX = 8

// The part of each continent a region view shows around its covered
// countries when the region has no map_config: [[west, south], [east, north]]
// in degrees, keyed by regions.stable_key. Regions not listed here (a new
// region, the unpublished-region group) are framed on their covered
// countries alone. Frames fitted to the covered countries only were too
// tight (product owner, 2026-10-16: Asia showed only its east).
export const REGION_CONTEXT = {
	africa: [[-18, -35], [52, 37]],
	asia: [[26, -10], [146, 55]],
	europe: [[-25, 35], [45, 71]],
	'latin-america-caribbean': [[-118, -56], [-34, 33]],
	'north-america': [[-168, 15], [-52, 72]],
	oceania: [[112, -48], [180, -9]],
}

const RADIANS = Math.PI / 180
const SPHERE = 4 * Math.PI

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const lerp = (from, to, t) => from + (to - from) * t
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

export function normalizeLongitude(longitude) {
	return ((((longitude + 180) % 360) + 360) % 360) - 180
}

// Signed shortest turn from one longitude to another, in degrees.
function longitudeDelta(from, to) {
	return normalizeLongitude(to - from)
}

// ISO 3166-1 numeric code of a topology feature ("642"), or null for the
// map-only features without one (Kosovo, Northern Cyprus, Somaliland).
export function featureNumericCode(feature) {
	const id = feature?.id
	if (id === undefined || id === null || id === '') return null
	const digits = String(id)
	return /^\d{1,3}$/.test(digits) ? digits.padStart(3, '0') : null
}

function polygonsOf(geometry) {
	if (geometry?.type === 'Polygon') return [geometry.coordinates]
	if (geometry?.type === 'MultiPolygon') return geometry.coordinates
	return []
}

// Spherical area that tolerates either ring winding.
function polygonArea(coordinates) {
	const area = geoArea({ coordinates, type: 'Polygon' })
	return area > SPHERE / 2 ? SPHERE - area : area
}

// The country as people picture it: its largest polygon plus every polygon
// whose centre is within PRINCIPAL_RADIUS_DEGREES of it. Keeps Corsica,
// Hokkaido and Tasmania; drops French Guiana from France, Svalbard from
// Norway, and Alaska and
// Hawaii from the United States. Returns a MultiPolygon feature, or null.
export function principalShape(feature, radiusDegrees = PRINCIPAL_RADIUS_DEGREES) {
	const polygons = polygonsOf(feature?.geometry)
	if (!polygons.length) return null
	const measured = polygons.map((coordinates) => ({ area: polygonArea(coordinates), centroid: geoCentroid({ coordinates, type: 'Polygon' }), coordinates }))
	const largest = measured.reduce((best, polygon) => (polygon.area > best.area ? polygon : best))
	const kept = measured.filter((polygon) => polygon === largest || geoDistance(polygon.centroid, largest.centroid) <= radiusDegrees * RADIANS)
	return { geometry: { coordinates: kept.map((polygon) => polygon.coordinates), type: 'MultiPolygon' }, id: feature.id, properties: feature.properties ?? {}, type: 'Feature' }
}

// `regions.map_config` / `countries.map_config` as written by the admin:
// `{ coordinates: [longitude, latitude], zoom? }`. Anything else is null.
export function parseMapConfig(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null
	const [longitude, latitude] = Array.isArray(value.coordinates) ? value.coordinates : []
	if (!isFiniteNumber(longitude) || !isFiniteNumber(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) return null
	return { center: [longitude, latitude], zoom: isFiniteNumber(value.zoom) && value.zoom > 0 ? value.zoom : null }
}

// The middle of the longitudes the features span, across the antimeridian
// when they cross it (Oceania).
export function centerLongitude(features) {
	const [[west], [east]] = geoBounds({ features, type: 'FeatureCollection' })
	const span = east >= west ? east - west : east + 360 - west
	return normalizeLongitude(west + span / 2)
}

export function extentCenter(extent) {
	return [(extent[0][0] + extent[1][0]) / 2, (extent[0][1] + extent[1][1]) / 2]
}

// The frame that fits `features` into `extent` with the given central meridian.
export function fitFrame(features, extent, rotation = 0, limits = {}) {
	const projection = geoNaturalEarth1().rotate([-rotation, 0]).fitExtent(extent, { features, type: 'FeatureCollection' })
	const anchor = extentCenter(extent)
	return {
		anchor,
		center: projection.invert(anchor),
		rotation,
		scale: clamp(projection.scale(), limits.minScale ?? 0, limits.maxScale ?? Number.POSITIVE_INFINITY),
	}
}

// A lon/lat box as points along its edges, so fitting it follows Natural
// Earth's curved meridians.
export function boundsFeature([[west, south], [east, north]], step = 5) {
	const points = []
	for (let longitude = west; longitude < east; longitude += step) points.push([longitude, south], [longitude, north])
	for (let latitude = south; latitude < north; latitude += step) points.push([west, latitude], [east, latitude])
	points.push([east, south], [east, north])
	return { geometry: { coordinates: points, type: 'MultiPoint' }, properties: {}, type: 'Feature' }
}

const isPointFeature = (feature) => feature?.geometry?.type === 'Point' || feature?.geometry?.type === 'MultiPoint'

// The frame of a region: the editorial `config` when set (its longitude is
// also the central meridian, its zoom is relative to the world scale);
// otherwise its `context` box together with the principal shapes of its
// drawable countries (and the points of countries the topology lacks),
// fitted with the map turned to their middle longitude. Null when there is
// nothing to frame.
export function regionFrame({ config, context = null, extent, features, worldScale }) {
	const limits = { maxScale: worldScale * MAX_ZOOM, minScale: worldScale * MIN_ZOOM }
	if (config) {
		return { anchor: extentCenter(extent), center: config.center, rotation: config.center[0], scale: clamp(worldScale * (config.zoom ?? MIN_ZOOM), limits.minScale, limits.maxScale) }
	}
	const shapes = features.map((feature) => (isPointFeature(feature) ? feature : principalShape(feature))).filter(Boolean)
	if (!shapes.length) return null
	const framed = context ? [...shapes, boundsFeature(context)] : shapes
	return fitFrame(framed, extent, centerLongitude(framed), limits)
}

// Limits a drag so that at least `keep` of the map box stays covered by the
// globe's outline in each direction (`bounds`: the projected sphere).
export function clampPan(bounds, delta, size, keep = 0.25) {
	const [[x0, y0], [x1, y1]] = bounds
	const axis = (start, end, value, length) => Math.min(Math.max(value, length * keep - end), length * (1 - keep) - start)
	return [axis(x0, x1, delta[0], size.width), axis(y0, y1, delta[1], size.height)]
}

// The same frame moved on screen by `delta` pixels.
export function panFrame(frame, delta) {
	return { ...frame, anchor: [frame.anchor[0] + delta[0], frame.anchor[1] + delta[1]] }
}

// A d3 projection drawing `frame`, clipped just outside `size` when given.
export function projectFrame(frame, size) {
	const projection = geoNaturalEarth1().rotate([-frame.rotation, 0]).scale(frame.scale).translate([0, 0])
	const [x, y] = projection(frame.center)
	projection.translate([frame.anchor[0] - x, frame.anchor[1] - y])
	if (size) projection.clipExtent([[-2, -2], [size.width + 2, size.height + 2]])
	return projection
}

// Between two frames at `t` (0–1): longitudes take the shortest way round and
// the scale changes geometrically, so zooming feels even.
export function interpolateFrame(from, to, t) {
	return {
		anchor: [lerp(from.anchor[0], to.anchor[0], t), lerp(from.anchor[1], to.anchor[1], t)],
		center: [normalizeLongitude(from.center[0] + longitudeDelta(from.center[0], to.center[0]) * t), lerp(from.center[1], to.center[1], t)],
		rotation: normalizeLongitude(from.rotation + longitudeDelta(from.rotation, to.rotation) * t),
		scale: from.scale * (to.scale / from.scale) ** t,
	}
}

export function easeInOutCubic(t) {
	return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

// A feature's centre and angular radius (radians), for cheap culling while
// the map moves.
export function featureReach(feature) {
	const polygons = polygonsOf(feature?.geometry)
	if (!polygons.length) return null
	const center = geoCentroid(feature)
	let radius = 0
	for (const polygon of polygons) for (const ring of polygon) for (const point of ring) radius = Math.max(radius, geoDistance(center, point))
	return { center, radius }
}

// Whether a feature may show inside `size` under `projection`. Conservative:
// Natural Earth stretches distances by well under 1.6 from the scale.
export function mayBeVisible(projection, reach, size) {
	if (!reach) return false
	const point = projection(reach.center)
	if (!point || !point.every(Number.isFinite)) return true
	const margin = reach.radius * projection.scale() * 1.6 + 2
	return point[0] > -margin && point[1] > -margin && point[0] < size.width + margin && point[1] < size.height + margin
}

// Whether projected bounds are too small to see or tap without a marker.
export function isSmallBounds(bounds, threshold = SMALL_FEATURE_PX) {
	const [[x0, y0], [x1, y1]] = bounds
	if (![x0, y0, x1, y1].every(Number.isFinite)) return false
	return Math.max(x1 - x0, y1 - y0) < threshold
}

// Where a country's marker and selection ripple go: its principal shape's centre.
export function markerPoint(feature) {
	const shape = principalShape(feature)
	return shape ? geoCentroid(shape) : null
}

// A country's principal shape as a standalone outline (panel image, detail
// hero): drawn with the projection centred on the country, so its shape is
// barely distorted, fitted to a `size` square and trimmed to its bounds.
export function outlinePath(feature, size = 100) {
	const shape = principalShape(feature)
	if (!shape) return null
	const [longitude, latitude] = geoCentroid(shape)
	const projection = geoNaturalEarth1().rotate([-longitude, -latitude]).fitSize([size, size], shape)
	const path = geoPath(projection).digits(1)
	const [[x0, y0], [x1, y1]] = path.bounds(shape)
	const round = (value) => Math.round(value * 10) / 10
	return { d: path(shape), viewBox: [round(x0), round(y0), round(x1 - x0), round(y1 - y0)] }
}

/**
 * A country whose principal shape is shorter than this (degrees, longer side)
 * gets a locator in the detail hero: the 110m topology draws Belgium, the
 * Netherlands, Ireland, Denmark or Taiwan with 9 to 24 points, which no longer
 * read as the country once smoothed to hero size.
 */
export const HERO_MIN_SPAN_DEGREES = 5
/** How far (degrees) around a small or missing country its locator drawing reaches, at least. */
export const LOCATOR_RADIUS_DEGREES = 4
/** Width of a locator drawing for a height of 1: the hero frames are wider than tall. */
export const LOCATOR_ASPECT = 1.6

// The longer side of a feature's longitude/latitude box in degrees, with
// longitudes shortened by the cosine of the middle latitude, so that it
// compares sizes on the ground.
export function angularSpan(feature) {
	const [[west, south], [east, north]] = geoBounds(feature)
	const width = (east >= west ? east - west : east + 360 - west) * Math.cos(((south + north) / 2) * RADIANS)
	return Math.max(width, north - south)
}

const round1 = (value) => Math.round(value * 10) / 10
const formatPoint = ([x, y]) => `${round1(x)},${round1(y)}`

// Centripetal Catmull-Rom control points for the segment p1 → p2 (as in
// d3-shape's curveCatmullRomClosed with alpha 0.5, which never overshoots
// into loops or cusps).
function catmullRomControls(p0, p1, p2, p3) {
	const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1])
	const l01 = Math.sqrt(distance(p0, p1))
	const l12 = Math.sqrt(distance(p1, p2))
	const l23 = Math.sqrt(distance(p2, p3))
	let c1 = p1
	let c2 = p2
	if (l01 > 1e-6) {
		const a = 2 * l01 ** 2 + 3 * l01 * l12 + l12 ** 2
		const n = 3 * l01 * (l01 + l12)
		c1 = [(p1[0] * a - p0[0] * l12 ** 2 + p2[0] * l01 ** 2) / n, (p1[1] * a - p0[1] * l12 ** 2 + p2[1] * l01 ** 2) / n]
	}
	if (l23 > 1e-6) {
		const b = 2 * l23 ** 2 + 3 * l23 * l12 + l12 ** 2
		const m = 3 * l23 * (l23 + l12)
		c2 = [(p2[0] * b + p1[0] * l23 ** 2 - p3[0] * l12 ** 2) / m, (p2[1] * b + p1[1] * l23 ** 2 - p3[1] * l12 ** 2) / m]
	}
	return [c1, c2]
}

// A closed ring of screen points as a smooth SVG path through every point.
export function smoothRingPath(points) {
	const ring = points.filter((point, index) => index === 0 || formatPoint(point) !== formatPoint(points[index - 1]))
	if (ring.length > 1 && formatPoint(ring[0]) === formatPoint(ring[ring.length - 1])) ring.pop()
	if (ring.length < 3) return ''
	const at = (index) => ring[(index + ring.length) % ring.length]
	let d = `M${formatPoint(ring[0])}`
	for (let index = 0; index < ring.length; index += 1) {
		const [c1, c2] = catmullRomControls(at(index - 1), at(index), at(index + 1), at(index + 2))
		d += `C${formatPoint(c1)},${formatPoint(c2)},${formatPoint(at(index + 1))}`
	}
	return `${d}Z`
}

// The country's principal shape as smooth white line art, like the
// designer's hand-drawn outlines (Figma 5741:293), fitted to a `size` square
// with the projection centred on it and trimmed to its points.
function outlineDrawing(shape, size) {
	const [longitude, latitude] = geoCentroid(shape)
	const projection = geoNaturalEarth1().rotate([-longitude, -latitude]).fitSize([size, size], shape)
	const rings = polygonsOf(shape.geometry).flatMap((polygon) => polygon.map((ring) => ring.map((point) => projection(point))))
	const points = rings.flat()
	const xs = points.map(([x]) => x)
	const ys = points.map(([, y]) => y)
	const [x0, y0] = [Math.min(...xs), Math.min(...ys)]
	return {
		marker: null,
		paths: [{ d: rings.map(smoothRingPath).join(''), tone: 'primary' }],
		viewBox: [round1(x0), round1(y0), round1(Math.max(...xs) - x0), round1(Math.max(...ys) - y0)],
	}
}

// A small country (or one the topology lacks) in its neighbourhood: the
// countries within LOCATOR_RADIUS_DEGREES (or the country's own span, when
// larger) as faint context, the country's own
// shape when there is one, and a marker at its centre, the same point the
// overview map marks (markerPoint, map_config coordinates).
function locatorDrawing(center, shape, others, size) {
	const width = round1(size * LOCATOR_ASPECT)
	const radius = Math.max(LOCATOR_RADIUS_DEGREES, shape ? angularSpan(shape) : 0)
	const projection = geoNaturalEarth1()
		.rotate([-center[0], -center[1]])
		.fitExtent([[0, 0], [width, size]], geoCircle().center(center).radius(radius)())
		.clipExtent([[0, 0], [width, size]])
	const path = geoPath(projection).digits(1)
	const context = others.map((item) => path(item)).filter(Boolean).join('')
	const own = shape ? path(shape) : null
	return {
		marker: projection(center).map(round1),
		paths: [...(context ? [{ d: context, tone: 'context' }] : []), ...(own ? [{ d: own, tone: 'primary' }] : [])],
		viewBox: [0, 0, width, size],
	}
}

// The detail hero's line drawing (control tower §15.12.5): the country's
// outline when the topology draws it large enough to read, otherwise a
// locator around its marker point; null when there is neither a shape nor a
// `point` (map_config coordinates). `features` are all topology features,
// for the locator's context.
export function heroDrawing({ feature = null, features = [], point = null, size = 100 }) {
	const shape = principalShape(feature)
	if (shape && angularSpan(shape) >= HERO_MIN_SPAN_DEGREES) return outlineDrawing(shape, size)
	const center = shape ? geoCentroid(shape) : point
	if (!center) return null
	return locatorDrawing(center, shape, features.filter((item) => item !== feature), size)
}
