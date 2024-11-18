'use client'

import { useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import GeographyModifier from './sub/GeographyModifier'
import PriceModalMobile from './sub/PriceModalMobile'
import PriceModalDesktop from './sub/PriceModalDesktop'
import selectionData from '@/data/selectionData'
import { useStore } from '@/store/store'
import axios from 'axios'
import Loading from '../Loading'

export default function EMobilitySelection() {
	const {
		storeSector,
		geographies,
		languages,
		addLanguage,
		removeLanguage,
		storeData,
		addData,
		removeData,
		handleReport,
		getSinglePrice,
		getAllAbovePrice,
		getUser,
	} = useStore((state) => ({
		storeSector: state.sector,
		geographies: state.geographies,
		languages: state.languages,
		addLanguage: state.addLanguage,
		removeLanguage: state.removeLanguage,
		storeData: state.data,
		addData: state.addData,
		removeData: state.removeData,
		handleReport: state.handleReport,
		getSinglePrice: state.getSinglePrice,
		getAllAbovePrice: state.getAllAbovePrice,
		getUser: state.getUser,
	}))

	const locale = useLocale()
	const router = useRouter()

	const handleCheckbox = (category, item) => {
		if (
			storeData[storeSector.value][category].find(
				(el) => el.value === item.value
			)
		) {
			removeData(category, item)
		} else {
			addData(category, item)
		}
	}

	const handleLanguages = (e, item) => {
		e.target.checked ? addLanguage(item) : removeLanguage(item)
	}

	const handleAllAbove = (e, category) => {
		e.target.checked
			? selectionData[storeSector.value][category].forEach((item) => {
					if (
						!storeData[storeSector.value][category].find(
							(el) => el.value === item.value
						)
					) {
						addData(category, item)
					}
			  })
			: selectionData[storeSector.value][category].forEach((item) => {
					if (
						storeData[storeSector.value][category].find(
							(el) => el.value === item.value
						)
					) {
						removeData(category, item)
					}
			  })
	}

	const sendUser = async () => {
		const user = getUser()
		const results = await axios.post(
			'http://localhost:4000/api/registered-clients',
			user
		)
		console.log(results)
	}

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			if (
				Object.keys(storeSector).length === 0 ||
				geographies.length === 0
			) {
				router.push(`/${locale}`)
			}
		}, 2000)

		return () => clearTimeout(timeoutId) // Cleanup function
		//eslint-disable-next-line
	}, [storeSector, geographies])

	return (
		<>
			{Object.keys(storeSector).length > 0 && geographies.length > 0 ? (
				<div className="font-jose mt-10 mb-20 mx-auto w-[90%] max-w-[1550px] text-primary text-xs xl:text-base">
					<div className="flex flex-col items-center mx-auto justify-center gap-2 mb-10">
						<div className="mx-auto font-unna font-bold text-lg xl:text-4xl flex items-center justify-center bg-primary-light overflow-hidden text-white w-40 xl:w-96 h-9 xl:h-20">
							{storeSector.label}
						</div>
						<div className="xl:hidden">
							<GeographyModifier />
						</div>
					</div>
					{/* FULL SECTION */}
					<div className="flex flex-col items-center justify-center gap-3 mx-auto w-full xl:w-4/5 xl:grid xl:grid-cols-[3fr_1fr] relative">
						<div>
							{/* FIRST SECTION */}
							<section
								className="w-full"
								id="tenders-section"
							>
								<div className="w-full px-5 py-2 xl:py-3 mb-4 bg-primary text-white font-unna text-base xl:text-3xl">
									Public Procurement Opportunities (Tenders)
								</div>
								{/* EVEHICLES */}
								<div className="w-full xl:pb-5">
									<div className="w-full px-5 py-2 xl:py-3 bg-primary-light text-white font-bold text-xs xl:text-xl">
										E-Vehicles
									</div>
									<div className="px-5 py-2">
										<span className="mt-3 block text-primary font-bold text-xs xl:text-lg">
											Type of Vehicle
										</span>
										<ul className="space-y-1 mt-3">
											{selectionData.eMobility.typeOfVehicle.map(
												(item, index) => (
													<li
														key={item.value}
														className="flex flex-row items-center justify-between text-primary"
													>
														<div className="flex flex-row items-center gap-1 justify-start">
															<input
																type="checkbox"
																id={`checkbox-vehicle-type-${index}`}
																value={
																	item.value
																}
																onChange={(e) =>
																	handleCheckbox(
																		'typeOfVehicle',
																		item
																	)
																}
																checked={
																	storeData[
																		storeSector
																			.value
																	]?.typeOfVehicle?.find(
																		(
																			element
																		) =>
																			element.value ===
																			item.value
																	)
																		? true
																		: false
																}
																className="custom-checkbox scale-[.8] peer"
															/>
															<label
																htmlFor={`checkbox-vehicle-type-${index}`}
																className="peer-checked:font-bold"
															>
																{item.label}
															</label>
														</div>
														<span
															className={
																storeData[
																	storeSector
																		.value
																]?.typeOfVehicle?.find(
																	(element) =>
																		element.value ===
																		item.value
																)
																	? 'font-bold'
																	: ''
															}
														>{`EUR ${getSinglePrice(
															'typeOfVehicle',
															item
														)} / year`}</span>
													</li>
												)
											)}
											<li
												key="all-above"
												className="flex flex-row items-center justify-between text-primary"
											>
												<div className="flex flex-row items-center gap-1 justify-start">
													<input
														type="checkbox"
														id="checkbox-vehicle-type-all-above"
														value="all"
														onChange={(e) =>
															handleAllAbove(
																e,
																'typeOfVehicle'
															)
														}
														checked={
															storeData[
																storeSector
																	.value
															]?.typeOfVehicle
																?.length ===
															selectionData
																.eMobility
																.typeOfVehicle
																.length
																? true
																: false
														}
														className="custom-checkbox scale-[.8] peer"
													/>
													<label
														className="peer-checked:font-bold"
														htmlFor="checkbox-vehicle-type-all-above"
													>
														All of the above
													</label>
												</div>
												<span>{`EUR ${getAllAbovePrice(
													'typeOfVehicle'
												)} / year`}</span>
											</li>
										</ul>
									</div>
									{storeData[storeSector.value]?.typeOfVehicle
										?.length > 0 && (
										<div className="px-5 py-2">
											<span className="text-primary block font-bold text-xs xl:text-xl">
												Type of Contract
											</span>
											<span className="text-primary block text-xs xl:text-lg">
												(Needs to be selected as soon as
												any of the above is selected)
											</span>
											<ul className="space-y-1 mt-3">
												{selectionData.eMobility.typeOfVehicleContract.map(
													(item, index) => (
														<li
															key={item.value}
															className="flex flex-row items-center justify-between text-primary"
														>
															<div className="flex flex-row items-center gap-1 justify-start">
																<input
																	type="checkbox"
																	id={`checkbox-vehicle-contract-${index}`}
																	value={
																		item.value
																	}
																	onChange={(
																		e
																	) =>
																		handleCheckbox(
																			'typeOfVehicleContract',
																			item
																		)
																	}
																	checked={
																		storeData.eMobility?.typeOfVehicleContract?.find(
																			(
																				element
																			) =>
																				element.value ===
																				item.value
																		)
																			? true
																			: false
																	}
																	className="custom-checkbox scale-[.8] peer"
																/>
																<label
																	className="peer-checked:font-bold"
																	htmlFor={`checkbox-vehicle-contract-${index}`}
																>
																	{item.label}
																</label>
															</div>
														</li>
													)
												)}
												<li
													key="all-above"
													className="flex flex-row items-center justify-between text-primary"
												>
													<div className="flex flex-row items-center gap-1 justify-start">
														<input
															type="checkbox"
															id={`checkbox-vehicle-contract-all-above`}
															value="all"
															onChange={(e) =>
																handleAllAbove(
																	e,
																	'typeOfVehicleContract'
																)
															}
															checked={
																storeData[
																	storeSector
																		.value
																]
																	?.typeOfVehicleContract
																	?.length ===
																selectionData
																	.eMobility
																	.typeOfVehicleContract
																	.length
																	? true
																	: false
															}
															className="custom-checkbox scale-[.8]"
														/>
														<label htmlFor="checkbox-vehicle-contract-all-above">
															All of the above
														</label>
													</div>
												</li>
											</ul>
										</div>
									)}
								</div>
								<div className="w-full xl:pb-5">
									<div className="w-full px-5 py-2 xl:py-3 bg-primary-light text-white font-bold text-xs xl:text-xl">
										Charging Stations
									</div>
									<div className="px-5 py-2">
										<span className="mt-3 block text-primary font-bold text-xs xl:text-lg">
											Purchase, Operations and/or
											Maintenance of stations
										</span>
										<ul className="space-y-1 mt-3">
											{selectionData.eMobility.chargingStations.map(
												(item, index) => (
													<li
														key={item.value}
														className="flex flex-row items-center justify-between text-primary"
													>
														<div className="flex flex-row items-center gap-1 justify-start">
															<input
																type="checkbox"
																id={`checkbox-charging-stations-${index}`}
																value={
																	item.value
																}
																onChange={(e) =>
																	handleCheckbox(
																		'chargingStations',
																		item
																	)
																}
																checked={
																	storeData[
																		storeSector
																			.value
																	]?.chargingStations?.find(
																		(
																			element
																		) =>
																			element.value ===
																			item.value
																	)
																		? true
																		: false
																}
																className="custom-checkbox scale-[.8] peer"
															/>
															<label
																className="peer-checked:font-bold"
																htmlFor={`checkbox-charging-stations-${index}`}
															>
																{item.label}
															</label>
														</div>
														<span
															className={
																storeData[
																	storeSector
																		.value
																]?.chargingStations?.find(
																	(element) =>
																		element.value ===
																		item.value
																)
																	? 'font-bold'
																	: ''
															}
														>{`EUR ${getSinglePrice(
															'chargingStations',
															item
														)} / year`}</span>
													</li>
												)
											)}
											<li
												key="all-above"
												className="flex flex-row items-center justify-between text-primary"
											>
												<div className="flex flex-row items-center gap-1 justify-start">
													<input
														type="checkbox"
														id="checkbox-charging-stations-all-above"
														value="all"
														onChange={(e) =>
															handleAllAbove(
																e,
																'chargingStations'
															)
														}
														checked={
															storeData[
																storeSector
																	.value
															]?.chargingStations
																?.length ===
															selectionData
																.eMobility
																.chargingStations
																.length
																? true
																: false
														}
														className="custom-checkbox scale-[.8] peer"
													/>
													<label
														className="peer-checked:font-bold"
														htmlFor="checkbox-charging-stations-all-above"
													>
														All of the above
													</label>
												</div>
												<span>{`EUR ${getAllAbovePrice(
													'chargingStations'
												)} / year`}</span>
											</li>
										</ul>
									</div>
									{storeData[storeSector.value]
										?.chargingStations?.length > 0 && (
										<div className="px-5 py-2">
											<span className="text-primary block font-bold text-xs xl:text-lg">
												Type of contract
											</span>
											<span className="text-primary block text-xs xl:text-lg">
												(Needs to be selected as soon as
												any of the above is selected)
											</span>
											<ul className="space-y-1 mt-3">
												{selectionData.eMobility.chargingStationsMaintenance.map(
													(item, index) => (
														<li
															key={item.value}
															className="flex flex-row items-center justify-between text-primary"
														>
															<div className="flex flex-row items-center gap-1 justify-start">
																<input
																	type="checkbox"
																	id={`checkbox-charging-stations-maintenance-${index}`}
																	value={
																		item.value
																	}
																	onChange={(
																		e
																	) =>
																		handleCheckbox(
																			'chargingStationsMaintenance',
																			item
																		)
																	}
																	checked={
																		storeData[
																			storeSector
																				.value
																		]?.chargingStationsMaintenance?.find(
																			(
																				element
																			) =>
																				element.value ===
																				item.value
																		)
																			? true
																			: false
																	}
																	className="custom-checkbox scale-[.8] peer"
																/>
																<label
																	className="peer-checked:font-bold"
																	htmlFor={`checkbox-charging-stations-maintenance-${index}`}
																>
																	{item.label}
																</label>
															</div>
														</li>
													)
												)}
											</ul>
										</div>
									)}
								</div>
							</section>
							<section
								className="w-full"
								id="eu-report-section"
							>
								<div className="w-full px-5 py-2 xl:py-3 bg-primary text-white font-unna text-base text-balance xl:text-3xl">
									European Commission Funding & Investment
									Financing opportunities in the e-mobility
									sector
								</div>
								<div className="mt-3 px-5 py-2 xl:py-5 flex flex-row justify-between items-start gap-1">
									<div className="flex flex-row justify-start items-start gap-1">
										<input
											type="checkbox"
											id="checkbox-report-eu"
											value="report-eu"
											onChange={() =>
												handleReport('reportEu')
											}
											checked={
												storeData.eMobility.reportEu
											}
											className="custom-checkbox scale-[.8] peer"
										/>
										<label
											className="peer-checked:font-bold"
											htmlFor="checkbox-report-eu"
										>
											Quarterly report (with ad hoc alerts
											for time-sensitive announcements) on
											European Commission support
											programme for research & innovation
											& deployment investment of
											e-mobility services
										</label>
									</div>
									<span className="block text-nowrap">
										EUR 8,000 / year
									</span>
								</div>
							</section>
							<section
								className="w-full"
								id="non-eu-report-section"
							>
								<div className="w-full px-5 py-2 xl:py-3 bg-primary text-white font-unna text-base text-balance xl:text-3xl">
									European Funding & Investment Financing
									opportunities in the e-mobility sector
									(non-EU administered)
								</div>

								<div className="mt-3 px-5 py-2 xl:py-5 flex flex-row justify-between items-start gap-1">
									<div className="flex flex-row justify-start items-start gap-1">
										<input
											type="checkbox"
											id="checkbox-report-non-eu"
											value="report-non-eu"
											onChange={() =>
												handleReport('reportNonEu')
											}
											checked={
												storeData.eMobility.reportNonEu
											}
											className="custom-checkbox scale-[.8] peer"
										/>
										<label
											className="peer-checked:font-bold"
											htmlFor="checkbox-report-non-eu"
										>
											Quarterly report (with ad hoc alerts
											for time-sensitive announcements) on
											international, regional or national
											funding or financing programmes of
											e-mobility services
										</label>
									</div>
									<span className="block text-nowrap">
										EUR 11,000 / year
									</span>
								</div>
							</section>
							<section
								className="w-full xl:pb-5"
								id="language-section"
							>
								<div className="w-full px-5 py-2 xl:py-3 bg-primary text-white font-unna text-base text-balance xl:text-3xl">
									Language
								</div>
								<div className="mt-3 px-5 py-2">
									<span className="text-pretty block">
										All monitoring is furnished in English.
										The reports can be available in the
										following languages with an additional{' '}
										<strong>25 percent</strong> for each
										country, on top of the total costs:
									</span>
									<ul className="mt-3 space-y-1">
										{selectionData.language.map(
											(item, index) => (
												<li
													key={item.value}
													className="flex flex-row items-center justify-between text-primary"
												>
													<div className="flex flex-row items-center gap-1 justify-start">
														<input
															type="checkbox"
															id={`checkbox-language-${index}`}
															value={item.value}
															onChange={(e) =>
																handleLanguages(
																	e,
																	item
																)
															}
															checked={
																languages?.find(
																	(element) =>
																		element.value ===
																		item.value
																)
																	? true
																	: false
															}
															className="custom-checkbox scale-[.8] peer"
														/>
														<label
															htmlFor={`checkbox-language-${index}`}
															className="peer-checked:font-bold"
														>
															{item.label}
														</label>
													</div>
												</li>
											)
										)}
									</ul>
								</div>
							</section>
							<section
								className="w-full"
								id="private-training-section"
							>
								<div className="w-full px-5 py-2 xl:py-3 bg-primary text-white font-unna text-base text-balance xl:text-3xl">
									Private Training
								</div>
								<div className="mt-3 px-5 py-2 flex flex-row justify-between items-start gap-1">
									<div className="flex flex-row justify-start items-start gap-1">
										<input
											type="checkbox"
											id="checkbox-report-eu"
											value="report-eu"
											/* onChange={(e) => handleCheckbox(e, 'chargingStations')}
								checked={data.chargingStations.includes(item.value)} */
											className="custom-checkbox scale-[.8] peer"
										/>
										<label
											className="peer-checked:font-bold"
											htmlFor="checkbox-report-eu"
										>
											2-hour private seminar with the
											local experts on all questions you
											have on the above.
											<span className="mt-4 block">
												Free of charge if the above
												purchase is above EUR 10,000 /
												year
											</span>
										</label>
									</div>
									<span className="block text-nowrap">
										EUR 500 / session
									</span>
								</div>
							</section>
							<button
								onClick={sendUser}
								className="mx-auto py-3 px-5 bg-primary-light mt-6 mb-16"
							>
								Send
							</button>
						</div>
						<div
							id="desktop-recap"
							className="hidden xl:block xl:sticky top-10 self-start"
						>
							<GeographyModifier />
							<PriceModalDesktop />
						</div>
					</div>
					<PriceModalMobile />
				</div>
			) : (
				<Loading />
			)}
		</>
	)
}
