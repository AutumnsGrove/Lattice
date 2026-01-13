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
	wildflowers,
	flowers,
	springFoliage,
	springSky,
	cherryBlossoms,
	cherryBlossomsPeak,
	winter,
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
			expect(autumnReds).toBeDefined();
			expect(winter).toBeDefined();
		});

		it('should export spring-specific palettes', () => {
			expect(springFoliage).toBeDefined();
			expect(springSky).toBeDefined();
			expect(wildflowers).toBeDefined();
			expect(cherryBlossoms).toBeDefined();
			expect(cherryBlossomsPeak).toBeDefined();
		});

		it('should export backward-compatible aliases', () => {
			// These are deprecated but should still work
			expect(pinks).toBeDefined();
			expect(pinks.deepPink).toBe(cherryBlossoms.deep);
		});

		it('should export accent palettes', () => {
			expect(accents).toBeDefined();
			expect(accents.mushroom).toBeDefined();
			expect(accents.flower).toBeDefined(); // Deprecated but still available
			expect(accents.firefly).toBeDefined();
			expect(accents.berry).toBeDefined();
			expect(accents.water).toBeDefined();
			expect(accents.sky).toBeDefined();
		});

		it('accents.flower should alias flowers.wildflower colors', () => {
			expect(accents.flower.purple).toBe(flowers.wildflower.purple);
			expect(accents.flower.yellow).toBe(flowers.wildflower.buttercup);
			expect(accents.flower.white).toBe(flowers.wildflower.white);
		});

		it('should export flowers unified palette', () => {
			expect(flowers).toBeDefined();
			expect(flowers.wildflower).toBeDefined();
			expect(flowers.cherry).toBeDefined();
			expect(flowers.cherryPeak).toBeDefined();
		});

		it('flowers.wildflower should match wildflowers palette', () => {
			expect(flowers.wildflower.buttercup).toBe(wildflowers.buttercup);
			expect(flowers.wildflower.daffodil).toBe(wildflowers.daffodil);
			expect(flowers.wildflower.crocus).toBe(wildflowers.crocus);
			expect(flowers.wildflower.purple).toBe(wildflowers.purple);
			expect(flowers.wildflower.tulipPink).toBe(wildflowers.tulipPink);
		});

		it('flowers.cherry should match cherryBlossoms palette', () => {
			expect(flowers.cherry.deep).toBe(cherryBlossoms.deep);
			expect(flowers.cherry.standard).toBe(cherryBlossoms.standard);
			expect(flowers.cherry.light).toBe(cherryBlossoms.light);
			expect(flowers.cherry.pale).toBe(cherryBlossoms.pale);
			expect(flowers.cherry.falling).toBe(cherryBlossoms.falling);
		});

		it('flowers.cherryPeak should match cherryBlossomsPeak palette', () => {
			expect(flowers.cherryPeak.deep).toBe(cherryBlossomsPeak.deep);
			expect(flowers.cherryPeak.standard).toBe(cherryBlossomsPeak.standard);
			expect(flowers.cherryPeak.falling).toBe(cherryBlossomsPeak.falling);
		});

		it('flowers.wildflower should include all wildflowers colors', () => {
			const wildflowerKeys = Object.keys(wildflowers);
			const flowersWildflowerKeys = Object.keys(flowers.wildflower);
			wildflowerKeys.forEach((key) => {
				expect(flowersWildflowerKeys).toContain(key);
			});
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

			Object.values(wildflowers).forEach(color => {
				expect(color).toMatch(hexRegex);
			});
		});

		it('cherryBlossoms and cherryBlossomsPeak should have distinct but related colors', () => {
			// Peak bloom is brighter (shifted one shade up)
			expect(cherryBlossomsPeak.deep).toBe(cherryBlossoms.standard);
			expect(cherryBlossomsPeak.standard).toBe(cherryBlossoms.light);
		});
	});

	describe('getSeasonalGreens', () => {
		it('should return greens palette for summer (default)', () => {
			expect(getSeasonalGreens()).toBe(greens);
			expect(getSeasonalGreens('summer')).toBe(greens);
		});

		it('should return spring foliage mapped to greens structure for spring', () => {
			const springGreens = getSeasonalGreens('spring');
			expect(springGreens.darkForest).toBe(springFoliage.sprout);
			expect(springGreens.grove).toBe(springFoliage.newLeaf);
			expect(springGreens.meadow).toBe(springFoliage.freshGreen);
		});

		it('should return autumn palette for autumn', () => {
			expect(getSeasonalGreens('autumn')).toBe(autumn);
		});

		it('should return winter frosted colors for winter', () => {
			const winterGreens = getSeasonalGreens('winter');
			expect(winterGreens.darkForest).toBe(winter.frostedPine);
			expect(winterGreens.grove).toBe(winter.winterGreen);
		});
	});

	describe('getCherryColors', () => {
		it('should return cherryBlossomsPeak for spring (peak bloom)', () => {
			expect(getCherryColors('spring')).toBe(cherryBlossomsPeak);
		});

		it('should return cherryBlossomsPeak for spring as default', () => {
			expect(getCherryColors()).toBe(cherryBlossomsPeak);
		});

		it('should return cherryBlossoms for summer', () => {
			expect(getCherryColors('summer')).toBe(cherryBlossoms);
		});

		it('should return autumnReds palette for autumn', () => {
			expect(getCherryColors('autumn')).toBe(autumnReds);
		});

		it('should return null for winter (bare trees)', () => {
			expect(getCherryColors('winter')).toBeNull();
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
