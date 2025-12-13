<script lang="ts">
	import LegalLayout from '$lib/components/LegalLayout.svelte';
</script>

<svelte:head>
	<title>Privacy Policy — Grove</title>
	<meta name="description" content="Privacy Policy for Grove. Your data belongs to you. We never sell your data." />
</svelte:head>

<LegalLayout title="Privacy Policy" effectiveDate="December 10, 2025" lastUpdated="December 11, 2025">
	<!-- Commitment -->
	<div class="card p-6 mb-8 bg-accent border-accent">
		<h2>Our Commitment to Your Privacy</h2>
		<p>
			Grove is built on a simple principle: <strong>your data belongs to you</strong>. We collect only what we need to provide the Service, we never sell your data, and we give you full control over your information.
		</p>
	</div>

	<section>
		<h2>1. Information We Collect</h2>

		<h3>1.1 Information You Provide</h3>
		<p><strong>Account Information:</strong></p>
		<ul class="space-y-1 ml-4">
			<li>Email address (required for authentication)</li>
			<li>Display name (optional)</li>
			<li>Profile information you choose to add</li>
		</ul>

		<p class="mt-4"><strong>Content:</strong></p>
		<ul class="space-y-1 ml-4">
			<li>Blog posts and pages you create</li>
			<li>Images and media you upload</li>
			<li>Comments and reactions (if using Meadow)</li>
		</ul>

		<p class="mt-4"><strong>Payment Information:</strong></p>
		<ul class="space-y-1 ml-4">
			<li>Billing details are processed by Stripe</li>
			<li>We do not store your credit card numbers</li>
		</ul>

		<h3>1.2 Information Collected Automatically</h3>
		<ul class="space-y-1 ml-4">
			<li>Session tokens (stored as HTTP-only cookies)</li>
			<li>IP addresses (retained for exactly 1 minute for rate limiting, then discarded)</li>
			<li>Aggregated, anonymized usage data</li>
		</ul>

		<h3>1.3 Information We Do NOT Collect</h3>
		<ul class="space-y-1 ml-4">
			<li>We do not use tracking pixels or third-party advertising trackers</li>
			<li>We do not purchase data about you from third parties</li>
			<li>We do not monitor your activity outside of Grove</li>
		</ul>
	</section>

	<section>
		<h2>2. How We Use Your Information</h2>
		<div class="overflow-x-auto my-4">
			<table>
				<thead>
					<tr>
						<th>Purpose</th>
						<th>Data Used</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Provide the Service</td>
						<td>Account info, content, session data</td>
					</tr>
					<tr>
						<td>Process payments</td>
						<td>Billing info (via Stripe)</td>
					</tr>
					<tr>
						<td>Send important updates</td>
						<td>Email address</td>
					</tr>
					<tr>
						<td>Prevent abuse</td>
						<td>IP addresses, rate limiting data</td>
					</tr>
				</tbody>
			</table>
		</div>

		<p><strong>We Never Use Your Data To:</strong></p>
		<ul class="space-y-1 ml-4">
			<li>Sell to third parties</li>
			<li>Target you with advertising</li>
			<li>Build profiles for marketing</li>
			<li>Train AI models</li>
		</ul>
	</section>

	<section>
		<h2>3. How We Share Your Information</h2>
		<p><strong>We will never sell, rent, or trade your personal information.</strong></p>

		<p class="mt-4">We share limited data with trusted service providers:</p>
		<ul class="space-y-1 ml-4">
			<li><strong>Cloudflare</strong> — Infrastructure, CDN, security</li>
			<li><strong>Stripe</strong> — Payment processing</li>
			<li><strong>Resend</strong> — Email delivery</li>
			<li><strong>Google</strong> — Authentication (if you use Google Sign-In)</li>
		</ul>

		<p class="mt-4">We may disclose information if required by law, such as in response to a valid subpoena or court order.</p>
	</section>

	<section>
		<h2>4. Data Retention</h2>
		<div class="overflow-x-auto my-4">
			<table>
				<thead>
					<tr>
						<th>Data Type</th>
						<th>Retention Period</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>IP addresses</td>
						<td>1 minute (rate limiting only)</td>
					</tr>
					<tr>
						<td>Sessions</td>
						<td>7 days (or until logout)</td>
					</tr>
					<tr>
						<td>Account data after deletion</td>
						<td>30 days, then permanently deleted</td>
					</tr>
					<tr>
						<td>Payment records</td>
						<td>As required by law (typically 7 years)</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<section>
		<h2>5. Your Rights and Choices</h2>
		<ul class="space-y-2 ml-4">
			<li><strong>Access Your Data:</strong> View all your personal information in your account settings</li>
			<li><strong>Export Your Data:</strong> Export your data at any time in standard formats</li>
			<li><strong>Correct Your Data:</strong> Update your account information through your settings</li>
			<li><strong>Delete Your Data:</strong> Request deletion by contacting autumn@grove.place</li>
			<li><strong>Opt Out:</strong> Unsubscribe from marketing emails at any time</li>
		</ul>
	</section>

	<section>
		<h2>6. Data Security</h2>
		<p>We implement industry-standard security measures:</p>
		<ul class="space-y-1 ml-4">
			<li>All data transmitted over HTTPS/TLS encryption</li>
			<li>Passwords and authentication codes are hashed</li>
			<li>HTTP-only, Secure, SameSite=Strict cookies</li>
			<li>Rate limiting to prevent brute-force attacks</li>
			<li>Data stored on Cloudflare's SOC 2 Type II certified infrastructure</li>
		</ul>
	</section>

	<section>
		<h2>7. Cookies</h2>
		<p>We use only essential cookies:</p>
		<ul class="space-y-1 ml-4">
			<li><strong>Session cookie</strong> — Authentication (7 days)</li>
			<li><strong>CSRF token</strong> — Security (session)</li>
		</ul>
		<p class="mt-4">We do not use third-party tracking cookies, advertising cookies, or social media tracking pixels.</p>
	</section>

	<section>
		<h2>8. Children's Privacy</h2>
		<p>Grove is not intended for users under 18 years of age. We do not knowingly collect personal information from anyone under 18.</p>
	</section>

	<section>
		<h2>9. Contact Us</h2>
		<p>If you have questions about this Privacy Policy, please contact us:</p>
		<p><strong>Email:</strong> <a href="mailto:autumn@grove.place">autumn@grove.place</a></p>
	</section>

	<!-- Summary -->
	<section class="pt-6">
		<h2>Summary</h2>
		<div class="overflow-x-auto">
			<table>
				<tbody>
					<tr>
						<td>Do you sell my data?</td>
						<td><strong>Never.</strong></td>
					</tr>
					<tr>
						<td>Do you use my data for advertising?</td>
						<td><strong>No.</strong></td>
					</tr>
					<tr>
						<td>Can I export my data?</td>
						<td><strong>Yes, anytime.</strong></td>
					</tr>
					<tr>
						<td>Can I delete my account?</td>
						<td><strong>Yes, completely.</strong></td>
					</tr>
					<tr>
						<td>Do you use tracking cookies?</td>
						<td><strong>Only essential cookies for authentication.</strong></td>
					</tr>
					<tr>
						<td>Is my data encrypted?</td>
						<td><strong>Yes, in transit and at rest.</strong></td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<section class="pt-4">
		<p><em>
			Your privacy matters. If something in this policy concerns you or doesn't make sense, please reach out.
		</em></p>
	</section>
</LegalLayout>
