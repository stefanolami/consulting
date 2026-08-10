import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
	cacheComponents: true,
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
