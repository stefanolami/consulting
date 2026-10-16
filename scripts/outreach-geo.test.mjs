import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import test from 'node:test'

import { geoBounds, geoPath } from 'd3-geo'

import {
	boundsFeature,
	centerLongitude,
	clampPan,
	easeInOutCubic,
	featureNumericCode,
	featureReach,
	fitFrame,
	interpolateFrame,
	isSmallBounds,
	markerPoint,
	mayBeVisible,
	outlinePath,
	parseMapConfig,
	principalShape,
	panFrame,
	projectFrame,
	REGION_CONTEXT,
	regionFrame,
} from '../src/lib/outreach/outreach-geo.mjs'

const require = createRequire(import.meta.url)
const { feature } = require('topojson-client')
const countries = require('i18n-iso-countries')

const topology = JSON.parse(await readFile(new URL('../public/data/world-countries-110m.topo.json', import.meta.url), 'utf8'))
const features = feature(topology, topology.objects.countries).features
const geography = JSON.parse(await readFile(new URL('./data/outreach-geography.json', import.meta.url), 'utf8'))
const byAlpha2 = (code) => features.find((item) => featureNumericCode(item) === countries.alpha2ToNumeric(code))

const SIZE = { height: 700, width: 1000 }
const WORLD_EXTENT = [[16, 16], [SIZE.width - 16, SIZE.height - 16]]
const worldFrame = fitFrame(features, WORLD_EXTENT)

function insideExtent(frame, items, extent, tolerance = 1) {
	const path = geoPath(projectFrame(frame))
	return items.every((item) => {
		const [[x0, y0], [x1, y1]] = path.bounds(principalShape(item))
		return x0 >= extent[0][0] - tolerance && y0 >= extent[0][1] - tolerance && x1 <= extent[1][0] + tolerance && y1 <= extent[1][1] + tolerance
	})
}

test('feature identifiers become zero-padded ISO numeric codes', () => {
	assert.equal(featureNumericCode({ id: '642' }), '642')
	assert.equal(featureNumericCode({ id: 36 }), '036')
	assert.equal(featureNumericCode({ id: '036' }), '036')
	assert.equal(featureNumericCode({ id: undefined }), null)
	assert.equal(featureNumericCode({ id: '-99' }), null)
	assert.equal(featureNumericCode(null), null)
})

test('every legacy-covered country has a matching topology feature', () => {
	const missing = geography.legacyCoverage.map((entry) => entry.code).filter((code) => !byAlpha2(code))
	assert.deepEqual(missing, [])
})

test('a country that is not in the 110m topology has no feature', () => {
	assert.equal(byAlpha2('MT'), undefined)
	assert.equal(byAlpha2('SG'), undefined)
})

test('principal shapes keep nearby islands and drop distant territories', () => {
	const france = principalShape(byAlpha2('FR'))
	const franceBounds = geoBounds(france)
	assert.ok(franceBounds[0][0] > -10, 'French Guiana is dropped from France')
	assert.ok(franceBounds[1][0] > 9, 'Corsica stays with France')
	assert.ok(geoBounds(principalShape(byAlpha2('NO')))[1][1] < 72, 'Svalbard is dropped from Norway')
	assert.equal(principalShape(byAlpha2('NZ')).geometry.coordinates.length, 2, 'both main New Zealand islands stay')
	const unitedStates = geoBounds(principalShape(byAlpha2('US')))
	assert.ok(unitedStates[0][0] > -130 && unitedStates[1][1] < 50, 'Alaska and Hawaii are dropped')
	const japan = principalShape(byAlpha2('JP'))
	assert.equal(japan.geometry.coordinates.length, byAlpha2('JP').geometry.coordinates.length, 'every Japanese island stays')
	assert.equal(principalShape({ geometry: null, id: '1', type: 'Feature' }), null)
})

test('map_config is parsed only in the admin shape', () => {
	assert.deepEqual(parseMapConfig({ coordinates: [15.69, 2.14], zoom: 1.7 }), { center: [15.69, 2.14], zoom: 1.7 })
	assert.deepEqual(parseMapConfig({ coordinates: [35, 53] }), { center: [35, 53], zoom: null })
	assert.deepEqual(parseMapConfig({ coordinates: [35, 53], zoom: 0 }), { center: [35, 53], zoom: null })
	assert.equal(parseMapConfig({}), null)
	assert.equal(parseMapConfig({ coordinates: [200, 0] }), null)
	assert.equal(parseMapConfig({ coordinates: ['35', 53] }), null)
	assert.equal(parseMapConfig([35, 53]), null)
	assert.equal(parseMapConfig(null), null)
})

test('a region is centred on the middle of its longitudes, across the antimeridian', () => {
	const europe = ['PT', 'RO', 'NO'].map((code) => principalShape(byAlpha2(code)))
	assert.ok(Math.abs(centerLongitude(europe) - 10.6) < 3, String(centerLongitude(europe)))
	const pacific = ['NZ', 'FJ'].map((code) => principalShape(byAlpha2(code)))
	const middle = centerLongitude(pacific)
	assert.ok(middle > 165 || middle < -175, String(middle))
})

test('region frames fit their countries inside the extent left of the panel', () => {
	const extent = [[16, 16], [SIZE.width - 400, SIZE.height - 16]]
	for (const region of new Set(geography.legacyCoverage.map((entry) => entry.regionKey))) {
		const items = geography.legacyCoverage.filter((entry) => entry.regionKey === region).map((entry) => byAlpha2(entry.code))
		const frame = regionFrame({ config: null, extent, features: items, worldScale: worldFrame.scale })
		assert.ok(frame.scale >= worldFrame.scale && frame.scale <= worldFrame.scale * 8, `${region} scale`)
		assert.ok(insideExtent(frame, items, extent), `${region} fits`)
	}
})

test('an editorial map_config overrides the computed frame, within the zoom limits', () => {
	const extent = [[0, 0], [600, 700]]
	const frame = regionFrame({ config: { center: [35, 53], zoom: 2 }, extent, features: [], worldScale: 100 })
	assert.deepEqual(frame, { anchor: [300, 350], center: [35, 53], rotation: 35, scale: 200 })
	assert.equal(regionFrame({ config: { center: [35, 53], zoom: 40 }, extent, features: [], worldScale: 100 }).scale, 800)
	assert.equal(regionFrame({ config: { center: [35, 53], zoom: null }, extent, features: [], worldScale: 100 }).scale, 100)
	assert.equal(regionFrame({ config: null, extent, features: [], worldScale: 100 }), null)
})

test('a projected frame draws its centre at its anchor', () => {
	const frame = { anchor: [420, 300], center: [25, 45], rotation: 140, scale: 900 }
	const [x, y] = projectFrame(frame)(frame.center)
	assert.ok(Math.abs(x - 420) < 1e-6 && Math.abs(y - 300) < 1e-6)
})

test('frames interpolate the shortest way round and keep their ends', () => {
	const from = { anchor: [0, 0], center: [170, 0], rotation: 170, scale: 100 }
	const to = { anchor: [100, 50], center: [-170, 20], rotation: -170, scale: 400 }
	assert.deepEqual(interpolateFrame(from, to, 0), from)
	const end = interpolateFrame(from, to, 1)
	assert.ok(Math.abs(end.rotation - -170) < 1e-9 && Math.abs(end.scale - 400) < 1e-9)
	const middle = interpolateFrame(from, to, 0.5)
	assert.equal(Math.abs(middle.rotation), 180)
	assert.equal(middle.scale, 200)
	assert.deepEqual(middle.anchor, [50, 25])
	assert.equal(easeInOutCubic(0), 0)
	assert.equal(easeInOutCubic(1), 1)
	assert.equal(easeInOutCubic(0.5), 0.5)
})

test('small countries are detected on screen and get a marker point', () => {
	assert.equal(isSmallBounds([[0, 0], [7, 3]]), true)
	assert.equal(isSmallBounds([[0, 0], [9, 3]]), false)
	assert.equal(isSmallBounds([[Infinity, Infinity], [-Infinity, -Infinity]]), false)
	const path = geoPath(projectFrame(worldFrame))
	assert.equal(isSmallBounds(path.bounds(byAlpha2('LU'))), true, 'Luxembourg is tiny on the world map')
	assert.equal(isSmallBounds(path.bounds(byAlpha2('RO'))), false)
	const [longitude, latitude] = markerPoint(byAlpha2('LU'))
	assert.ok(Math.abs(longitude - 6.1) < 0.5 && Math.abs(latitude - 49.7) < 0.5)
})

test('country outlines fit a square and are trimmed to the shape', () => {
	const romania = outlinePath(byAlpha2('RO'))
	assert.match(romania.d, /^M[\d.]+,[\d.]+L/)
	const [, , width, height] = romania.viewBox
	assert.ok(Math.max(width, height) > 99 && Math.max(width, height) <= 100.1, romania.viewBox.join(' '))
	assert.equal(outlinePath({ geometry: null, id: '1', type: 'Feature' }), null)
})

test('culling keeps every country that is drawn on screen and drops far ones', () => {
	const extent = [[16, 16], [SIZE.width - 400, SIZE.height - 16]]
	const europe = geography.legacyCoverage.filter((entry) => entry.regionKey === 'europe').map((entry) => byAlpha2(entry.code))
	const projection = projectFrame(regionFrame({ config: null, extent, features: europe, worldScale: worldFrame.scale }), SIZE)
	const path = geoPath(projection)
	let culled = 0
	for (const item of features) {
		const visible = mayBeVisible(projection, featureReach(item), SIZE)
		if (!visible) {
			culled += 1
			const [[x0, y0], [x1, y1]] = path.bounds(item)
			assert.ok(x1 < 0 || y1 < 0 || x0 > SIZE.width || y0 > SIZE.height || !Number.isFinite(x0), `${item.id} is culled but on screen`)
		}
	}
	assert.ok(culled > features.length / 2, `only ${culled} culled`)
	assert.equal(featureReach({ geometry: null, id: '1', type: 'Feature' }), null)
	assert.equal(mayBeVisible(projection, null, SIZE), false)
})

test('region frames show their continent context as well as their countries', () => {
	const extent = [[24, 24], [SIZE.width - 400, SIZE.height - 68]]
	const asia = geography.legacyCoverage.filter((entry) => entry.regionKey === 'asia').map((entry) => byAlpha2(entry.code))
	const tight = regionFrame({ config: null, extent, features: asia, worldScale: worldFrame.scale })
	const wide = regionFrame({ config: null, context: REGION_CONTEXT.asia, extent, features: asia, worldScale: worldFrame.scale })
	assert.ok(wide.scale < tight.scale, 'the context zooms out')
	const [x] = projectFrame(wide)([30, 39])
	assert.ok(x >= extent[0][0] - 1, 'Turkey is inside the Asia frame')
	assert.ok(insideExtent(wide, asia, extent), 'the covered countries still fit')
	for (const [key, bounds] of Object.entries(REGION_CONTEXT)) {
		assert.ok(bounds[0][0] < bounds[1][0] && bounds[0][1] < bounds[1][1], key)
		assert.ok(boundsFeature(bounds).geometry.coordinates.length > 8, key)
	}
})

test('points of countries the topology lacks are kept in the frame', () => {
	const extent = [[0, 0], [600, 600]]
	const malta = { geometry: { coordinates: [14.4, 35.9], type: 'Point' }, properties: {}, type: 'Feature' }
	const frame = regionFrame({ config: null, extent, features: [byAlpha2('PT'), malta], worldScale: worldFrame.scale })
	const [x, y] = projectFrame(frame)(malta.geometry.coordinates)
	assert.ok(x <= 600.5 && y <= 600.5 && x >= -0.5 && y >= -0.5, `${x},${y}`)
})

test('dragging is limited so part of the globe stays in the box', () => {
	const size = { height: 500, width: 1000 }
	const bounds = [[50, 20], [950, 480]]
	assert.deepEqual(clampPan(bounds, [10, -5], size), [10, -5])
	assert.deepEqual(clampPan(bounds, [5000, 0], size), [700, 0])
	assert.deepEqual(clampPan(bounds, [-5000, -5000], size), [-700, -355])
	assert.deepEqual(panFrame({ anchor: [1, 2], center: [0, 0], rotation: 0, scale: 1 }, [3, 4]).anchor, [4, 6])
})
