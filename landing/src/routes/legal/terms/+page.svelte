<script lang="ts">
</script>

<svelte:head>
	<title>Terms of Service — Grove</title>
	<meta name="description" content="Terms of Service for the Grove platform. The agreement between you and Grove." />
</svelte:head>

<main class="min-h-screen flex flex-col">
	<!-- Header -->
	<header class="py-6 px-6 border-b border-grove-200">
		<div class="max-w-3xl mx-auto flex items-center justify-between">
			<a href="/" class="text-xl font-serif text-bark hover:text-grove-600 transition-colors">Grove</a>
			<nav class="flex items-center gap-6 text-sm font-sans text-bark/60">
				<a href="/legal" class="hover:text-grove-600 transition-colors">Legal</a>
			</nav>
		</div>
	</header>

	<!-- Content -->
	<article class="flex-1 px-6 py-12">
		<div class="max-w-3xl mx-auto">
			<!-- Header -->
			<header class="mb-8">
				<p class="text-sm text-bark/50 font-sans mb-2">
					<a href="/legal" class="hover:text-grove-600 transition-colors">&larr; All Legal Documents</a>
				</p>
				<h1 class="text-3xl md:text-4xl font-serif text-bark mb-2">Terms of Service</h1>
				<p class="text-bark/50 font-sans text-sm">
					Effective Date: December 10, 2025 · Last Updated: December 10, 2025
				</p>
			</header>

			<!-- Content -->
			<div class="prose prose-bark max-w-none font-sans text-bark/80 leading-relaxed space-y-8">
				<section>
					<h2 class="text-xl font-serif text-bark mb-4">1. Agreement to Terms</h2>
					<p>
						By accessing or using Grove ("the Service"), operated by Autumn ("we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
					</p>
					<p>
						The Service is offered to users in the United States only. By using the Service, you represent that you are located in the United States.
					</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">2. Eligibility</h2>
					<p>
						You must be at least <strong>18 years of age</strong> to use the Service. By using Grove, you represent and warrant that you meet this age requirement.
					</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">3. Description of Service</h2>
					<p>Grove is a multi-tenant blogging platform that provides:</p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>Personal blog hosting on subdomains (username.grove.place)</li>
						<li>Markdown-based content creation and publishing</li>
						<li>Media storage and delivery</li>
						<li>Optional community features (Grove Social)</li>
						<li>Custom domain support (Premium tier only)</li>
					</ul>
					<p>The Service is provided on a subscription basis with different tiers offering varying features and limits.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">4. Account Registration</h2>
					<h3 class="text-lg font-serif text-bark/90 mb-2">4.1 Account Creation</h3>
					<p>To use certain features of the Service, you must create an account. You agree to:</p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>Provide accurate, current, and complete information</li>
						<li>Maintain and update your information as needed</li>
						<li>Keep your login credentials secure</li>
						<li>Notify us immediately of any unauthorized access</li>
					</ul>

					<h3 class="text-lg font-serif text-bark/90 mb-2 mt-4">4.2 Account Responsibility</h3>
					<p>You are solely responsible for all activity that occurs under your account. We are not liable for any loss or damage arising from unauthorized use of your account.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">5. Subscription and Payment</h2>
					<h3 class="text-lg font-serif text-bark/90 mb-2">5.1 Subscription Tiers</h3>
					<p>Grove offers the following subscription plans:</p>
					<div class="overflow-x-auto my-4">
						<table class="w-full text-sm border-collapse">
							<thead>
								<tr class="border-b border-grove-200">
									<th class="py-2 px-3 text-left">Plan</th>
									<th class="py-2 px-3 text-left">Price</th>
									<th class="py-2 px-3 text-left">Features</th>
								</tr>
							</thead>
							<tbody>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Basic</td>
									<td class="py-2 px-3">$12/month</td>
									<td class="py-2 px-3">5GB storage, 250 posts, Grove Social access</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Professional</td>
									<td class="py-2 px-3">$25/month</td>
									<td class="py-2 px-3">20GB storage, unlimited posts, Grove Social access</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Premium</td>
									<td class="py-2 px-3">$35/month</td>
									<td class="py-2 px-3">100GB storage, unlimited posts, custom domain, Grove Social access</td>
								</tr>
							</tbody>
						</table>
					</div>

					<h3 class="text-lg font-serif text-bark/90 mb-2">5.2 Billing</h3>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>Subscriptions are billed monthly in advance</li>
						<li>Payment is processed through Stripe</li>
						<li>You authorize us to charge your payment method on a recurring basis</li>
						<li>Prices may change with 30 days' notice</li>
					</ul>

					<h3 class="text-lg font-serif text-bark/90 mb-2 mt-4">5.3 Failed Payments</h3>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>A <strong>7-day grace period</strong> is provided for failed payments</li>
						<li>During the grace period, you will receive daily reminder emails</li>
						<li>If payment is not received within the grace period, your account will be suspended</li>
						<li>Your data will be archived for <strong>30 days</strong> after suspension</li>
						<li>After 30 days, your data may be permanently deleted</li>
					</ul>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">6. Refunds and Cancellation</h2>
					<p>Please see our <a href="/legal/refund" class="text-grove-600 hover:text-grove-700 underline">Refund & Cancellation Policy</a> for complete details.</p>
					<p><strong>Summary:</strong></p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li><strong>Within 14 days:</strong> Full refund available</li>
						<li><strong>After 14 days:</strong> Pro-rated refund for unused portion</li>
						<li>You may cancel your subscription at any time through your account settings</li>
					</ul>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">7. User Content</h2>
					<h3 class="text-lg font-serif text-bark/90 mb-2">7.1 Ownership</h3>
					<p>You retain all ownership rights to the content you create and publish on Grove ("User Content"). We do not claim ownership of your content.</p>

					<h3 class="text-lg font-serif text-bark/90 mb-2 mt-4">7.2 License to Grove</h3>
					<p>By posting User Content, you grant us a limited, non-exclusive license to host, store, display, and distribute your content solely for the purpose of operating the Service. This license ends when you delete your content or close your account.</p>

					<h3 class="text-lg font-serif text-bark/90 mb-2 mt-4">7.3 Content Restrictions</h3>
					<p>Your use of the Service is subject to our <a href="/legal/acceptable-use" class="text-grove-600 hover:text-grove-700 underline">Acceptable Use Policy</a>. You agree not to post content that violates these guidelines.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">8. Data and Privacy</h2>
					<p>Your privacy is important to us. Please review our <a href="/legal/privacy" class="text-grove-600 hover:text-grove-700 underline">Privacy Policy</a> to understand how we collect, use, and protect your information.</p>
					<p><strong>Key Points:</strong></p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>We never sell your data</li>
						<li>We collect only what's necessary to provide the Service</li>
						<li>You can export your data at any time</li>
						<li>You can request deletion of your account and data</li>
					</ul>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">9. Intellectual Property</h2>
					<p>The Service, including its design, features, and underlying technology, is owned by us and protected by intellectual property laws. You may not copy, modify, or reverse engineer any part of the Service.</p>
					<p>The Grove platform code is available under the GNU Affero General Public License v3.0 (AGPL-3.0).</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">10. DMCA and Copyright</h2>
					<p>We respect intellectual property rights and respond to valid copyright complaints. Please see our <a href="/legal/dmca" class="text-grove-600 hover:text-grove-700 underline">DMCA Policy</a> for information on filing takedown notices and counter-notifications.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">11. Third-Party Services</h2>
					<p>The Service integrates with third-party services including:</p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li><strong>Cloudflare</strong> — Infrastructure and content delivery</li>
						<li><strong>Stripe</strong> — Payment processing</li>
						<li><strong>Resend</strong> — Email delivery</li>
						<li><strong>Google</strong> — Authentication</li>
					</ul>
					<p>Your use of these services is subject to their respective terms and privacy policies.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">12. Disclaimer of Warranties</h2>
					<p class="uppercase text-sm">
						THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
					</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">13. Limitation of Liability</h2>
					<p class="uppercase text-sm">
						TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
					</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">14. Termination</h2>
					<p>You may terminate your account at any time by canceling your subscription and requesting account deletion.</p>
					<p>We may terminate or suspend your account if you violate these Terms, engage in fraudulent activity, or fail to pay after the grace period.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">15. Dispute Resolution</h2>
					<p>These Terms are governed by the laws of the State of Georgia, United States. Before filing any legal claim, you agree to contact us at autumn@grove.place to attempt to resolve the dispute informally.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">16. Changes to Terms</h2>
					<p>We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms and sending an email. Your continued use of the Service constitutes acceptance of the updated Terms.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">17. Contact Us</h2>
					<p>If you have questions about these Terms, please contact us at:</p>
					<p><strong>Email:</strong> <a href="mailto:autumn@grove.place" class="text-grove-600 hover:text-grove-700 underline">autumn@grove.place</a></p>
				</section>

				<section class="pt-6 border-t border-grove-200">
					<p class="italic text-bark/60">
						By using Grove, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
					</p>
				</section>
			</div>
		</div>
	</article>

	<!-- Footer -->
	<footer class="py-8 border-t border-grove-200">
		<div class="max-w-3xl mx-auto px-6">
			<div class="flex items-center justify-center gap-4 text-sm font-sans text-bark/50">
				<a href="/" class="hover:text-grove-600 transition-colors">Home</a>
				<span class="text-grove-300">·</span>
				<a href="/legal" class="hover:text-grove-600 transition-colors">Legal</a>
			</div>
		</div>
	</footer>
</main>
