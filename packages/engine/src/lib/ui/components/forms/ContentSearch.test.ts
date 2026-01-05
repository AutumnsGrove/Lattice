import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ContentSearch from './ContentSearch.svelte';

// Mock SvelteKit modules
vi.mock('$app/stores', () => ({
	page: {
		subscribe: (fn: any) => {
			fn({ url: new URL('http://localhost/test') });
			return () => {};
		}
	}
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('ContentSearch Component', () => {
	const mockItems = [
		{ id: 1, title: 'JavaScript Fundamentals', tags: ['javascript', 'tutorial'] },
		{ id: 2, title: 'TypeScript Guide', tags: ['typescript', 'guide'] },
		{ id: 3, title: 'Svelte 5 Runes', tags: ['svelte', 'runes'] }
	];

	const mockFilterFn = (item: any, query: string) => {
		const q = query.toLowerCase();
		return (
			item.title.toLowerCase().includes(q) ||
			item.tags.some((tag: string) => tag.toLowerCase().includes(q))
		);
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	describe('Rendering', () => {
		it('should render search input with placeholder', () => {
			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					placeholder: 'Search posts...'
				}
			});

			const input = screen.getByRole('searchbox');
			expect(input).toBeInTheDocument();
			expect(input).toHaveAttribute('placeholder', 'Search posts...');
		});

		it('should render with search icon by default', () => {
			const { container } = render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn
				}
			});

			const icon = container.querySelector('.content-search-icon');
			expect(icon).toBeInTheDocument();
		});

		it('should not render search icon when showIcon is false', () => {
			const { container } = render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					showIcon: false
				}
			});

			const icon = container.querySelector('.content-search-icon');
			expect(icon).not.toBeInTheDocument();
		});

		it('should render clear button when there is a query', async () => {
			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					searchQuery: 'test'
				}
			});

			const clearButton = screen.getByLabelText('Clear search query');
			expect(clearButton).toBeInTheDocument();
		});

		it('should not render clear button when query is empty', () => {
			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					searchQuery: ''
				}
			});

			const clearButton = screen.queryByLabelText('Clear search query');
			expect(clearButton).not.toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA roles and labels', () => {
			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					placeholder: 'Search items'
				}
			});

			const searchContainer = screen.getByRole('search');
			expect(searchContainer).toBeInTheDocument();

			const input = screen.getByRole('searchbox');
			expect(input).toHaveAttribute('aria-label', 'Search items');
		});

		it('should have type="search" on input', () => {
			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn
				}
			});

			const input = screen.getByRole('searchbox');
			expect(input).toHaveAttribute('type', 'search');
		});

		it('should have aria-describedby when clear button is present', async () => {
			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					searchQuery: 'test'
				}
			});

			const input = screen.getByRole('searchbox');
			const clearButton = screen.getByLabelText('Clear search query');

			expect(input).toHaveAttribute('aria-describedby', clearButton.id);
		});

		it('should announce results to screen readers', async () => {
			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					searchQuery: 'javascript',
					debounceDelay: 0
				}
			});

			await waitFor(() => {
				const status = screen.getByRole('status');
				expect(status).toHaveTextContent('Found 1 result for "javascript"');
			});
		});

		it('should use correct plural for multiple results', async () => {
			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					searchQuery: 'script',
					debounceDelay: 0
				}
			});

			await waitFor(() => {
				const status = screen.getByRole('status');
				expect(status).toHaveTextContent('Found 2 results for "script"');
			});
		});

		it('should mark decorative icons as aria-hidden', () => {
			const { container } = render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					searchQuery: 'test'
				}
			});

			const icons = container.querySelectorAll('svg[aria-hidden="true"]');
			expect(icons.length).toBeGreaterThan(0);
		});
	});

	describe('Debouncing', () => {
		it('should debounce search input by default delay (250ms)', async () => {
			vi.useFakeTimers();
			const onSearchChange = vi.fn();

			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					onSearchChange
				}
			});

			const input = screen.getByRole('searchbox');

			await fireEvent.input(input, { target: { value: 'java' } });

			// Should not call immediately
			expect(onSearchChange).not.toHaveBeenCalled();

			// Fast-forward time
			vi.advanceTimersByTime(250);

			await waitFor(() => {
				expect(onSearchChange).toHaveBeenCalledWith('java', expect.any(Array));
			});

			vi.useRealTimers();
		});

		it('should respect custom debounce delay', async () => {
			vi.useFakeTimers();
			const onSearchChange = vi.fn();

			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					onSearchChange,
					debounceDelay: 500
				}
			});

			const input = screen.getByRole('searchbox');
			await fireEvent.input(input, { target: { value: 'test' } });

			vi.advanceTimersByTime(250);
			expect(onSearchChange).not.toHaveBeenCalled();

			vi.advanceTimersByTime(250);
			await waitFor(() => {
				expect(onSearchChange).toHaveBeenCalled();
			});

			vi.useRealTimers();
		});

		it('should clear previous timer on rapid input changes', async () => {
			vi.useFakeTimers();
			const onSearchChange = vi.fn();

			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					onSearchChange,
					debounceDelay: 250
				}
			});

			const input = screen.getByRole('searchbox');

			await fireEvent.input(input, { target: { value: 'j' } });
			vi.advanceTimersByTime(100);

			await fireEvent.input(input, { target: { value: 'ja' } });
			vi.advanceTimersByTime(100);

			await fireEvent.input(input, { target: { value: 'jav' } });
			vi.advanceTimersByTime(250);

			// Should only be called once with the final value
			await waitFor(() => {
				expect(onSearchChange).toHaveBeenCalledTimes(1);
				expect(onSearchChange).toHaveBeenCalledWith('jav', expect.any(Array));
			});

			vi.useRealTimers();
		});
	});

	describe('Filtering', () => {
		it('should call filterFn for each item', async () => {
			const filterFn = vi.fn(mockFilterFn);
			const onSearchChange = vi.fn();

			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn,
					onSearchChange,
					searchQuery: 'javascript',
					debounceDelay: 0
				}
			});

			await waitFor(() => {
				expect(filterFn).toHaveBeenCalledTimes(mockItems.length);
			});
		});

		it('should return all items when query is empty', async () => {
			const onSearchChange = vi.fn();

			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					onSearchChange,
					searchQuery: '',
					debounceDelay: 0
				}
			});

			await waitFor(() => {
				expect(onSearchChange).toHaveBeenCalledWith('', mockItems);
			});
		});

		it('should filter items correctly', async () => {
			const onSearchChange = vi.fn();

			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					onSearchChange,
					searchQuery: 'svelte',
					debounceDelay: 0
				}
			});

			await waitFor(() => {
				expect(onSearchChange).toHaveBeenCalledWith('svelte', [
					{ id: 3, title: 'Svelte 5 Runes', tags: ['svelte', 'runes'] }
				]);
			});
		});

		it('should call onSearchChange callback with results', async () => {
			const onSearchChange = vi.fn();

			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					onSearchChange,
					searchQuery: 'script',
					debounceDelay: 0
				}
			});

			await waitFor(() => {
				expect(onSearchChange).toHaveBeenCalledWith('script', expect.any(Array));
				const [, results] = onSearchChange.mock.calls[0];
				expect(results).toHaveLength(2);
			});
		});
	});

	describe('Clear Functionality', () => {
		it('should clear search when clear button is clicked', async () => {
			const onSearchChange = vi.fn();

			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					onSearchChange,
					searchQuery: 'test',
					debounceDelay: 0
				}
			});

			const clearButton = screen.getByLabelText('Clear search query');
			await fireEvent.click(clearButton);

			await waitFor(() => {
				const input = screen.getByRole('searchbox') as HTMLInputElement;
				expect(input.value).toBe('');
			});
		});

		it('should call onSearchChange with empty results after clearing', async () => {
			const onSearchChange = vi.fn();

			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					onSearchChange,
					searchQuery: 'test',
					debounceDelay: 0
				}
			});

			const clearButton = screen.getByLabelText('Clear search query');
			await fireEvent.click(clearButton);

			await waitFor(() => {
				expect(onSearchChange).toHaveBeenCalledWith('', mockItems);
			});
		});
	});

	describe('Custom Styling', () => {
		it('should apply custom wrapper class', () => {
			const { container } = render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					wrapperClass: 'custom-wrapper'
				}
			});

			const wrapper = container.querySelector('.content-search-wrapper');
			expect(wrapper).toHaveClass('custom-wrapper');
		});

		it('should apply custom input class', () => {
			render(ContentSearch, {
				props: {
					items: mockItems,
					filterFn: mockFilterFn,
					inputClass: 'custom-input'
				}
			});

			const input = screen.getByRole('searchbox');
			expect(input).toHaveClass('custom-input');
		});
	});
});
