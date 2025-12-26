import satori from 'satori';
import { html } from 'satori-html';
import type { RequestHandler } from './$types';

/**
 * Dynamic Open Graph Image Generator
 *
 * Generates custom OG images with:
 * - Grove logo on the left 1/4
 * - Page content preview on the right 3/4
 *
 * Query params:
 * - title: Page title
 * - subtitle: Optional subtitle/description
 * - accent: Optional accent color (hex without #)
 */
export const GET: RequestHandler = async ({ url, fetch }) => {
	const title = url.searchParams.get('title') || 'Grove';
	const subtitle = url.searchParams.get('subtitle') || 'A place to Be.';
	const accent = url.searchParams.get('accent') || '16a34a'; // Default grove green

	// Load Lexend font from static assets (Cloudflare Workers compatible)
	const fontUrl = new URL('/fonts/Lexend-Regular.ttf', url.origin);
	const fontResponse = await fetch(fontUrl.toString());
	const fontData = await fontResponse.arrayBuffer();

	// Grove logo SVG (simplified asterisk/star shape)
	const logoSvg = `
		<svg viewBox="0 0 100 100" style="width: 100%; height: 100%;">
			<path
				d="M50 0 L55 35 L90 20 L60 50 L90 80 L55 65 L50 100 L45 65 L10 80 L40 50 L10 20 L45 35 Z"
				fill="#${accent}"
			/>
		</svg>
	`;

	// Create the OG image template
	const markup = html(`
		<div style="
			display: flex;
			width: 1200px;
			height: 630px;
			background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
			color: white;
			font-family: 'Lexend', sans-serif;
		">
			<!-- Left 1/4: Logo -->
			<div style="
				display: flex;
				align-items: center;
				justify-content: center;
				width: 300px;
				height: 100%;
				background: rgba(255, 255, 255, 0.05);
				border-right: 2px solid rgba(255, 255, 255, 0.1);
			">
				<div style="width: 180px; height: 180px; opacity: 0.9;">
					${logoSvg}
				</div>
			</div>

			<!-- Right 3/4: Content -->
			<div style="
				display: flex;
				flex-direction: column;
				justify-content: center;
				padding: 80px 60px;
				width: 900px;
				height: 100%;
			">
				<div style="
					font-size: 72px;
					font-weight: 600;
					line-height: 1.2;
					margin-bottom: 24px;
					color: white;
				">
					${title}
				</div>
				<div style="
					font-size: 32px;
					line-height: 1.5;
					color: rgba(255, 255, 255, 0.8);
					max-width: 750px;
				">
					${subtitle}
				</div>
				<div style="
					margin-top: 48px;
					font-size: 24px;
					color: rgba(255, 255, 255, 0.5);
					letter-spacing: 0.5px;
				">
					grove.place
				</div>
			</div>
		</div>
	`);

	// Generate SVG using Satori
	const svg = await satori(markup, {
		width: 1200,
		height: 630,
		fonts: [
			{
				name: 'Lexend',
				data: fontData,
				weight: 400,
				style: 'normal',
			},
		],
	});

	// Return SVG as response
	return new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml',
			'Cache-Control': 'public, max-age=31536000, immutable',
		},
	});
};
