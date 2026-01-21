import { Josefin_Sans, Unna, Roboto_Serif } from 'next/font/google'

export const jose = Josefin_Sans({
	subsets: ['latin'],
	display: 'swap',
	variable: '--font-jose',
	fallback: ['sans-serif'],
})

export const unna = Unna({
	weight: ['400', '700'],
	style: ['normal', 'italic'],
	subsets: ['latin'],
	display: 'swap',
	variable: '--font-unna',
	fallback: ['serif'],
})

export const robo = Roboto_Serif({
	weight: ['400', '700'],
	style: ['normal', 'italic'],
	subsets: ['latin'],
	variable: '--font-robo',
	fallback: ['serif'],
})
