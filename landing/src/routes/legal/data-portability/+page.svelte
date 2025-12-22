<script lang="ts">
	import LegalLayout from '$lib/components/LegalLayout.svelte';
</script>

<svelte:head>
	<title>Data Portability & Separation — Grove</title>
	<meta name="description" content="Your content is yours. Here's exactly what happens when you leave Grove." />
</svelte:head>

<LegalLayout title="Data Portability & Account Separation" effectiveDate="December 2025">
	<!-- Promise -->
	<div class="card p-6 mb-8 bg-accent border-accent">
		<h2>Our Promise</h2>
		<p>
			Your content is yours. Your domain is yours. Grove will never hold your data or domain hostage.
		</p>
	</div>

	<section>
		<h2>1. Data Export</h2>

		<h3>What You Receive</h3>
		<p>When you cancel your subscription (or anytime you request it), you receive a complete export package:</p>

		<p class="mt-4"><strong>Blog Content:</strong></p>
		<ul class="space-y-1 ml-4">
			<li>All blog posts in Markdown format</li>
			<li>Original images and media files</li>
			<li>Post metadata (publish dates, tags, status)</li>
			<li>Site configuration and settings</li>
		</ul>

		<div class="card p-4 mt-4 bg-accent border-accent">
			<p class="font-mono text-sm">
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

		<h3>How to Request an Export</h3>
		<ol class="space-y-1 ml-4">
			<li><strong>Self-service:</strong> Admin Panel → Settings → Export Data</li>
			<li><strong>Email:</strong> autumnbrown23@pm.me</li>
			<li><strong>Automatic on cancellation:</strong> Export link sent within 24 hours</li>
		</ol>
		<p class="mt-2">Exports are generated within 24 hours and available for download for 30 days.</p>
	</section>

	<section>
		<h2>2. Domain Ownership & Transfer</h2>

		<h3>You Own Your Domain</h3>
		<p>When Grove registers a custom domain on your behalf (Evergreen tier), <strong>you are the legal owner</strong>. Grove acts as a registrar agent, not the domain owner.</p>
		<ul class="space-y-1 ml-4 mt-2">
			<li>The domain is registered with your contact information</li>
			<li>You receive registrar notifications directly</li>
			<li>You can transfer the domain at any time</li>
			<li>Grove cannot sell, redirect, or hold your domain</li>
		</ul>

		<h3>Domain Transfer Process</h3>
		<p><strong>When you cancel your Evergreen subscription:</strong></p>
		<ol class="space-y-1 ml-4">
			<li><strong>Notification:</strong> You'll receive an email explaining your options</li>
			<li><strong>Transfer window:</strong> 30 days to initiate transfer to another registrar</li>
			<li><strong>Authorization code:</strong> Provided within 48 hours of request</li>
			<li><strong>No fees:</strong> Grove charges no transfer fees</li>
		</ol>

		<p class="mt-4"><strong>To request a domain transfer:</strong></p>
		<ul class="space-y-1 ml-4">
			<li>Email: autumnbrown23@pm.me</li>
			<li>Subject: "Domain Transfer Request - yourdomain.com"</li>
			<li>We'll respond with your EPP/authorization code within 48 hours</li>
		</ul>
	</section>

	<section>
		<h2>3. Grace Periods</h2>
		<div class="overflow-x-auto">
			<table>
				<thead>
					<tr>
						<th>Timeline</th>
						<th>What Happens</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Day 0</td>
						<td>Subscription cancelled</td>
					</tr>
					<tr>
						<td>Days 1-30</td>
						<td>Blog remains accessible, emails forward, domain active</td>
					</tr>
					<tr>
						<td>Days 31-60</td>
						<td>Blog shows "subscription inactive" message, domain still yours</td>
					</tr>
					<tr>
						<td>Days 61-90</td>
						<td>Domain preserved but not pointing to Grove</td>
					</tr>
					<tr>
						<td>Day 90+</td>
						<td>Domain follows registrar's expiration policy if not renewed</td>
					</tr>
				</tbody>
			</table>
		</div>
		<p class="mt-4"><strong>Your domain never disappears without warning.</strong> You'll receive email reminders at 30, 14, and 7 days before any service interruption.</p>
	</section>

	<section>
		<h2>4. @grove.place Email Addresses</h2>
		<p>Email addresses like <code>username@grove.place</code> are tied to your Grove subscription.</p>
		<p class="mt-4"><strong>On cancellation:</strong></p>
		<ul class="space-y-1 ml-4">
			<li>Email forwarding stops after 30-day grace period</li>
			<li>We'll forward a final notice to your personal email</li>
			<li>The address may be released for future users after 6 months</li>
		</ul>
		<p class="mt-4"><strong>Custom domain email</strong> (Oak tier) is entirely yours and unaffected by Grove cancellation.</p>
	</section>

	<section>
		<h2>5. Data Retention After Cancellation</h2>
		<div class="overflow-x-auto">
			<table>
				<thead>
					<tr>
						<th>Data Type</th>
						<th>Retention Period</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Blog posts & media</td>
						<td>90 days (exportable anytime)</td>
					</tr>
					<tr>
						<td>Account information</td>
						<td>90 days (for reactivation)</td>
					</tr>
					<tr>
						<td>Payment history</td>
						<td>7 years (legal requirements)</td>
					</tr>
					<tr>
						<td>Domain registration</td>
						<td>Indefinite (you own it)</td>
					</tr>
				</tbody>
			</table>
		</div>
		<p class="mt-4"><strong>After 90 days:</strong> All blog content is permanently deleted from Grove servers. We cannot recover it.</p>
		<p class="mt-2"><strong>Reactivation:</strong> Within 90 days, you can reactivate your account and restore all content.</p>
	</section>

	<section>
		<h2>6. No Hostage Situations</h2>
		<p>Grove commits to the following:</p>
		<ol class="space-y-1 ml-4">
			<li><strong>No transfer fees</strong> for domains or data</li>
			<li><strong>No artificial delays</strong> in providing export files or authorization codes</li>
			<li><strong>No "pay to leave"</strong> schemes</li>
			<li><strong>No content held for ransom</strong> under any circumstances</li>
			<li><strong>Standard formats</strong> for all exports (Markdown, JSON, common image formats)</li>
		</ol>
		<p class="mt-4">If you ever feel Grove is not honoring this commitment, contact <a href="mailto:autumnbrown23@pm.me">autumnbrown23@pm.me</a> directly.</p>
	</section>

	<section>
		<h2>7. Contact</h2>
		<p><strong>Email:</strong> <a href="mailto:autumnbrown23@pm.me">autumnbrown23@pm.me</a></p>
		<p><strong>Response time:</strong> Within 48 hours</p>
	</section>

	<section class="pt-6">
		<p><em>
			This policy reflects Grove's core value: your content, your ownership, your choice.
		</em></p>
	</section>
</LegalLayout>
