'use client'

import { Suspense, type ComponentProps } from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

import { isCurrentPath } from './navigation'

type NavLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
	href: string
	matchNested: boolean
	currentClassName?: string
}

// The current-page state depends on the request path, which Cache Components
// only allows inside a Suspense boundary; the fallback is the same link
// without the current-page marker.
export function NavLink({ matchNested, currentClassName, ...props }: NavLinkProps) {
	return (
		<Suspense fallback={<Link {...props} />}>
			<CurrentAwareLink currentClassName={currentClassName} matchNested={matchNested} {...props} />
		</Suspense>
	)
}

function CurrentAwareLink({ href, matchNested, className, currentClassName, ...props }: NavLinkProps) {
	const pathname = usePathname()
	const current = isCurrentPath(pathname, { href, matchNested })

	return (
		<Link
			{...props}
			aria-current={current ? 'page' : undefined}
			className={cn(className, current && currentClassName)}
			href={href}
		/>
	)
}
