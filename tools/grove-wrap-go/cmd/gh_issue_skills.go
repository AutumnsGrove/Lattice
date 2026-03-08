package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"

	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// skillEntry defines a skill that can be launched from the issue browser.
type skillEntry struct {
	Key      string
	Name     string // slash command name (e.g., "panther-strike")
	Purpose  string
	Category string
}

// skillCategories controls help display ordering.
var skillCategories = []string{
	"Surgical Fixers",
	"Exploration",
	"Enhancement",
	"Security",
	"Reasoning",
	"Gatherings",
	"Board Mgmt",
}

// skillRegistry is the full list of launchable skills.
// Keys j/k are reserved for navigation; conflicts resolved with shift or alternate keys.
var skillRegistry = []skillEntry{
	// Surgical Fixers (Issue Resolution)
	{"p", "panther-strike", "Lock onto ONE issue, fix it fast", "Surgical Fixers"},
	{"m", "mole-debug", "Systematic hypothesis-driven debugging", "Surgical Fixers"},
	{"e", "elephant-build", "Multi-file feature implementation", "Surgical Fixers"},
	{"r", "lynx-repair", "Address PR review feedback", "Surgical Fixers"},

	// Exploration & Planning
	{"a", "eagle-architect", "System architecture from 10,000 feet", "Exploration"},
	{"b", "bloodhound-scout", "Track code through the codebase", "Exploration"},
	{"g", "groundhog-surface", "Surface and validate assumptions", "Exploration"},

	// Enhancement & Optimization
	{"f", "fox-optimize", "Hunt performance bottlenecks", "Enhancement"},
	{"d", "deer-sense", "Audit accessibility barriers", "Enhancement"},
	{"c", "chameleon-adapt", "Theme/design with glassmorphism", "Enhancement"},
	{"t", "beaver-build", "Write robust tests", "Enhancement"},

	// Security & Hardening
	{"s", "spider-weave", "Auth integration and route security", "Security"},
	{"u", "turtle-harden", "Defense-in-depth protection layers", "Security"},
	{"x", "raccoon-audit", "Security sweep and secret cleanup", "Security"},
	{"h", "hawk-survey", "Full application security assessment", "Security"},

	// Reasoning & Documentation
	{"w", "crow-reason", "Critical reasoning, devil's advocate", "Reasoning"},
	{"o", "owl-archive", "Documentation and user-facing text", "Reasoning"},
	{"n", "swan-design", "Technical specs with diagrams", "Reasoning"},

	// Multi-Animal Chains (Gatherings — shift keys)
	{"G", "gathering-feature", "Full lifecycle: explore → build → test → doc", "Gatherings"},
	{"S", "gathering-security", "Spider → Raccoon → Turtle pipeline", "Gatherings"},
	{"U", "gathering-ui", "Chameleon → Deer pipeline", "Gatherings"},
	{"A", "gathering-architecture", "Eagle → Crow → Swan → Elephant", "Gatherings"},

	// Board Management
	{"J", "vulture-sweep", "Clean up stale/closed issues", "Board Mgmt"},
	{"l", "safari-explore", "Systematically review a collection", "Board Mgmt"},
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
	"security":      {"gathering-security"},
	"performance":   {"fox-optimize"},
	"documentation": {"owl-archive"},
	"accessibility": {"deer-sense"},
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

// launchSkillForIssue creates a worktree and launches claude with the given skill.
func launchSkillForIssue(skillName, issueNum string) error {
	wtPath, err := worktreePathForIssue(issueNum)
	if err != nil {
		return fmt.Errorf("failed to resolve worktree path: %w", err)
	}

	if _, err := os.Stat(wtPath); os.IsNotExist(err) {
		ui.Info(fmt.Sprintf("Creating worktree for issue #%s...", issueNum))
		wtCmd := gitWorktreeCreateCmd
		wtCmd.SetArgs([]string{issueNum})
		if err := wtCmd.RunE(wtCmd, []string{issueNum}); err != nil {
			ui.Warning(fmt.Sprintf("Worktree creation failed, launching in current directory: %v", err))
			wtPath = ""
		}
	} else {
		ui.Info(fmt.Sprintf("Reusing existing worktree at %s", wtPath))
	}

	prompt := fmt.Sprintf("/%s #%s", skillName, issueNum)
	var exitCode int
	if wtPath != "" {
		ui.Info(fmt.Sprintf("Working in %s", wtPath))
		exitCode, err = gwexec.RunStreamingInDir(wtPath, "claude", prompt)
	} else {
		exitCode, err = gwexec.RunStreaming("claude", prompt)
	}
	if err != nil {
		return fmt.Errorf("failed to launch claude: %w", err)
	}
	if exitCode != 0 {
		return fmt.Errorf("claude exited with code %d", exitCode)
	}
	return nil
}

// launchSkillForPR creates a worktree from the PR's head branch and launches claude with the given skill.
func launchSkillForPR(skillName string, prNumber int, headBranch string) error {
	base, err := worktreeBasePath()
	if err != nil {
		return fmt.Errorf("failed to resolve worktree path: %w", err)
	}

	wtPath := fmt.Sprintf("%s/pr-%d", base, prNumber)

	if _, err := os.Stat(wtPath); os.IsNotExist(err) {
		ui.Info(fmt.Sprintf("Creating worktree for PR #%d (branch: %s)...", prNumber, headBranch))
		// Fetch the PR branch first
		if _, fetchErr := gwexec.GitOutput("fetch", "origin", headBranch); fetchErr != nil {
			ui.Warning(fmt.Sprintf("Failed to fetch branch %s: %v", headBranch, fetchErr))
		}
		// Create worktree from the PR's head branch
		if _, wtErr := gwexec.GitOutput("worktree", "add", wtPath, fmt.Sprintf("origin/%s", headBranch)); wtErr != nil {
			ui.Warning(fmt.Sprintf("Worktree creation failed, launching in current directory: %v", wtErr))
			wtPath = ""
		}
	} else {
		ui.Info(fmt.Sprintf("Reusing existing worktree at %s", wtPath))
	}

	prompt := fmt.Sprintf("/%s #%d", skillName, prNumber)
	var exitCode int
	if wtPath != "" {
		ui.Info(fmt.Sprintf("Working in %s", wtPath))
		exitCode, err = gwexec.RunStreamingInDir(wtPath, "claude", prompt)
	} else {
		exitCode, err = gwexec.RunStreaming("claude", prompt)
	}
	if err != nil {
		return fmt.Errorf("failed to launch claude: %w", err)
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
