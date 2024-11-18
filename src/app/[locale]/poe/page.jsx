import { useTranslations } from 'next-intl'
import { unstable_setRequestLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import PoeHero from '@/components/poe/PoeHero'
import SectorSelector from '@/components/poe/SectorSelector'

export async function generateMetadata({ params: { locale } }) {
	const t = await getTranslations({
		locale,
		namespace: 'Index' /* replace with metadata file */,
	})

	return {
		title: t('title'),
	}
}

export default function PoePage({ params: { locale } }) {
	unstable_setRequestLocale(locale)
	const t = useTranslations('Index')
	return (
		<div className="mb-24 xl:mb-20">
			<PoeHero />
			<p className="text-center text-primary font-jose text-xs md:text-base xl:text-2xl m-5 xl:mt-16 3xl:mt-24 xl:mx-52 3xl:mx-80 font-normal">
				POE is a dynamic, real-time alert system designed to connect
				stakeholders—businesses, NGOs, and individuals—with public
				funding, public financing, and public tender opportunities. POE
				serves as an essential tool for those looking to sell products
				or services locally, regionally, or globally, ensuring they
				never miss an opportunity to engage in publicly funded projects.
			</p>
			<SectorSelector />
		</div>
	)
}
