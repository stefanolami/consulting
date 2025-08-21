import Overview from './overview'
import Endorsements from '../endorsements/endorsements'
import ClientCodex from './client-codex'

const WhyUs = () => {
	return (
		<div className="pt-8 xl:pt-20 pb-16 xl:pb-32 w-full text-primary">
			<h1 className="font-unna font-bold text-xl lg:text-[48px] text-center text-primary mb-6 lg:mb-16">
				WHY US
			</h1>
			<Overview />
			<ClientCodex />
			<Endorsements />
		</div>
	)
}

export default WhyUs
