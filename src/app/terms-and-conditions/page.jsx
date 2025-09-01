import Link from 'next/link'

export const metadata = {
	title: 'Terms and Conditions',
}

export default function TermsPage() {
	return (
		<div className="w-[90%] xl:w-[70%] max-w-[1100px] mx-auto pt-8 xl:pt-20 pb-16 xl:pb-32 text-primary">
			<h1 className="font-unna font-bold text-xl xl:text-[48px] text-center mb-10 xl:mb-20">
				TERMS AND CONDITIONS
			</h1>
			<div className="space-y-6 font-jose text-sm xl:text-base">
				<p>
					Welcome to the Time&Place Consulting website. These Terms
					and Conditions govern your use of our website and services.
					By accessing or using our website, you agree to be bound by
					these terms. If you do not agree with any part of these
					Terms and Conditions, you must refrain from using the
					website.
				</p>

				<p>
					These Terms and Conditions are issued in compliance with
					applicable laws and regulations, including but not limited
					to the General Data Protection Regulation (EU) 2016/679
					(GDPR).
				</p>

				<h2 className="text-lg font-semibold">
					1. General Information
				</h2>

				<p>
					Time&Place Consulting <br />
					Rue de la Loi 81A, <br />
					1040 Brussels,
					<br />
					Belgium <br />
					Email: info@consultingontap.com
				</p>
				<p>
					Time&Place Funding is a Brussels-based provider of public
					funding advisory and consulting services.
				</p>

				<h2 className="text-lg font-semibold">2. Use of the Website</h2>
				<p>
					You agree to use this website in accordance with applicable
					laws and regulations and in a manner that does not infringe
					the rights of third parties or restrict or inhibit the use
					of the website by others. Unauthorized use of this website
					may give rise to a claim for damages and/or be a criminal
					offense under Belgian law.
				</p>

				<h2 className="text-lg font-semibold">3. Website Content</h2>
				<p>
					All content available on the Time&Place Consulting website,
					including but not limited to text, images, graphics, logos,
					and software, is the intellectual property of Time&Place
					Consulting unless otherwise indicated. You are permitted to
					view, download, and print content from this website for
					personal, non-commercial use, provided that you do not
					modify, reproduce, distribute, or exploit the content
					without prior written consent from Time&Place Consulting.
				</p>

				<h2 className="text-lg font-semibold">4. User Accounts</h2>
				<p>
					Certain areas of the website may require you to create an
					account or provide personal information. When creating an
					account, you must ensure that the information you provide is
					accurate, current, and complete. You are responsible for
					maintaining the confidentiality of your account credentials
					and for any activities that occur under your account.
				</p>
				<p>
					We reserve the right to suspend or terminate your account at
					our discretion if we suspect any unauthorized or unlawful
					activity.
				</p>

				<h2 className="text-lg font-semibold">
					5. Privacy and Data Protection
				</h2>
				<p>
					Your privacy is important to us. We are committed to
					protecting your personal data and ensuring its lawful use in
					accordance with the GDPR. Our{' '}
					<Link
						href="/privacy-policy"
						className="underline"
					>
						Privacy Policy
					</Link>{' '}
					outlines how we collect, process, and protect your personal
					information. By using this website, you acknowledge that you
					have read and understood our Privacy Policy.
				</p>

				<h2 className="text-lg font-semibold">6. Cookies</h2>
				<p>
					This website uses cookies to enhance user experience,
					provide functionality, and collect analytical data. Our{' '}
					<Link
						href="/cookie-use"
						className="underline"
					>
						Cookie Policy
					</Link>{' '}
					explains the types of cookies we use, how they work, and how
					you can manage your cookie preferences.
				</p>

				<h2 className="text-lg font-semibold">
					7. Intellectual Property
				</h2>
				<p>
					All intellectual property rights related to the website and
					its content are owned by or licensed to Time&Place
					Consulting. The website and its content are protected by
					copyright, trademark, and other intellectual property laws.
					You may not use, reproduce, distribute, or modify any
					content without our express written permission.
				</p>
				<p>
					Any unauthorized use of our intellectual property may result
					in legal action.
				</p>

				<h2 className="text-lg font-semibold">8. Third-Party Links</h2>
				<p>
					This website may contain links to external websites operated
					by third parties. These links are provided for your
					convenience only, and Time&Place Consulting has no control
					over the content or availability of such websites. We are
					not responsible for the accuracy, reliability, or legality
					of any third-party content or services provided through
					linked websites.
				</p>
				<p>
					The inclusion of any link does not imply endorsement by
					Time&Place Consulting. Use of third-party websites is at
					your own risk, and we encourage you to review the terms and
					policies of any third-party sites you visit.
				</p>

				<h2 className="text-lg font-semibold">
					9. Limitation of Liability
				</h2>
				<p>
					While we make every effort to ensure that the content of
					this website is accurate and up to date, Time&Place
					Consulting does not guarantee the completeness, accuracy, or
					reliability of the information provided. The website and its
					content are provided &quot;as is&quot; without any
					warranties, express or implied.
				</p>
				<p>
					To the fullest extent permitted by law, Time&Place
					Consulting excludes all liability for any loss or damage,
					including but not limited to indirect or consequential loss
					or damage, arising from your use of or inability to use this
					website or any information contained therein.
				</p>

				<h2 className="text-lg font-semibold">10. Indemnification</h2>
				<p>
					You agree to indemnify, defend, and hold harmless Time&Place
					Consulting, its officers, directors, employees, and agents
					from and against any claims, liabilities, damages, losses,
					or expenses, including reasonable legal fees, arising out of
					or related to your use of the website or any violation of
					these Terms and Conditions.
				</p>

				<h2 className="text-lg font-semibold">
					11. Modifications to Terms and Website
				</h2>
				<p>
					Time&Place Consulting reserves the right to modify these
					Terms and Conditions at any time. Any changes will be posted
					on this page, and we will indicate the date of the latest
					revision at the top of this page. Your continued use of the
					website after any modifications constitutes your acceptance
					of the updated Terms and Conditions.
				</p>
				<p>
					We also reserve the right to modify, suspend, or discontinue
					any part of the website or its services at any time without
					notice.
				</p>

				<h2 className="text-lg font-semibold">
					12. Governing Law and Jurisdiction
				</h2>
				<p>
					These Terms and Conditions and any disputes arising out of
					or relating to your use of the website shall be governed by
					and construed in accordance with the laws of Belgium,
					without regard to its conflict of law principles. You agree
					to submit to the exclusive jurisdiction of the courts
					located in Brussels, Belgium, to resolve any legal matters
					arising from these Terms and Conditions.
				</p>

				<h2 className="text-lg font-semibold">13. Contact Us</h2>
				<p>
					If you have any questions or concerns about these Terms and
					Conditions, please contact us at:
				</p>
				<p>
					Time&Place Consulting <br />
					Rue de la Loi 81A, <br />
					1040 Brussels,
					<br />
					Belgium <br />
					Email: info@consultingontap.com
				</p>
			</div>
		</div>
	)
}
