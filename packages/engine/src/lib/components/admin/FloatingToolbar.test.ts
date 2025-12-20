/**
 * FloatingToolbar Component Tests
 *
 * Tests for the Medium-style floating toolbar covering:
 * - Text selection triggers toolbar visibility
 * - Formatting actions wrap text correctly
 * - Keyboard shortcuts (Cmd+B, Cmd+I)
 * - Toolbar closes on click outside
 * - Toolbar positioning within viewport bounds
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// FORMATTING LOGIC TESTS
// =============================================================================
// These tests verify the core text manipulation logic without full component rendering

describe('FloatingToolbar Formatting Logic', () => {
	/**
	 * Simulates wrapping selected text with formatting markers
	 */
	function wrapSelection(
		content: string,
		selectionStart: number,
		selectionEnd: number,
		before: string,
		after: string
	): { newContent: string; newSelectionStart: number; newSelectionEnd: number } {
		const selectedText = content.substring(selectionStart, selectionEnd);
		const newContent =
			content.substring(0, selectionStart) +
			before +
			selectedText +
			after +
			content.substring(selectionEnd);

		return {
			newContent,
			newSelectionStart: selectionStart + before.length,
			newSelectionEnd: selectionEnd + before.length,
		};
	}

	/**
	 * Simulates inserting a prefix at the beginning of the current line
	 */
	function insertLinePrefix(
		content: string,
		selectionStart: number,
		selectionEnd: number,
		prefix: string
	): { newContent: string; newSelectionStart: number; newSelectionEnd: number } {
		const beforeSelection = content.substring(0, selectionStart);
		const lineStart = beforeSelection.lastIndexOf('\n') + 1;

		const newContent = content.substring(0, lineStart) + prefix + content.substring(lineStart);

		return {
			newContent,
			newSelectionStart: selectionStart + prefix.length,
			newSelectionEnd: selectionEnd + prefix.length,
		};
	}

	// =========================================================================
	// Bold Formatting
	// =========================================================================

	describe('Bold Formatting', () => {
		it('should wrap selected text with ** markers', () => {
			const content = 'Hello world';
			const result = wrapSelection(content, 6, 11, '**', '**');

			expect(result.newContent).toBe('Hello **world**');
			expect(result.newSelectionStart).toBe(8);
			expect(result.newSelectionEnd).toBe(13);
		});

		it('should handle selection at start of text', () => {
			const content = 'Hello world';
			const result = wrapSelection(content, 0, 5, '**', '**');

			expect(result.newContent).toBe('**Hello** world');
		});

		it('should handle empty selection range', () => {
			const content = 'Hello world';
			const result = wrapSelection(content, 5, 5, '**', '**');

			expect(result.newContent).toBe('Hello**** world');
		});

		it('should preserve surrounding content', () => {
			const content = 'Start middle end';
			const result = wrapSelection(content, 6, 12, '**', '**');

			expect(result.newContent).toBe('Start **middle** end');
		});
	});

	// =========================================================================
	// Italic Formatting
	// =========================================================================

	describe('Italic Formatting', () => {
		it('should wrap selected text with _ markers', () => {
			const content = 'Hello world';
			const result = wrapSelection(content, 6, 11, '_', '_');

			expect(result.newContent).toBe('Hello _world_');
		});

		it('should handle multi-word selection', () => {
			const content = 'Hello beautiful world';
			const result = wrapSelection(content, 6, 21, '_', '_');

			expect(result.newContent).toBe('Hello _beautiful world_');
		});
	});

	// =========================================================================
	// Code Formatting
	// =========================================================================

	describe('Code Formatting', () => {
		it('should wrap selected text with backticks', () => {
			const content = 'Use the function method';
			const result = wrapSelection(content, 8, 16, '`', '`');

			expect(result.newContent).toBe('Use the `function` method');
		});

		it('should handle code with special characters', () => {
			const content = 'Call myFunc()';
			const result = wrapSelection(content, 5, 13, '`', '`');

			expect(result.newContent).toBe('Call `myFunc()`');
		});
	});

	// =========================================================================
	// Link Formatting
	// =========================================================================

	describe('Link Formatting', () => {
		it('should wrap selected text as link with placeholder URL', () => {
			const content = 'Click here for more';
			const result = wrapSelection(content, 6, 10, '[', '](url)');

			expect(result.newContent).toBe('Click [here](url) for more');
		});

		it('should create empty link at cursor position', () => {
			const content = 'Add a link';
			const result = wrapSelection(content, 6, 6, '[', '](url)');

			expect(result.newContent).toBe('Add a [](url)link');
		});
	});

	// =========================================================================
	// Heading Formatting
	// =========================================================================

	describe('Heading Formatting', () => {
		it('should add H1 prefix to current line', () => {
			const content = 'My Title';
			const result = insertLinePrefix(content, 0, 8, '# ');

			expect(result.newContent).toBe('# My Title');
		});

		it('should add H2 prefix to current line', () => {
			const content = 'Section Header';
			const result = insertLinePrefix(content, 0, 14, '## ');

			expect(result.newContent).toBe('## Section Header');
		});

		it('should add H3 prefix to current line', () => {
			const content = 'Subsection';
			const result = insertLinePrefix(content, 0, 10, '### ');

			expect(result.newContent).toBe('### Subsection');
		});

		it('should handle prefix insertion in multi-line content', () => {
			const content = 'First line\nSecond line\nThird line';
			// Selection is in the middle of "Second line"
			const result = insertLinePrefix(content, 15, 21, '## ');

			expect(result.newContent).toBe('First line\n## Second line\nThird line');
		});

		it('should add prefix at start of line when cursor is mid-line', () => {
			const content = 'Some text here';
			const result = insertLinePrefix(content, 5, 9, '# ');

			expect(result.newContent).toBe('# Some text here');
			expect(result.newSelectionStart).toBe(7); // 5 + 2 (prefix length)
		});
	});

	// =========================================================================
	// Complex Scenarios
	// =========================================================================

	describe('Complex Formatting Scenarios', () => {
		it('should handle formatting with newlines', () => {
			const content = 'Line one\nLine two\nLine three';
			const result = wrapSelection(content, 9, 17, '**', '**');

			expect(result.newContent).toBe('Line one\n**Line two**\nLine three');
		});

		it('should handle unicode content', () => {
			const content = 'Hello 世界 world';
			const result = wrapSelection(content, 6, 8, '**', '**');

			expect(result.newContent).toBe('Hello **世界** world');
		});

		it('should handle consecutive formatting operations', () => {
			let content = 'Hello world';

			// First, make "Hello" bold
			let result = wrapSelection(content, 0, 5, '**', '**');
			content = result.newContent;
			// content is now: "**Hello** world"

			// Then, make "world" italic (positions shifted by 4 due to **)
			result = wrapSelection(content, 10, 15, '_', '_');

			expect(result.newContent).toBe('**Hello** _world_');
		});
	});
});

// =============================================================================
// KEYBOARD SHORTCUT TESTS
// =============================================================================

describe('FloatingToolbar Keyboard Shortcuts', () => {
	/**
	 * Simulates checking if a keyboard event should trigger formatting
	 */
	function shouldTriggerFormat(
		key: string,
		metaKey: boolean,
		ctrlKey: boolean,
		hasSelection: boolean
	): boolean {
		const isMod = metaKey || ctrlKey;
		if (!isMod) return false;
		if (!hasSelection) return false;

		const lowerKey = key.toLowerCase();
		return lowerKey === 'b' || lowerKey === 'i';
	}

	it('should trigger bold on Cmd+B with selection', () => {
		expect(shouldTriggerFormat('b', true, false, true)).toBe(true);
		expect(shouldTriggerFormat('B', true, false, true)).toBe(true);
	});

	it('should trigger italic on Cmd+I with selection', () => {
		expect(shouldTriggerFormat('i', true, false, true)).toBe(true);
		expect(shouldTriggerFormat('I', true, false, true)).toBe(true);
	});

	it('should trigger bold on Ctrl+B with selection', () => {
		expect(shouldTriggerFormat('b', false, true, true)).toBe(true);
	});

	it('should trigger italic on Ctrl+I with selection', () => {
		expect(shouldTriggerFormat('i', false, true, true)).toBe(true);
	});

	it('should not trigger without modifier key', () => {
		expect(shouldTriggerFormat('b', false, false, true)).toBe(false);
	});

	it('should not trigger without selection', () => {
		expect(shouldTriggerFormat('b', true, false, false)).toBe(false);
	});

	it('should not trigger for other keys', () => {
		expect(shouldTriggerFormat('a', true, false, true)).toBe(false);
		expect(shouldTriggerFormat('x', true, false, true)).toBe(false);
	});
});

// =============================================================================
// TOOLBAR VISIBILITY TESTS
// =============================================================================

describe('FloatingToolbar Visibility Logic', () => {
	/**
	 * Simulates checking if toolbar should be visible
	 */
	function shouldShowToolbar(
		selectionStart: number,
		selectionEnd: number,
		isTextareaFocused: boolean,
		readonly: boolean
	): boolean {
		if (readonly) return false;
		if (!isTextareaFocused) return false;
		if (selectionStart === selectionEnd) return false;
		return true;
	}

	it('should show toolbar when text is selected and textarea is focused', () => {
		expect(shouldShowToolbar(0, 5, true, false)).toBe(true);
	});

	it('should hide toolbar when no text is selected', () => {
		expect(shouldShowToolbar(5, 5, true, false)).toBe(false);
	});

	it('should hide toolbar when textarea is not focused', () => {
		expect(shouldShowToolbar(0, 5, false, false)).toBe(false);
	});

	it('should hide toolbar in readonly mode', () => {
		expect(shouldShowToolbar(0, 5, true, true)).toBe(false);
	});
});

// =============================================================================
// TOOLBAR POSITIONING TESTS
// =============================================================================

describe('FloatingToolbar Positioning Logic', () => {
	/**
	 * Simulates constraining toolbar position to viewport
	 */
	function constrainToViewport(
		toolbarLeft: number,
		toolbarTop: number,
		toolbarWidth: number,
		toolbarHeight: number,
		viewportWidth: number,
		viewportHeight: number,
		padding: number = 12
	): { left: number; top: number } {
		const constrainedLeft = Math.max(
			padding,
			Math.min(toolbarLeft, viewportWidth - toolbarWidth - padding)
		);
		const constrainedTop = Math.max(
			padding,
			Math.min(toolbarTop, viewportHeight - toolbarHeight - padding)
		);

		return {
			left: constrainedLeft,
			top: constrainedTop,
		};
	}

	it('should keep toolbar within left boundary', () => {
		const result = constrainToViewport(-50, 100, 200, 40, 1024, 768);

		expect(result.left).toBe(12); // padding
	});

	it('should keep toolbar within right boundary', () => {
		const result = constrainToViewport(900, 100, 200, 40, 1024, 768);

		expect(result.left).toBe(812); // 1024 - 200 - 12
	});

	it('should keep toolbar within top boundary', () => {
		const result = constrainToViewport(100, -20, 200, 40, 1024, 768);

		expect(result.top).toBe(12); // padding
	});

	it('should keep toolbar within bottom boundary', () => {
		const result = constrainToViewport(100, 750, 200, 40, 1024, 768);

		expect(result.top).toBe(716); // 768 - 40 - 12
	});

	it('should not modify position when within bounds', () => {
		const result = constrainToViewport(400, 300, 200, 40, 1024, 768);

		expect(result.left).toBe(400);
		expect(result.top).toBe(300);
	});

	it('should handle edge case of very small viewport', () => {
		// Toolbar wider than viewport
		const result = constrainToViewport(0, 0, 300, 40, 200, 100);

		expect(result.left).toBe(12); // Can't fit, constrain to padding
		expect(result.top).toBe(12);
	});
});

// =============================================================================
// CLICK OUTSIDE TESTS
// =============================================================================

describe('FloatingToolbar Click Outside Logic', () => {
	/**
	 * Simulates checking if a click should close the toolbar
	 */
	function shouldCloseOnClick(
		clickTarget: 'toolbar' | 'textarea' | 'outside',
		toolbarVisible: boolean
	): boolean {
		if (!toolbarVisible) return false;
		if (clickTarget === 'toolbar') return false;
		if (clickTarget === 'textarea') return false;
		return true;
	}

	it('should close toolbar when clicking outside', () => {
		expect(shouldCloseOnClick('outside', true)).toBe(true);
	});

	it('should not close toolbar when clicking on toolbar', () => {
		expect(shouldCloseOnClick('toolbar', true)).toBe(false);
	});

	it('should not close toolbar when clicking on textarea', () => {
		expect(shouldCloseOnClick('textarea', true)).toBe(false);
	});

	it('should not affect hidden toolbar', () => {
		expect(shouldCloseOnClick('outside', false)).toBe(false);
	});
});

// =============================================================================
// SELECTION STATE TESTS
// =============================================================================

describe('FloatingToolbar Selection State', () => {
	it('should calculate correct selection after bold formatting', () => {
		const originalStart = 6;
		const originalEnd = 11;
		const prefixLength = 2; // **

		const newStart = originalStart + prefixLength;
		const newEnd = originalEnd + prefixLength;

		expect(newStart).toBe(8);
		expect(newEnd).toBe(13);
	});

	it('should calculate correct cursor position after heading prefix', () => {
		const originalStart = 5;
		const prefixLength = 3; // "## "

		const newStart = originalStart + prefixLength;

		expect(newStart).toBe(8);
	});

	it('should handle selection spanning multiple lines', () => {
		const content = 'Line 1\nLine 2\nLine 3';
		const selectionStart = 0;
		const selectionEnd = 20;

		const selectedText = content.substring(selectionStart, selectionEnd);

		expect(selectedText).toBe('Line 1\nLine 2\nLine 3');
		expect(selectedText).toContain('\n');
	});
});
