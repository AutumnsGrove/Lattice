import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	greens,
	bark,
	earth,
	natural,
	autumn,
	pinks,
	autumnReds,
	accents,
	getSeasonalGreens,
	getCherryColors,
	pickRandom,
	pickFrom,
	type Season
} from './palette';

describe('palette.ts', () => {
	describe('Color palettes', () => {
		it('should export all core palettes', () => {
			expect(greens).toBeDefined();
			expect(bark).toBeDefined();
			expect(earth).toBeDefined();
			expect(natural).toBeDefined();
		});

		it('should export all seasonal palettes', () => {
			expect(autumn).toBeDefined();
			expect(pinks).toBeDefined();
			expect(autumnReds).toBeDefined();
		});

		it('should export accent palettes', () => {
			expect(accents).toBeDefined();
			expect(accents.mushroom).toBeDefined();
			expect(accents.flower).toBeDefined();
			expect(accents.firefly).toBeDefined();
			expect(accents.berry).toBeDefined();
			expect(accents.water).toBeDefined();
			expect(accents.sky).toBeDefined();
		});

		it('greens should have expected color keys', () => {
			expect(greens.darkForest).toBe('#0d4a1c');
			expect(greens.grove).toBe('#16a34a');
			expect(greens.meadow).toBe('#22c55e');
		});

		it('all colors should be valid hex codes', () => {
			const hexRegex = /^#[0-9A-Fa-f]{6}$/;

			Object.values(greens).forEach(color => {
				expect(color).toMatch(hexRegex);
			});

			Object.values(bark).forEach(color => {
				expect(color).toMatch(hexRegex);
			});

			Object.values(autumn).forEach(color => {
				expect(color).toMatch(hexRegex);
			});
		});
	});

	describe('getSeasonalGreens', () => {
		it('should return greens palette for summer (default)', () => {
			expect(getSeasonalGreens()).toBe(greens);
			expect(getSeasonalGreens('summer')).toBe(greens);
		});

		it('should return greens palette for spring', () => {
			expect(getSeasonalGreens('spring')).toBe(greens);
		});

		it('should return autumn palette for autumn', () => {
			expect(getSeasonalGreens('autumn')).toBe(autumn);
		});

		it('should return greens palette for winter (current behavior)', () => {
			expect(getSeasonalGreens('winter')).toBe(greens);
		});
	});

	describe('getCherryColors', () => {
		it('should return pinks palette for spring (default)', () => {
			expect(getCherryColors()).toBe(pinks);
			expect(getCherryColors('spring')).toBe(pinks);
		});

		it('should return pinks palette for summer', () => {
			expect(getCherryColors('summer')).toBe(pinks);
		});

		it('should return autumnReds palette for autumn', () => {
			expect(getCherryColors('autumn')).toBe(autumnReds);
		});

		it('should return pinks palette for winter', () => {
			expect(getCherryColors('winter')).toBe(pinks);
		});
	});

	describe('pickRandom', () => {
		let mathRandomSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			mathRandomSpy = vi.spyOn(Math, 'random');
		});

		afterEach(() => {
			mathRandomSpy.mockRestore();
		});

		it('should return a color from the palette', () => {
			const result = pickRandom(greens);
			expect(Object.values(greens)).toContain(result);
		});

		it('should pick first item when Math.random returns 0', () => {
			mathRandomSpy.mockReturnValue(0);
			const result = pickRandom(greens);
			expect(result).toBe(Object.values(greens)[0]);
		});

		it('should pick last item when Math.random returns 0.999', () => {
			mathRandomSpy.mockReturnValue(0.999);
			const values = Object.values(greens);
			const result = pickRandom(greens);
			expect(result).toBe(values[values.length - 1]);
		});

		it('should work with any palette object', () => {
			expect(Object.values(bark)).toContain(pickRandom(bark));
			expect(Object.values(autumn)).toContain(pickRandom(autumn));
			expect(Object.values(accents.mushroom)).toContain(pickRandom(accents.mushroom));
		});
	});

	describe('pickFrom', () => {
		let mathRandomSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			mathRandomSpy = vi.spyOn(Math, 'random');
		});

		afterEach(() => {
			mathRandomSpy.mockRestore();
		});

		it('should return a color from specified keys only', () => {
			const keys: (keyof typeof greens)[] = ['grove', 'meadow'];
			const result = pickFrom(greens, keys);
			expect([greens.grove, greens.meadow]).toContain(result);
		});

		it('should pick from first key when Math.random returns 0', () => {
			mathRandomSpy.mockReturnValue(0);
			const keys: (keyof typeof greens)[] = ['darkForest', 'spring'];
			const result = pickFrom(greens, keys);
			expect(result).toBe(greens.darkForest);
		});

		it('should pick from second key when Math.random returns 0.5', () => {
			mathRandomSpy.mockReturnValue(0.5);
			const keys: (keyof typeof greens)[] = ['darkForest', 'spring'];
			const result = pickFrom(greens, keys);
			expect(result).toBe(greens.spring);
		});

		it('should work with single key', () => {
			const result = pickFrom(bark, ['warmBark']);
			expect(result).toBe(bark.warmBark);
		});
	});

	describe('Type safety', () => {
		it('Season type should accept valid seasons', () => {
			const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
			seasons.forEach(season => {
				// These should not throw type errors
				getSeasonalGreens(season);
				getCherryColors(season);
			});
		});
	});
});
