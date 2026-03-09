package commits

import "testing"

func TestValidateConventional(t *testing.T) {
	tests := []struct {
		message string
		ok      bool
	}{
		{"feat(auth): add OAuth2 PKCE flow", true},
		{"fix: correct typo in readme", true},
		{"docs(api): update endpoint docs", true},
		{"refactor(db): extract query builder", true},
		{"feat!: breaking change", true},
		{"feat(scope)!: breaking with scope", true},
		{"FEAT: uppercase type", true}, // case insensitive
		{"chore: bump dependencies", true},
		{"perf(render): optimize re-renders", true},
		{"ci: update GitHub Actions", true},
		{"build: upgrade vite", true},
		{"revert: undo last commit", true},

		// Invalid
		{"add new feature", false},
		{"", false},
		{"feat:", false},       // no description after colon
		{"feat: ", false},      // just space after colon
		{"unknown: something", false}, // invalid type
	}

	for _, tt := range tests {
		ok, errMsg := Validate(tt.message, DefaultTypes, "conventional")
		if ok != tt.ok {
			t.Errorf("Validate(%q) = (%v, %q), want ok=%v", tt.message, ok, errMsg, tt.ok)
		}
	}
}

func TestValidateSimple(t *testing.T) {
	ok, _ := Validate("any message works", nil, "simple")
	if !ok {
		t.Error("simple format should accept any non-empty message")
	}

	ok, _ = Validate("", nil, "simple")
	if ok {
		t.Error("simple format should reject empty messages")
	}
}

func TestValidateNone(t *testing.T) {
	ok, _ := Validate("literally anything", nil, "none")
	if !ok {
		t.Error("none format should accept everything")
	}
}

func TestValidateLineTooLong(t *testing.T) {
	long := "feat: " + string(make([]byte, 80))
	ok, _ := Validate(long, DefaultTypes, "conventional")
	if ok {
		t.Error("message with first line > 72 chars should fail")
	}
}

func TestFormat(t *testing.T) {
	tests := []struct {
		commitType  string
		description string
		scope       string
		body        string
		breaking    bool
		issue       int
		want        string
	}{
		{"feat", "add auth", "", "", false, 0, "feat: add auth"},
		{"feat", "add auth", "login", "", false, 0, "feat(login): add auth"},
		{"feat", "add auth", "", "", true, 0, "feat!: add auth"},
		{"fix", "typo", "", "", false, 42, "fix: typo (#42)"},
		{"feat", "add auth", "login", "Detailed body here.", false, 0, "feat(login): add auth\n\nDetailed body here."},
	}

	for _, tt := range tests {
		got := Format(tt.commitType, tt.description, tt.scope, tt.body, tt.breaking, tt.issue)
		if got != tt.want {
			t.Errorf("Format() = %q, want %q", got, tt.want)
		}
	}
}

func TestExtractIssueNumber(t *testing.T) {
	tests := []struct {
		branch string
		want   int
	}{
		{"feat/123-add-auth", 123},
		{"fix/456-typo", 456},
		{"42-quick-fix", 42},
		{"main", 0},
		{"feat/no-number", 0},
	}

	for _, tt := range tests {
		got := ExtractIssueNumber(tt.branch, "")
		if got != tt.want {
			t.Errorf("ExtractIssueNumber(%q) = %d, want %d", tt.branch, got, tt.want)
		}
	}
}
