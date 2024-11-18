'use client'
import { useState } from 'react'
import axios from 'axios'
import Select from 'react-select'

const sectors = [
	{ value: 'eMobility', label: 'E-Mobility' },
	{ value: 'aviation', label: 'Aviation' },
]
const typeOfVehicles = [
	{ value: 'cars', label: 'Cars' },
	{ value: 'buses', label: 'Buses' },
	{ value: 'trucks', label: 'Trucks' },
	{ value: 'planes', label: 'Planes' },
	{ value: 'boats', label: 'Boats' },
	{ value: 'twoWheelers', label: 'Two Wheelers' },
]
const typeOfVehicleCountries = [
	{ value: 'eu', label: 'Eu' },
	{ value: 'brazil', label: 'Brazil' },
]
const typeOfContracts = [
	{ value: 'purchase', label: 'Purchase' },
	{ value: 'leasing', label: 'Leasing' },
	{ value: 'rental', label: 'Rental' },
	{ value: 'fleetManagement', label: 'Fleet Management' },
	{ value: 'dataManagement', label: 'Data Management' },
]

const colorStyles = {
	control: (styles, state) => ({
		...styles,
		boxShadow: 'none',
		border: '0',
		borderRadius: '0',
	}),
	option: (styles, state) => ({
		...styles,
		backgroundColor: state.isFocused ? '#9ca3af' : 'white',
		color: state.isFocused ? 'white' : 'black',
	}),
	menu: (styles, state) => ({
		...styles,
		borderRadius: '0',
	}),
}

export default function Form() {
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		sector: '',
		typeOfVehicle: '',
		typeOfVehicleCountry: '',
		typeOfContract: '',
	})
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState(null)

	const handleChange = (event) => {
		setFormData({
			...formData,
			[event.target.name]: event.target.value,
		})
		console.log('formData', formData)
	}

	const handleSectorChange = (selectedOption) => {
		setFormData({
			...formData,
			sector: selectedOption,
		})
		console.log('formData', formData)
	}

	const handleTypeOfVehicleChange = (selectedOption) => {
		setFormData({
			...formData,
			typeOfVehicle: selectedOption,
		})
		console.log('formData', formData)
	}
	const handleTypeOfVehicleCountryChange = (selectedOption) => {
		setFormData({
			...formData,
			typeOfVehicleCountry: selectedOption,
		})
		console.log('formData', formData)
	}

	const handleTypeOfContractChange = (selectedOption) => {
		setFormData({
			...formData,
			typeOfContract: selectedOption,
		})
		console.log('formData', formData)
	}

	const handleSubmit = async (event) => {
		event.preventDefault()
		setIsLoading(true)
		setError(null)
		console.log('formData', formData)
		const data = {
			name: formData.name,
			email: formData.email,
			sector: formData.sector.map((sector) => sector.value),
			typeOfVehicle: formData.typeOfVehicle.map(
				(typeOfVehicle) => typeOfVehicle.value
			),
			typeOfVehicleCountry: formData.typeOfVehicleCountry.map(
				(typeOfVehicleCountry) => typeOfVehicleCountry.value
			),
			typeOfContract: formData.typeOfContract.map(
				(typeOfContract) => typeOfContract.value
			),
		}
		console.log('data', data)
		try {
			const response = await axios.post(
				'https://poe-test-8.payloadcms.app/api/registered-clients',
				data
			)
			console.log('Form submission successful:', response.data)
		} catch (error) {
			console.error('Error submitting form:', error)
			setError(error.message)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div>
			<form
				className="flex flex-col w-2/5 mt-10"
				onSubmit={handleSubmit}
			>
				<label
					htmlFor="name"
					className="mb-2 pl-2 text-lg"
				>
					Name:
				</label>
				<input
					type="text"
					id="name"
					name="name"
					onChange={handleChange}
					className="text-black"
				/>

				<label
					htmlFor="email"
					className="mb-2 pl-2 text-lg"
				>
					Email:
				</label>
				<input
					type="email"
					id="email"
					name="email"
					onChange={handleChange}
					className="text-black"
				/>
				<label className="w-full">
					<p className="mb-2 pl-2 text-lg">Sectors:</p>
					<Select
						name="sector"
						styles={colorStyles}
						onChange={handleSectorChange}
						options={sectors}
						value={formData.sector}
						isMulti
					/>
				</label>
				<label className="w-full">
					<p className="mb-2 pl-2 text-lg">Type of Vehicle:</p>
					<Select
						name="typeOfVehicle"
						styles={colorStyles}
						onChange={handleTypeOfVehicleChange}
						options={typeOfVehicles}
						value={formData.typeOfVehicle}
						isMulti
					/>
				</label>
				<label className="w-full">
					<p className="mb-2 pl-2 text-lg">
						Type of Vehicle Country:
					</p>
					<Select
						name="typeOfVehicleCountry"
						styles={colorStyles}
						onChange={handleTypeOfVehicleCountryChange}
						options={typeOfVehicleCountries}
						value={formData.typeOfVehicleCountry}
						isMulti
					/>
				</label>
				<label className="w-full">
					<p className="mb-2 pl-2 text-lg">Type of Contract:</p>
					<Select
						name="typeOfContract"
						styles={colorStyles}
						onChange={handleTypeOfContractChange}
						options={typeOfContracts}
						value={formData.typeOfContract}
						isMulti
					/>
				</label>

				<button
					className="bg-gray-500 text-white p-6 w-fit mx-auto"
					type="submit"
					disabled={isLoading}
				>
					Submit
				</button>
			</form>
		</div>
	)
}
