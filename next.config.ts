import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
	cacheComponents: true,
	experimental: {
		serverActions: {
			bodySizeLimit: '16mb',
		},
	},
	// The interim `/team` routes moved to the legacy `/who-we-are` paths, which
	// printed business-card QR codes link to (control tower §15.4). Why Us was
	// merged into Who We Are on 2026-11-04; its path lands on that section.
	async redirects() {
		return [
			{ source: '/why-us', destination: '/who-we-are#why-us', permanent: true },
			{ source: '/:locale(de|it|pt-BR|pt-PT)/why-us', destination: '/:locale/who-we-are#why-us', permanent: true },
			{ source: '/team', destination: '/who-we-are', permanent: true },
			{ source: '/team/:slug', destination: '/who-we-are/:slug', permanent: true },
			{ source: '/:locale(de|it|pt-BR|pt-PT)/team', destination: '/:locale/who-we-are', permanent: true },
			{ source: '/:locale(de|it|pt-BR|pt-PT)/team/:slug', destination: '/:locale/who-we-are/:slug', permanent: true },
		]
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '**.supabase.co',
				pathname: '/storage/v1/object/public/**',
			},
		],
	},
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
export default withNextIntl(nextConfig)
