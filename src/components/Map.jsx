'use client'

import React, { useState } from 'react'
import {
	ComposableMap,
	Geographies,
	Geography,
	ZoomableGroup,
} from 'react-simple-maps'
/* import countriesData from '../data/countriesData' */
import regions from '../data/regions'

import { scaleLinear } from 'd3-scale'
const colorScale = scaleLinear().domain([0, 1000]).range(['red', 'orange'])

/* const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json' */

export default function MapChart() {
	const [selectedRegion, setSelectedRegion] = useState('')
	const [zoomLevel, setZoomLevel] = useState(0.8)
	const [zoomCenter, setZoomCenter] = useState([0, 43])

	const handleRegionCLick = (region) => {
		console.log(region)
		setSelectedRegion(region.value)
		setZoomCenter(region.properties.coordinates)
		setZoomLevel(region.properties.zoom)
	}
	const handleResetRegion = () => {
		setSelectedRegion('')
		setZoomCenter([0, 43])
		setZoomLevel(0.8)
	}
	const handleZoom = (level, center) => {
		setZoomLevel(level)
		setZoomCenter(center)
	}
	return (
		<div className="w-full grid grid-cols-[1fr_50%_1fr] pb-44">
			<div className="">
				{!selectedRegion && (
					<ul className="m-12">
						{Object.values(regions).map((region) => (
							<li
								className="cursor-pointer"
								onClick={() => handleRegionCLick(region)}
								key={region.value}
							>
								{region.name}
							</li>
						))}
					</ul>
				)}
				{selectedRegion && (
					<ul className="m-12">
						{regions[selectedRegion].countries.map((country) => (
							<li
								className="cursor-pointer"
								key={country}
							>
								{country}
							</li>
						))}
						<li
							className="mt-10 cursor-pointer"
							onClick={handleResetRegion}
							key="back"
						>
							Back to Regions
						</li>
					</ul>
				)}
			</div>
			<div className="w-full mt-8">
				<ComposableMap
					projection="geoMercator"
					className="w-full  border-2 border-black"
				>
					<ZoomableGroup
						center={zoomCenter}
						zoom={zoomLevel}
						minZoom={0.7}
						onMoveEnd={({ coordinates, zoom }) => {
							console.log('zooming', coordinates, zoom)
						}}
						/* onMoveEnd={({ coordinates, zoom }) => {
							setZoomLevel(zoom)
							setZoomCenter(coordinates)
							console.log('zooming', zoomLevel, zoomCenter)
						}} */
					>
						<Geographies geography="/worldNoAntarctica.json">
							{({ geographies }) =>
								geographies.map((geo) => (
									<Geography
										style={{
											default: {
												outline: 'none',
											},
											hover: {
												outline: 'none',
											},
											pressed: {
												outline: 'none',
											},
										}}
										key={geo.rsmKey}
										geography={geo}
										id={geo.properties.name}
										fill={colorScale(geo.id)}
										/* className={
									countriesNames.includes(geo.properties.name)
										? ' covered-countries '
										: ' uncovered-countries '
								} */
										className="hover:brightness-110 stoke-[.5px] cursor-pointer"
									/>
								))
							}
						</Geographies>
					</ZoomableGroup>
				</ComposableMap>
			</div>
			<div className=""></div>
		</div>
	)
}
