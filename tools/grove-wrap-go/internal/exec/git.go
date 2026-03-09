package exec

import "fmt"

// Git runs a git command and returns the result.
func Git(args ...string) (*Result, error) {
	return Run("git", args...)
}

// GitOutput runs a git command and returns stdout, or an error.
func GitOutput(args ...string) (string, error) {
	result, err := Git(args...)
	if err != nil {
		return "", err
	}
	if !result.OK() {
		return "", fmt.Errorf("git %s: %s", args[0], result.Stderr)
	}
	return result.Stdout, nil
}

// IsGitRepo returns true if the current directory is inside a git repository.
func IsGitRepo() bool {
	result, err := Git("rev-parse", "--is-inside-work-tree")
	return err == nil && result.OK()
}

// CurrentBranch returns the current git branch name.
func CurrentBranch() (string, error) {
	result, err := Git("rev-parse", "--abbrev-ref", "HEAD")
	if err != nil {
		return "", err
	}
	if !result.OK() {
		return "", fmt.Errorf("not a git repository")
	}
	lines := result.Lines()
	if len(lines) == 0 {
		return "", fmt.Errorf("could not determine current branch")
	}
	return lines[0], nil
}
