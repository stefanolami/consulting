'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import {
	forgotPasswordAction,
	signInAction,
	updatePasswordAction,
	type AuthActionState,
} from '@/app/(auth)/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const initialAuthActionState: AuthActionState = {
	status: 'idle',
}

function SubmitButton({ children }: { children: React.ReactNode }) {
	const { pending } = useFormStatus()

	return (
		<Button
			className="h-11 w-full rounded-lg bg-[#27335a] text-white hover:bg-[#1e294c]"
			disabled={pending}
			type="submit"
		>
			{pending ? 'Please wait…' : children}
		</Button>
	)
}

function FormMessage({
	status,
	message,
}: {
	status: 'idle' | 'error' | 'success'
	message?: string
}) {
	if (!message) {
		return null
	}

	return (
		<p
			aria-live="polite"
			className={cn(
				'rounded-lg border px-3 py-2.5 text-sm leading-5',
				status === 'success'
					? 'border-emerald-200 bg-emerald-50 text-emerald-800'
					: 'border-red-200 bg-red-50 text-red-700',
			)}
			role={status === 'error' ? 'alert' : 'status'}
		>
			{message}
		</p>
	)
}

function FieldError({ messages }: { messages?: string[] }) {
	if (!messages?.length) {
		return null
	}

	return <p className="text-sm text-red-700">{messages[0]}</p>
}

export function SignInForm({
	initialError,
	nextPath,
}: {
	initialError?: string
	nextPath: string
}) {
	const initialState: AuthActionState = initialError
		? {
				status: 'error',
				message: initialError,
			}
		: initialAuthActionState
	const [state, action] = useActionState(
		signInAction,
		initialState,
	)

	return (
		<form action={action} className="space-y-5">
			<input name="next" type="hidden" value={nextPath} />
			<FormMessage status={state.status} message={state.message} />
			<div className="space-y-2">
				<Label htmlFor="email">Email address</Label>
				<Input
					aria-describedby={
						state.fieldErrors?.email ? 'email-error' : undefined
					}
					autoCapitalize="none"
					autoComplete="email"
					autoFocus
					className="h-11 rounded-lg bg-white"
					id="email"
					name="email"
					required
					type="email"
				/>
				<div id="email-error">
					<FieldError messages={state.fieldErrors?.email} />
				</div>
			</div>
			<div className="space-y-2">
				<div className="flex items-center justify-between gap-4">
					<Label htmlFor="password">Password</Label>
					<Link
						className="text-sm font-medium text-[#27335a] underline-offset-4 hover:underline"
						href="/auth/forgot-password"
					>
						Forgot password?
					</Link>
				</div>
				<Input
					aria-describedby={
						state.fieldErrors?.password
							? 'password-error'
							: undefined
					}
					autoComplete="current-password"
					className="h-11 rounded-lg bg-white"
					id="password"
					name="password"
					required
					type="password"
				/>
				<div id="password-error">
					<FieldError messages={state.fieldErrors?.password} />
				</div>
			</div>
			<SubmitButton>Sign in</SubmitButton>
		</form>
	)
}

export function ForgotPasswordForm() {
	const [state, action] = useActionState(
		forgotPasswordAction,
		initialAuthActionState,
	)

	return (
		<form action={action} className="space-y-5">
			<FormMessage status={state.status} message={state.message} />
			<div className="space-y-2">
				<Label htmlFor="email">Email address</Label>
				<Input
					aria-describedby={
						state.fieldErrors?.email ? 'email-error' : undefined
					}
					autoCapitalize="none"
					autoComplete="email"
					autoFocus
					className="h-11 rounded-lg bg-white"
					id="email"
					name="email"
					required
					type="email"
				/>
				<div id="email-error">
					<FieldError messages={state.fieldErrors?.email} />
				</div>
			</div>
			<SubmitButton>Send recovery link</SubmitButton>
			<p className="text-center text-sm text-slate-600">
				<Link
					className="font-medium text-[#27335a] underline-offset-4 hover:underline"
					href="/auth/sign-in"
				>
					Return to sign in
				</Link>
			</p>
		</form>
	)
}

export function UpdatePasswordForm() {
	const [state, action] = useActionState(
		updatePasswordAction,
		initialAuthActionState,
	)

	return (
		<form action={action} className="space-y-5">
			<FormMessage status={state.status} message={state.message} />
			<div className="space-y-2">
				<Label htmlFor="password">New password</Label>
				<Input
					aria-describedby="password-help password-error"
					autoComplete="new-password"
					autoFocus
					className="h-11 rounded-lg bg-white"
					id="password"
					minLength={12}
					name="password"
					required
					type="password"
				/>
				<p className="text-sm text-slate-500" id="password-help">
					Use at least 12 characters.
				</p>
				<div id="password-error">
					<FieldError messages={state.fieldErrors?.password} />
				</div>
			</div>
			<div className="space-y-2">
				<Label htmlFor="passwordConfirmation">
					Confirm new password
				</Label>
				<Input
					aria-describedby={
						state.fieldErrors?.passwordConfirmation
							? 'password-confirmation-error'
							: undefined
					}
					autoComplete="new-password"
					className="h-11 rounded-lg bg-white"
					id="passwordConfirmation"
					minLength={12}
					name="passwordConfirmation"
					required
					type="password"
				/>
				<div id="password-confirmation-error">
					<FieldError
						messages={state.fieldErrors?.passwordConfirmation}
					/>
				</div>
			</div>
			<SubmitButton>Save password</SubmitButton>
		</form>
	)
}
