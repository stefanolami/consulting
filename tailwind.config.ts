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
				primary: '#27335A',
				'primary-light': '#274882',
				grey: '#EAEAEA',
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
