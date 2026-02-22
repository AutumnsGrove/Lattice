// Package commits validates and formats conventional commit messages.
//
// Format: type(scope): description
// Example: feat(auth): add OAuth2 PKCE flow
package commits

import (
	"fmt"
	"regexp"
	"strings"
)

// DefaultTypes are the conventional commit types recognized by gw.
var DefaultTypes = []string{
	"feat", "fix", "docs", "style", "refactor",
	"test", "chore", "perf", "ci", "build", "revert",
}

// Pre-compiled regex for the default conventional commit format.
var defaultConventionalRe = regexp.MustCompile(
	`(?i)^(` + strings.Join(DefaultTypes, "|") + `)(\(.+\))?!?: .+`,
)

// Pre-compiled regex for issue number extraction.
var defaultIssueRe = regexp.MustCompile(`(?:^|/)(\d+)[-_]`)

// Validate checks a commit message against conventional commits format.
// Returns (ok, errorMessage).
func Validate(message string, types []string, format string) (bool, string) {
	if format == "none" {
		return true, ""
	}

	firstLine := strings.SplitN(message, "\n", 2)[0]

	if format == "simple" {
		if strings.TrimSpace(firstLine) == "" {
			return false, "commit message cannot be empty"
		}
		if len(firstLine) > 72 {
			return false, "first line should be 72 characters or less"
		}
		return true, ""
	}

	// Conventional commits format: type(scope)!?: description
	var re *regexp.Regexp
	if len(types) == 0 || sameTypes(types, DefaultTypes) {
		re = defaultConventionalRe
	} else {
		pattern := `(?i)^(` + strings.Join(types, "|") + `)(\(.+\))?!?: .+`
		var err error
		re, err = regexp.Compile(pattern)
		if err != nil {
			return false, fmt.Sprintf("invalid type pattern: %v", err)
		}
	}

	if !re.MatchString(firstLine) {
		effectiveTypes := types
		if len(effectiveTypes) == 0 {
			effectiveTypes = DefaultTypes
		}
		return false, fmt.Sprintf(
			"commit message must follow Conventional Commits format: type(scope): description\n"+
				"Valid types: %s\n"+
				"Example: feat(auth): add OAuth2 PKCE flow",
			strings.Join(effectiveTypes, ", "),
		)
	}

	if len(firstLine) > 72 {
		return false, "first line should be 72 characters or less"
	}

	return true, ""
}

// sameTypes checks if two type slices are identical.
func sameTypes(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// Format builds a conventional commit message from parts.
func Format(commitType, description string, scope string, body string, breaking bool, issueNumber int) string {
	line := commitType
	if scope != "" {
		line += "(" + scope + ")"
	}
	if breaking {
		line += "!"
	}
	line += ": " + description

	if issueNumber > 0 {
		line += fmt.Sprintf(" (#%d)", issueNumber)
	}

	if body != "" {
		return line + "\n\n" + body
	}
	return line
}

// ExtractIssueNumber extracts an issue number from a branch name.
// Pattern: (^|/)(\d+)[-_] (e.g., "feat/123-add-auth" -> 123)
func ExtractIssueNumber(branch string, pattern string) int {
	var re *regexp.Regexp
	if pattern == "" {
		re = defaultIssueRe
	} else {
		var err error
		re, err = regexp.Compile(pattern)
		if err != nil {
			return 0
		}
	}
	m := re.FindStringSubmatch(branch)
	if len(m) > 1 {
		var n int
		fmt.Sscanf(m[1], "%d", &n)
		return n
	}
	return 0
}
