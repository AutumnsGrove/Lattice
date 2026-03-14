/**
 * Curio Widget Components
 *
 * Embeddable curios: mounted by CurioHydrator via ::curio-name[]:: directives
 * Global layers: mounted once in root layout for site-wide effects
 */

// Embeddable curio widgets (dynamically imported by CurioHydrator)
export { default as CurioHitcounter } from "./CurioHitcounter.svelte";
export { default as CurioNowplaying } from "./CurioNowplaying.svelte";
export { default as CurioBadges } from "./CurioBadges.svelte";
export { default as CurioGuestbook } from "./CurioGuestbook.svelte";
export { default as CurioPoll } from "./CurioPoll.svelte";
export { default as CurioMoodring } from "./CurioMoodring.svelte";
export { default as CurioBlogroll } from "./CurioBlogroll.svelte";
export { default as CurioStatusbadges } from "./CurioStatusbadges.svelte";
export { default as CurioArtifacts } from "./CurioArtifacts.svelte";
export { default as CurioWebring } from "./CurioWebring.svelte";
export { default as CurioShelves } from "./CurioShelves.svelte";
export { default as CurioActivitystatus } from "./CurioActivitystatus.svelte";

// Artifact curio widgets (interactive collectibles)
export { default as ArtifactConfigForm } from "./artifacts/ArtifactConfigForm.svelte";
export { default as ArtifactRenderer } from "./artifacts/ArtifactRenderer.svelte";
export { default as ArtifactShowcase } from "./artifacts/ArtifactShowcase.svelte";
export { default as BlinkingNew } from "./artifacts/BlinkingNew.svelte";
export { default as CoinFlip } from "./artifacts/CoinFlip.svelte";
export { default as CompassRose } from "./artifacts/CompassRose.svelte";
export { default as CrystalBall } from "./artifacts/CrystalBall.svelte";
export { default as DiceRoller } from "./artifacts/DiceRoller.svelte";
export { default as EmailButton } from "./artifacts/EmailButton.svelte";
export { default as FortuneCookie } from "./artifacts/FortuneCookie.svelte";
export { default as GlassCathedral } from "./artifacts/GlassCathedral.svelte";
export { default as Hourglass } from "./artifacts/Hourglass.svelte";
export { default as Magic8Ball } from "./artifacts/Magic8Ball.svelte";
export { default as MarqueeText } from "./artifacts/MarqueeText.svelte";
export { default as MoodCandle } from "./artifacts/MoodCandle.svelte";
export { default as MusicBox } from "./artifacts/MusicBox.svelte";
export { default as PotionBottle } from "./artifacts/PotionBottle.svelte";
export { default as RainbowDivider } from "./artifacts/RainbowDivider.svelte";
export { default as SnowGlobe } from "./artifacts/SnowGlobe.svelte";
export { default as TarotCard } from "./artifacts/TarotCard.svelte";
export { default as TerrariumGlobe } from "./artifacts/TerrariumGlobe.svelte";
export { default as WindChime } from "./artifacts/WindChime.svelte";
export { default as WishingWell } from "./artifacts/WishingWell.svelte";

// Global curio layers (imported directly in root layout)
export { default as CurioCursorsLayer } from "./CurioCursorsLayer.svelte";
export { default as CurioAmbientLayer } from "./CurioAmbientLayer.svelte";
