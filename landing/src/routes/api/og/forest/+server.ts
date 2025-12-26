import satori from "satori";
import { html } from "satori-html";
import { Resvg } from "@cf-wasm/resvg";
import type { RequestHandler } from "./$types";

// Constants for forest generation
const FOREST_TREE_COUNT = 24;
const FOREST_LEAF_COUNT = 30;

/**
 * Escape HTML entities to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Custom Forest OG Image Generator
 *
 * Generates a unique autumn forest scene with:
 * - Grove logo on the left 1/4
 * - Lush random forest with ~24 trees on the right 3/4
 * - Random falling leaves
 * - Randomly generated each time for uniqueness
 */
export const GET: RequestHandler = async ({ url, fetch }) => {
  // IMPORTANT: Requires Lexend-Regular.ttf in /static/fonts/
  // Load Lexend font from static assets (Cloudflare Workers compatible)
  const fontUrl = new URL("/fonts/Lexend-Regular.ttf", url.origin);
  const fontResponse = await fetch(fontUrl.toString());

  if (!fontResponse.ok) {
    // Return helpful error instead of breaking all OG previews
    console.error(
      `Failed to load font from ${fontUrl.toString()}: ${fontResponse.status}`,
    );
    return new Response(
      `OG Image Error: Font not found at ${fontUrl.toString()}. ` +
        `Please ensure Lexend-Regular.ttf exists in /static/fonts/.`,
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          "X-Error": "font-load-failed",
        },
      },
    );
  }

  const fontData = await fontResponse.arrayBuffer();

  // Autumn color palette
  const autumnColors = {
    trees: ["#d97706", "#ea580c", "#dc2626", "#f59e0b", "#b45309"],
    leaves: ["#fbbf24", "#f59e0b", "#dc2626", "#ea580c", "#b45309"],
    trunks: ["#78350f", "#451a03", "#57534e"],
  };

  // Generate random trees
  const treeCount = FOREST_TREE_COUNT;
  const trees: Array<{
    x: number;
    y: number;
    size: number;
    color: string;
    trunkColor: string;
  }> = [];

  for (let i = 0; i < treeCount; i++) {
    trees.push({
      x: 5 + Math.random() * 90, // Random x position (5-95%)
      y: 20 + Math.random() * 50, // Random y position (ground level variation)
      size: 30 + Math.random() * 60, // Random size (30-90px)
      color:
        autumnColors.trees[
          Math.floor(Math.random() * autumnColors.trees.length)
        ],
      trunkColor:
        autumnColors.trunks[
          Math.floor(Math.random() * autumnColors.trunks.length)
        ],
    });
  }

  // Sort by y position for depth effect (back to front)
  trees.sort((a, b) => a.y - b.y);

  // Generate random falling leaves
  const leafCount = FOREST_LEAF_COUNT;
  const leaves: Array<{
    x: number;
    y: number;
    size: number;
    color: string;
    rotation: number;
  }> = [];

  for (let i = 0; i < leafCount; i++) {
    leaves.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 8,
      color:
        autumnColors.leaves[
          Math.floor(Math.random() * autumnColors.leaves.length)
        ],
      rotation: Math.random() * 360,
    });
  }

  // Generate tree SVGs
  const treeSvgs = trees
    .map(
      (tree, i) => `
		<g style="opacity: ${0.6 + Math.random() * 0.4}">
			<!-- Trunk -->
			<rect
				x="${tree.x}%"
				y="${tree.y + tree.size * 0.3}%"
				width="${tree.size * 0.15}"
				height="${tree.size * 0.4}"
				fill="${tree.trunkColor}"
				rx="2"
			/>
			<!-- Canopy (triangle) -->
			<polygon
				points="${tree.x},${tree.y} ${tree.x - tree.size * 0.35},${tree.y + tree.size * 0.5} ${tree.x + tree.size * 0.35},${tree.y + tree.size * 0.5}"
				fill="${tree.color}"
			/>
		</g>
	`,
    )
    .join("");

  // Generate leaf SVGs
  const leafSvgs = leaves
    .map(
      (leaf) => `
		<ellipse
			cx="${leaf.x}%"
			cy="${leaf.y}%"
			rx="${leaf.size}"
			ry="${leaf.size * 0.6}"
			fill="${leaf.color}"
			transform="rotate(${leaf.rotation} ${leaf.x} ${leaf.y})"
			opacity="0.7"
		/>
	`,
    )
    .join("");

  // Grove logo SVG
  const logoSvg = `
		<svg viewBox="0 0 100 100" style="width: 100%; height: 100%;">
			<path
				d="M50 0 L55 35 L90 20 L60 50 L90 80 L55 65 L50 100 L45 65 L10 80 L40 50 L10 20 L45 35 Z"
				fill="#f59e0b"
			/>
		</svg>
	`;

  // Create the OG image with forest scene
  const markup = html(`
		<div style="
			display: flex;
			width: 1200px;
			height: 630px;
			background: linear-gradient(180deg, #fed7aa 0%, #fdba74 50%, #fb923c 100%);
			font-family: 'Lexend', sans-serif;
		">
			<!-- Left 1/4: Logo -->
			<div style="
				display: flex;
				align-items: center;
				justify-content: center;
				width: 300px;
				height: 100%;
				background: rgba(120, 53, 15, 0.1);
				border-right: 2px solid rgba(120, 53, 15, 0.2);
			">
				<div style="width: 180px; height: 180px;">
					${logoSvg}
				</div>
			</div>

			<!-- Right 3/4: Autumn Forest -->
			<div style="
				position: relative;
				width: 900px;
				height: 100%;
				overflow: hidden;
			">
				<!-- Sky gradient (already in parent) -->

				<!-- Forest SVG -->
				<svg
					viewBox="0 0 100 100"
					style="
						position: absolute;
						width: 100%;
						height: 100%;
						top: 0;
						left: 0;
					"
					preserveAspectRatio="none"
				>
					<!-- Ground -->
					<rect x="0" y="70" width="100" height="30" fill="#78350f" opacity="0.3" />

					<!-- Trees -->
					${treeSvgs}

					<!-- Falling leaves -->
					${leafSvgs}
				</svg>

				<!-- Title overlay -->
				<div style="
					position: absolute;
					bottom: 40px;
					left: 40px;
					right: 40px;
					display: flex;
					flex-direction: column;
				">
					<div style="
						font-size: 64px;
						font-weight: 700;
						color: #78350f;
						margin-bottom: 12px;
						text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.3);
					">
						The Forest
					</div>
					<div style="
						font-size: 28px;
						color: #92400e;
						text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.3);
					">
						Grove trees, growing together
					</div>
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
        name: "Lexend",
        data: fontData,
        weight: 400,
        style: "normal",
      },
    ],
  });

  // Convert SVG to PNG for better social media compatibility
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 1200,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // Return PNG with stale-while-revalidate for random generation
  // Serves stale content while regenerating in background
  return new Response(pngBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Generated-At": new Date().toISOString(),
    },
  });
};
