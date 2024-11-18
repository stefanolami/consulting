'use client'

import React, { useState } from 'react'
import {
	ComposableMap,
	Geographies,
	Geography,
	ZoomableGroup,
} from 'react-simple-maps'
/* import countriesData from '../data/countriesData' */
import countriesData from '@/data/countriesData'

export default function CountryComponent({ country }) {
	const countryData = countriesData.find((c) => c.value == country)
	console.log('country: ', country)
	console.log('countryData: ', countryData)
	console.log(countriesData)
	return (
		<div className="w-full h-full py-96 bg-slate-400">
			<div className="w-1/2 mx-auto bg-white">
				<div className="your-access-map h-screen -mt-48 relative">
					<ComposableMap
						projection="geoMercator"
						className="absolute top-0 w-full"
					>
						<ZoomableGroup
							center={countryData.coordinates}
							zoom={countryData.zoom}
							minZoom={countryData.zoom}
							maxZoom={countryData.zoom}
							onMoveEnd={({ coordinates, zoom }) => {
								console.log('zooming', coordinates, zoom)
							}}
						>
							<Geographies geography="/worldNoAntarctica.json">
								{({ geographies }) =>
									geographies.map((geo, index) =>
										geo.properties.name.toLowerCase() ===
										country.toLowerCase() ? (
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
												onMouseEnter={() => {
													console.log(
														geo.geometry.coordinates
													)
												}}
												fill="#666"
												/* className={
									countriesNames.includes(geo.properties.name)
										? ' covered-countries '
										: ' uncovered-countries '
								} */
												className="hover:brightness-110 stoke-[.5px] cursor-pointer"
											/>
										) : (
											<h1 key={index}>
												Country not found
											</h1>
										)
									)
								}
							</Geographies>
						</ZoomableGroup>
					</ComposableMap>
				</div>
			</div>
		</div>
	)
}
