<script lang="ts">
</script>

<svelte:head>
	<title>Privacy Policy — Grove</title>
	<meta name="description" content="Privacy Policy for Grove. Your data belongs to you. We never sell your data." />
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
				<h1 class="text-3xl md:text-4xl font-serif text-bark mb-2">Privacy Policy</h1>
				<p class="text-bark/50 font-sans text-sm">
					Effective Date: December 10, 2025 · Last Updated: December 11, 2025
				</p>
			</header>

			<!-- Commitment -->
			<div class="card p-6 mb-8 bg-grove-50 border-grove-200">
				<h2 class="text-lg font-serif text-grove-700 mb-2">Our Commitment to Your Privacy</h2>
				<p class="text-bark/70 font-sans">
					Grove is built on a simple principle: <strong>your data belongs to you</strong>. We collect only what we need to provide the Service, we never sell your data, and we give you full control over your information.
				</p>
			</div>

			<!-- Content -->
			<div class="prose prose-bark max-w-none font-sans text-bark/80 leading-relaxed space-y-8">
				<section>
					<h2 class="text-xl font-serif text-bark mb-4">1. Information We Collect</h2>

					<h3 class="text-lg font-serif text-bark/90 mb-2">1.1 Information You Provide</h3>
					<p><strong>Account Information:</strong></p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>Email address (required for authentication)</li>
						<li>Display name (optional)</li>
						<li>Profile information you choose to add</li>
					</ul>

					<p class="mt-4"><strong>Content:</strong></p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>Blog posts and pages you create</li>
						<li>Images and media you upload</li>
						<li>Comments and reactions (if using Grove Social)</li>
					</ul>

					<p class="mt-4"><strong>Payment Information:</strong></p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>Billing details are processed by Stripe</li>
						<li>We do not store your credit card numbers</li>
					</ul>

					<h3 class="text-lg font-serif text-bark/90 mb-2 mt-6">1.2 Information Collected Automatically</h3>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>Session tokens (stored as HTTP-only cookies)</li>
						<li>IP addresses (retained for exactly 1 minute for rate limiting, then discarded)</li>
						<li>Aggregated, anonymized usage data</li>
					</ul>

					<h3 class="text-lg font-serif text-bark/90 mb-2 mt-6">1.3 Information We Do NOT Collect</h3>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>We do not use tracking pixels or third-party advertising trackers</li>
						<li>We do not purchase data about you from third parties</li>
						<li>We do not monitor your activity outside of Grove</li>
					</ul>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">2. How We Use Your Information</h2>
					<div class="overflow-x-auto my-4">
						<table class="w-full text-sm border-collapse">
							<thead>
								<tr class="border-b border-grove-200">
									<th class="py-2 px-3 text-left">Purpose</th>
									<th class="py-2 px-3 text-left">Data Used</th>
								</tr>
							</thead>
							<tbody>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Provide the Service</td>
									<td class="py-2 px-3">Account info, content, session data</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Process payments</td>
									<td class="py-2 px-3">Billing info (via Stripe)</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Send important updates</td>
									<td class="py-2 px-3">Email address</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Prevent abuse</td>
									<td class="py-2 px-3">IP addresses, rate limiting data</td>
								</tr>
							</tbody>
						</table>
					</div>

					<p><strong>We Never Use Your Data To:</strong></p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>Sell to third parties</li>
						<li>Target you with advertising</li>
						<li>Build profiles for marketing</li>
						<li>Train AI models</li>
					</ul>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">3. How We Share Your Information</h2>
					<p><strong>We will never sell, rent, or trade your personal information.</strong></p>

					<p class="mt-4">We share limited data with trusted service providers:</p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li><strong>Cloudflare</strong> — Infrastructure, CDN, security</li>
						<li><strong>Stripe</strong> — Payment processing</li>
						<li><strong>Resend</strong> — Email delivery</li>
						<li><strong>Google</strong> — Authentication (if you use Google Sign-In)</li>
					</ul>

					<p class="mt-4">We may disclose information if required by law, such as in response to a valid subpoena or court order.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">4. Data Retention</h2>
					<div class="overflow-x-auto my-4">
						<table class="w-full text-sm border-collapse">
							<thead>
								<tr class="border-b border-grove-200">
									<th class="py-2 px-3 text-left">Data Type</th>
									<th class="py-2 px-3 text-left">Retention Period</th>
								</tr>
							</thead>
							<tbody>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">IP addresses</td>
									<td class="py-2 px-3">1 minute (rate limiting only)</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Sessions</td>
									<td class="py-2 px-3">7 days (or until logout)</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Account data after deletion</td>
									<td class="py-2 px-3">30 days, then permanently deleted</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Payment records</td>
									<td class="py-2 px-3">As required by law (typically 7 years)</td>
								</tr>
							</tbody>
						</table>
					</div>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">5. Your Rights and Choices</h2>
					<ul class="list-disc list-inside space-y-2 ml-4">
						<li><strong>Access Your Data:</strong> View all your personal information in your account settings</li>
						<li><strong>Export Your Data:</strong> Export your data at any time in standard formats</li>
						<li><strong>Correct Your Data:</strong> Update your account information through your settings</li>
						<li><strong>Delete Your Data:</strong> Request deletion by contacting autumn@grove.place</li>
						<li><strong>Opt Out:</strong> Unsubscribe from marketing emails at any time</li>
					</ul>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">6. Data Security</h2>
					<p>We implement industry-standard security measures:</p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>All data transmitted over HTTPS/TLS encryption</li>
						<li>Passwords and authentication codes are hashed</li>
						<li>HTTP-only, Secure, SameSite=Strict cookies</li>
						<li>Rate limiting to prevent brute-force attacks</li>
						<li>Data stored on Cloudflare's SOC 2 Type II certified infrastructure</li>
					</ul>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">7. Cookies</h2>
					<p>We use only essential cookies:</p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li><strong>Session cookie</strong> — Authentication (7 days)</li>
						<li><strong>CSRF token</strong> — Security (session)</li>
					</ul>
					<p class="mt-4">We do not use third-party tracking cookies, advertising cookies, or social media tracking pixels.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">8. Children's Privacy</h2>
					<p>Grove is not intended for users under 18 years of age. We do not knowingly collect personal information from anyone under 18.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">9. Contact Us</h2>
					<p>If you have questions about this Privacy Policy, please contact us:</p>
					<p><strong>Email:</strong> <a href="mailto:autumn@grove.place" class="text-grove-600 hover:text-grove-700 underline">autumn@grove.place</a></p>
				</section>

				<!-- Summary -->
				<section class="pt-6 border-t border-grove-200">
					<h2 class="text-xl font-serif text-bark mb-4">Summary</h2>
					<div class="overflow-x-auto">
						<table class="w-full text-sm border-collapse">
							<tbody>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Do you sell my data?</td>
									<td class="py-2 px-3 font-bold text-grove-700">Never.</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Do you use my data for advertising?</td>
									<td class="py-2 px-3 font-bold text-grove-700">No.</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Can I export my data?</td>
									<td class="py-2 px-3 font-bold text-grove-700">Yes, anytime.</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Can I delete my account?</td>
									<td class="py-2 px-3 font-bold text-grove-700">Yes, completely.</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Do you use tracking cookies?</td>
									<td class="py-2 px-3 font-bold text-grove-700">Only essential cookies for authentication.</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Is my data encrypted?</td>
									<td class="py-2 px-3 font-bold text-grove-700">Yes, in transit and at rest.</td>
								</tr>
							</tbody>
						</table>
					</div>
				</section>

				<section class="pt-4">
					<p class="italic text-bark/60">
						Your privacy matters. If something in this policy concerns you or doesn't make sense, please reach out.
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
