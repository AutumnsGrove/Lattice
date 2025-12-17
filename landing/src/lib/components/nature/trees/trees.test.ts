import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import TreeAspen from './TreeAspen.svelte';
import TreeBirch from './TreeBirch.svelte';

describe('Tree Components', () => {
	describe('TreeAspen', () => {
		it('renders with default props', () => {
			const { container } = render(TreeAspen);
			expect(container.querySelector('svg')).toBeTruthy();
		});

		it('renders with custom class', () => {
			const { container } = render(TreeAspen, { props: { class: 'w-16 h-16' } });
			const svg = container.querySelector('svg');
			expect(svg?.classList.contains('w-16')).toBe(true);
			expect(svg?.classList.contains('h-16')).toBe(true);
		});

		it('renders with custom color', () => {
			const { container } = render(TreeAspen, { props: { color: '#ff0000' } });
			const svg = container.querySelector('svg');
			expect(svg?.innerHTML).toContain('#ff0000');
		});

		it('renders with autumn season', () => {
			const { container } = render(TreeAspen, { props: { season: 'autumn' } });
			const svg = container.querySelector('svg');
			// Autumn gold color from palette
			expect(svg?.innerHTML).toContain('#eab308');
		});

		it('applies animation classes when animate is true', () => {
			const { container } = render(TreeAspen, { props: { animate: true } });
			const animatedElements = container.querySelectorAll('.quiver');
			expect(animatedElements.length).toBeGreaterThan(0);
		});

		it('removes animation classes when animate is false', () => {
			const { container } = render(TreeAspen, { props: { animate: false } });
			const animatedElements = container.querySelectorAll('.quiver');
			expect(animatedElements.length).toBe(0);
		});

		it('matches snapshot with default props', () => {
			const { container } = render(TreeAspen);
			expect(container.innerHTML).toMatchSnapshot();
		});

		it('matches snapshot with autumn season', () => {
			const { container } = render(TreeAspen, { props: { season: 'autumn' } });
			expect(container.innerHTML).toMatchSnapshot();
		});
	});

	describe('TreeBirch', () => {
		it('renders with default props', () => {
			const { container } = render(TreeBirch);
			expect(container.querySelector('svg')).toBeTruthy();
		});

		it('renders with custom class', () => {
			const { container } = render(TreeBirch, { props: { class: 'w-20 h-20' } });
			const svg = container.querySelector('svg');
			expect(svg?.classList.contains('w-20')).toBe(true);
			expect(svg?.classList.contains('h-20')).toBe(true);
		});

		it('renders with birch white trunk by default', () => {
			const { container } = render(TreeBirch);
			const svg = container.querySelector('svg');
			// Birch white color from palette
			expect(svg?.innerHTML).toContain('#f5f5f0');
		});

		it('renders with autumn season', () => {
			const { container } = render(TreeBirch, { props: { season: 'autumn' } });
			const svg = container.querySelector('svg');
			// Autumn gold color for birch
			expect(svg?.innerHTML).toContain('#eab308');
		});

		it('applies animation classes when animate is true', () => {
			const { container } = render(TreeBirch, { props: { animate: true } });
			const animatedElements = container.querySelectorAll('.sway');
			expect(animatedElements.length).toBeGreaterThan(0);
		});

		it('removes animation classes when animate is false', () => {
			const { container } = render(TreeBirch, { props: { animate: false } });
			const animatedElements = container.querySelectorAll('.sway');
			expect(animatedElements.length).toBe(0);
		});

		it('matches snapshot with default props', () => {
			const { container } = render(TreeBirch);
			expect(container.innerHTML).toMatchSnapshot();
		});

		it('matches snapshot with autumn season', () => {
			const { container } = render(TreeBirch, { props: { season: 'autumn' } });
			expect(container.innerHTML).toMatchSnapshot();
		});
	});
});
