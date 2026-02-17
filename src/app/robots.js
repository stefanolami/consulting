export default function robots() {
	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
			},
			{
				userAgent: [
					'SemrushBot',
					'AhrefsBot',
					'MJ12bot',
					'DotBot',
					'PetalBot',
					'BLEXBot',
					'bytespider',
					'GPTBot',
					'CCBot',
					'anthropic-ai',
					'Claude-Web',
					'Bytespider',
					'DataForSeoBot',
					'FacebookBot',
				],
				disallow: '/',
			},
		],
		sitemap: 'https://www.consultingontap.com/sitemap.xml',
	}
}
