# @autumnsgrove/gossamer

[![npm version](https://img.shields.io/npm/v/@autumnsgrove/gossamer.svg)](https://www.npmjs.com/package/@autumnsgrove/gossamer)
[![npm downloads](https://img.shields.io/npm/dm/@autumnsgrove/gossamer.svg)](https://www.npmjs.com/package/@autumnsgrove/gossamer)
[![license](https://img.shields.io/npm/l/@autumnsgrove/gossamer.svg)](https://github.com/AutumnsGrove/Gossamer/blob/main/LICENSE)

ASCII visual effects library — Threads of light for your web applications.

## Installation

```bash
pnpm add @autumnsgrove/gossamer
# or
npm install @autumnsgrove/gossamer
```

## Usage

```typescript
import { GossamerRenderer, generatePatternData } from "@autumnsgrove/gossamer";

const canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
const renderer = new GossamerRenderer(canvas, {
	characters: " ·∙•◦○◉●",
	cellSize: 12,
	color: "#22c55e",
});

// Render animated clouds
renderer.startAnimation((time) => {
	return generatePatternData(canvas.width, canvas.height, "perlin", time * 0.001, {
		frequency: 0.05,
		amplitude: 1.0,
		speed: 0.5,
	});
}, 30);
```

## Documentation

See the [main repository](https://github.com/AutumnsGrove/Gossamer) for full documentation.
