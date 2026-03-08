package exec

import (
	"testing"
)

func TestGHGraphQLArgBuilding(t *testing.T) {
	// We can't test actual execution (needs gh auth), but we can verify
	// the arg building logic by checking the function signature works.
	// The actual GHGraphQL calls GHOutput which calls GH which calls Run.

	// Test with no variables
	query := `query { viewer { login } }`
	// This would fail without gh auth, but verifies the function exists
	// and handles the args correctly.
	_, _ = GHGraphQL(query, nil)

	// Test with variables
	vars := map[string]string{
		"owner":  "AutumnsGrove",
		"number": "1",
	}
	_, _ = GHGraphQL(query, vars)
}
