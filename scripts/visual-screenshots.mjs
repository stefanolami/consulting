// Development-only visual check: screenshots local public pages at the Figma
// desktop (1440) and mobile (390) widths for comparison with the Figma frames.
//
//   npm run dev                      # in another terminal
//   npm run visual:screenshots       # all default pages
//   npm run visual:screenshots -- / /de/services --label=after
//
// Options: --base=http://localhost:3000, --label=<subfolder>, --viewport-only.
// Output: visual-output/<label>/<page>-<width>.png (git-ignored).
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import { chromium } from 'playwright'

const DEFAULT_PAGES = ['/', '/who-we-are', '/who-we-are/glenn-cezanne', '/services', '/sectors', '/newsroom', '/our-outreach', '/de']
const VIEWPORTS = [
	{ name: 'desktop', width: 1440, height: 900 },
	{ name: 'mobile', width: 390, height: 844 },
]

const args = process.argv.slice(2)
const option = (name, fallback) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback
const base = option('base', process.env.VISUAL_BASE_URL ?? 'http://localhost:3000')
const label = option('label', 'latest')
const fullPage = !args.includes('--viewport-only')
const pages = args.filter((arg) => !arg.startsWith('--'))
const outputDir = path.join('visual-output', label)

function fileName(pagePath, viewport) {
	const slug = pagePath.replace(/^\/|\/$/g, '').replace(/[^\w-]+/g, '_') || 'home'
	return `${slug}-${viewport.name}-${viewport.width}.png`
}

await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch()
let failures = 0
try {
	for (const viewport of VIEWPORTS) {
		const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' })
		const page = await context.newPage()
		for (const pagePath of pages.length ? pages : DEFAULT_PAGES) {
			const url = new URL(pagePath, base).toString()
			try {
				const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
				await page.evaluate(() => document.fonts.ready)
				const file = path.join(outputDir, fileName(pagePath, viewport))
				await page.screenshot({ path: file, fullPage })
				console.log(`${response?.status() ?? '???'} ${url} -> ${file}`)
			} catch (error) {
				failures += 1
				console.error(`FAILED ${url}: ${error instanceof Error ? error.message : error}`)
			}
		}
		await context.close()
	}
} finally {
	await browser.close()
}
if (failures) process.exitCode = 1
