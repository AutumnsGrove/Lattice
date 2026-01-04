<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';
	import Logo from './Logo.svelte';
	import {
		Github,
		ExternalLink,
		BookOpen,
		MapPin,
		Tag,
		Telescope,
		Mail,
		PenLine,
		Hammer,
		Scroll,
		Grape
	} from 'lucide-svelte';
	import { season } from '$lib/stores/season';

	interface Props {
		maxWidth?: 'narrow' | 'default' | 'wide';
	}

	let { maxWidth = 'default' }: Props = $props();

	const maxWidthClass = {
		narrow: 'max-w-2xl',
		default: 'max-w-4xl',
		wide: 'max-w-5xl'
	};
</script>

<footer class="py-12 border-t border-default">
	<div class="{maxWidthClass[maxWidth]} mx-auto px-6">
		<!-- Three Column Layout (stacked on mobile) -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 mb-10">
			<!-- Column 1: Grove Brand -->
			<div class="text-center sm:text-left">
				<div class="flex items-center gap-2 justify-center sm:justify-start mb-3">
					<Logo class="w-6 h-6" season={$season} />
					<span class="text-xl font-serif text-foreground">Grove</span>
				</div>
				<p class="text-sm font-sans text-foreground-subtle italic mb-4">
					A place to Be
				</p>
				<p class="text-sm font-sans text-foreground-subtle leading-relaxed">
					A quiet corner of the internet where your words can grow and flourish.
				</p>
			</div>

			<!-- Column 2: Resources -->
			<div class="text-center sm:text-left">
				<h3 class="text-sm font-sans font-medium text-foreground uppercase tracking-wide mb-4">Resources</h3>
				<ul class="space-y-2.5 text-sm font-sans">
					<li>
						<a href="/knowledge" class="inline-flex items-center gap-1.5 text-foreground-subtle hover:text-accent-muted transition-colors">
							<BookOpen class="w-4 h-4" />
							Knowledge Base
						</a>
					</li>
					<li>
						<a href="/roadmap" class="inline-flex items-center gap-1.5 text-foreground-subtle hover:text-accent-muted transition-colors">
							<MapPin class="w-4 h-4" />
							Roadmap
						</a>
					</li>
					<li>
						<a href="/roadmap/workshop" class="inline-flex items-center gap-1.5 text-foreground-subtle hover:text-accent-muted transition-colors">
							<Hammer class="w-4 h-4" />
							Workshop
						</a>
					</li>
					<li>
						<a href="/vineyard" class="inline-flex items-center gap-1.5 text-foreground-subtle hover:text-accent-muted transition-colors">
							<Grape class="w-4 h-4" />
							Vineyard
						</a>
					</li>
					<li>
						<a href="/pricing" class="inline-flex items-center gap-1.5 text-foreground-subtle hover:text-accent-muted transition-colors">
							<Tag class="w-4 h-4" />
							Pricing
						</a>
					</li>
					<li>
						<a href="/manifesto" class="inline-flex items-center gap-1.5 text-foreground-subtle hover:text-accent-muted transition-colors">
							<Scroll class="w-4 h-4" />
							Manifesto
						</a>
					</li>
					<li>
						<a href="/vision" class="inline-flex items-center gap-1.5 text-foreground-subtle hover:text-accent-muted transition-colors">
							<Telescope class="w-4 h-4" />
							Our Vision
						</a>
					</li>
				</ul>
			</div>

			<!-- Column 3: Connect -->
			<div class="text-center sm:text-left">
				<h3 class="text-sm font-sans font-medium text-foreground uppercase tracking-wide mb-4">Connect</h3>
				<ul class="space-y-2.5 text-sm font-sans">
					<li>
						<a href="/contact" class="inline-flex items-center gap-1.5 text-foreground-subtle hover:text-accent-muted transition-colors">
							<Mail class="w-4 h-4" />
							Contact
						</a>
					</li>
					<li>
						<a
							href="https://autumnsgrove.com/blog"
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1.5 text-foreground-subtle hover:text-accent-muted transition-colors"
						>
							<PenLine class="w-4 h-4" />
							Blog
							<ExternalLink class="w-3 h-3" />
						</a>
					</li>
					<li>
						<a
							href="https://github.com/AutumnsGrove/GroveEngine"
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1.5 text-foreground-subtle hover:text-accent-muted transition-colors"
						>
							<Github class="w-4 h-4" />
							GitHub
						</a>
					</li>
				</ul>
			</div>
		</div>

		<!-- Bottom Bar -->
		<div class="pt-6 border-t border-default">
			<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
				<!-- Copyright & Legal Links -->
				<div class="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-xs font-sans text-foreground-subtle">
					<span>&copy; {new Date().getFullYear()} Autumn Brown</span>
					<span class="text-divider">·</span>
					<span>Made with care</span>
					<span class="text-divider hidden sm:inline">·</span>
					<a href="/credits" class="hover:text-accent-muted transition-colors">Credits</a>
					<span class="text-divider">·</span>
					<a href="/legal/privacy" class="hover:text-accent-muted transition-colors">Privacy</a>
					<span class="text-divider">·</span>
					<a href="/legal/terms" class="hover:text-accent-muted transition-colors">Terms</a>
				</div>

				<!-- Theme Toggle -->
				<div class="flex items-center gap-2">
					<span class="text-xs text-foreground-faint font-sans">Theme</span>
					<ThemeToggle />
				</div>
			</div>
		</div>
	</div>
</footer>
