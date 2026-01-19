import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TableOfContents from './TableOfContents.svelte';

describe('TableOfContents', () => {
	const mockHeaders = [
		{ id: 'intro', text: 'Introduction', level: 2 },
		{ id: 'features', text: 'Features', level: 2 },
		{ id: 'getting-started', text: 'Getting Started', level: 3 },
	];

	describe('Rendering', () => {
		it('renders nothing when headers array is empty', () => {
			const { container } = render(TableOfContents, { props: { headers: [] } });
			expect(container.querySelector('nav')).toBeFalsy();
		});

		it('renders navigation when headers are provided', () => {
			const { container } = render(TableOfContents, { props: { headers: mockHeaders } });
			expect(container.querySelector('nav')).toBeTruthy();
		});

		it('renders default title', () => {
			render(TableOfContents, { props: { headers: mockHeaders } });
			expect(screen.getByText('Table of Contents')).toBeTruthy();
		});

		it('renders custom title when provided', () => {
			render(TableOfContents, { props: { headers: mockHeaders, title: 'On this page' } });
			expect(screen.getByText('On this page')).toBeTruthy();
		});

		it('renders all header items', () => {
			render(TableOfContents, { props: { headers: mockHeaders } });
			expect(screen.getByText('Introduction')).toBeTruthy();
			expect(screen.getByText('Features')).toBeTruthy();
			expect(screen.getByText('Getting Started')).toBeTruthy();
		});
	});

	describe('Level Classes', () => {
		it('applies correct level-2 classes', () => {
			const { container } = render(TableOfContents, { props: { headers: mockHeaders } });
			const level2Items = container.querySelectorAll('.level-2');
			expect(level2Items.length).toBe(2);
		});

		it('applies correct level-3 classes', () => {
			const { container } = render(TableOfContents, { props: { headers: mockHeaders } });
			const level3Items = container.querySelectorAll('.level-3');
			expect(level3Items.length).toBe(1);
		});
	});

	describe('Structure', () => {
		it('renders buttons for each header', () => {
			render(TableOfContents, { props: { headers: mockHeaders } });
			const buttons = screen.getAllByRole('button');
			expect(buttons.length).toBe(mockHeaders.length);
		});

		it('renders unordered list for items', () => {
			const { container } = render(TableOfContents, { props: { headers: mockHeaders } });
			expect(container.querySelector('ul.toc-list')).toBeTruthy();
		});

		it('has toc class on nav element', () => {
			const { container } = render(TableOfContents, { props: { headers: mockHeaders } });
			expect(container.querySelector('nav.toc')).toBeTruthy();
		});

		it('wraps header text in span elements', () => {
			const { container } = render(TableOfContents, { props: { headers: mockHeaders } });
			const spans = container.querySelectorAll('.toc-link span');
			expect(spans.length).toBe(mockHeaders.length);
		});
	});

	describe('Props', () => {
		it('accepts scrollOffset prop', () => {
			// Component should accept prop without error
			const { container } = render(TableOfContents, {
				props: { headers: mockHeaders, scrollOffset: 120 }
			});
			expect(container.querySelector('nav')).toBeTruthy();
		});

		it('uses default scrollOffset when not provided', () => {
			// Component should render without scrollOffset prop
			const { container } = render(TableOfContents, {
				props: { headers: mockHeaders }
			});
			expect(container.querySelector('nav')).toBeTruthy();
		});
	});

	describe('Accessibility', () => {
		it('uses semantic nav element', () => {
			const { container } = render(TableOfContents, { props: { headers: mockHeaders } });
			expect(container.querySelector('nav')).toBeTruthy();
		});

		it('uses heading for title', () => {
			const { container } = render(TableOfContents, { props: { headers: mockHeaders } });
			expect(container.querySelector('h3.toc-title')).toBeTruthy();
		});

		it('uses button elements for navigation items', () => {
			render(TableOfContents, { props: { headers: mockHeaders } });
			const buttons = screen.getAllByRole('button');
			buttons.forEach(button => {
				expect(button.getAttribute('type')).toBe('button');
			});
		});
	});
});
