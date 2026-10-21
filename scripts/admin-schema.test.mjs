import assert from 'node:assert/strict'
import test from 'node:test'

import { z } from 'zod'

import {
	callToActionSchema,
	countryServiceAssignmentSchema,
	countryServiceCopySchema,
	countryStatisticLabelSchema,
	countryStatisticSchema,
	isBlank,
	optional,
	optionalEmail,
	optionalHttpUrl,
	optionalNumber,
	optionalText,
	optionalUuid,
	profileRoleSchema,
	SOCIAL_PLATFORMS,
	socialLinkSchema,
	unusedSocialPlatform,
} from '../src/lib/admin-schema.mjs'

const EMPTY_INPUTS = [undefined, null, '', '   ', '\n\t']
const uuid = (n) => `00000000-0000-4000-8000-00000000000${n}`

test('blank means missing, null, or only whitespace', () => {
	for (const value of EMPTY_INPUTS) assert.equal(isBlank(value), true)
	for (const value of ['a', ' a ', 0, false, [], {}]) assert.equal(isBlank(value), false)
})

test('every optional helper turns any empty input into null', () => {
	const helpers = { text: optionalText(10), uuid: optionalUuid, number: optionalNumber, url: optionalHttpUrl(), email: optionalEmail(), custom: optional(z.enum(['a', 'b'])) }
	for (const [name, schema] of Object.entries(helpers)) {
		for (const value of EMPTY_INPUTS) assert.equal(schema.parse(value), null, `${name} with ${JSON.stringify(value)}`)
	}
	// A missing key in an object is null too.
	assert.deepEqual(z.object({ note: optionalText(10) }).parse({}), { note: null })
})

test('optional helpers still validate real values', () => {
	assert.equal(optionalText(10).parse('  hello '), 'hello')
	assert.ok(!optionalText(3).safeParse('hello').success)
	assert.equal(optionalUuid.parse(` ${uuid(1)} `), uuid(1))
	assert.ok(!optionalUuid.safeParse('not-a-uuid').success)
	assert.equal(optionalNumber.parse('2024'), 2024)
	assert.equal(optionalNumber.parse(10.6), 10.6)
	assert.equal(optionalHttpUrl().parse(' https://www.scb.se/en/ '), 'https://www.scb.se/en/')
	assert.equal(optionalHttpUrl('Use a source URL.').safeParse('www.scb.se').error?.issues[0].message, 'Use a source URL.')
	assert.ok(!optionalHttpUrl().safeParse('javascript:alert(1)').success)
	assert.equal(optionalEmail().parse('info@example.com'), 'info@example.com')
	assert.equal(optionalEmail('Enter a valid contact email.').safeParse('info@').error?.issues[0].message, 'Enter a valid contact email.')
})

// The payloads below are what the editors send when the optional fields of a
// row are left empty (audit X-03).

test('a People role without a card label saves (Glenn Cezanne)', () => {
	const roles = z.array(profileRoleSchema).parse([
		{ id: 'b5e1a47f-cafd-43fa-a38a-4366430a5f1b', title: 'Founder & CEO – Time&Place Group', cardLabel: 'Founder & CEO', isCardRole: true },
		{ id: 'b472eb05-4093-4e3b-81b3-8df21345ec1e', title: 'Founder & Managing Director – Time&Place Consulting', cardLabel: null, isCardRole: false },
		{ id: '7cc6af56-e388-4c9a-a98e-2c7a666b2283', title: 'Founder – Time&Place Institute', cardLabel: '', isCardRole: false },
		{ title: 'New role', isCardRole: false },
	])
	assert.deepEqual(roles.map((role) => role.cardLabel), ['Founder & CEO', null, null, null])
	// A new editor row still needs its title.
	assert.ok(!profileRoleSchema.safeParse({ title: '', cardLabel: null, isCardRole: true }).success)
})

test('a country service without a coverage level saves', () => {
	assert.deepEqual(countryServiceAssignmentSchema.parse({ serviceId: uuid(1), coverageLevel: null }), { serviceId: uuid(1), coverageLevel: null })
	assert.deepEqual(countryServiceAssignmentSchema.parse({ serviceId: uuid(1), coverageLevel: '' }), { serviceId: uuid(1), coverageLevel: null })
	assert.deepEqual(countryServiceAssignmentSchema.parse({ serviceId: uuid(1) }), { serviceId: uuid(1), coverageLevel: null })
})

test('a statistic without a source URL, unit or year saves', () => {
	// The new-row state of the statistics editor, once a key is typed.
	assert.deepEqual(countryStatisticSchema.parse({ metricKey: 'slice-2-check', numericValue: 3, unit: null, statisticYear: null, sourceUrl: null, displayOrder: 1 }), {
		metricKey: 'slice-2-check', numericValue: 3, unit: null, statisticYear: null, sourceUrl: null, displayOrder: 1,
	})
	assert.equal(countryStatisticSchema.parse({ metricKey: 'population', numericValue: '', unit: '', statisticYear: '', sourceUrl: '', displayOrder: 0 }).sourceUrl, null)
	assert.equal(countryStatisticSchema.safeParse({ metricKey: 'population', numericValue: null, unit: null, statisticYear: null, sourceUrl: 'scb.se', displayOrder: 0 }).error?.issues[0].message, 'Use a complete http or https source URL.')
	assert.equal(countryStatisticSchema.safeParse({ metricKey: 'population', numericValue: null, unit: null, statisticYear: 1800, sourceUrl: null, displayOrder: 0 }).error?.issues[0].message, 'Statistic year must be between 1900 and 2200.')
})

test('country service copy and statistic labels with empty optional fields save', () => {
	assert.deepEqual(countryServiceCopySchema.parse({ serviceId: uuid(1), summary: null, content: { type: 'doc', content: [] } }).summary, null)
	assert.deepEqual(countryStatisticLabelSchema.parse({ statisticId: uuid(2), label: 'Population', displayValue: null }), { statisticId: uuid(2), label: 'Population', displayValue: null })
	// Rows carry no locale: the locale is the form's own field.
	assert.ok(!countryServiceCopySchema.safeParse({ serviceId: uuid(1), locale: 'en', summary: null, content: {} }).success)
	assert.ok(!countryStatisticLabelSchema.safeParse({ statisticId: uuid(2), locale: 'en', label: 'Population', displayValue: null }).success)
})

test('a call to action needs only its English label', () => {
	const cta = callToActionSchema.parse({ key: 'slice-2-check', href: '/contact', labels: { en: 'Slice 2 check', de: null, it: '', 'pt-BR': null, 'pt-PT': '  ' } })
	assert.deepEqual(cta.labels, { en: 'Slice 2 check', de: null, it: null, 'pt-BR': null, 'pt-PT': null })
	assert.ok(!callToActionSchema.safeParse({ key: 'contact-us', href: '/contact', labels: { en: '', de: null, it: null, 'pt-BR': null, 'pt-PT': null } }).success)
	assert.ok(!callToActionSchema.safeParse({ key: 'contact-us', href: 'contact', labels: { en: 'Contact', de: null, it: null, 'pt-BR': null, 'pt-PT': null } }).success)
})

test('a new social row starts with a platform that is not used yet (SET-04)', () => {
	assert.equal(unusedSocialPlatform([]), 'linkedin')
	assert.equal(unusedSocialPlatform(['facebook', 'instagram', 'linkedin']), 'youtube')
	assert.equal(unusedSocialPlatform(['linkedin', 'youtube']), 'instagram')
	assert.equal(unusedSocialPlatform(SOCIAL_PLATFORMS), null)
})

test('a social link needs a listed platform and a complete web URL', () => {
	assert.deepEqual(socialLinkSchema.parse({ platform: 'x', url: ' https://x.com/timeandplace ' }), { platform: 'x', url: 'https://x.com/timeandplace' })
	assert.equal(socialLinkSchema.safeParse({ platform: 'tiktok', url: 'https://tiktok.com' }).success, false)
	assert.equal(socialLinkSchema.safeParse({ platform: 'x', url: 'javascript:alert(1)' }).success, false)
})
