import { useState, useEffect } from 'react'
import Image from 'next/image'
import selectionData from '@/data/selectionData'
import { categoryValueToLabel, removeParenthesesContent } from '@/utils/helpers'
import { useStore } from '@/store/store'
import priceModalData from '@/data/priceModalData'

export default function PriceModalMobile() {
	const [isOpen, setIsOpen] = useState(false)
	const [isOpenCategory, setIsOpenCategory] = useState(priceModalData)

	const {
		storeSector,
		geographies,
		languages,
		addLanguage,
		removeLanguage,
		handleReport,
		storeData,
		getModalSinglePrice,
		getTotalPrice,
		getSubTotalPrice,
		getUser,
		addSingleGeography,
		removeSingleGeography,
	} = useStore((state) => ({
		storeSector: state.sector,
		geographies: state.geographies,
		languages: state.languages,
		addLanguage: state.addLanguage,
		removeLanguage: state.removeLanguage,
		handleReport: state.handleReport,
		storeData: state.data,
		getModalSinglePrice: state.getModalSinglePrice,
		getTotalPrice: state.getTotalPrice,
		getSubTotalPrice: state.getSubTotalPrice,
		getUser: state.user,
		addSingleGeography: state.addSingleGeography,
		removeSingleGeography: state.removeSingleGeography,
	}))

	const upArrow = '/up-arrow.png'
	const downArrow = '/down-arrow.png'

	const toggleOpen = () => {
		setIsOpen(!isOpen)
	}

	const toggleOpenItem = (category, item) => {
		setIsOpenCategory({
			...isOpenCategory,
			[category]: {
				...isOpenCategory[category],
				[item]: !isOpenCategory[category][item],
			},
		})
	}

	const handleGeography = (e, geography, category, item) => {
		if (e.target.checked) {
			addSingleGeography(geography, category, item)
		} else {
			removeSingleGeography(geography, category, item)
			console.log('handling')
		}
	}

	const handleLanguages = (e, item) => {
		e.target.checked ? addLanguage(item) : removeLanguage(item)
	}

	const sendUser = async (confirmed) => {
		const user = getUser(confirmed)
		const results = await axios.post(
			'http://localhost:4000/api/registered-clients',
			user
		)
		console.log(results)
	}

	return (
		<div
			id="price-modal"
			className={`z-20 fixed xl:hidden bottom-0 left-0 right-0 bg-primary-light px-5 text-white transition-all duration-300 overflow-auto scrollbar-thin scrollbar-webkit ${
				isOpen ? 'h-dvh' : 'h-[82px]'
			}`}
		>
			<div
				className="mx-auto flex flex-row justify-center items-center gap-4 pb-2 pt-[10px]"
				onClick={toggleOpen}
			>
				<span className="text-base font-bold">Order Summary</span>
				<Image
					src={isOpen ? downArrow : upArrow}
					alt="arrow"
					width={20}
					height={20}
					className="scale-90"
				/>
			</div>
			{isOpen ? (
				<>
					<div className="w-full text-xs">
						<div className="bg-white w-full h-[2px]"></div>
						{Object.keys(storeData[storeSector.value]).map(
							(category) => {
								if (
									category == 'typeOfVehicle' ||
									category == 'eVehiclesMaintenance' ||
									category == 'chargingStations'
								) {
									if (
										storeData[storeSector.value][category]
											?.length > 0
									) {
										return (
											<div key={category}>
												<div className="text-base font-bold pt-2 pb-1">
													{categoryValueToLabel(
														category
													)}
												</div>
												<div className="text-sm flex flex-col gap-2">
													{storeData[
														storeSector.value
													][category].map((item) => {
														return (
															<div
																key={item.value}
																className="w-full"
															>
																<div className="flex flex-row justify-between items-center w-full">
																	<div
																		className="flex flex-start gap-1 items-center"
																		onClick={() =>
																			toggleOpenItem(
																				category,
																				item.value
																			)
																		}
																	>
																		<Image
																			src={
																				isOpenCategory[
																					category
																				][
																					item
																						.value
																				]
																					? upArrow
																					: downArrow
																			}
																			alt="arrow"
																			width={
																				15
																			}
																			height={
																				15
																			}
																			className="scale-90"
																		/>
																		<span>
																			{removeParenthesesContent(
																				item.label
																			)}
																		</span>
																	</div>
																	{!isOpenCategory[
																		category
																	][
																		item
																			.value
																	] && (
																		<span>
																			{`EUR ${getModalSinglePrice(
																				category,
																				item
																			)} / year`}
																		</span>
																	)}
																</div>
																{isOpenCategory[
																	category
																][
																	item.value
																] && (
																	<div className="w-full my-2 px-3">
																		<ul className=" flex flex-col items-center justify-start gap-[6px]">
																			{geographies.map(
																				(
																					country
																				) => {
																					console.log(
																						storeData
																							.eMobility[
																							category
																						][
																							item
																								.value
																						],
																						country.value,
																						item.value
																					)
																					return (
																						<li
																							key={
																								country.value
																							}
																							className="flex flex-row justify-between w-full"
																						>
																							<div className="flex flex-row justify-start items-center gap-1">
																								<input
																									type="checkbox"
																									id={`checkbox-${category}-${item.value}-${country.value}`}
																									value={
																										country.value
																									}
																									onChange={(
																										e
																									) =>
																										handleGeography(
																											e,
																											country,
																											category,
																											item
																										)
																									}
																									checked={
																										storeData[
																											storeSector
																												.value
																										]?.[
																											category
																										]
																											?.find(
																												(
																													el
																												) =>
																													el.value ==
																													item.value
																											)
																											.geographies.find(
																												(
																													element
																												) =>
																													element.value ===
																													country.value
																											)
																											? true
																											: false
																									}
																									className="custom-checkbox scale-[.8] peer"
																								/>
																								<label
																									className="peer-checked:font-bold"
																									htmlFor={`checkbox-${category}-${item.value}-${country.value}`}
																								>
																									{
																										country.label
																									}
																								</label>
																							</div>
																							<span>
																								EUR{' '}
																								{
																									selectionData[
																										storeSector
																											.value
																									][
																										category
																									].find(
																										(
																											x
																										) =>
																											x.value ===
																											item.value
																									)
																										.price[
																										country
																											.value
																									]
																								}
																								{
																									' / year'
																								}
																							</span>
																						</li>
																					)
																				}
																			)}
																		</ul>
																	</div>
																)}
															</div>
														)
													})}
												</div>
											</div>
										)
									}
								}
							}
						)}
					</div>
					{storeData.eMobility.reportEu === true ||
					storeData.eMobility.reportNonEu === true ? (
						<div className="my-3 text-sm">
							<div className="text-base font-bold pt-2 pb-1">
								European Commission Funding & Investment
								Financing opportunities report
							</div>
							<ul className="py-2 flex flex-col items-center justify-start gap-[6px]">
								{storeData.eMobility.reportEu === true && (
									<li
										key="eu"
										className="flex flex-row justify-between w-full"
									>
										<div className="flex flex-row justify-start items-center gap-1">
											<input
												type="checkbox"
												id="checkbox-eu-report-modal"
												value="eu"
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
												htmlFor="checkbox-eu-report-modal"
											>
												EU
											</label>
										</div>
										<span>EUR 8000 / year</span>
									</li>
								)}
								{storeData.eMobility.reportNonEu === true && (
									<li
										key="non-eu"
										className="flex flex-row justify-between w-full"
									>
										<div className="flex flex-row justify-start items-center gap-1">
											<input
												type="checkbox"
												id="checkbox-non-eu-report-modal"
												value="non-eu"
												onChange={() =>
													handleReport('reportNonEu')
												}
												checked={
													storeData.eMobility
														.reportNonEu
												}
												className="custom-checkbox scale-[.8] peer"
											/>
											<label
												className="peer-checked:font-bold"
												htmlFor="checkbox-non-eu-report-modal"
											>
												non-EU
											</label>
										</div>
										<span>EUR 11000 / year</span>
									</li>
								)}
							</ul>
						</div>
					) : null}
					{languages.length > 0 && (
						<div className="my-3">
							<div className="flex flex-col justify-center items-center text-base font-bold">
								<span className="flex flex-row justify-start w-full">
									SUBTOTAL
								</span>
								<div className="bg-white w-full h-[2px]"></div>
								<span className="flex flex-row justify-end w-full">
									EUR {getSubTotalPrice()}
								</span>
							</div>
							<div>
								<span className="text-base font-bold pt-2 pb-1">
									Languages
								</span>
								<ul className="my-2 flex flex-col gap-2">
									{languages.map((item, index) => (
										<li key={item.value}>
											<div className="flex flex-row items-center gap-1 justify-start">
												<input
													type="checkbox"
													id={`checkbox-language-${index}`}
													value={item.value}
													onChange={(e) =>
														handleLanguages(e, item)
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
									))}
								</ul>
							</div>
						</div>
					)}
					<div className="flex flex-col justify-center items-center text-base font-bold my-3">
						<span className="flex flex-row justify-start w-full">
							TOTAL
						</span>
						<div className="bg-white w-full h-[2px]"></div>
						<span className="flex flex-row justify-end w-full">
							EUR {getTotalPrice()}
						</span>
					</div>
					{getTotalPrice() > 0 && (
						<div className="flex flex-col justify-center items-center gap-5 mx-auto mt-8 mb-10 font-bold text-sm xl:text-lg text-center text-primary">
							<button
								className="bg-white w-52 xl:w-72 h-9 xl:h-12 rounded-md shadow-md hover:shadow-xl"
								onClick={() => sendUser(false)}
							>
								Send the offer by email
							</button>
							<button
								className="bg-white w-52 xl:w-72 h-9 xl:h-12 rounded-md shadow-md hover:shadow-xl"
								onClick={() => sendUser(true)}
							>
								Order now
							</button>
						</div>
					)}
				</>
			) : (
				<>
					<div className="bg-white w-full h-[2px]"></div>
					<div className="text-base font-bold flex flex-row justify-between items-center pt-2 pb-[10px]">
						<span>TOTAL</span>
						<span>EUR {getTotalPrice()}</span>
					</div>
				</>
			)}
		</div>
	)
}
