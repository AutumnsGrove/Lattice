<script lang="ts">
	import LegalLayout from '$lib/components/LegalLayout.svelte';
</script>

<svelte:head>
	<title>Refund & Cancellation Policy — Grove</title>
	<meta name="description" content="How refunds and cancellations work at Grove. No hoops, no hassle." />
</svelte:head>

<LegalLayout title="Refund & Cancellation Policy" effectiveDate="December 10, 2025" lastUpdated="December 10, 2025">
	<!-- Philosophy -->
	<div class="card p-6 mb-8 bg-accent border-accent">
		<h2>Our Philosophy</h2>
		<p>
			We want you to love Grove. If it's not right for you, we make it easy to get your money back or cancel your subscription. No hoops, no hassle.
		</p>
	</div>

	<section>
		<h2>1. Refund Policy</h2>

		<h3>1.1 Within 14 Days (Full Refund)</h3>
		<p>If you're not satisfied with Grove, you can request a <strong>full refund within 14 days</strong> of your initial subscription or any renewal payment.</p>
		<ul class="space-y-1 ml-4">
			<li>No questions asked</li>
			<li>Full amount refunded to your original payment method</li>
			<li>Refund processed within 5-10 business days</li>
		</ul>

		<h3>1.2 After 14 Days (Pro-Rated Refund)</h3>
		<p>After the 14-day period, you may still request a refund. We will provide a <strong>pro-rated refund</strong> for the unused portion of your current billing period.</p>
		<p class="mt-2"><strong>Example:</strong> If you're on the Sapling plan ($12/month) and cancel on day 20 of your billing cycle, you would receive approximately $4 back (10 unused days ÷ 30 days × $12).</p>

		<h3>1.3 How to Request a Refund</h3>
		<p>Email us at <a href="mailto:autumn@grove.place">autumn@grove.place</a> with subject "Refund Request".</p>
		<p>We will process your request within <strong>3 business days</strong>.</p>
	</section>

	<section>
		<h2>2. Cancellation Policy</h2>

		<h3>2.1 How to Cancel</h3>
		<p>You can cancel your subscription at any time:</p>
		<ul class="space-y-1 ml-4">
			<li><strong>Through your account settings</strong> — Go to Settings → Billing → Cancel Subscription</li>
			<li><strong>By contacting us</strong> — Email autumn@grove.place</li>
		</ul>

		<h3>2.2 What Happens When You Cancel</h3>
		<ul class="space-y-1 ml-4">
			<li>Your subscription will remain active until the end of your current billing period</li>
			<li>You will not be charged again</li>
			<li>You retain full access to your blog until the period ends</li>
			<li>After your subscription ends, your account will be suspended</li>
		</ul>

		<h3>2.3 After Cancellation</h3>
		<div class="overflow-x-auto my-4">
			<table>
				<thead>
					<tr>
						<th>Timeframe</th>
						<th>What Happens</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>End of billing period</td>
						<td>Account suspended, blog goes offline</td>
					</tr>
					<tr>
						<td>30 days after suspension</td>
						<td>Data archived, available for export</td>
					</tr>
					<tr>
						<td>60 days after suspension</td>
						<td>Data scheduled for deletion</td>
					</tr>
					<tr>
						<td>90 days after suspension</td>
						<td>Data permanently deleted</td>
					</tr>
				</tbody>
			</table>
		</div>
		<p><strong>Want to come back?</strong> You can reactivate your subscription anytime within 90 days and your data will be restored.</p>
	</section>

	<section>
		<h2>3. Grace Period for Failed Payments</h2>
		<p>If your payment fails:</p>
		<div class="overflow-x-auto my-4">
			<table>
				<thead>
					<tr>
						<th>Day</th>
						<th>What Happens</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Day 1</td>
						<td>Payment fails, first reminder email sent</td>
					</tr>
					<tr>
						<td>Days 2-7</td>
						<td>Daily reminder emails sent</td>
					</tr>
					<tr>
						<td>Day 7</td>
						<td>Grace period ends</td>
					</tr>
					<tr>
						<td>Day 8</td>
						<td>Account suspended</td>
					</tr>
				</tbody>
			</table>
		</div>
		<p>During the <strong>7-day grace period</strong>, your blog remains online and you can update your payment method.</p>
	</section>

	<section>
		<h2>4. Data Export</h2>
		<p>Before or after cancellation, you can export all your data:</p>
		<ul class="space-y-1 ml-4">
			<li>Blog posts (Markdown format)</li>
			<li>Pages</li>
			<li>Media files</li>
			<li>Settings</li>
		</ul>
		<p class="mt-2"><strong>We recommend exporting your data before your subscription ends</strong> to ensure you have a backup.</p>
		<p class="mt-2">See our <a href="/legal/data-portability">Data Portability Policy</a> for full details.</p>
	</section>

	<section>
		<h2>5. Exceptions</h2>
		<p>Refunds are <strong>not available</strong> in the following situations:</p>
		<ul class="space-y-1 ml-4">
			<li>Account terminated for violation of our <a href="/legal/terms">Terms of Service</a> or <a href="/legal/acceptable-use">Acceptable Use Policy</a></li>
			<li>Fraudulent payment or chargeback abuse</li>
			<li>Requests made more than 90 days after the original payment</li>
		</ul>
	</section>

	<section>
		<h2>6. Contact Us</h2>
		<p>If you have questions about refunds, cancellations, or billing:</p>
		<p><strong>Email:</strong> <a href="mailto:autumn@grove.place">autumn@grove.place</a></p>
		<p>We respond to all billing inquiries within <strong>24 hours</strong>.</p>
	</section>

	<!-- Summary -->
	<section class="pt-6">
		<h2>Summary</h2>
		<div class="overflow-x-auto">
			<table>
				<thead>
					<tr>
						<th>Situation</th>
						<th>Policy</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Refund within 14 days</td>
						<td>Full refund</td>
					</tr>
					<tr>
						<td>Refund after 14 days</td>
						<td>Pro-rated refund</td>
					</tr>
					<tr>
						<td>Cancel subscription</td>
						<td>Access until end of billing period</td>
					</tr>
					<tr>
						<td>Failed payment</td>
						<td>7-day grace period</td>
					</tr>
					<tr>
						<td>Data after cancellation</td>
						<td>Retained 90 days, then deleted</td>
					</tr>
					<tr>
						<td>Reactivation</td>
						<td>Available within 90 days</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<section class="pt-4">
		<p><em>
			We believe in fair, transparent billing. If you ever have an issue, just reach out — we'll make it right.
		</em></p>
	</section>
</LegalLayout>
