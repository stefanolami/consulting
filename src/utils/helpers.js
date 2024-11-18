export function categoryValueToLabel(category) {
	if (category === 'typeOfVehicle') return 'E-Vehicles'
	if (category === 'eVehiclesMaintenance') return 'E-Vehicles Maintenance'
	if (category === 'chargingStations') return 'Charging Stations'
}

export function removeParenthesesContent(string) {
	const index = string.indexOf('(')
	return string.slice(0, index).trim()
}
