<script lang="ts">
</script>

<svelte:head>
	<title>Data Portability & Separation — Grove</title>
	<meta name="description" content="Your content is yours. Here's exactly what happens when you leave Grove." />
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
				<h1 class="text-3xl md:text-4xl font-serif text-bark mb-2">Data Portability & Account Separation</h1>
				<p class="text-bark/50 font-sans text-sm">
					Effective Date: December 2025
				</p>
			</header>

			<!-- Promise -->
			<div class="card p-6 mb-8 bg-grove-50 border-grove-200">
				<h2 class="text-lg font-serif text-grove-700 mb-2">Our Promise</h2>
				<p class="text-bark/70 font-sans">
					Your content is yours. Your domain is yours. Grove will never hold your data or domain hostage.
				</p>
			</div>

			<!-- Content -->
			<div class="prose prose-bark max-w-none font-sans text-bark/80 leading-relaxed space-y-8">
				<section>
					<h2 class="text-xl font-serif text-bark mb-4">1. Data Export</h2>

					<h3 class="text-lg font-serif text-bark/90 mb-2">What You Receive</h3>
					<p>When you cancel your subscription (or anytime you request it), you receive a complete export package:</p>

					<p class="mt-4"><strong>Blog Content:</strong></p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>All blog posts in Markdown format</li>
						<li>Original images and media files</li>
						<li>Post metadata (publish dates, tags, status)</li>
						<li>Site configuration and settings</li>
					</ul>

					<div class="card p-4 bg-bark/5 mt-4">
						<p class="text-sm font-mono text-bark/70">
							grove-export-username-YYYY-MM-DD.zip<br/>
							├── posts/<br/>
							│&nbsp;&nbsp;&nbsp;├── 2025-01-15-my-first-post.md<br/>
							│&nbsp;&nbsp;&nbsp;└── ...<br/>
							├── media/<br/>
							│&nbsp;&nbsp;&nbsp;├── images/<br/>
							│&nbsp;&nbsp;&nbsp;└── uploads/<br/>
							├── config/<br/>
							│&nbsp;&nbsp;&nbsp;└── site-settings.json<br/>
							└── README.md (import instructions)
						</p>
					</div>

					<h3 class="text-lg font-serif text-bark/90 mb-2 mt-6">How to Request an Export</h3>
					<ol class="list-decimal list-inside space-y-1 ml-4">
						<li><strong>Self-service:</strong> Admin Panel → Settings → Export Data</li>
						<li><strong>Email:</strong> autumn@grove.place</li>
						<li><strong>Automatic on cancellation:</strong> Export link sent within 24 hours</li>
					</ol>
					<p class="mt-2">Exports are generated within 24 hours and available for download for 30 days.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">2. Domain Ownership & Transfer</h2>

					<h3 class="text-lg font-serif text-bark/90 mb-2">You Own Your Domain</h3>
					<p>When Grove registers a custom domain on your behalf (Evergreen tier), <strong>you are the legal owner</strong>. Grove acts as a registrar agent, not the domain owner.</p>
					<ul class="list-disc list-inside space-y-1 ml-4 mt-2">
						<li>The domain is registered with your contact information</li>
						<li>You receive registrar notifications directly</li>
						<li>You can transfer the domain at any time</li>
						<li>Grove cannot sell, redirect, or hold your domain</li>
					</ul>

					<h3 class="text-lg font-serif text-bark/90 mb-2 mt-6">Domain Transfer Process</h3>
					<p><strong>When you cancel your Evergreen subscription:</strong></p>
					<ol class="list-decimal list-inside space-y-1 ml-4">
						<li><strong>Notification:</strong> You'll receive an email explaining your options</li>
						<li><strong>Transfer window:</strong> 30 days to initiate transfer to another registrar</li>
						<li><strong>Authorization code:</strong> Provided within 48 hours of request</li>
						<li><strong>No fees:</strong> Grove charges no transfer fees</li>
					</ol>

					<p class="mt-4"><strong>To request a domain transfer:</strong></p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>Email: autumn@grove.place</li>
						<li>Subject: "Domain Transfer Request - yourdomain.com"</li>
						<li>We'll respond with your EPP/authorization code within 48 hours</li>
					</ul>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">3. Grace Periods</h2>
					<div class="overflow-x-auto">
						<table class="w-full text-sm border-collapse">
							<thead>
								<tr class="border-b border-grove-200">
									<th class="py-2 px-3 text-left">Timeline</th>
									<th class="py-2 px-3 text-left">What Happens</th>
								</tr>
							</thead>
							<tbody>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Day 0</td>
									<td class="py-2 px-3">Subscription cancelled</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Days 1-30</td>
									<td class="py-2 px-3">Blog remains accessible, emails forward, domain active</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Days 31-60</td>
									<td class="py-2 px-3">Blog shows "subscription inactive" message, domain still yours</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Days 61-90</td>
									<td class="py-2 px-3">Domain preserved but not pointing to Grove</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Day 90+</td>
									<td class="py-2 px-3">Domain follows registrar's expiration policy if not renewed</td>
								</tr>
							</tbody>
						</table>
					</div>
					<p class="mt-4"><strong>Your domain never disappears without warning.</strong> You'll receive email reminders at 30, 14, and 7 days before any service interruption.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">4. @grove.place Email Addresses</h2>
					<p>Email addresses like <code>username@grove.place</code> are tied to your Grove subscription.</p>
					<p class="mt-4"><strong>On cancellation:</strong></p>
					<ul class="list-disc list-inside space-y-1 ml-4">
						<li>Email forwarding stops after 30-day grace period</li>
						<li>We'll forward a final notice to your personal email</li>
						<li>The address may be released for future users after 6 months</li>
					</ul>
					<p class="mt-4"><strong>Custom domain email</strong> (Oak tier) is entirely yours and unaffected by Grove cancellation.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">5. Data Retention After Cancellation</h2>
					<div class="overflow-x-auto">
						<table class="w-full text-sm border-collapse">
							<thead>
								<tr class="border-b border-grove-200">
									<th class="py-2 px-3 text-left">Data Type</th>
									<th class="py-2 px-3 text-left">Retention Period</th>
								</tr>
							</thead>
							<tbody>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Blog posts & media</td>
									<td class="py-2 px-3">90 days (exportable anytime)</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Account information</td>
									<td class="py-2 px-3">90 days (for reactivation)</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Payment history</td>
									<td class="py-2 px-3">7 years (legal requirements)</td>
								</tr>
								<tr class="border-b border-grove-100">
									<td class="py-2 px-3">Domain registration</td>
									<td class="py-2 px-3">Indefinite (you own it)</td>
								</tr>
							</tbody>
						</table>
					</div>
					<p class="mt-4"><strong>After 90 days:</strong> All blog content is permanently deleted from Grove servers. We cannot recover it.</p>
					<p class="mt-2"><strong>Reactivation:</strong> Within 90 days, you can reactivate your account and restore all content.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">6. No Hostage Situations</h2>
					<p>Grove commits to the following:</p>
					<ol class="list-decimal list-inside space-y-1 ml-4">
						<li><strong>No transfer fees</strong> for domains or data</li>
						<li><strong>No artificial delays</strong> in providing export files or authorization codes</li>
						<li><strong>No "pay to leave"</strong> schemes</li>
						<li><strong>No content held for ransom</strong> under any circumstances</li>
						<li><strong>Standard formats</strong> for all exports (Markdown, JSON, common image formats)</li>
					</ol>
					<p class="mt-4">If you ever feel Grove is not honoring this commitment, contact <a href="mailto:autumn@grove.place" class="text-grove-600 hover:text-grove-700 underline">autumn@grove.place</a> directly.</p>
				</section>

				<section>
					<h2 class="text-xl font-serif text-bark mb-4">7. Contact</h2>
					<p><strong>Email:</strong> <a href="mailto:autumn@grove.place" class="text-grove-600 hover:text-grove-700 underline">autumn@grove.place</a></p>
					<p><strong>Response time:</strong> Within 48 hours</p>
				</section>

				<section class="pt-6 border-t border-grove-200">
					<p class="italic text-bark/60">
						This policy reflects Grove's core value: your content, your ownership, your choice.
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
