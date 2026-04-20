'use client'

import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useState } from 'react'
import Link from 'next/link'

export default function Newsletter() {
	const { register, handleSubmit, reset, watch } = useForm()
	const [isLoading, setIsLoading] = useState(false)
	const consent = watch('consent')

	const onSubmit = async (data) => {
		setIsLoading(true)

		try {
			const response = await fetch('/api/newsletter', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: data.email }),
			})

			const result = await response.json()

			if (response.ok) {
				toast.success('Subscribed!', {
					description: result.message,
				})
				reset()
			} else {
				toast.error('Could not subscribe', {
					description: result.error || 'Please try again later.',
				})
			}
		} catch (error) {
			toast.error('Something went wrong', {
				description: 'Please check your connection and try again.',
			})
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="w-full bg-primary/90 py-10 lg:py-16">
			<div className="w-[90%] md:w-3/4 max-w-[650px] mx-auto flex flex-col items-center">
				<span className="block text-2xl lg:text-4xl font-unna font-bold text-white mb-2">
					STAY UPDATED
				</span>
				<p className="font-jose text-white/80 text-sm lg:text-base text-center mb-6">
					Subscribe to our newsletter for the latest insights and
					updates.
				</p>
				<form
					className="w-full flex flex-col items-center"
					onSubmit={handleSubmit(onSubmit)}
				>
					<div className="w-full flex flex-col sm:flex-row gap-3 mb-4">
						<input
							type="email"
							placeholder="Your email address"
							className="flex-1 font-jose text-primary border-2 border-white/30 focus:border-white bg-white p-2 outline-none shadow-sm focus:shadow-md"
							{...register('email', { required: true })}
						/>
						<button
							type="submit"
							disabled={isLoading || !consent}
							className="h-10 px-6 sm:w-36 bg-white font-jose font-bold text-sm lg:text-base text-primary rounded-md shadow-md hover:shadow-xl hover:brightness-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? 'Subscribing...' : 'Subscribe'}
						</button>
					</div>
					<label className="flex items-start gap-2 cursor-pointer">
						<input
							type="checkbox"
							className="w-4 h-4 shrink-0 appearance-none border-2 border-white rounded-sm checked:bg-white checked:border-white relative checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-primary checked:after:text-xs checked:after:font-bold"
							{...register('consent', { required: true })}
						/>
						<span className="font-jose text-white/70 text-xs lg:text-sm">
							I agree to receive newsletters and updates. You can
							unsubscribe at any time by{' '}
							<Link
								href="/contact"
								className="underline text-white hover:text-white/90"
							>
								contacting us
							</Link>
							.
						</span>
					</label>
				</form>
			</div>
		</div>
	)
}
