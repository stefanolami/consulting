import localFont from 'next/font/local'

// Self-hosted brand fonts (SIL Open Font License, see OFL-*.txt).
// Built from the google/fonts sources: subset to Latin, Latin-1 and Latin
// Extended-A (Romanian and Portuguese names), weight axis limited to 400-700,
// Roboto Serif's GRAD/wdth/opsz axes pinned to their defaults.

export const unna = localFont({
	src: [
		{ path: './unna-400.woff2', weight: '400', style: 'normal' },
		{ path: './unna-700.woff2', weight: '700', style: 'normal' },
	],
	variable: '--font-unna-face',
	display: 'swap',
	fallback: ['Georgia', 'Times New Roman', 'serif'],
})

export const robo = localFont({
	src: [
		{ path: './roboto-serif-variable.woff2', weight: '400 700', style: 'normal' },
		{ path: './roboto-serif-italic-variable.woff2', weight: '400 700', style: 'italic' },
	],
	variable: '--font-robo-face',
	display: 'swap',
	fallback: ['Georgia', 'Times New Roman', 'serif'],
})

export const jose = localFont({
	src: [
		{ path: './josefin-sans-variable.woff2', weight: '400 700', style: 'normal' },
		{ path: './josefin-sans-italic-variable.woff2', weight: '400 700', style: 'italic' },
	],
	variable: '--font-jose-face',
	display: 'swap',
	fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
})
