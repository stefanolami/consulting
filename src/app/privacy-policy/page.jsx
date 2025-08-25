import Link from 'next/link'

export const metadata = {
	title: 'Privacy Policy',
}

export default function PrivacyPolicyPage() {
	return (
		<div className="w-[90%] xl:w-[70%] max-w-[1100px] mx-auto pt-8 xl:pt-20 pb-16 xl:pb-32 ">
			<h1 className="font-unna font-bold text-xl xl:text-[48px] text-center text-black mb-10 xl:mb-20">
				PRIVACY POLICY
			</h1>
			<div className="space-y-6 font-jose text-sm xl:text-base">
				<p>
					Time&Place Consulting is committed to protecting your
					privacy and ensuring that your personal data is handled in
					compliance with applicable laws, including the General Data
					Protection Regulation (EU) 2016/679 (GDPR). This Privacy
					Policy explains how we collect, use, disclose, and protect
					your personal information when you visit our website and
					interact with our services.
				</p>

				<p>
					<strong>1. Data Controller</strong>
					<br />
					The data controller responsible for processing your personal
					data is:
				</p>
				<p>
					Time&Place Consulting <br />
					Rue de la Loi 81A, <br />
					1040 Brussels, Belgium <br />
					Email: info@consultingontap.com
				</p>

				<p>
					<strong>2. Data We Collect</strong>
					<br />
					We collect personal data that you provide directly to us or
					that we collect automatically through your use of our
					website. The types of personal data we collect include:
				</p>
				<ul className="list-disc pl-5 space-y-2">
					<li>
						Personal Identification Information: name, email
						address, phone number, company name, and job title.
					</li>
					<li>
						Usage Data: information about how you use our website,
						including IP address, browser type and version, device
						information, pages visited, time spent on pages, and
						interactions with website features.
					</li>
					<li>
						Cookies and Tracking Technologies: data collected
						through cookies and similar technologies, such as
						browser cookies, pixels, and analytics tools. For more
						information, please see our{' '}
						<Link
							href="/cookie-use"
							className="underline"
						>
							Cookie Policy
						</Link>
						.
					</li>
				</ul>

				<p>
					<strong>3. Legal Basis for Processing</strong>
					<br />
					We process your personal data based on the following legal
					grounds:
				</p>
				<ul className="list-disc pl-5 space-y-2">
					<li>
						Consent: When you provide us with your explicit consent
						to process your personal data (e.g., when subscribing to
						our newsletter or accepting cookies).
					</li>
					<li>
						Contractual necessity: When processing your data is
						necessary for the performance of a contract with you
						(e.g., providing our services or responding to your
						inquiries).
					</li>
					<li>
						Legitimate interests: When processing is necessary for
						our legitimate interests, provided that these interests
						are not overridden by your rights (e.g., improving our
						website, marketing communications).
					</li>
					<li>
						Legal obligations: When processing is necessary for
						compliance with legal obligations (e.g., maintaining
						financial records).
					</li>
				</ul>

				<p>
					<strong>4. How We Use Your Data</strong>
					<br />
					We use the personal data we collect for the following
					purposes:
				</p>
				<ul className="list-disc pl-5 space-y-2">
					<li>
						To provide and manage our services, including responding
						to inquiries and providing public funding advice.
					</li>
					<li>
						To improve and personalize your experience on our
						website.
					</li>
					<li>
						To analyze website usage and improve the functionality
						and content of our website.
					</li>
					<li>
						To send you marketing communications and updates, where
						you have consented to receive such communications.
					</li>
					<li>To comply with our legal obligations.</li>
				</ul>

				<p>
					<strong>5. Data Retention</strong>
					<br />
					We will retain your personal data for as long as necessary
					to fulfill the purposes for which it was collected, or as
					required by law. When your data is no longer necessary, we
					will securely delete or anonymize it.
				</p>

				<p>
					<strong>6. Sharing Your Data</strong>
					<br />
					We may share your personal data with third parties under the
					following circumstances:
				</p>
				<ul className="list-disc pl-5 space-y-2">
					<li>
						Service Providers: We may engage third-party companies
						to perform functions on our behalf, such as website
						hosting, data analysis, or email marketing. These
						service providers are contractually bound to process
						your personal data only in accordance with our
						instructions and applicable data protection laws.
					</li>
					<li>
						Legal Obligations: We may disclose your data where
						required by law or to comply with legal proceedings,
						court orders, or government regulations.
					</li>
					<li>
						Business Transfers: In the event of a merger,
						acquisition, or sale of assets, your personal data may
						be transferred as part of the transaction.
					</li>
				</ul>
				<p>
					We do not sell or rent your personal data to third parties.
				</p>

				<p>
					<strong>7. International Data Transfers</strong>
					<br />
					If we transfer your personal data outside the European
					Economic Area (EEA), we will ensure that appropriate
					safeguards are in place to protect your data, such as
					entering into standard contractual clauses approved by the
					European Commission or ensuring that the recipient is
					subject to an adequacy decision by the European Commission.
				</p>

				<p>
					<strong>8. Your Rights Under GDPR</strong>
					<br />
					As a data subject, you have the following rights concerning
					your personal data:
				</p>
				<ul className="list-disc pl-5 space-y-2">
					<li>
						Right of access: You have the right to request access to
						the personal data we hold about you.
					</li>
					<li>
						Right to rectification: You have the right to request
						correction of any inaccurate or incomplete data.
					</li>
					<li>
						Right to erasure: You have the right to request the
						deletion of your data in certain circumstances, also
						known as the &quot;right to be forgotten.&quot;
					</li>
					<li>
						Right to restrict processing: You have the right to
						request a restriction on how we process your personal
						data under specific conditions.
					</li>
					<li>
						Right to data portability: You have the right to receive
						your data in a structured, commonly used, and
						machine-readable format and have the right to transmit
						the data to another controller.
					</li>
					<li>
						Right to object: You have the right to object to the
						processing of your data based on legitimate interests,
						including for direct marketing purposes.
					</li>
					<li>
						Right to withdraw consent: If you have given consent to
						the processing of your data, you have the right to
						withdraw your consent at any time, without affecting the
						lawfulness of processing based on consent before its
						withdrawal.
					</li>
				</ul>
				<p>
					To exercise any of these rights, please contact us using the
					contact details provided in this policy.
				</p>

				<p>
					<strong>9. Security of Your Data</strong>
					<br />
					We implement appropriate technical and organisational
					measures to protect your personal data against unauthorized
					access, loss, destruction, or alteration. However, please
					note that no method of transmission over the internet or
					electronic storage is 100% secure. While we strive to
					protect your personal data, we cannot guarantee its absolute
					security.
				</p>

				<p>
					<strong>10. Cookies and Tracking Technologies</strong>
					<br />
					We use cookies and similar tracking technologies to collect
					information about your browsing activities on our website.
					This data is used to improve your user experience, analyze
					traffic, and provide personalized content. For detailed
					information on the cookies we use and how you can manage
					your cookie preferences, please refer to our{' '}
					<Link
						href="/cookie-use"
						className="underline"
					>
						Cookie Policy
					</Link>
					.
				</p>

				<p>
					<strong>11. Marketing Communications</strong>
					<br />
					If you have opted in to receive marketing communications
					from us, we will use your personal data to send you
					information about our services, events, and other relevant
					updates. You may opt out of receiving these communications
					at any time by clicking the &quot;unsubscribe&quot; link in
					any email or contacting us directly.
				</p>

				<p>
					<strong>12. Third-Party Links</strong>
					<br />
					Our website may contain links to external websites operated
					by third parties. These websites have their own privacy
					policies, and we are not responsible for their content or
					practices. We recommend reviewing the privacy policies of
					any third-party websites you visit.
				</p>

				<p>
					<strong>13. Changes to This Privacy Policy</strong>
					<br />
					We may update this Privacy Policy from time to time to
					reflect changes in our practices or legal requirements. Any
					changes will be posted on this page, and the &quot;Effective
					Date&quot; will be updated accordingly. We encourage you to
					review this policy regularly to stay informed about how we
					are protecting your personal data.
				</p>

				<p>
					<strong>14. Contact Us</strong>
					<br />
					If you have any questions or concerns about this Privacy
					Policy, or if you wish to exercise your data protection
					rights, please contact us at:
				</p>
				<p>
					Time&Place Consulting
					<br />
					Rue de la Loi 81A,
					<br />
					1040 Brussels, Belgium
					<br />
					Email: info@consultingontap.com
				</p>
			</div>
		</div>
	)
}
