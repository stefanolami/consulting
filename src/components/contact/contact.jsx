import Image from 'next/image'
import ContactForm from './contact-form'
import ContactMapMobile from './contact-map-mobile'
import ContactMapDesktop from './contact-map-desktop'

export default function Contact() {
	return (
		<div className="w-[90%] lg:w-[75%] max-w-[1100px] mx-auto pt-8 lg:pt-20 pb-16 lg:pb-32 ">
			<div className="w-full lg:flex flex-row items-start justify-center gap-32 mb-12 lg:mb-24">
				<ContactForm />
				<div className="w-full lg:w-[45%] mt-10 lg:mt-0">
					<h2 className="font-unna font-bold text-lg lg:text-3xl lg:text-center text-primary mb-6">
						Brussels Head Office
					</h2>
					<div className="w-full flex items-center justify-center">
						<div className="flex-col items-start justify-center">
							<div className="flex flex-row lg:flex-col justify-start items-center gap-3 mb-2 lg:mb-6">
								<div className="w-9 lg:w-16 h-9 lg:h-16 relative">
									<Image
										src={'/contact/contact-address.png'}
										alt="Address logo"
										fill
										sizes="(max-width: 640px) 10vw, 7vw"
									/>
								</div>
								<div>
									<span className="block font-jose text-xs lg:text-lg font-primary lg:text-center">
										Rue de la Loi 81A
									</span>
									<span className="block font-jose text-xs lg:text-lg font-primary lg:text-center">
										1040 Brussels – Belgium
									</span>
								</div>
							</div>
							<div className="flex flex-row lg:flex-col justify-start items-center gap-3  mb-2 lg:mb-6">
								<div className="w-9 lg:w-16 h-9 lg:h-16 relative">
									<Image
										src={'/contact/contact-email.png'}
										alt="Email logo"
										fill
										sizes="(max-width: 640px) 10vw, 7vw"
									/>
								</div>
								<div>
									<span className="block font-jose text-xs lg:text-lg font-primary">
										info@consultingontap.com
									</span>
								</div>
							</div>
							<div className="flex flex-row lg:flex-col justify-start items-center gap-3">
								<div className="w-9 lg:w-16 h-9 lg:h-16 relative">
									<Image
										src={'/contact/contact-phone.png'}
										alt="Phone logo"
										fill
										sizes="(max-width: 640px) 10vw, 7vw"
									/>
								</div>
								<div>
									<span className="block font-jose text-xs lg:text-lg font-primary">
										+32 (0) 485 38 22 21
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<ContactMapMobile />
			<ContactMapDesktop />
		</div>
	)
}
