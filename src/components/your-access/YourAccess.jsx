'use client'

import React, { useState } from 'react'
import {
	ComposableMap,
	Geographies,
	Geography,
	ZoomableGroup,
} from 'react-simple-maps'
/* import countriesData from '../data/countriesData' */
import regions from '@/data/regions'
import { FiX } from 'react-icons/fi'

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

export default function YourAccess() {
	const [selectedRegion, setSelectedRegion] = useState('')
	const [selectedCountry, setSelectedCountry] = useState('')
	const [zoomLevel, setZoomLevel] = useState(0.6)
	const [zoomCenter, setZoomCenter] = useState([35, 30])

	const coveredCountries = Object.values(regions)
		.map((region) => {
			return region.countries.map((country) => country.value)
		})
		.flat()

	console.log(coveredCountries)

	const handleRegionCLick = (region) => {
		console.log(region)
		if (selectedRegion == region.value) {
			setSelectedRegion('')
			setZoomCenter([35, 30])
			setZoomLevel(0.6)
			return
		} else {
			setSelectedRegion(region.value)
			setZoomCenter(region.properties.coordinates)
			setZoomLevel(region.properties.zoom)
		}
	}
	const handleCountryClick = (country) => {
		const countryRegion = Object.values(regions).find((region) =>
			region.countries.some((c) => c.value == country)
		)
		console.log(countryRegion)
		if (countryRegion) {
			setSelectedCountry(country)
			if (selectedRegion != countryRegion.value) {
				setSelectedRegion(countryRegion.value)
				setZoomCenter(
					regions[countryRegion.value].properties.coordinates
				)
				setZoomLevel(regions[countryRegion.value].properties.zoom)
			}
		}
	}
	const handleResetRegion = () => {
		setSelectedRegion('')
		setZoomCenter([35, 30])
		setZoomLevel(0.6)
	}
	const handleZoom = (level, center) => {
		setZoomLevel(level)
		setZoomCenter(center)
	}
	return (
		<div className="w-full flex flex-row items-center justify-start">
			<div className="bg-transparent w-full absolute top-0 h-16 xl:h-24">
				<div className="ml-[7%] h-screen w-[270px] bg-primary-light"></div>
			</div>
			<div className="ml-[7%] h-screen w-[270px] bg-primary-light z-20 font-jose transition-all duration-300 overflow-auto scrollbar-thin scrollbar-webkit">
				<ul className="m-12 space-y-3">
					{Object.values(regions).map((region, index) => (
						<li key={index}>
							<button
								className={`cursor-pointer text-xl text-left ${
									selectedRegion == region.value
										? 'text-primary font-bold'
										: 'text-white'
								}`}
								onClick={() => handleRegionCLick(region)}
							>
								{region.name}
							</button>

							{selectedRegion == region.value ? (
								<ul className="my-4 ml-8 z-50 space-y-3 list-disc">
									{regions[selectedRegion].countries.map(
										(country, index) => (
											<li
												className={`${
													selectedCountry ==
													country.value
														? 'text-primary font-bold'
														: 'text-white'
												} cursor-pointer text-base`}
												key={index}
												onClick={() =>
													handleCountryClick(
														country.value
													)
												}
											>
												{country.name}
											</li>
										)
									)}
								</ul>
							) : null}
						</li>
					))}
				</ul>
			</div>
			<div className="your-access-map h-screen -mt-48 relative">
				<ComposableMap
					projection="geoMercator"
					className="absolute top-0 w-full"
				>
					<ZoomableGroup
						center={zoomCenter}
						zoom={zoomLevel}
						minZoom={zoomLevel}
						maxZoom={zoomLevel}
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
										onClick={() => {
											console.log(geo)
											handleCountryClick(
												geo.properties.value
											)
										}}
										stroke="#FFF"
										fill={
											selectedCountry ==
											geo.properties.value
												? '#004A6A'
												: coveredCountries.includes(
														geo.properties.value
												  )
												? '#009EC2'
												: '#666'
										}
										/* className={
									countriesNames.includes(geo.properties.name)
										? ' covered-countries '
										: ' uncovered-countries '
								} */
										className={`hover:brightness-110 stroke-[.3px] cursor-pointer`}
									/>
								))
							}
						</Geographies>
					</ZoomableGroup>
				</ComposableMap>
				{selectedCountry && (
					<div className="bg-primary w-1/4 h-1/2 absolute bottom-10 right-10 rounded-xl font-jose text-white p-6">
						<div className="w-full h-full relative">
							<FiX
								className="absolute top-0 right-0 cursor-pointer text-2xl"
								onClick={() => setSelectedCountry('')}
							/>

							{selectedCountry}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
