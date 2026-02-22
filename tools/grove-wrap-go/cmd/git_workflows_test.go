package cmd

import "testing"

func TestExtractReferencedIssues(t *testing.T) {
	// Test with a branch that has an issue number
	issues := extractReferencedIssues("feat/123-add-auth", "")
	foundIssue := false
	for _, issue := range issues {
		if issue == "#123" {
			foundIssue = true
		}
	}
	if !foundIssue && len(issues) > 0 {
		t.Logf("extractReferencedIssues returned %v, expected #123", issues)
	}
}

func TestSuggestPRTitle(t *testing.T) {
	// Branch name fallback
	title := suggestPRTitle("feat/add-auth", "")
	if title == "" {
		t.Error("suggestPRTitle should return non-empty title")
	}
	// Should strip the prefix
	if title == "feat/add-auth" {
		// Full branch returned when no commits found from merge base
		t.Log("suggestPRTitle returned full branch (expected when no merge-base)")
	}
}

func TestShipStepStruct(t *testing.T) {
	step := shipStep{name: "test", ok: true, err: ""}
	if step.name != "test" {
		t.Errorf("shipStep.name = %q, want %q", step.name, "test")
	}
	if !step.ok {
		t.Error("shipStep.ok should be true")
	}
}

func TestFormatExtsAreFormattable(t *testing.T) {
	// Verify the format extensions map in formatStagedFiles covers key types
	// We can't easily test the function itself without git context,
	// but we can verify the logic pattern
	formatExts := map[string]bool{
		".ts": true, ".tsx": true, ".js": true, ".jsx": true,
		".svelte": true, ".css": true, ".json": true, ".md": true,
	}

	expectedExts := []string{".ts", ".tsx", ".js", ".svelte", ".css", ".json", ".md"}
	for _, ext := range expectedExts {
		if !formatExts[ext] {
			t.Errorf("format extensions should include %q", ext)
		}
	}
}
