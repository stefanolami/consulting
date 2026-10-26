import Contact from '@/components/contact/contact'
import { trainingCourses } from '@/data/data'

export const metadata = {
	title: 'Contact',
}

// Prefills subject and message when arriving from a training offer link
function getDefaultValues(trainingId) {
	const course = trainingCourses.find((course) => course.id === trainingId)
	if (!course) return undefined

	const languages = new Intl.ListFormat('en', {
		type: 'disjunction',
	}).format(course.languages)

	return {
		subject: `Personalised offer – ${course.title}`,
		message: `Hello,\n\nI would like to receive a personalised offer for the training "${course.title}" with ${course.trainer.name}.\n\nPreferred language (${languages}):\nPreferred format (on our premises, in a Time&Place office or online):\nNumber of participants:\n`,
	}
}

export default async function ContactPage({ searchParams }) {
	const { training } = await searchParams
	return <Contact defaultValues={getDefaultValues(training)} />
}
