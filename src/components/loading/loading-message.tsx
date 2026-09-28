'use client'

import { useTranslations } from 'next-intl'

// Localized loading label for places with no request locale on the server:
// `loading.tsx` files and Suspense fallbacks rendered before the route params
// resolve. Only this leaf is a client component; the skeleton around it stays
// server-rendered. `messageKey` is a full key such as `Team.profile.loading`.
export function LoadingMessage({ messageKey }: { messageKey: string }) {
	const t = useTranslations()
	return t(messageKey)
}
