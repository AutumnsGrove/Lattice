<script lang="ts">
	/**
	 * ArtifactRenderer — Renders the correct artifact component based on type.
	 * Handles container wrapping (bare vs glass-card) and reveal animations.
	 */
	import type {
		ArtifactDisplay,
		ArtifactType,
		ArtifactComponentProps,
		ArtifactComponentType,
	} from "$lib/curios/artifacts";
	import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";

	import Magic8Ball from "./Magic8Ball.svelte";
	import FortuneCookie from "./FortuneCookie.svelte";
	import TarotCard from "./TarotCard.svelte";
	import CrystalBall from "./CrystalBall.svelte";
	import GlassCathedral from "./GlassCathedral.svelte";
	import DiceRoller from "./DiceRoller.svelte";
	import CoinFlip from "./CoinFlip.svelte";
	import WishingWell from "./WishingWell.svelte";
	import SnowGlobe from "./SnowGlobe.svelte";
	import MarqueeText from "./MarqueeText.svelte";
	import BlinkingNew from "./BlinkingNew.svelte";
	import RainbowDivider from "./RainbowDivider.svelte";
	import EmailButton from "./EmailButton.svelte";
	import MoodCandle from "./MoodCandle.svelte";
	import WindChime from "./WindChime.svelte";
	import Hourglass from "./Hourglass.svelte";
	import PotionBottle from "./PotionBottle.svelte";
	import MusicBox from "./MusicBox.svelte";
	import CompassRose from "./CompassRose.svelte";
	import TerrariumGlobe from "./TerrariumGlobe.svelte";

	let {
		artifact,
		tenantId = "",
	}: {
		artifact: ArtifactDisplay;
		tenantId?: string;
	} = $props();

	const useGlassCard = $derived(artifact.container === "glass-card");
	const revealClass = $derived(`reveal-${artifact.revealAnimation || "fade"}`);

	// Trust boundary: each artifact component accepts ArtifactComponentProps
	// at runtime (config + optional tenantId/artifactId). The assertion bridges
	// TypeScript's contravariance between each component's specific config type
	// and the common interface.
	const componentMap = {
		magic8ball: Magic8Ball,
		fortunecookie: FortuneCookie,
		tarotcard: TarotCard,
		crystalball: CrystalBall,
		glasscathedral: GlassCathedral,
		diceroller: DiceRoller,
		coinflip: CoinFlip,
		wishingwell: WishingWell,
		snowglobe: SnowGlobe,
		marqueetext: MarqueeText,
		blinkingnew: BlinkingNew,
		rainbowdivider: RainbowDivider,
		emailbutton: EmailButton,
		moodcandle: MoodCandle,
		windchime: WindChime,
		hourglass: Hourglass,
		potionbottle: PotionBottle,
		musicbox: MusicBox,
		compassrose: CompassRose,
		terrariumglobe: TerrariumGlobe,
	} as Record<ArtifactType, ArtifactComponentType>;

	const ArtifactComponent = $derived(componentMap[artifact.artifactType]);

	/** Build props depending on artifact type */
	const componentProps = $derived.by((): ArtifactComponentProps => {
		const props: ArtifactComponentProps = { config: artifact.config };

		// Some artifacts need tenantId for daily seeding
		if (["fortunecookie", "tarotcard"].includes(artifact.artifactType)) {
			props.tenantId = tenantId;
		}

		// Glass Cathedral needs its artifact ID for panel loading
		if (artifact.artifactType === "glasscathedral") {
			props.artifactId = artifact.id;
		}

		return props;
	});
</script>

{#if ArtifactComponent}
	<div class="artifact-renderer {revealClass}">
		{#if useGlassCard}
			<GlassCard class="artifact-glass-container">
				<ArtifactComponent {...componentProps} />
			</GlassCard>
		{:else}
			<ArtifactComponent {...componentProps} />
		{/if}
	</div>
{/if}

<style>
	.artifact-renderer {
		display: flex;
		justify-content: center;
	}

	:global(.artifact-glass-container) {
		padding: 1rem;
	}

	/* ── Reveal Animations ── */
	.reveal-fade {
		animation: reveal-fade 0.6s ease-out both;
	}

	.reveal-sparkle {
		animation: reveal-sparkle 0.8s ease-out both;
	}

	.reveal-slide {
		animation: reveal-slide 0.5s ease-out both;
	}

	.reveal-grow {
		animation: reveal-grow 0.6s ease-out both;
	}

	.reveal-flicker {
		animation: reveal-flicker 1s steps(5) both;
	}

	@keyframes reveal-fade {
		0% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}

	@keyframes reveal-sparkle {
		0% {
			opacity: 0;
			filter: brightness(2);
			transform: scale(0.9);
		}
		50% {
			opacity: 1;
			filter: brightness(1.5);
		}
		100% {
			opacity: 1;
			filter: brightness(1);
			transform: scale(1);
		}
	}

	@keyframes reveal-slide {
		0% {
			opacity: 0;
			transform: translateX(-1rem);
		}
		100% {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@keyframes reveal-grow {
		0% {
			opacity: 0;
			transform: scale(0.3);
		}
		70% {
			transform: scale(1.05);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes reveal-flicker {
		0% {
			opacity: 0;
		}
		20% {
			opacity: 0.8;
		}
		40% {
			opacity: 0.2;
		}
		60% {
			opacity: 0.9;
		}
		80% {
			opacity: 0.4;
		}
		100% {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.reveal-fade,
		.reveal-sparkle,
		.reveal-slide,
		.reveal-grow,
		.reveal-flicker {
			animation: none;
			opacity: 1;
		}
	}
</style>
