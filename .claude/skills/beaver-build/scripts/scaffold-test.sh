#!/usr/bin/env bash
# Beaver Build — Test Scaffolding Script
#
# Usage:
#   ./scaffold-test.sh <type> <path-to-source-file>
#
# Types:
#   service    — Unit test for a service/utility module
#   api        — Integration test for a SvelteKit API route (+server.ts)
#   component  — Component test with Testing Library
#   worker     — Worker/service test with node environment
#
# Examples:
#   ./scaffold-test.sh service src/lib/services/my-service.ts
#   ./scaffold-test.sh api src/routes/api/posts/+server.ts
#   ./scaffold-test.sh component src/lib/components/MyCard.svelte
#   ./scaffold-test.sh worker src/index.ts

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ $# -lt 2 ]; then
    echo -e "${CYAN}🦫 Beaver Test Scaffolding${NC}"
    echo ""
    echo "Usage: $0 <type> <path-to-source-file>"
    echo ""
    echo "Types:"
    echo "  service    — Unit test for a service/utility"
    echo "  api        — Integration test for an API route"
    echo "  component  — Component test with Testing Library"
    echo "  worker     — Worker test with node environment"
    echo ""
    echo "Example: $0 api src/routes/api/posts/+server.ts"
    exit 1
fi

TYPE="$1"
SOURCE_FILE="$2"

# Derive test file path
if [[ "$SOURCE_FILE" == *.svelte ]]; then
    TEST_FILE="${SOURCE_FILE%.svelte}.test.ts"
elif [[ "$SOURCE_FILE" == *.ts ]]; then
    TEST_FILE="${SOURCE_FILE%.ts}.test.ts"
elif [[ "$SOURCE_FILE" == *.js ]]; then
    TEST_FILE="${SOURCE_FILE%.js}.test.ts"
else
    echo -e "${RED}Unsupported file extension${NC}"
    exit 1
fi

# Check if test file already exists
if [ -f "$TEST_FILE" ]; then
    echo -e "${YELLOW}⚠ Test file already exists: $TEST_FILE${NC}"
    echo "  Not overwriting. Delete it first if you want to regenerate."
    exit 1
fi

# Extract module name for describe block
BASENAME=$(basename "$SOURCE_FILE" | sed 's/\.[^.]*$//' | sed 's/+//')
MODULE_NAME=$(echo "$BASENAME" | sed 's/-/ /g' | sed 's/\b\(.\)/\U\1/g' | sed 's/ //g')

# Calculate relative path to helpers (from test file location)
TEST_DIR=$(dirname "$TEST_FILE")
# Find the package root (nearest package.json)
PKG_ROOT="$TEST_DIR"
while [ ! -f "$PKG_ROOT/package.json" ] && [ "$PKG_ROOT" != "/" ]; do
    PKG_ROOT=$(dirname "$PKG_ROOT")
done

echo -e "${CYAN}🦫 Beaver Test Scaffolding${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Type:   ${GREEN}$TYPE${NC}"
echo -e "  Source: ${GREEN}$SOURCE_FILE${NC}"
echo -e "  Test:   ${GREEN}$TEST_FILE${NC}"
echo ""

case "$TYPE" in
    service)
        cat > "$TEST_FILE" << 'TEMPLATE'
import { describe, it, expect, vi, beforeEach } from "vitest";
// TODO: Import the functions you want to test
// import { myFunction } from "./MODULE_NAME";

describe("MODULE_NAME", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("myFunction", () => {
		it("should handle the happy path", async () => {
			// Arrange
			const input = {};

			// Act
			// const result = await myFunction(input);

			// Assert
			// expect(result).toBeDefined();
		});

		it("should handle edge cases", async () => {
			// Arrange
			const edgeCaseInput = {};

			// Act
			// const result = await myFunction(edgeCaseInput);

			// Assert
			// expect(result).toBeNull();
		});
	});
});
TEMPLATE
        # Replace MODULE_NAME placeholder
        sed -i '' "s/MODULE_NAME/$BASENAME/g" "$TEST_FILE"
        ;;

    api)
        cat > "$TEST_FILE" << 'TEMPLATE'
import { describe, it, expect, beforeEach } from "vitest";
// TODO: Import the HTTP methods you want to test
// import { GET, POST } from "./+server";
import {
	createMockRequestEvent,
	createAuthenticatedTenantEvent,
	resetFactoryCounters,
	createTestUser,
} from "HELPERS_PATH";

describe("ROUTE_PATH", () => {
	beforeEach(() => {
		resetFactoryCounters();
	});

	it("should return data for authenticated request", async () => {
		// Arrange
		const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
			url: "https://test.grove.place/ROUTE_URL",
		});

		// Act
		// const response = await GET(event as any);

		// Assert
		// expect(response.status).toBe(200);
		// const data = await response.json();
		// expect(data).toBeDefined();
	});

	it("should return Signpost error for unauthenticated request", async () => {
		// Arrange
		const event = createMockRequestEvent({
			url: "https://test.grove.place/ROUTE_URL",
		});

		// Act
		// const response = await GET(event as any);

		// Assert
		// expect(response.status).toBe(401);
		// const data = await response.json();
		// expect(data.error_code).toMatch(/^GROVE-API-\d{3}$/);
		// expect(data.error).toBeDefined();
		// expect(data.error_description).toBeDefined();
	});

	it("should return Signpost error for invalid input", async () => {
		// Arrange
		const event = createAuthenticatedTenantEvent("tenant-1", "user-1", {
			url: "https://test.grove.place/ROUTE_URL",
			method: "POST",
			body: {}, // Invalid/empty body
		});

		// Act
		// const response = await POST(event as any);

		// Assert
		// expect(response.status).toBe(400);
		// const data = await response.json();
		// expect(data.error_code).toMatch(/^GROVE-API-\d{3}$/);
	});
});
TEMPLATE
        # Calculate relative path to integration helpers (pure bash, no python3 dependency)
        HELPERS_ABS="$PKG_ROOT/tests/integration/helpers"
        REL_HELPERS=$(perl -e 'use File::Spec; print File::Spec->abs2rel($ARGV[0], $ARGV[1])' "$HELPERS_ABS" "$TEST_DIR" 2>/dev/null || echo "../../../../tests/integration/helpers")

        # Extract route path from file path
        ROUTE_URL=$(echo "$SOURCE_FILE" | sed 's|.*/routes/||' | sed 's|/+server\.ts||' | sed 's|/+server\.js||')
        ROUTE_PATH=$(echo "$ROUTE_URL" | tr '/' ' ' | sed 's/\b\(.\)/\U\1/g' | sed 's/ / \/ /g')

        sed -i '' "s|HELPERS_PATH|$REL_HELPERS|g" "$TEST_FILE"
        sed -i '' "s|ROUTE_URL|$ROUTE_URL|g" "$TEST_FILE"
        sed -i '' "s|ROUTE_PATH|$ROUTE_URL|g" "$TEST_FILE"
        ;;

    component)
        cat > "$TEST_FILE" << 'TEMPLATE'
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
// TODO: Import the component
// import COMPONENT_NAME from "./COMPONENT_FILE";

describe("COMPONENT_NAME", () => {
	it("should render with default props", () => {
		// Arrange & Act
		// render(COMPONENT_NAME);

		// Assert
		// expect(screen.getByRole("...")).toBeInTheDocument();
	});

	it("should render with custom props", () => {
		// Arrange & Act
		// render(COMPONENT_NAME, { props: { title: "Hello" } });

		// Assert
		// expect(screen.getByText("Hello")).toBeInTheDocument();
	});

	it("should handle user interaction", async () => {
		// Arrange
		// render(COMPONENT_NAME);

		// Act
		// await fireEvent.click(screen.getByRole("button", { name: /click me/i }));

		// Assert
		// expect(screen.getByText("Clicked!")).toBeInTheDocument();
	});

	it("should show loading state", async () => {
		// Arrange
		// render(COMPONENT_NAME, { props: { loading: true } });

		// Assert
		// expect(screen.getByRole("progressbar")).toBeInTheDocument();
		// OR
		// expect(screen.getByRole("button")).toBeDisabled();
	});
});
TEMPLATE
        COMPONENT_FILE=$(basename "$SOURCE_FILE")
        COMPONENT_NAME=$(echo "$COMPONENT_FILE" | sed 's/\.svelte$//')

        sed -i '' "s/COMPONENT_NAME/$COMPONENT_NAME/g" "$TEST_FILE"
        sed -i '' "s/COMPONENT_FILE/$COMPONENT_FILE/g" "$TEST_FILE"
        ;;

    worker)
        cat > "$TEST_FILE" << 'TEMPLATE'
import { describe, it, expect, vi, beforeEach } from "vitest";
// TODO: Import the worker handler
// import worker from "./index";

describe("WORKER_NAME worker", () => {
	let mockEnv: Record<string, unknown>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockEnv = {
			DB: {
				prepare: vi.fn().mockReturnValue({
					bind: vi.fn().mockReturnValue({
						run: vi.fn().mockResolvedValue({ success: true }),
						first: vi.fn().mockResolvedValue(null),
						all: vi.fn().mockResolvedValue({ results: [] }),
					}),
				}),
			},
			CACHE: {
				get: vi.fn().mockResolvedValue(null),
				put: vi.fn().mockResolvedValue(undefined),
			},
		};
	});

	it("should handle GET request", async () => {
		// Arrange
		const request = new Request("https://worker.grove.place/", {
			method: "GET",
		});

		// Act
		// const response = await worker.fetch(request, mockEnv);

		// Assert
		// expect(response.status).toBe(200);
	});

	it("should return 404 for unknown routes", async () => {
		// Arrange
		const request = new Request("https://worker.grove.place/unknown", {
			method: "GET",
		});

		// Act
		// const response = await worker.fetch(request, mockEnv);

		// Assert
		// expect(response.status).toBe(404);
	});
});
TEMPLATE
        WORKER_NAME=$(basename "$(dirname "$SOURCE_FILE")")
        sed -i '' "s/WORKER_NAME/$WORKER_NAME/g" "$TEST_FILE"
        ;;

    *)
        echo -e "${RED}Unknown type: $TYPE${NC}"
        echo "  Valid types: service, api, component, worker"
        exit 1
        ;;
esac

echo -e "${GREEN}✓ Test file created: $TEST_FILE${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Uncomment imports and adjust to match your source"
echo "  2. Fill in the TODO placeholders"
echo "  3. Run: pnpm --filter <package> test:run"
echo "  4. Verify: gw ci --affected --fail-fast --diagnose"
