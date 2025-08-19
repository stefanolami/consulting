'use client'

import { useForm } from 'react-hook-form'
import { sendEmail } from '@/lib/utils/send-email'

export default function ContactForm() {
	const { register, handleSubmit } = useForm()

	const onSubmit = (data) => {
		sendEmail(data)
	}

	return (
		<div className="w-full">
			<h1 className="font-unna font-bold text-xl xl:text-[36px] text-primary mb-4 xl:mb-10">
				CONTACT
			</h1>
			<form
				className="text-sm xl:text-base"
				onSubmit={handleSubmit(onSubmit)}
			>
				<div className="xl:flex flex-row items-center justify-center gap-3">
					<input
						type="text"
						placeholder="Name"
						className="w-full font-jose text-primary border-2 mb-3 border-primary-light focus:border-primary bg-grey p-2 outline-none shadow-sm focus:shadow-md"
						{...register('name', { required: true })}
					/>
					<input
						type="email"
						placeholder="Email"
						className="w-full font-jose text-primary border-2 mb-3 border-primary-light focus:border-primary bg-grey p-2 outline-none shadow-sm focus:shadow-md"
						{...register('email', { required: true })}
					/>
				</div>
				<input
					type="subject"
					placeholder="Subject"
					className="w-full font-jose text-primary border-2 mb-3 border-primary-light focus:border-primary bg-grey p-2 outline-none shadow-sm focus:shadow-md"
					{...register('subject', { required: true })}
				/>
				<textarea
					rows={4}
					placeholder="How can we be of service?"
					className="w-full xl:h-64 resize-none font-jose text-primary border-2 mb-3 border-primary-light focus:border-primary bg-grey p-2 outline-none shadow-sm focus:shadow-md"
					{...register('message', { required: true })}
				></textarea>
				<button className="ml-auto block h-6 xl:h-8 w-28 xl:w-44 bg-primary font-jose font-bold text-xs xl:text-lg text-white rounded-md shadow-md hover:shadow-xl hover:brightness-90">
					Send
				</button>
			</form>
		</div>
	)
}
