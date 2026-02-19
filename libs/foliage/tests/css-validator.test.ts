// tests/css-validator.test.ts
// Custom CSS validation tests

import { describe, it, expect } from "vitest";

// Validation function matching CustomCSSEditor logic
interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

function validateCSS(css: string, maxSize: number = 10240): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Size check
	const size = new Blob([css]).size;
	if (size > maxSize) {
		errors.push(`CSS exceeds ${(maxSize / 1024).toFixed(1)}KB limit`);
	} else if (size > maxSize * 0.8) {
		warnings.push(`Approaching size limit`);
	}

	// Blocked patterns for security
	const blockedPatterns = [
		{ pattern: /@import/gi, message: "@import statements are not allowed" },
		{ pattern: /javascript:/gi, message: "javascript: URLs are not allowed" },
		{ pattern: /expression\s*\(/gi, message: "expression() is not allowed" },
		{ pattern: /behavior\s*:/gi, message: "behavior: is not allowed" },
		{ pattern: /-moz-binding/gi, message: "-moz-binding is not allowed" },
		{ pattern: /<script/gi, message: "Script tags are not allowed" },
		{
			pattern: /url\s*\(\s*["']?https?:\/\//gi,
			message: "External URLs in url() are not allowed",
		},
	];

	for (const { pattern, message } of blockedPatterns) {
		if (pattern.test(css)) {
			errors.push(message);
		}
	}

	return { valid: errors.length === 0, errors, warnings };
}

describe("CSS Validator", () => {
	describe("Size Limits", () => {
		it("should accept CSS under 10KB", () => {
			const css = ".test { color: red; }";
			const result = validateCSS(css);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject CSS over 10KB", () => {
			// Create CSS larger than 10KB
			const css = ".test { color: red; }".repeat(1000);
			const result = validateCSS(css, 1024); // 1KB limit for testing
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("exceeds");
		});

		it("should warn when approaching size limit", () => {
			// Create CSS at ~85% of limit
			const css = "a".repeat(870);
			const result = validateCSS(css, 1024);
			expect(result.valid).toBe(true);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0]).toContain("Approaching");
		});
	});

	describe("Blocked Patterns", () => {
		it("should reject @import statements", () => {
			const css = '@import url("styles.css");';
			const result = validateCSS(css);
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("@import");
		});

		it("should reject javascript: URLs", () => {
			const css = "background: url(javascript:alert(1));";
			const result = validateCSS(css);
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("javascript:");
		});

		it("should reject expression() (IE)", () => {
			const css = "width: expression(document.body.clientWidth);";
			const result = validateCSS(css);
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("expression()");
		});

		it("should reject behavior: (IE)", () => {
			const css = "behavior: url(malicious.htc);";
			const result = validateCSS(css);
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("behavior:");
		});

		it("should reject -moz-binding", () => {
			const css = '-moz-binding: url("chrome://malicious/content/file.xml");';
			const result = validateCSS(css);
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("-moz-binding");
		});

		it("should reject script tags", () => {
			const css = "<script>alert(1)</script>";
			const result = validateCSS(css);
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("Script tags");
		});

		it("should reject external URLs in url()", () => {
			const css = 'background: url("https://evil.com/image.png");';
			const result = validateCSS(css);
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("External URLs");
		});

		it("should reject http URLs in url()", () => {
			const css = "background: url(http://evil.com/image.png);";
			const result = validateCSS(css);
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("External URLs");
		});
	});

	describe("URL Validation", () => {
		it("should allow CSS variables in url()", () => {
			const css = "background: url(var(--custom-bg));";
			const result = validateCSS(css);
			expect(result.valid).toBe(true);
		});

		it("should allow data URIs", () => {
			const css = "background: url(data:image/png;base64,ABC123);";
			const result = validateCSS(css);
			expect(result.valid).toBe(true);
		});

		it("should allow relative URLs", () => {
			const css = 'background: url("../images/bg.png");';
			const result = validateCSS(css);
			expect(result.valid).toBe(true);
		});
	});

	describe("Valid CSS", () => {
		it("should preserve valid CSS with custom properties", () => {
			const css = `
				.blog-post {
					background: var(--color-background);
					color: var(--color-foreground);
					font-family: var(--font-body);
				}
			`;
			const result = validateCSS(css);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should allow standard CSS selectors and properties", () => {
			const css = `
				h1, h2, h3 {
					font-weight: bold;
					margin-bottom: 1rem;
				}

				.card {
					border-radius: 8px;
					box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
				}

				@media (max-width: 768px) {
					.card {
						padding: 1rem;
					}
				}
			`;
			const result = validateCSS(css);
			expect(result.valid).toBe(true);
		});

		it("should allow CSS animations", () => {
			const css = `
				@keyframes fadeIn {
					from { opacity: 0; }
					to { opacity: 1; }
				}

				.fade-in {
					animation: fadeIn 0.3s ease-in-out;
				}
			`;
			const result = validateCSS(css);
			expect(result.valid).toBe(true);
		});

		it("should allow CSS gradients", () => {
			const css = `
				.gradient-bg {
					background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				}
			`;
			const result = validateCSS(css);
			expect(result.valid).toBe(true);
		});
	});

	describe("Multiple Errors", () => {
		it("should report all errors when multiple patterns are violated", () => {
			const css = `
				@import url("evil.css");
				.test {
					background: url(javascript:alert(1));
					-moz-binding: url("chrome://evil");
				}
			`;
			const result = validateCSS(css);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThanOrEqual(3);
		});
	});
});
