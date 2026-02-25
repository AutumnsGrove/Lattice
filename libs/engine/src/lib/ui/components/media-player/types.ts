/**
 * MediaPlayer Types
 *
 * Shared types for the universal media player component system.
 */

/** Playback speed presets */
export const SPEED_OPTIONS = [0.5, 1, 2] as const;
export type PlaybackSpeed = (typeof SPEED_OPTIONS)[number];

/** MediaPlayer state exposed to content slots and external consumers */
export interface MediaPlayerState {
	/** Current frame/time position */
	currentTime: number;
	/** Total duration in frames or seconds */
	duration: number;
	/** Whether playback is active */
	playing: boolean;
	/** Current playback speed multiplier */
	speed: PlaybackSpeed;
	/** Whether loop is enabled */
	loop: boolean;
	/** Progress as a 0-1 fraction */
	progress: number;
}

/** Props for the MediaPlayer component */
export interface MediaPlayerProps {
	/** Total frames or seconds of content */
	duration: number;
	/** Current position (bindable). Defaults to 0 */
	currentTime?: number;
	/** Playback speed multiplier. Defaults to 1 */
	speed?: PlaybackSpeed;
	/** Whether playback is active (bindable). Defaults to false */
	playing?: boolean;
	/** Loop when reaching the end. Defaults to false */
	loop?: boolean;
	/** Accessible label for the player region */
	label?: string;
	/** Show time/frame display in controls. Defaults to true */
	showTimestamps?: boolean;
	/** Custom formatter for time display. Receives frame index, returns display string */
	formatTime?: (time: number) => string;
	/** Interval in ms between frames during playback. Defaults to 100 (10fps) */
	frameInterval?: number;
}
