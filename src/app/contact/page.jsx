import Contact from '@/components/contact/contact'

export async function generateMetadata() {
	return {
		title: 'Contact',
	}
}

export default function ContactPage() {
	return <Contact />
}
