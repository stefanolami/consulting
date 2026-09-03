import { readFile, writeFile } from 'node:fs/promises'

import { geoMercator, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'

const topology = JSON.parse(await readFile(new URL('../public/data/world-countries-110m.topo.json', import.meta.url), 'utf8'))
const collection = feature(topology, topology.objects.countries)
const brazil = collection.features.find((country) => String(country.id).padStart(3, '0') === '076')

if (!brazil) throw new Error('Brazil (UN M49 076) is missing from the checked-in topology.')

const width = 1_200
const height = 900
const projection = geoMercator().fitExtent([[40, 40], [width - 40, height - 40]], brazil)
const outline = geoPath(projection)(brazil)

if (!outline) throw new Error('The Brazil outline could not be rendered.')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title"><title>Outline map of Brazil</title><path fill="#27335a" d="${outline}"/></svg>\n`
await writeFile(new URL('../public/outreach/brazil-outline.svg', import.meta.url), svg, 'utf8')
console.log('Generated public/outreach/brazil-outline.svg from the checked-in Natural Earth topology.')
