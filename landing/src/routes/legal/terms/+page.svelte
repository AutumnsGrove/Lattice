<script lang="ts">
	import LegalLayout from '$lib/components/LegalLayout.svelte';
</script>

<svelte:head>
	<title>Terms of Service — Grove</title>
	<meta name="description" content="Terms of Service for the Grove platform. The agreement between you and Grove." />
</svelte:head>

<LegalLayout title="Terms of Service" effectiveDate="December 10, 2025" lastUpdated="December 13, 2025">
	<section>
		<h2>1. Agreement to Terms</h2>
		<p>
			By accessing or using Grove ("the Service"), operated by Autumn ("we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
		</p>
		<p>
			The Service is offered to users in the United States only. By using the Service, you represent that you are located in the United States.
		</p>
	</section>

	<section>
		<h2>2. Eligibility</h2>
		<p>
			You must be at least <strong>18 years of age</strong> to use the Service. By using Grove, you represent and warrant that you meet this age requirement.
		</p>
	</section>

	<section>
		<h2>3. Description of Service</h2>
		<p>Grove is a multi-tenant blogging platform that provides:</p>
		<ul>
			<li>Personal blog hosting on subdomains (username.grove.place)</li>
			<li>Markdown-based content creation and publishing</li>
			<li>Media storage and delivery</li>
			<li>Optional community features (Meadow)</li>
			<li>Custom domain support (Oak and Evergreen tiers)</li>
		</ul>
		<p>The Service is provided on a subscription basis with different tiers offering varying features and limits.</p>
	</section>

	<section>
		<h2>4. Account Registration</h2>
		<h3>4.1 Account Creation</h3>
		<p>To use certain features of the Service, you must create an account. You agree to:</p>
		<ul>
			<li>Provide accurate, current, and complete information</li>
			<li>Maintain and update your information as needed</li>
			<li>Keep your login credentials secure</li>
			<li>Notify us immediately of any unauthorized access</li>
		</ul>

		<h3>4.2 Account Responsibility</h3>
		<p>You are solely responsible for all activity that occurs under your account. We are not liable for any loss or damage arising from unauthorized use of your account.</p>
	</section>

	<section>
		<h2>5. Subscription and Payment</h2>
		<h3>5.1 Subscription Tiers</h3>
		<p>Grove offers the following subscription plans:</p>
		<div class="overflow-x-auto my-4">
			<table>
				<thead>
					<tr>
						<th>Plan</th>
						<th>Price</th>
						<th>Features</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Seedling</td>
						<td>$8/month ($82/year)</td>
						<td>1GB storage, 50 posts, Meadow access, community support</td>
					</tr>
					<tr>
						<td>Sapling</td>
						<td>$12/month ($122/year)</td>
						<td>5GB storage, 250 posts, Meadow access, email forwarding, email support</td>
					</tr>
					<tr>
						<td>Oak</td>
						<td>$25/month ($255/year)</td>
						<td>20GB storage, unlimited posts, Meadow access, BYOD custom domain, full @grove.place email, priority support</td>
					</tr>
					<tr>
						<td>Evergreen</td>
						<td>$35/month ($357/year)</td>
						<td>100GB storage, unlimited posts, Meadow access, custom domain included, full @grove.place email, 8 hours onboarding + priority support</td>
					</tr>
				</tbody>
			</table>
		</div>
		<p>Yearly plans save 15% — pay for 10 months, get 12.</p>

		<h3>5.2 Billing</h3>
		<ul>
			<li>Subscriptions are billed monthly in advance</li>
			<li>Payment is processed through Stripe</li>
			<li>You authorize us to charge your payment method on a recurring basis</li>
			<li>Prices may change with 30 days' notice</li>
		</ul>

		<h3>5.3 Failed Payments</h3>
		<ul>
			<li>A <strong>7-day grace period</strong> is provided for failed payments</li>
			<li>During the grace period, you will receive daily reminder emails</li>
			<li>If payment is not received within the grace period, your account will be suspended</li>
			<li>Your data will be archived for <strong>30 days</strong> after suspension</li>
			<li>After 30 days, your data may be permanently deleted</li>
		</ul>
	</section>

	<section>
		<h2>6. Refunds and Cancellation</h2>
		<p>Please see our <a href="/legal/refund">Refund & Cancellation Policy</a> for complete details.</p>
		<p><strong>Summary:</strong></p>
		<ul>
			<li><strong>Within 14 days:</strong> Full refund available</li>
			<li><strong>After 14 days:</strong> Pro-rated refund for unused portion</li>
			<li>You may cancel your subscription at any time through your account settings</li>
		</ul>
	</section>

	<section>
		<h2>7. User Content</h2>
		<h3>7.1 Ownership</h3>
		<p>You retain all ownership rights to the content you create and publish on Grove ("User Content"). We do not claim ownership of your content.</p>

		<h3>7.2 License to Grove</h3>
		<p>By posting User Content, you grant us a limited, non-exclusive license to host, store, display, and distribute your content solely for the purpose of operating the Service. This license ends when you delete your content or close your account.</p>

		<h3>7.3 Content Restrictions</h3>
		<p>Your use of the Service is subject to our <a href="/legal/acceptable-use">Acceptable Use Policy</a>. You agree not to post content that violates these guidelines.</p>
	</section>

	<section>
		<h2>8. Data and Privacy</h2>
		<p>Your privacy is important to us. Please review our <a href="/legal/privacy">Privacy Policy</a> to understand how we collect, use, and protect your information.</p>
		<p><strong>Key Points:</strong></p>
		<ul>
			<li>We never sell your data</li>
			<li>We collect only what's necessary to provide the Service</li>
			<li>You can export your data at any time</li>
			<li>You can request deletion of your account and data</li>
		</ul>
	</section>

	<section>
		<h2>9. Intellectual Property</h2>
		<p>The Service, including its design, features, and underlying technology, is owned by us and protected by intellectual property laws. You may not copy, modify, or reverse engineer any part of the Service.</p>
		<p>The Grove platform code is available under the GNU Affero General Public License v3.0 (AGPL-3.0).</p>
	</section>

	<section>
		<h2>10. DMCA and Copyright</h2>
		<p>We respect intellectual property rights and respond to valid copyright complaints. Please see our <a href="/legal/dmca">DMCA Policy</a> for information on filing takedown notices and counter-notifications.</p>
	</section>

	<section>
		<h2>11. Third-Party Services</h2>
		<p>The Service integrates with third-party services including:</p>
		<ul>
			<li><strong>Cloudflare</strong> — Infrastructure and content delivery</li>
			<li><strong>Stripe</strong> — Payment processing</li>
			<li><strong>Resend</strong> — Email delivery</li>
			<li><strong>Google</strong> — Authentication</li>
		</ul>
		<p>Your use of these services is subject to their respective terms and privacy policies.</p>
	</section>

	<section>
		<h2>12. Disclaimer of Warranties</h2>
		<p class="uppercase">
			THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
		</p>
	</section>

	<section>
		<h2>13. Limitation of Liability</h2>
		<p class="uppercase">
			TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
		</p>
	</section>

	<section>
		<h2>14. Termination</h2>
		<p>You may terminate your account at any time by canceling your subscription and requesting account deletion.</p>
		<p>We may terminate or suspend your account if you violate these Terms, engage in fraudulent activity, or fail to pay after the grace period.</p>
	</section>

	<section>
		<h2>15. Dispute Resolution</h2>
		<p>These Terms are governed by the laws of the State of Georgia, United States. Before filing any legal claim, you agree to contact us at autumnbrown23@pm.me to attempt to resolve the dispute informally.</p>
	</section>

	<section>
		<h2>16. Changes to Terms</h2>
		<p>We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms and sending an email. Your continued use of the Service constitutes acceptance of the updated Terms.</p>
	</section>

	<section>
		<h2>17. Contact Us</h2>
		<p>If you have questions about these Terms, please contact us at:</p>
		<p><strong>Email:</strong> <a href="mailto:autumnbrown23@pm.me">autumnbrown23@pm.me</a></p>
	</section>

	<section class="pt-6">
		<p><em>
			By using Grove, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
		</em></p>
	</section>
</LegalLayout>
