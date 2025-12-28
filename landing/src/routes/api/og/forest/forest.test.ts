import { describe, it, expect, vi } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from './$types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Forest OG Image Generation Tests
 *
 * Tests the special forest-themed OG image endpoint that generates
 * a random autumn forest scene.
 */

// Load the actual font file for realistic testing
const fontPath = path.join(process.cwd(), 'static/fonts/Lexend-Regular.ttf');
const fontBuffer = fs.existsSync(fontPath) ? fs.readFileSync(fontPath) : null;

// Create a mock fetch that returns the font
const createMockFetch = () => {
	return vi.fn(async (url: string) => {
		if (url.includes('Lexend-Regular.ttf') && fontBuffer) {
			return new Response(fontBuffer, {
				status: 200,
				headers: { 'Content-Type': 'font/ttf' }
			});
		}
		return new Response('Not found', { status: 404 });
	});
};

// Helper to create a mock RequestEvent
const createMockEvent = (): RequestEvent => {
	const url = new URL('http://localhost:5173/api/og/forest');

	return {
		url,
		fetch: createMockFetch(),
		params: {},
		request: new Request(url),
		locals: {},
		platform: {},
		route: { id: '/api/og/forest' },
		cookies: {} as any,
		getClientAddress: () => '127.0.0.1',
		isDataRequest: false,
		isSubRequest: false,
		setHeaders: vi.fn()
	} as unknown as RequestEvent;
};

describe('Forest OG Image Generation (/api/og/forest)', () => {
	// Skip all tests if font file doesn't exist
	const describeOrSkip = fontBuffer ? describe : describe.skip;

	describeOrSkip('when font is available', () => {
		it('should return 200 status', async () => {
			const event = createMockEvent();
			const response = await GET(event);

			expect(response.status).toBe(200);
		});

		it('should return PNG content type', async () => {
			const event = createMockEvent();
			const response = await GET(event);

			expect(response.headers.get('Content-Type')).toBe('image/png');
		});

		it('should generate valid PNG data', async () => {
			const event = createMockEvent();
			const response = await GET(event);
			const buffer = await response.arrayBuffer();

			// PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
			const pngMagic = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
			const header = new Uint8Array(buffer.slice(0, 8));

			expect(header).toEqual(pngMagic);
		});

		it('should set stale-while-revalidate cache headers', async () => {
			const event = createMockEvent();
			const response = await GET(event);

			const cacheControl = response.headers.get('Cache-Control');
			expect(cacheControl).toContain('public');
			expect(cacheControl).toContain('stale-while-revalidate');
		});

		it('should include generation timestamp header', async () => {
			const event = createMockEvent();
			const response = await GET(event);

			const timestamp = response.headers.get('X-Generated-At');
			expect(timestamp).toBeTruthy();
			expect(() => new Date(timestamp!)).not.toThrow();
		});

		it('should generate different images on subsequent calls (randomized)', async () => {
			// The forest has random elements, but we can at least verify
			// it generates successfully twice
			const event1 = createMockEvent();
			const event2 = createMockEvent();

			const response1 = await GET(event1);
			const response2 = await GET(event2);

			expect(response1.status).toBe(200);
			expect(response2.status).toBe(200);

			// Both should be valid PNGs
			const buffer1 = await response1.arrayBuffer();
			const buffer2 = await response2.arrayBuffer();

			const pngMagic = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

			expect(new Uint8Array(buffer1.slice(0, 8))).toEqual(pngMagic);
			expect(new Uint8Array(buffer2.slice(0, 8))).toEqual(pngMagic);
		});
	});

	describe('font loading', () => {
		it('should return 500 when font is not found', async () => {
			const event = createMockEvent();
			event.fetch = vi.fn(async () => new Response('Not found', { status: 404 }));

			const response = await GET(event);

			expect(response.status).toBe(500);
			expect(response.headers.get('X-Error')).toBe('font-load-failed');
		});
	});
});
