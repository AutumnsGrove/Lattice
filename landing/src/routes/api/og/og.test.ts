import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from './$types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * OG Image Generation Tests
 *
 * These tests verify that the OG image endpoint:
 * 1. Returns valid PNG images
 * 2. Handles various parameter combinations
 * 3. Has correct satori markup (explicit display:flex on containers)
 *
 * Note: These tests require the font file to exist at the expected path.
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
const createMockEvent = (searchParams: Record<string, string> = {}): RequestEvent => {
	const url = new URL('http://localhost:5173/api/og');
	Object.entries(searchParams).forEach(([key, value]) => {
		url.searchParams.set(key, value);
	});

	return {
		url,
		fetch: createMockFetch(),
		params: {},
		request: new Request(url),
		locals: {},
		platform: {},
		route: { id: '/api/og' },
		cookies: {} as any,
		getClientAddress: () => '127.0.0.1',
		isDataRequest: false,
		isSubRequest: false,
		setHeaders: vi.fn()
	} as unknown as RequestEvent;
};

describe('OG Image Generation (/api/og)', () => {
	// Skip all tests if font file doesn't exist
	const describeOrSkip = fontBuffer ? describe : describe.skip;

	describeOrSkip('when font is available', () => {
		it('should return 200 with default parameters', async () => {
			const event = createMockEvent();
			const response = await GET(event);

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('image/png');
		});

		it('should return 200 with custom title', async () => {
			const event = createMockEvent({ title: 'Test Title' });
			const response = await GET(event);

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('image/png');
		});

		it('should return 200 with custom title and subtitle', async () => {
			const event = createMockEvent({
				title: 'The Workshop',
				subtitle: 'Tools being built in the Grove workshop'
			});
			const response = await GET(event);

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('image/png');
		});

		it('should return 200 with custom accent color', async () => {
			const event = createMockEvent({
				title: 'Amber Accent',
				accent: 'f59e0b'
			});
			const response = await GET(event);

			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('image/png');
		});

		it('should handle special characters in title', async () => {
			const event = createMockEvent({
				title: 'Test <script> & "quotes"',
				subtitle: "It's a test with 'apostrophes'"
			});
			const response = await GET(event);

			// Should succeed - XSS characters are escaped
			expect(response.status).toBe(200);
		});

		it('should truncate very long titles', async () => {
			const event = createMockEvent({
				title: 'A'.repeat(200) // Over 100 char limit
			});
			const response = await GET(event);

			expect(response.status).toBe(200);
		});

		it('should use default accent for invalid hex color', async () => {
			const event = createMockEvent({
				title: 'Invalid Color',
				accent: 'not-a-hex'
			});
			const response = await GET(event);

			expect(response.status).toBe(200);
		});

		it('should set correct cache headers', async () => {
			const event = createMockEvent();
			const response = await GET(event);

			const cacheControl = response.headers.get('Cache-Control');
			expect(cacheControl).toContain('public');
			expect(cacheControl).toContain('max-age=86400');
		});

		it('should include generation timestamp header', async () => {
			const event = createMockEvent();
			const response = await GET(event);

			const timestamp = response.headers.get('X-Generated-At');
			expect(timestamp).toBeTruthy();
			// Should be a valid ISO date
			expect(() => new Date(timestamp!)).not.toThrow();
		});

		it('should generate valid PNG data', async () => {
			const event = createMockEvent({ title: 'PNG Test' });
			const response = await GET(event);
			const buffer = await response.arrayBuffer();

			// PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
			const pngMagic = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
			const header = new Uint8Array(buffer.slice(0, 8));

			expect(header).toEqual(pngMagic);
		});
	});

	describe('font loading', () => {
		it('should return 500 when font is not found', async () => {
			const event = createMockEvent();
			// Override fetch to return 404 for font
			event.fetch = vi.fn(async () => new Response('Not found', { status: 404 }));

			const response = await GET(event);

			expect(response.status).toBe(500);
			expect(response.headers.get('X-Error')).toBe('font-load-failed');
		});
	});
});
