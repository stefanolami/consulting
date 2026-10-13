import type { HeroIllustration } from './page-hero'

// The designer's page-hero line drawings (white on transparent). Each source
// file is a 16:9 canvas; the files in public/hero are cropped to the drawing
// band with a small margin and scaled to 2880 px wide (2x a 1440 px layout).
const heroImage = (name: string, height: number): HeroIllustration => ({ kind: 'image', src: `/hero/${name}.png`, width: 2880, height })

export const HERO_ART = {
	contact: heroImage('hero-contact-telephone', 1074),
	home: heroImage('hero-homepage-doors', 546),
	publications: heroImage('hero-publications-papers', 843),
	sectors: heroImage('hero-sectors-industry', 844),
	services: heroImage('hero-services-gears', 750),
	whoWeAre: heroImage('hero-who-we-are-team', 881),
	whyUs: heroImage('hero-why-us-laptop', 784),
} as const satisfies Record<string, HeroIllustration>
