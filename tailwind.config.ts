import type { Config } from 'tailwindcss'

const config: Config = {
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'gradient-conic':
					'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
			},
			colors: {
				primary: '#004A6A',
				'primary-light': '#009EC2',
				grey: '#EAEAEA',
				'grey-purple': '#BBB9D6',
				'consulting-primary': '#354B83',
				'consulting-secondary': '#FFF',
				'consulting-tertiary': '#FFF',
				'funding-primary': '#FFF',
				'funding-secondary': '#00A4D5',
				'funding-tertiary': '#1D4967',
				'marketing-primary': '#AA337F',
				'marketing-secondary': '#FFF',
				'marketing-tertiary': '#FFF',
				'production-primary': '#FFF',
				'production-secondary': '#DF8946',
				'production-tertiary': '#4A2C2O',
				'institute-primary': '#6D9544',
				'institute-secondary': '#FFF',
				'institute-tertiary': '#FFF',
				'spaces-primary': '#FFF',
				'spaces-secondary': '#0F2CCA',
				'spaces-tertiary': '#2A2A2A',
			},
			fontFamily: {
				jose: ['var(--font-jose)'],
				unna: ['var(--font-unna)'],
			},
		},
	},
	plugins: [
		//@ts-ignore
		function ({ addUtilities }) {
			const newUtilities = {
				'.scrollbar-thin': {
					scrollbarWidth: 'thin',
					scrollbarColor: 'white #009EC2',
				},
				'.scrollbar-webkit': {
					'&::-webkit-scrollbar': {
						width: '8px',
					},
					'&::-webkit-scrollbar-track': {
						background: '#009EC2',
					},
					'&::-webkit-scrollbar-thumb': {
						backgroundColor: 'white',
						borderRadius: '20px',
						border: '1px solid #009EC2',
					},
				},
			}
			addUtilities(newUtilities, ['responsive', 'hover'])
		},
	],
}
export default config
