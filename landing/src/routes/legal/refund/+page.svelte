<script lang="ts">
</script>

<svelte:head>
	<title>Refund & Cancellation Policy — Grove</title>
	<meta name="description" content="How refunds and cancellations work at Grove. No hoops, no hassle." />
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
				<h1 class="text-3xl md:text-4xl font-serif text-bark mb-2">Refund & Cancellation Policy</h1>
				<p class="text-bark/50 font-sans text-sm">
					Effective Date: December 10, 2025 · Last Updated: December 10, 2025
				</p>
			</header>

			<!-- Philosophy -->
			<div class="card p-6 mb-8 bg-grove-50 border-grove-200">
				<h2 class="text-lg font-serif text-grove-700 mb-2">Our Philosophy</h2>
				<p class="text-bark/70 font-sans">
					We want you to love Grove. If it's not right for you, we make it easy to get your money back or cancel your subscription. No hoops, no hassle.
				</p>
			</div>

			<!-- Content -->
			<div class="prose prose-bark max-w-none font-sans text-bark/80 leading-relaxed space-y-8">
				<section>
					<h2 class="text-xl font-serif text-bark mb-4">1. Refund Policy</h2>

					<h3 class="text-lg font-serif text-bark/90 mb-2">1.1 Within 14 Days (Full Refund)</h3>
					<p>If you're not satisfied with Grove, you can request a <strong>full refund within 14 days</strong> of your initial subscription or any renewal payment.</p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>No questions asked</li>
						<li>Full amount refunded to your original payment method</li>
						<li>Refund processed within 5-10 business days</li>
					</ul>

					<h3 class="text-lg font-serif text-bark/90 mb-2 mt-4">1.2 After 14 Days (Pro-Rated Refund)</h3>
					<p>After the 14-day period, you may still request a refund. We will provide a <strong>pro-rated refund</strong> for the unused portion of your current billing period.</p>
					<p class="mt-2"><strong>Example:</strong> If you're on the Basic plan ($12/month) and cancel on day 20 of your billing cycle, you would receive approximately $4 back (10 unused days ÷ 30 days × $12).</p>

					<h3 class="text-lg font-serif text-bark/90 mb-2 mt-4">1.3 How to Request a Refund</h3>
					<p>Email us at <a href="mailto:autumn@grove.place" class="text-grove-600 hover:text-grove-700 underline">autumn@grove.place</a> with subject "Refund Request".</p>
					<p>We will process your request within <strong>3 business days</strong>.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">2. Cancellation Policy</h2>

					<h3 class="text-lg font-serif text-bark/90 mb-2">2.1 How to Cancel</h3>
					<p>You can cancel your subscription at any time:</p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li><strong>Through your account settings</strong> — Go to Settings → Billing → Cancel Subscription</li>
						<li><strong>By contacting us</strong> — Email autumn@grove.place</li>
					</ul>

					<h3 class="text-lg font-serif text-bark/90 mb-2 mt-4">2.2 What Happens When You Cancel</h3>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>Your subscription will remain active until the end of your current billing period</li>
						<li>You will not be charged again</li>
						<li>You retain full access to your blog until the period ends</li>
						<li>After your subscription ends, your account will be suspended</li>
					</ul>

					<h3 class="text-lg font-serif text-bark/90 mb-2 mt-4">2.3 After Cancellation</h3>
					<div class="overflow-x-auto my-4">
						<table class="w-full text-sm border-collapse">
							<thead>
								<tr class="border-b border-grove-200">
									<th class="py-2 px-3 text-left">Timeframe</th>
									<th class="py-2 px-3 text-left">What Happens</th>
								</tr>
							</thead>
							<tbody>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">End of billing period</td>
									<td class="py-2 px-3">Account suspended, blog goes offline</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">30 days after suspension</td>
									<td class="py-2 px-3">Data archived, available for export</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">60 days after suspension</td>
									<td class="py-2 px-3">Data scheduled for deletion</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">90 days after suspension</td>
									<td class="py-2 px-3">Data permanently deleted</td>
								</tr>
							</tbody>
						</table>
					</div>
					<p><strong>Want to come back?</strong> You can reactivate your subscription anytime within 90 days and your data will be restored.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">3. Grace Period for Failed Payments</h2>
					<p>If your payment fails:</p>
					<div class="overflow-x-auto my-4">
						<table class="w-full text-sm border-collapse">
							<thead>
								<tr class="border-b border-grove-200">
									<th class="py-2 px-3 text-left">Day</th>
									<th class="py-2 px-3 text-left">What Happens</th>
								</tr>
							</thead>
							<tbody>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Day 1</td>
									<td class="py-2 px-3">Payment fails, first reminder email sent</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Days 2-7</td>
									<td class="py-2 px-3">Daily reminder emails sent</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Day 7</td>
									<td class="py-2 px-3">Grace period ends</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Day 8</td>
									<td class="py-2 px-3">Account suspended</td>
								</tr>
							</tbody>
						</table>
					</div>
					<p>During the <strong>7-day grace period</strong>, your blog remains online and you can update your payment method.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">4. Data Export</h2>
					<p>Before or after cancellation, you can export all your data:</p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>Blog posts (Markdown format)</li>
						<li>Pages</li>
						<li>Media files</li>
						<li>Settings</li>
					</ul>
					<p class="mt-2"><strong>We recommend exporting your data before your subscription ends</strong> to ensure you have a backup.</p>
					<p class="mt-2">See our <a href="/legal/data-portability" class="text-grove-600 hover:text-grove-700 underline">Data Portability Policy</a> for full details.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">5. Exceptions</h2>
					<p>Refunds are <strong>not available</strong> in the following situations:</p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>Account terminated for violation of our <a href="/legal/terms" class="text-grove-600 hover:text-grove-700 underline">Terms of Service</a> or <a href="/legal/acceptable-use" class="text-grove-600 hover:text-grove-700 underline">Acceptable Use Policy</a></li>
						<li>Fraudulent payment or chargeback abuse</li>
						<li>Requests made more than 90 days after the original payment</li>
					</ul>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">6. Contact Us</h2>
					<p>If you have questions about refunds, cancellations, or billing:</p>
					<p><strong>Email:</strong> <a href="mailto:autumn@grove.place" class="text-grove-600 hover:text-grove-700 underline">autumn@grove.place</a></p>
					<p>We respond to all billing inquiries within <strong>24 hours</strong>.</p>
				</section>

				<!-- Summary -->
				<section class="pt-6 border-t border-grove-200">
					<h2 class="text-xl font-serif text-bark mb-4">Summary</h2>
					<div class="overflow-x-auto">
						<table class="w-full text-sm border-collapse">
							<thead>
								<tr class="border-b border-grove-200">
									<th class="py-2 px-3 text-left">Situation</th>
									<th class="py-2 px-3 text-left">Policy</th>
								</tr>
							</thead>
							<tbody>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Refund within 14 days</td>
									<td class="py-2 px-3">Full refund</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Refund after 14 days</td>
									<td class="py-2 px-3">Pro-rated refund</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Cancel subscription</td>
									<td class="py-2 px-3">Access until end of billing period</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Failed payment</td>
									<td class="py-2 px-3">7-day grace period</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Data after cancellation</td>
									<td class="py-2 px-3">Retained 90 days, then deleted</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Reactivation</td>
									<td class="py-2 px-3">Available within 90 days</td>
								</tr>
							</tbody>
						</table>
					</div>
				</section>

				<section class="pt-4">
					<p class="italic text-bark/60">
						We believe in fair, transparent billing. If you ever have an issue, just reach out — we'll make it right.
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
