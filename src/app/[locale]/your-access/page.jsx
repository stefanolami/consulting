import { useTranslations } from 'next-intl'
import { unstable_setRequestLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import YourAccess from '@/components/your-access/YourAccess'

export async function generateMetadata({ params: { locale } }) {
	const t = await getTranslations({
		locale,
		namespace: 'Index' /* replace with metadata file */,
	})

	return {
		title: t('title'),
	}
}

export default function About({ params: { locale } }) {
	unstable_setRequestLocale(locale)
	const t = useTranslations('Index')
	const heroMessage = t('hero')
	return (
		<div>
			<YourAccess />
		</div>
	)
}
