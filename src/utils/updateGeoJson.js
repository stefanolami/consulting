const fs = require('fs')
const path = './worldNoAntarctica.json'

// Function to convert a string to camelCase
function toCamelCase(str) {
	return str
		.replace(/\s(.)/g, function (match, group1) {
			return group1.toUpperCase()
		})
		.replace(/\s/g, '')
		.replace(/^(.)/, function (match, group1) {
			return group1.toLowerCase()
		})
}

// Read the JSON file
fs.readFile(path, 'utf8', (err, data) => {
	if (err) {
		console.error(err)
		return
	}

	// Parse the JSON data
	let jsonData = JSON.parse(data)

	// Iterate over each geometry object and add the value key
	jsonData.objects.countries.geometries.forEach((geometry) => {
		const name = geometry.properties.name
		geometry.properties.value = toCamelCase(name)
	})

	// Write the modified JSON back to the file
	fs.writeFile(path, JSON.stringify(jsonData, null, 2), (err) => {
		if (err) {
			console.error(err)
			return
		}
		console.log('File successfully updated')
	})
})
