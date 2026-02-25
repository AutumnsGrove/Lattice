/**
 * MediaPlayer — Universal media player for sequential content.
 *
 * A slot-based component with glassmorphic controls for playing back
 * any sequential content: visualizations, slideshows, videos, timelines.
 *
 * @example
 * ```svelte
 * <script>
 *   import { MediaPlayer } from '@autumnsgrove/lattice/ui/media-player';
 * </script>
 *
 * <MediaPlayer duration={100} bind:currentTime={frame} loop>
 *   {#snippet content()}
 *     <MyVisualization {frame} />
 *   {/snippet}
 * </MediaPlayer>
 * ```
 */

export { default as MediaPlayer } from "./MediaPlayer.svelte";
export { default as MediaControls } from "./MediaControls.svelte";
export { default as MediaScrubber } from "./MediaScrubber.svelte";
export { default as MediaSpeedToggle } from "./MediaSpeedToggle.svelte";
export { SPEED_OPTIONS, type PlaybackSpeed, type MediaPlayerState, type MediaPlayerProps } from "./types";
