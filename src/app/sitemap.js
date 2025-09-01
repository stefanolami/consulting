export default function sitemap() {
	const baseUrl = 'https://www.consultingontap.com'

	return [
		{
			url: baseUrl,
			priority: 1,
		},
		{
			url: `${baseUrl}/about-us`,
			priority: 0.8,
		},
		{
			url: `${baseUrl}/our-team`,
			priority: 0.8,
		},
		{
			url: `${baseUrl}/sectors`,
			priority: 0.8,
		},
		{
			url: `${baseUrl}/services`,
			priority: 0.8,
		},
		{
			url: `${baseUrl}/why-us`,
			priority: 0.8,
		},
		{
			url: `${baseUrl}/contact`,
			priority: 0.8,
		},
		{
			url: `${baseUrl}/privacy-policy`,
			priority: 0.3,
		},
		{
			url: `${baseUrl}/terms-and-conditions`,
			priority: 0.3,
		},
		{
			url: `${baseUrl}/cookie-use`,
			priority: 0.3,
		},
	]
}
