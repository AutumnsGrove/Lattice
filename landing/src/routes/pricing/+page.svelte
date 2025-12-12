<script lang="ts">
</script>

<svelte:head>
	<title>Pricing — Grove</title>
	<meta name="description" content="Simple, accessible pricing for writers at every level. From curious newcomers to professionals who need a polished presence." />
</svelte:head>

<main class="min-h-screen flex flex-col">
	<!-- Header -->
	<header class="py-6 px-6 border-b border-grove-200">
		<div class="max-w-4xl mx-auto flex items-center justify-between">
			<a href="/" class="text-xl font-serif text-bark hover:text-grove-600 transition-colors">Grove</a>
			<nav class="flex items-center gap-6 text-sm font-sans text-bark/60">
				<a href="/vision" class="hover:text-grove-600 transition-colors">Vision</a>
				<a href="/legal" class="hover:text-grove-600 transition-colors">Legal</a>
			</nav>
		</div>
	</header>

	<!-- Content -->
	<article class="flex-1 px-6 py-12">
		<div class="max-w-4xl mx-auto">
			<!-- Header -->
			<header class="mb-12 text-center">
				<h1 class="text-4xl md:text-5xl font-serif text-bark mb-4">Pricing</h1>
				<p class="text-lg text-bark/60 font-sans">
					A home for writers at every level.
				</p>
				<div class="flex items-center justify-center gap-4 mt-6">
					<div class="w-12 h-px bg-grove-300"></div>
					<svg class="w-4 h-4 text-grove-400" viewBox="0 0 20 20" fill="currentColor">
						<circle cx="10" cy="10" r="4" />
					</svg>
					<div class="w-12 h-px bg-grove-300"></div>
				</div>
			</header>

			<!-- Pricing Table -->
			<div class="overflow-x-auto mb-8">
				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="border-b-2 border-grove-200">
							<th class="py-4 px-4 font-serif text-bark"></th>
							<th class="py-4 px-4 text-center">
								<div class="font-serif text-bark">Seedling</div>
								<div class="text-2xl font-sans font-bold text-grove-600">$8<span class="text-sm font-normal text-bark/50">/mo</span></div>
							</th>
							<th class="py-4 px-4 text-center">
								<div class="font-serif text-bark">Basic</div>
								<div class="text-2xl font-sans font-bold text-grove-600">$12<span class="text-sm font-normal text-bark/50">/mo</span></div>
							</th>
							<th class="py-4 px-4 text-center">
								<div class="font-serif text-bark">Professional</div>
								<div class="text-2xl font-sans font-bold text-grove-600">$25<span class="text-sm font-normal text-bark/50">/mo</span></div>
							</th>
							<th class="py-4 px-4 text-center">
								<div class="font-serif text-bark">Premium</div>
								<div class="text-2xl font-sans font-bold text-grove-600">$35<span class="text-sm font-normal text-bark/50">/mo</span></div>
							</th>
						</tr>
					</thead>
					<tbody class="text-sm font-sans">
						<tr class="border-b border-grove-100">
							<td class="py-3 px-4 text-bark/70">Blog Posts</td>
							<td class="py-3 px-4 text-center text-bark">50</td>
							<td class="py-3 px-4 text-center text-bark">250</td>
							<td class="py-3 px-4 text-center text-bark">Unlimited</td>
							<td class="py-3 px-4 text-center text-bark">Unlimited</td>
						</tr>
						<tr class="border-b border-grove-100 bg-grove-50/30">
							<td class="py-3 px-4 text-bark/70">Storage</td>
							<td class="py-3 px-4 text-center text-bark">1 GB</td>
							<td class="py-3 px-4 text-center text-bark">5 GB</td>
							<td class="py-3 px-4 text-center text-bark">20 GB</td>
							<td class="py-3 px-4 text-center text-bark">100 GB</td>
						</tr>
						<tr class="border-b border-grove-100">
							<td class="py-3 px-4 text-bark/70">Grove Social</td>
							<td class="py-3 px-4 text-center text-grove-600">
								<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</td>
							<td class="py-3 px-4 text-center text-grove-600">
								<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</td>
							<td class="py-3 px-4 text-center text-grove-600">
								<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</td>
							<td class="py-3 px-4 text-center text-grove-600">
								<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</td>
						</tr>
						<tr class="border-b border-grove-100 bg-grove-50/30">
							<td class="py-3 px-4 text-bark/70">Custom Domain</td>
							<td class="py-3 px-4 text-center text-bark/30">—</td>
							<td class="py-3 px-4 text-center text-bark/30">—</td>
							<td class="py-3 px-4 text-center text-bark">BYOD</td>
							<td class="py-3 px-4 text-center text-grove-600">
								<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</td>
						</tr>
						<tr class="border-b border-grove-100">
							<td class="py-3 px-4 text-bark/70">@grove.place Email</td>
							<td class="py-3 px-4 text-center text-bark/30">—</td>
							<td class="py-3 px-4 text-center text-bark">Forward</td>
							<td class="py-3 px-4 text-center text-bark">Full</td>
							<td class="py-3 px-4 text-center text-bark">Full</td>
						</tr>
						<tr class="border-b border-grove-100 bg-grove-50/30">
							<td class="py-3 px-4 text-bark/70">Support</td>
							<td class="py-3 px-4 text-center text-bark">Community</td>
							<td class="py-3 px-4 text-center text-bark">Email</td>
							<td class="py-3 px-4 text-center text-bark">Priority</td>
							<td class="py-3 px-4 text-center text-bark">8hrs + Priority</td>
						</tr>
						<tr class="border-b-2 border-grove-200">
							<td class="py-3 px-4 text-bark/70 italic">Best for</td>
							<td class="py-3 px-4 text-center text-bark/60 italic">Curious</td>
							<td class="py-3 px-4 text-center text-bark/60 italic">Hobbyists</td>
							<td class="py-3 px-4 text-center text-bark/60 italic">Serious Bloggers</td>
							<td class="py-3 px-4 text-center text-bark/60 italic">Professionals</td>
						</tr>
						<tr>
							<td class="py-4 px-4 text-bark/70">Yearly</td>
							<td class="py-4 px-4 text-center font-medium text-grove-700">$82</td>
							<td class="py-4 px-4 text-center font-medium text-grove-700">$122</td>
							<td class="py-4 px-4 text-center font-medium text-grove-700">$255</td>
							<td class="py-4 px-4 text-center font-medium text-grove-700">$357</td>
						</tr>
					</tbody>
				</table>
			</div>

			<p class="text-center text-sm text-bark/50 font-sans mb-12">
				Yearly plans save 15% — pay for 10 months, get 12.
			</p>

			<!-- Details Box -->
			<div class="card p-8">
				<h2 class="text-xl font-serif text-bark mb-6">The Fine Print</h2>

				<div class="space-y-6 text-sm font-sans text-bark/70">
					<div>
						<h3 class="font-medium text-bark mb-2">Custom Domains</h3>
						<p>
							<strong>Professional (BYOD):</strong> Bring a domain you already own at no extra cost.
							<strong>Premium:</strong> We find and register the perfect domain for you. Registration included for domains up to $100/year.
						</p>
					</div>

					<div>
						<h3 class="font-medium text-bark mb-2">@grove.place Email</h3>
						<p>
							<strong>Forward:</strong> Emails to you@grove.place forward to your personal inbox.
							<strong>Full:</strong> Send and receive as you@grove.place — a professional email address included with your blog.
						</p>
					</div>

					<div>
						<h3 class="font-medium text-bark mb-2">Support Hours (Premium)</h3>
						<p>
							Premium includes 8 hours of hands-on support in your first month — setup help, customization, whatever you need.
							After that, priority email support with faster response times.
						</p>
					</div>

					<div>
						<h3 class="font-medium text-bark mb-2">What's Included in Every Tier</h3>
						<ul class="list-disc list-inside space-y-1 mt-2">
							<li>Markdown blog posts with live preview</li>
							<li>Image hosting with automatic WebP compression</li>
							<li>Global CDN delivery via Cloudflare</li>
							<li>SSL/HTTPS included</li>
							<li>Data export anytime — your content is yours</li>
							<li>RSS feed for your blog</li>
							<li>No ads, no tracking of your readers</li>
						</ul>
					</div>

					<div class="pt-4 border-t border-grove-200">
						<h3 class="font-medium text-bark mb-2">Your Data, Your Ownership</h3>
						<p>
							Grove is designed around portability. Export everything at any time. If we ever register a domain for you, you own it — transfer it whenever you want, no fees, no questions.
							See our <a href="/legal/data-portability" class="text-grove-600 hover:text-grove-700 underline">Data Portability Policy</a> for details.
						</p>
					</div>
				</div>
			</div>

			<!-- Contact -->
			<div class="mt-12 text-center">
				<p class="text-bark/60 font-sans text-sm mb-2">
					Need something beyond Premium? Multiple domains, team collaboration, white-label options?
				</p>
				<p class="text-bark font-sans">
					<a href="mailto:autumn@grove.place" class="text-grove-600 hover:text-grove-700 underline">
						Let's talk.
					</a>
				</p>
			</div>
		</div>
	</article>

	<!-- Footer -->
	<footer class="py-8 border-t border-grove-200">
		<div class="max-w-4xl mx-auto px-6">
			<div class="flex items-center justify-center gap-4 text-sm font-sans text-bark/50">
				<a href="/" class="hover:text-grove-600 transition-colors">Home</a>
				<span class="text-grove-300">·</span>
				<a href="/vision" class="hover:text-grove-600 transition-colors">Vision</a>
				<span class="text-grove-300">·</span>
				<a href="/legal" class="hover:text-grove-600 transition-colors">Legal</a>
			</div>
		</div>
	</footer>
</main>
