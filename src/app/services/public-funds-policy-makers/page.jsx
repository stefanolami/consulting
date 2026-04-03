import PublicFundsPage from '@/components/services/public-funds-page'
import { publicFundsPolicyServices } from '@/data/data'

export const metadata = {
	title: 'Public Funds, Finance & Procurement for Policy-Makers & Awarding Authorities',
}

const PublicFundsPolicyMakersPage = () => {
	return (
		<PublicFundsPage
			title="Public Funds, Finance & Procurement"
			subtitle="for Policy-Makers & Awarding Authorities"
			intro="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."
			services={publicFundsPolicyServices}
		/>
	)
}

export default PublicFundsPolicyMakersPage
