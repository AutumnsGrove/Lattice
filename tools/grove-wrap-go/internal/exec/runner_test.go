package exec

import "testing"

func TestRunAllowedBinary(t *testing.T) {
	// "git" is allowlisted
	result, err := Run("git", "--version")
	if err != nil {
		t.Fatalf("Run(git --version) failed: %v", err)
	}
	if !result.OK() {
		t.Errorf("git --version should succeed, got exit code %d", result.ExitCode)
	}
	if result.Stdout == "" {
		t.Error("git --version should produce output")
	}
}

func TestRunBlocksUnknownBinary(t *testing.T) {
	_, err := Run("curl", "https://example.com")
	if err == nil {
		t.Error("non-allowlisted binary should be rejected")
	}
}

func TestRunBlocksPathTraversal(t *testing.T) {
	_, err := Run("/usr/bin/git", "--version")
	if err == nil {
		t.Error("path with separators should be rejected")
	}
}

func TestResultLines(t *testing.T) {
	r := &Result{Stdout: "line1\nline2\n\nline3\n"}
	lines := r.Lines()
	if len(lines) != 3 {
		t.Errorf("Lines() = %d entries, want 3", len(lines))
	}
	if lines[0] != "line1" || lines[1] != "line2" || lines[2] != "line3" {
		t.Errorf("Lines() = %v, want [line1 line2 line3]", lines)
	}
}

func TestResultOK(t *testing.T) {
	r0 := &Result{ExitCode: 0}
	if !r0.OK() {
		t.Error("ExitCode 0 should be OK")
	}
	r1 := &Result{ExitCode: 1}
	if r1.OK() {
		t.Error("ExitCode 1 should not be OK")
	}
}

func TestWhich(t *testing.T) {
	// git should exist
	path, ok := Which("git")
	if !ok {
		t.Skip("git not found in PATH")
	}
	if path == "" {
		t.Error("Which(git) returned empty path")
	}
}

func TestWhichNotFound(t *testing.T) {
	_, ok := Which("nonexistent-binary-12345")
	if ok {
		t.Error("Which should return false for non-existent binary")
	}
}

func TestIsGitRepo(t *testing.T) {
	// We're running inside the Lattice repo, so this should be true
	if !IsGitRepo() {
		t.Skip("not inside a git repo")
	}
}

func TestCurrentBranch(t *testing.T) {
	branch, err := CurrentBranch()
	if err != nil {
		t.Skip("not inside a git repo")
	}
	if branch == "" {
		t.Error("CurrentBranch() returned empty string")
	}
}
