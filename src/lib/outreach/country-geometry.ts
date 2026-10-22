import type { Feature, Geometry } from 'geojson'
import { alpha2ToNumeric } from 'i18n-iso-countries'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'

import topologyData from '../../../public/data/world-countries-110m.topo.json'

import { featureNumericCode, heroDrawing, outlinePath, type HeroDrawing, type OutlinePath, type Point } from './outreach-geo.mjs'

// Server-side access to the local topology (public/data/README.md), for the
// country outlines drawn in the Our Outreach panel and detail hero. The
// browser loads the same file separately, only for the map.

type CountryTopology = Topology<{ countries: GeometryCollection }>

let featuresByNumericCode: Map<string, Feature<Geometry | null>> | null = null
const outlines = new Map<string, OutlinePath | null>()

function countryFeatures() {
	if (!featuresByNumericCode) {
		const topology = topologyData as unknown as CountryTopology
		const collection = feature(topology, topology.objects.countries)
		featuresByNumericCode = new Map(collection.features.flatMap((item) => {
			const code = featureNumericCode(item)
			return code ? [[code, item]] : []
		}))
	}
	return featuresByNumericCode
}

/** ISO 3166-1 numeric code ("642") for an alpha-2 code, as used by the topology. */
export function countryNumericCode(code: string): string | null {
	return alpha2ToNumeric(code) ?? null
}

/** The country's outline in a 100-unit box, or null when the 110m topology does not draw it. */
export function countryOutline(code: string): OutlinePath | null {
	if (!outlines.has(code)) {
		const numeric = countryNumericCode(code)
		const item = numeric ? countryFeatures().get(numeric) : undefined
		outlines.set(code, item ? outlinePath(item) : null)
	}
	return outlines.get(code) ?? null
}

const drawings = new Map<string, HeroDrawing | null>()

/**
 * The detail hero's line drawing: the outline, or a locator for countries the
 * topology draws too small or not at all (then only with `point`, the
 * `countries.map_config` coordinates). Null when there is nothing to draw.
 */
export function countryHeroDrawing(code: string, point: Point | null): HeroDrawing | null {
	const key = `${code}:${point?.join(',') ?? ''}`
	if (!drawings.has(key)) {
		const numeric = countryNumericCode(code)
		const features = countryFeatures()
		drawings.set(key, heroDrawing({ feature: numeric ? features.get(numeric) ?? null : null, features: [...features.values()], point }))
	}
	return drawings.get(key) ?? null
}
