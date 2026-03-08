package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// skillEntry defines a skill that can be launched from the issue browser.
type skillEntry struct {
	Key      string
	Name     string // slash command name (e.g., "panther-strike")
	Purpose  string
	Category string
	Yolo     bool // launch with --dangerously-skip-permissions
}

// skillCategories controls help display ordering.
var skillCategories = []string{
	"Surgical Fixers",
	"Exploration",
	"Enhancement",
	"Compliance",
	"Security",
	"Reasoning",
	"Gatherings",
	"Board Mgmt",
}

// skillRegistry is the full list of launchable skills.
// Keys j/k are reserved for navigation; conflicts resolved with shift or alternate keys.
var skillRegistry = []skillEntry{
	// Surgical Fixers (Issue Resolution)
	{"p", "panther-strike", "Lock onto ONE issue, fix it fast", "Surgical Fixers", false},
	{"m", "mole-debug", "Systematic hypothesis-driven debugging", "Surgical Fixers", false},
	{"e", "elephant-build", "Multi-file feature implementation", "Surgical Fixers", false},
	{"r", "lynx-repair", "Address PR review feedback", "Surgical Fixers", false},

	// Exploration & Planning
	{"a", "eagle-architect", "System architecture from 10,000 feet", "Exploration", false},
	{"b", "bloodhound-scout", "Track code through the codebase", "Exploration", false},
	{"g", "groundhog-surface", "Surface and validate assumptions", "Exploration", false},

	// Enhancement & Optimization
	{"f", "fox-optimize", "Hunt performance bottlenecks", "Enhancement", false},
	{"d", "deer-sense", "Audit accessibility barriers", "Enhancement", false},
	{"c", "chameleon-adapt", "Theme/design with glassmorphism", "Enhancement", false},
	{"t", "beaver-build", "Write robust tests", "Enhancement", false},
	{"y", "bear-migrate", "Data migration with patient strength", "Enhancement", false},

	// Compliance & Quality
	{"i", "crane-audit", "PR compliance audit for Grove SDK standards", "Compliance", false},

	// Security & Hardening
	{"s", "spider-weave", "Auth integration and route security", "Security", false},
	{"u", "turtle-harden", "Defense-in-depth protection layers", "Security", false},
	{"x", "raccoon-audit", "Security sweep and secret cleanup", "Security", false},
	{"h", "hawk-survey", "Full application security assessment", "Security", false},

	// Reasoning & Documentation
	{"w", "crow-reason", "Critical reasoning, devil's advocate", "Reasoning", false},
	{"o", "owl-archive", "Documentation and user-facing text", "Reasoning", false},
	{"n", "swan-design", "Technical specs with diagrams", "Reasoning", false},

	// Multi-Animal Chains (Gatherings — shift keys)
	{"G", "gathering-feature", "Full lifecycle: explore → build → test → doc", "Gatherings", false},
	{"S", "gathering-security", "Spider → Raccoon → Turtle pipeline", "Gatherings", false},
	{"U", "gathering-ui", "Chameleon → Deer pipeline", "Gatherings", false},
	{"A", "gathering-architecture", "Eagle → Crow → Swan → Elephant", "Gatherings", false},
	{"M", "gathering-migration", "Bear → Bloodhound pipeline", "Gatherings", false},

	// Board Management
	{"J", "vulture-sweep", "Clean up stale/closed issues", "Board Mgmt", false},
	{"l", "safari-explore", "Systematically review a collection", "Board Mgmt", false},
}

// skillByKey provides O(1) lookup from hotkey to skill entry.
var skillByKey map[string]*skillEntry

// skillByName provides O(1) lookup from skill name to entry.
var skillByName map[string]*skillEntry

// labelSuggestions maps issue labels to recommended skill names.
var labelSuggestions = map[string][]string{
	"bug":           {"panther-strike", "mole-debug"},
	"feature":       {"elephant-build", "eagle-architect"},
	"enhancement":   {"elephant-build", "gathering-feature"},
	"lumen":         {"crane-audit"},
	"foliage":       {"crane-audit"},
	"lattice":       {"crane-audit", "elephant-build"},
	"security":      {"gathering-security"},
	"performance":   {"fox-optimize"},
	"documentation": {"owl-archive"},
	"accessibility": {"deer-sense"},
	"database":      {"bear-migrate", "elephant-build"},
	"migration":     {"bear-migrate"},
}

// claudeArgs builds the argument list for launching claude with a skill.
// Yolo mode (--dangerously-skip-permissions) is enabled when either the
// individual skill has Yolo set, or the global tui.yolo_mode config is on.
func claudeArgs(skillName, prompt string) []string {
	cfg := config.Get()
	yolo := cfg.TUI.YoloMode
	if !yolo {
		if entry, ok := skillByName[skillName]; ok && entry.Yolo {
			yolo = true
		}
	}
	if yolo {
		return []string{"--dangerously-skip-permissions", prompt}
	}
	return []string{prompt}
}

// effectiveRoot returns the best directory to launch Claude from.
// Prefers git repo root (when inside a repo), falls back to GroveRoot config.
func effectiveRoot() string {
	if root, err := repoRoot(); err == nil {
		return root
	}
	cfg := config.Get()
	groveRoot := cfg.GroveRoot
	// Verify GroveRoot looks like a real repo (has .git)
	if _, err := os.Stat(filepath.Join(groveRoot, ".git")); err == nil {
		return groveRoot
	}
	return groveRoot
}

// suggestSkills returns suggested skill names based on issue labels.
func suggestSkills(labels []string) []string {
	seen := make(map[string]bool)
	var suggestions []string
	for _, label := range labels {
		lower := strings.ToLower(label)
		if skills, ok := labelSuggestions[lower]; ok {
			for _, s := range skills {
				if !seen[s] {
					seen[s] = true
					suggestions = append(suggestions, s)
				}
			}
		}
	}
	return suggestions
}

// launchSkillForIssue creates a worktree (if auto_worktree is enabled) and
// launches claude with the given skill. Claude is launched from the repo root
// (not the worktree) so that worktree deletion during the session doesn't
// break Claude's working directory.
func launchSkillForIssue(skillName, issueNum string) error {
	root := effectiveRoot()
	cfg := config.Get()

	var wtPath string
	if cfg.TUI.AutoWorktree {
		var err error
		wtPath, err = worktreePathForIssue(issueNum)
		if err != nil {
			ui.Warning(fmt.Sprintf("Could not resolve worktree path: %v", err))
		} else {
			if _, err := os.Stat(wtPath); os.IsNotExist(err) {
				ui.Info(fmt.Sprintf("Creating worktree for issue #%s...", issueNum))
				wtCmd := gitWorktreeCreateCmd
				wtCmd.SetArgs([]string{issueNum})
				if err := wtCmd.RunE(wtCmd, []string{issueNum}); err != nil {
					ui.Warning(fmt.Sprintf("Worktree creation failed, launching in repo root: %v", err))
					wtPath = ""
				}
			} else {
				ui.Info(fmt.Sprintf("Reusing existing worktree at %s", wtPath))
			}
		}
	} else {
		ui.Info("Worktree creation disabled (auto_worktree = false)")
	}

	var prompt string
	if wtPath != "" {
		prompt = fmt.Sprintf("A worktree has been prepared at %s for issue #%s. Start by running: cd %s\n\nThen: /%s #%s", wtPath, issueNum, wtPath, skillName, issueNum)
		ui.Info(fmt.Sprintf("Launching Claude from %s (worktree: %s)", root, wtPath))
	} else {
		prompt = fmt.Sprintf("/%s #%s", skillName, issueNum)
		ui.Info(fmt.Sprintf("Launching Claude from %s", root))
	}
	args := claudeArgs(skillName, prompt)
	exitCode, launchErr := gwexec.RunStreamingInDir(root, "claude", args...)
	if launchErr != nil {
		return fmt.Errorf("failed to launch claude: %w", launchErr)
	}
	if exitCode != 0 {
		return fmt.Errorf("claude exited with code %d", exitCode)
	}
	return nil
}

// launchSkillForPR creates a worktree from the PR's head branch (if auto_worktree
// is enabled) and launches claude with the given skill. Claude is launched from
// the repo root (not the worktree) so that worktree deletion during the session
// doesn't break Claude's working directory.
func launchSkillForPR(skillName string, prNumber int, headBranch string) error {
	var wtPath string
	root := effectiveRoot()
	cfg := config.Get()

	if cfg.TUI.AutoWorktree {
		base, err := worktreeBasePath()
		if err != nil {
			ui.Warning(fmt.Sprintf("Could not resolve worktree path: %v", err))
		} else {
			wtPath = fmt.Sprintf("%s/pr-%d", base, prNumber)

			if _, err := os.Stat(wtPath); os.IsNotExist(err) {
				ui.Info(fmt.Sprintf("Creating worktree for PR #%d (branch: %s)...", prNumber, headBranch))
				// Fetch the PR branch first (run from repo root so git can find .git)
				if fetchResult, fetchErr := gwexec.RunInDir(root, "git", "fetch", "origin", headBranch); fetchErr != nil || !fetchResult.OK() {
					ui.Warning(fmt.Sprintf("Failed to fetch branch %s: %v", headBranch, fetchErr))
				}
				// Create worktree from the PR's head branch
				if wtResult, wtErr := gwexec.RunInDir(root, "git", "worktree", "add", wtPath, fmt.Sprintf("origin/%s", headBranch)); wtErr != nil || !wtResult.OK() {
					ui.Warning(fmt.Sprintf("Worktree creation failed, launching in repo root: %v", wtErr))
					wtPath = ""
				}
			} else {
				ui.Info(fmt.Sprintf("Reusing existing worktree at %s", wtPath))
			}
		}
	} else {
		ui.Info("Worktree creation disabled (auto_worktree = false)")
	}

	var prompt string
	if wtPath != "" {
		prompt = fmt.Sprintf("A worktree has been prepared at %s for PR #%d. Start by running: cd %s\n\nThen: /%s #%d", wtPath, prNumber, wtPath, skillName, prNumber)
		ui.Info(fmt.Sprintf("Launching Claude from %s (worktree: %s)", root, wtPath))
	} else {
		prompt = fmt.Sprintf("/%s #%d", skillName, prNumber)
		ui.Info(fmt.Sprintf("Launching Claude from %s", root))
	}
	args := claudeArgs(skillName, prompt)
	exitCode, launchErr := gwexec.RunStreamingInDir(root, "claude", args...)
	if launchErr != nil {
		return fmt.Errorf("failed to launch claude: %w", launchErr)
	}
	if exitCode != 0 {
		return fmt.Errorf("claude exited with code %d", exitCode)
	}
	return nil
}

// --- issue launch ---

var issueLaunchCmd = &cobra.Command{
	Use:   "launch <number>",
	Short: "Launch a skill against an issue",
	Long:  "Create a worktree and launch Claude with a skill for the given issue.",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		number := args[0]
		if err := validateGHNumber(number); err != nil {
			return err
		}

		skillName, _ := cmd.Flags().GetString("skill")

		// Allow short names (e.g., "mole" matches "mole-debug")
		if _, ok := skillByName[skillName]; !ok {
			// Try prefix match
			var match *skillEntry
			for i := range skillRegistry {
				if strings.HasPrefix(skillRegistry[i].Name, skillName) {
					if match != nil {
						return fmt.Errorf("ambiguous skill %q — matches %q and %q", skillName, match.Name, skillRegistry[i].Name)
					}
					match = &skillRegistry[i]
				}
			}
			if match == nil {
				return fmt.Errorf("unknown skill %q — available skills:\n%s", skillName, listSkillNames())
			}
			skillName = match.Name
		}

		return launchSkillForIssue(skillName, number)
	},
}

// listSkillNames returns a formatted list of all available skill names.
func listSkillNames() string {
	var b strings.Builder
	for _, cat := range skillCategories {
		for i := range skillRegistry {
			if skillRegistry[i].Category == cat {
				b.WriteString(fmt.Sprintf("  [%s] %s — %s\n", skillRegistry[i].Key, skillRegistry[i].Name, skillRegistry[i].Purpose))
			}
		}
	}
	return b.String()
}

func init() {
	// Build lookup maps
	skillByKey = make(map[string]*skillEntry, len(skillRegistry))
	skillByName = make(map[string]*skillEntry, len(skillRegistry))
	for i := range skillRegistry {
		skillByKey[skillRegistry[i].Key] = &skillRegistry[i]
		skillByName[skillRegistry[i].Name] = &skillRegistry[i]
	}

	// Register launch command
	issueLaunchCmd.Flags().String("skill", "", "Skill to launch (e.g., panther-strike, mole-debug)")
	issueLaunchCmd.MarkFlagRequired("skill")
	issueCmd.AddCommand(issueLaunchCmd)
}
