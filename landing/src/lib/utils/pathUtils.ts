/**
 * Utilities for sampling points along SVG paths
 * Used for positioning elements (like trees) along curved surfaces
 */

export interface PathPoint {
	x: number;
	y: number;
	angle: number; // Slope angle in degrees
}

/**
 * Sample a point along an SVG path at a given percentage (0-1)
 * Returns the x, y coordinates and the slope angle at that point
 */
export function samplePathPoint(
	pathElement: SVGPathElement,
	t: number
): PathPoint {
	const length = pathElement.getTotalLength();
	const point = pathElement.getPointAtLength(t * length);

	// Calculate slope by sampling nearby points
	const delta = Math.min(1, length * 0.001); // Small offset for derivative
	const tBefore = Math.max(0, t * length - delta);
	const tAfter = Math.min(length, t * length + delta);

	const pointBefore = pathElement.getPointAtLength(tBefore);
	const pointAfter = pathElement.getPointAtLength(tAfter);

	// Calculate angle from the tangent
	const dx = pointAfter.x - pointBefore.x;
	const dy = pointAfter.y - pointBefore.y;
	const angle = Math.atan2(dy, dx) * (180 / Math.PI);

	return {
		x: point.x,
		y: point.y,
		angle
	};
}

/**
 * Sample multiple points along a path with optional jitter
 * @param pathElement - The SVG path element to sample
 * @param count - Number of points to sample
 * @param jitter - Random offset factor (0-1) to prevent uniform spacing
 * @param startT - Start position (0-1), default 0.05 to avoid edges
 * @param endT - End position (0-1), default 0.95 to avoid edges
 */
export function samplePathPoints(
	pathElement: SVGPathElement,
	count: number,
	jitter: number = 0.3,
	startT: number = 0.05,
	endT: number = 0.95
): PathPoint[] {
	const points: PathPoint[] = [];
	const range = endT - startT;
	const step = range / (count + 1);

	for (let i = 1; i <= count; i++) {
		// Base position plus random jitter
		const baseT = startT + i * step;
		const jitterOffset = (Math.random() - 0.5) * step * jitter * 2;
		const t = Math.max(startT, Math.min(endT, baseT + jitterOffset));

		points.push(samplePathPoint(pathElement, t));
	}

	return points;
}

/**
 * Convert SVG viewBox coordinates to percentage positions
 * @param point - Point in SVG coordinates
 * @param viewBox - The viewBox dimensions {width, height}
 */
export function svgToPercent(
	point: { x: number; y: number },
	viewBox: { width: number; height: number }
): { x: number; y: number } {
	return {
		x: (point.x / viewBox.width) * 100,
		y: (point.y / viewBox.height) * 100
	};
}

/**
 * Create a temporary SVG path element from a path string
 * Useful for sampling paths defined as strings
 */
export function createPathElement(pathD: string): SVGPathElement {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', pathD);
	svg.appendChild(path);
	// Must be in DOM briefly to get accurate measurements
	svg.style.position = 'absolute';
	svg.style.visibility = 'hidden';
	document.body.appendChild(svg);
	return path;
}

/**
 * Clean up a temporary path element
 */
export function removePathElement(pathElement: SVGPathElement): void {
	const svg = pathElement.parentElement;
	if (svg && svg.parentElement) {
		svg.parentElement.removeChild(svg);
	}
}

/**
 * Sample points from a path string (convenience function)
 * Creates temporary element, samples, then cleans up
 */
export function samplePathString(
	pathD: string,
	count: number,
	viewBox: { width: number; height: number },
	options: {
		jitter?: number;
		startT?: number;
		endT?: number;
	} = {}
): Array<PathPoint & { xPercent: number; yPercent: number }> {
	const pathElement = createPathElement(pathD);

	try {
		const points = samplePathPoints(
			pathElement,
			count,
			options.jitter ?? 0.3,
			options.startT ?? 0.05,
			options.endT ?? 0.95
		);

		return points.map((point) => {
			const percent = svgToPercent(point, viewBox);
			return {
				...point,
				xPercent: percent.x,
				yPercent: percent.y
			};
		});
	} finally {
		removePathElement(pathElement);
	}
}
