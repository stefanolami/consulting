import Header from './Header'
import pick from 'lodash/pick'
import { useMessages } from 'next-intl'

export default function HeaderWrapper() {
	const messages = useMessages()

	return (
		<header className="relative header-blur">
			<link
				rel="icon"
				href="/favicon.ico"
			></link>
			<Header
				messages={
					// … and provide the relevant messages
					pick(messages, 'Navigation')
				}
			/>
		</header>
	)
}
