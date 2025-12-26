<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import SEO from '$lib/components/SEO.svelte';
</script>

<SEO
	title="Pricing — Grove"
	description="Simple, accessible pricing for writers at every level. From curious newcomers to professionals who need a polished presence."
	url="/pricing"
/>

<main class="min-h-screen flex flex-col">
	<Header maxWidth="wide" />

	<!-- Content -->
	<article class="flex-1 px-6 py-12">
		<div class="max-w-5xl mx-auto">
			<!-- Header -->
			<header class="mb-12 text-center">
				<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">Pricing</h1>
				<p class="text-lg text-foreground-subtle font-sans">
					A home for writers at every level.
				</p>
				<div class="flex items-center justify-center gap-4 mt-6">
					<div class="w-12 h-px bg-divider"></div>
					<svg class="w-4 h-4 text-accent-subtle" viewBox="0 0 20 20" fill="currentColor">
						<circle cx="10" cy="10" r="4" />
					</svg>
					<div class="w-12 h-px bg-divider"></div>
				</div>
			</header>

			<!-- Pricing Table -->
			<div class="overflow-x-auto mb-8">
				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="border-b-2 border-default">
							<th class="py-4 px-3 font-serif text-foreground"></th>
							<th class="py-4 px-3 text-center">
								<div class="font-serif text-foreground">Free</div>
								<div class="text-2xl font-sans font-bold text-accent-muted">$0</div>
							</th>
							<th class="py-4 px-3 text-center">
								<div class="font-serif text-foreground">Seedling</div>
								<div class="text-2xl font-sans font-bold text-accent-muted">$8<span class="text-sm font-normal text-foreground-faint">/mo</span></div>
							</th>
							<th class="py-4 px-3 text-center">
								<div class="font-serif text-foreground">Sapling</div>
								<div class="text-2xl font-sans font-bold text-accent-muted">$12<span class="text-sm font-normal text-foreground-faint">/mo</span></div>
							</th>
							<th class="py-4 px-3 text-center">
								<div class="font-serif text-foreground">Oak</div>
								<div class="text-2xl font-sans font-bold text-accent-muted">$25<span class="text-sm font-normal text-foreground-faint">/mo</span></div>
							</th>
							<th class="py-4 px-3 text-center">
								<div class="font-serif text-foreground">Evergreen</div>
								<div class="text-2xl font-sans font-bold text-accent-muted">$35<span class="text-sm font-normal text-foreground-faint">/mo</span></div>
							</th>
						</tr>
					</thead>
					<tbody class="text-sm font-sans">
						<tr class="border-b border-subtle">
							<td class="py-3 px-3 text-foreground-muted">Blog</td>
							<td class="py-3 px-3 text-center text-foreground-faint">—</td>
							<td class="py-3 px-3 text-center text-accent-muted">
								<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</td>
							<td class="py-3 px-3 text-center text-accent-muted">
								<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</td>
							<td class="py-3 px-3 text-center text-accent-muted">
								<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</td>
							<td class="py-3 px-3 text-center text-accent-muted">
								<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</td>
						</tr>
						<tr class="border-b border-subtle bg-surface">
							<td class="py-3 px-3 text-foreground-muted">Blog Posts</td>
							<td class="py-3 px-3 text-center text-foreground-faint">—</td>
							<td class="py-3 px-3 text-center text-foreground">50</td>
							<td class="py-3 px-3 text-center text-foreground">250</td>
							<td class="py-3 px-3 text-center text-foreground">Unlimited</td>
							<td class="py-3 px-3 text-center text-foreground">Unlimited</td>
						</tr>
						<tr class="border-b border-subtle">
							<td class="py-3 px-3 text-foreground-muted">Storage</td>
							<td class="py-3 px-3 text-center text-foreground-faint">—</td>
							<td class="py-3 px-3 text-center text-foreground">1 GB</td>
							<td class="py-3 px-3 text-center text-foreground">5 GB</td>
							<td class="py-3 px-3 text-center text-foreground">20 GB</td>
							<td class="py-3 px-3 text-center text-foreground">100 GB</td>
						</tr>
						<tr class="border-b border-subtle bg-surface">
							<td class="py-3 px-3 text-foreground-muted">Themes</td>
							<td class="py-3 px-3 text-center text-foreground-faint">—</td>
							<td class="py-3 px-3 text-center text-foreground">3 + accent</td>
							<td class="py-3 px-3 text-center text-foreground">10 + accent</td>
							<td class="py-3 px-3 text-center text-foreground">Customizer + Community</td>
							<td class="py-3 px-3 text-center text-foreground">Customizer + Community + Fonts</td>
						</tr>
						<tr class="border-b border-subtle">
							<td class="py-3 px-3 text-foreground-muted">Meadow</td>
							<td class="py-3 px-3 text-center text-accent-muted">
								<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</td>
							<td class="py-3 px-3 text-center text-accent-muted">
								<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</td>
							<td class="py-3 px-3 text-center text-accent-muted">
								<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</td>
							<td class="py-3 px-3 text-center text-accent-muted">
								<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</td>
							<td class="py-3 px-3 text-center text-accent-muted">
								<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</td>
						</tr>
						<tr class="border-b border-subtle bg-surface">
							<td class="py-3 px-3 text-foreground-muted">Public Comments</td>
							<td class="py-3 px-3 text-center text-foreground">20/week</td>
							<td class="py-3 px-3 text-center text-foreground">Unlimited</td>
							<td class="py-3 px-3 text-center text-foreground">Unlimited</td>
							<td class="py-3 px-3 text-center text-foreground">Unlimited</td>
							<td class="py-3 px-3 text-center text-foreground">Unlimited</td>
						</tr>
						<tr class="border-b border-subtle">
							<td class="py-3 px-3 text-foreground-muted">Custom Domain</td>
							<td class="py-3 px-3 text-center text-foreground-faint">—</td>
							<td class="py-3 px-3 text-center text-foreground-faint">—</td>
							<td class="py-3 px-3 text-center text-foreground-faint">—</td>
							<td class="py-3 px-3 text-center text-foreground">BYOD</td>
							<td class="py-3 px-3 text-center text-accent-muted">
								<svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</td>
						</tr>
						<tr class="border-b border-subtle bg-surface">
							<td class="py-3 px-3 text-foreground-muted">@grove.place Email</td>
							<td class="py-3 px-3 text-center text-foreground-faint">—</td>
							<td class="py-3 px-3 text-center text-foreground-faint">—</td>
							<td class="py-3 px-3 text-center text-foreground">Forward</td>
							<td class="py-3 px-3 text-center text-foreground">Full</td>
							<td class="py-3 px-3 text-center text-foreground">Full</td>
						</tr>
						<tr class="border-b border-subtle">
							<td class="py-3 px-3 text-foreground-muted">Support</td>
							<td class="py-3 px-3 text-center text-foreground">Help Center</td>
							<td class="py-3 px-3 text-center text-foreground">Community</td>
							<td class="py-3 px-3 text-center text-foreground">Email</td>
							<td class="py-3 px-3 text-center text-foreground">Priority</td>
							<td class="py-3 px-3 text-center text-foreground">8hrs + Priority</td>
						</tr>
						<tr class="border-b-2 border-default">
							<td class="py-3 px-3 text-foreground-muted italic">Best for</td>
							<td class="py-3 px-3 text-center text-foreground-subtle italic">Readers</td>
							<td class="py-3 px-3 text-center text-foreground-subtle italic">Curious</td>
							<td class="py-3 px-3 text-center text-foreground-subtle italic">Hobbyists</td>
							<td class="py-3 px-3 text-center text-foreground-subtle italic">Serious Bloggers</td>
							<td class="py-3 px-3 text-center text-foreground-subtle italic">Professionals</td>
						</tr>
						<tr>
							<td class="py-4 px-3 text-foreground-muted">Yearly</td>
							<td class="py-4 px-3 text-center text-foreground-faint">—</td>
							<td class="py-4 px-3 text-center font-medium text-accent-muted">$82</td>
							<td class="py-4 px-3 text-center font-medium text-accent-muted">$122</td>
							<td class="py-4 px-3 text-center font-medium text-accent-muted">$255</td>
							<td class="py-4 px-3 text-center font-medium text-accent-muted">$357</td>
						</tr>
					</tbody>
				</table>
			</div>

			<p class="text-center text-sm text-foreground-faint font-sans mb-12">
				Yearly plans save 15% — pay for 10 months, get 12.
			</p>

			<!-- Details Box -->
			<div class="card p-8">
				<h2 class="text-xl font-serif text-foreground mb-6">The Fine Print</h2>

				<div class="space-y-6 text-sm font-sans text-foreground-muted">
					<div>
						<h3 class="font-medium text-foreground mb-2">Reading Blogs</h3>
						<p>
							<strong>Everyone can read Grove blogs—no login required.</strong> All blogs are publicly accessible by default. Meadow (the community feed) requires a free account to browse. Only Evergreen tier users can choose to make their blog require login to view.
						</p>
						<p class="mt-2 text-xs text-foreground-faint">
							When you publish a post, it becomes visible to anyone on the internet, indexed by search engines, and shareable via direct links. This is by design—Grove is about sharing your voice with the world.
						</p>
					</div>

					<div>
						<h3 class="font-medium text-foreground mb-2">Free Accounts</h3>
						<p>
							Free accounts get full Meadow access—browse, follow, react—and can comment on posts (20 public comments per week, private replies are rate-limited to prevent spam). No blog, no storage. When you're ready to write, upgrade to Seedling.
						</p>
					</div>

					<div>
						<h3 class="font-medium text-foreground mb-2">Themes</h3>
						<p>
							<strong>Seedling:</strong> Choose from 3 hand-curated themes plus a custom accent color.
							<strong>Sapling:</strong> All 10 themes plus accent color.
							<strong>Oak+:</strong> Full theme customizer (colors, fonts, layout, custom CSS) plus community themes.
							<strong>Evergreen:</strong> Everything Oak gets, plus upload your own custom fonts.
						</p>
					</div>

					<div>
						<h3 class="font-medium text-foreground mb-2">Comments</h3>
						<p>
							Grove supports <strong>Replies</strong> (private, only the author sees) and <strong>Comments</strong> (public, after author approval). Free users can post 20 public comments per week—paid users get unlimited. Private replies are rate-limited for free users to reduce spam.
						</p>
					</div>

					<div>
						<h3 class="font-medium text-foreground mb-2">Custom Domains</h3>
						<p>
							<strong>Oak (BYOD):</strong> Bring a domain you already own at no extra cost.
							<strong>Evergreen:</strong> We find and register the perfect domain for you. Registration included for domains up to $100/year.
						</p>
					</div>

					<div>
						<h3 class="font-medium text-foreground mb-2">@grove.place Email</h3>
						<p>
							<strong>Forward:</strong> Emails to you@grove.place forward to your personal inbox.
							<strong>Full:</strong> Send and receive as you@grove.place — a professional email address included with your blog.
						</p>
					</div>

					<div>
						<h3 class="font-medium text-foreground mb-2">Support Hours (Evergreen)</h3>
						<p>
							Evergreen includes 8 hours of hands-on support in your first month — setup help, customization, whatever you need.
							After that, priority email support with faster response times.
						</p>
					</div>

					<div>
						<h3 class="font-medium text-foreground mb-2">What's Included in Every Paid Tier</h3>
						<ul class="list-disc list-inside space-y-1 mt-2">
							<li>Markdown blog posts with live preview</li>
							<li>Image hosting with automatic WebP compression</li>
							<li>Vines (sidebar links on your posts)</li>
							<li>Global CDN delivery via Cloudflare</li>
							<li>SSL/HTTPS included</li>
							<li>Data export anytime — your content is yours</li>
							<li>RSS feed for your blog</li>
							<li>No ads, no tracking of your readers</li>
						</ul>
					</div>

					<div class="pt-4 border-t border-default">
						<h3 class="font-medium text-foreground mb-2">Your Data, Your Ownership</h3>
						<p>
							Grove is designed around portability. Export everything at any time. If we ever register a domain for you, you own it — transfer it whenever you want, no fees, no questions.
							See our <a href="/legal/data-portability" class="text-accent-muted hover:text-primary underline">Data Portability Policy</a> for details.
						</p>
					</div>
				</div>
			</div>

			<!-- Contact -->
			<div class="mt-12 text-center">
				<p class="text-foreground-subtle font-sans text-sm mb-2">
					Need something beyond Evergreen? Multiple domains, team collaboration, white-label options?
				</p>
				<p class="font-sans">
					<a href="mailto:autumnbrown23@pm.me" class="text-accent-muted hover:text-primary underline">
						Let's talk.
					</a>
				</p>
			</div>
		</div>
	</article>

	<Footer maxWidth="wide" />
</main>

<style>
	.bg-divider { background-color: var(--color-divider); }
</style>
