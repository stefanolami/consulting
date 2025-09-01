import Link from 'next/link'

export const metadata = {
	title: 'Cookie Use',
}

export default function CookieUsePage() {
	return (
		<div className="w-[90%] xl:w-[70%] max-w-[1100px] mx-auto pt-8 xl:pt-20 pb-16 xl:pb-32 ">
			<h1 className="font-unna font-bold text-xl xl:text-[48px] text-center text-black mb-10 xl:mb-20">
				COOKIE USE
			</h1>
			<div className="space-y-6 font-jose text-sm xl:text-base">
				<p>
					Time&Place Consulting, headquartered in Brussels, Belgium,
					is committed to ensuring the privacy and protection of your
					personal data while visiting our website. This Cookie Policy
					outlines how we use cookies and similar technologies, in
					compliance with Regulation (EU) 2016/679 (General Data
					Protection Regulation - GDPR) and Directive 2002/58/EC
					(ePrivacy Directive).
				</p>

				<p>
					<strong>1. What Are Cookies?</strong>
					<br />
					Cookies are small text files that are placed on your device
					(e.g., computer, tablet, smartphone) when you visit a
					website. Cookies help enhance your browsing experience by
					remembering your preferences, providing analytical insights,
					and enabling certain functionalities.
				</p>

				<p>
					<strong>2. Types of Cookies Used on This Website</strong>
					<br />
					We use both “first-party” and “third-party cookies” on our
					website. First-party cookies are set by “Time&Place
					Consulting”, while third-party cookies are set by external
					service providers.
				</p>

				<p>
					<strong>3. The categories of cookies used are:</strong>
				</p>

				<ol className="list-decimal pl-5 space-y-4">
					<li>
						<strong>Strictly Necessary Cookies</strong> <br />
						These cookies are essential for the functioning of the
						website. They enable core functionality such as security
						features, access to secure areas, and network
						management. These cookies do not require user consent.
					</li>

					<li>
						<strong>Analytical/Performance Cookies*</strong> <br />
						These cookies collect aggregated data on how visitors
						use the website, such as pages visited and links
						clicked. This data is anonymized and helps us optimize
						the website’s performance. These cookies are deployed
						only with your explicit consent.
					</li>

					<li>
						<strong>Functional Cookies</strong> <br />
						Functional cookies allow the website to remember your
						settings and preferences, such as language choice or
						region. They enhance your experience but are not
						essential to the functioning of the website. Consent is
						required for their activation.
					</li>

					<li>
						<strong>Targeting/Advertising Cookies</strong> <br />
						These cookies are used to deliver advertisements that
						are more relevant to you and your interests. They may
						also be used to limit the number of times you see an ad
						and help measure the effectiveness of ad campaigns.
						These cookies may track your browsing activity across
						other websites and require your consent.
					</li>
				</ol>

				<p>
					<strong>4. Legal Basis for Using Cookies</strong>
					<br />
					Under Article 6(1)(a) of the GDPR, we will obtain your prior
					consent before placing any cookies on your device, except
					for those cookies that are strictly necessary for the
					functioning of the website. You can accept or reject
					non-essential cookies through the cookie banner that appears
					when you first visit our website.
				</p>
				<p>
					You may withdraw your consent at any time by changing your
					cookie settings as described below.
				</p>

				<p>
					<strong>5. Managing Your Cookie Preferences</strong>
					<br />
					You have the right to control and manage the use of cookies
					on our website. Upon your first visit, you will be presented
					with a cookie consent banner, allowing you to:
				</p>

				<ul className="list-disc pl-5 space-y-2">
					<li>Accept all cookies</li>
					<li>Reject non-essential cookies</li>
					<li>Customize your cookie settings</li>
				</ul>

				<p>
					You can also manage or delete cookies through your browser
					settings at any time. Please note that disabling certain
					cookies may impact the functionality of our website.
				</p>

				<ul className="list-disc underline pl-5 space-y-2">
					<li>
						<a
							href="https://support.google.com/chrome/answer/95647?hl=en"
							target="_blank"
						>
							Manage cookies in Google Chrome
						</a>
					</li>
					<li>
						<a
							href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop?redirectslug=enable-and-disable-cookies-website-preferences&redirectlocale=en-US"
							target="_blank"
						>
							Manage cookies in Mozilla Firefox
						</a>
					</li>
					<li>
						<a
							href="https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge-view-allow-block-delete-and-use-168dab11-0753-043d-7c16-ede5947fc64d"
							target="_blank"
						>
							Manage cookies in Microsoft Edge
						</a>
					</li>
					<li>
						<a
							href="https://support.apple.com/ro-ro/guide/safari/sfri11471/mac"
							target="_blank"
						>
							Manage cookies in Safari
						</a>
					</li>
				</ul>

				<p>
					<strong>6. Third-Party Cookies</strong>
					<br />
					Our website may contain cookies from third-party providers,
					including, but not limited to, analytics services (such as
					Google Analytics) and social media platforms (such as
					LinkedIn, Facebook, Instagram, X, YouTube). These third
					parties may collect data about your online activity across
					different websites.
				</p>

				<p>
					<strong>7. Data Collected via Cookies</strong>
					<br />
					The information collected via cookies may include, but is
					not limited to, the following:
				</p>

				<ul className="list-disc pl-5 space-y-2">
					<li>IP address</li>
					<li>Browser type and version</li>
					<li>Device operating system</li>
					<li>Pages visited on our website</li>
					<li>Time spent on pages</li>
					<li>Interaction with site features</li>
				</ul>

				<p>
					This information is used solely to improve your user
					experience, analyze site performance, and tailor our
					services to your preferences. Personal data collected via
					cookies will be processed in accordance with our{' '}
					<Link
						href="/privacy-policy"
						className="underline"
					>
						Privacy Policy
					</Link>
					.
				</p>

				<p>
					<strong>8. Data Retention</strong>
					<br />
					Cookies will be stored on your device for a duration
					appropriate to their purpose. Session cookies are
					automatically deleted when you close your browser, while
					persistent cookies remain on your device for a predetermined
					period unless deleted manually.
				</p>

				<p>
					<strong>9. Your Rights</strong>
					<br />
					As a data subject under the GDPR, you have the following
					rights concerning your personal data:
				</p>

				<ul className="list-disc pl-5 space-y-2">
					<li>
						Right of access – You may request access to the data we
						hold about you.
					</li>
					<li>
						Right to rectification – You may request correction of
						inaccurate data.
					</li>
					<li>
						Right to erasure (&quot;right to be forgotten&quot;) –
						You may request the deletion of your data under certain
						conditions.
					</li>
					<li>
						Right to restrict processing – You may request
						restrictions on how we process your data.
					</li>
					<li>
						Right to data portability – You may request the transfer
						of your data to another service provider.
					</li>
					<li>
						Right to object – You may object to the processing of
						your data, including data processing via cookies.
					</li>
				</ul>

				<p>
					To exercise these rights or for any questions related to our
					use of cookies, please contact us using the details below.
				</p>

				<p>
					<strong>10. Contact Us</strong>
					<br />
					If you have any questions or concerns about this Cookie
					Policy or how we use cookies, please contact us at:
				</p>

				<p>
					Time&Place Group
					<br />
					Rue de la Loi 81A, <br />
					1040 Brussels, <br />
					Belgium
					<br />
					Email: info@consultingontap.com
				</p>
			</div>
		</div>
	)
}
