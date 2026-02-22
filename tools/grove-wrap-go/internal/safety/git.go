package safety

import "strings"

// Git operation → safety tier mapping.
// Ported directly from Python gw's safety/git.py.
var gitOperationTiers = map[string]Tier{
	// Tier 1: Read operations (always safe)
	"status":       TierRead,
	"log":          TierRead,
	"diff":         TierRead,
	"blame":        TierRead,
	"show":         TierRead,
	"branch_list":  TierRead,
	"stash_list":   TierRead,
	"remote_list":  TierRead,
	"fetch":        TierRead,
	"reflog":       TierRead,
	"shortlog":     TierRead,
	"tag_list":     TierRead,
	"config_get":   TierRead,
	"worktree_list": TierRead,

	// Tier 2: Write operations (require --write)
	"add":            TierWrite,
	"commit":         TierWrite,
	"push":           TierWrite,
	"branch_create":  TierWrite,
	"branch_delete":  TierWrite,
	"checkout":       TierWrite,
	"switch":         TierWrite,
	"stash_push":     TierWrite,
	"stash_pop":      TierWrite,
	"stash_apply":    TierWrite,
	"stash_drop":     TierWrite,
	"pull":           TierWrite,
	"unstage":        TierWrite,
	"save":           TierWrite,
	"wip":            TierWrite,
	"undo":           TierWrite,
	"amend":          TierWrite,
	"sync":           TierWrite,
	"cherry_pick":    TierWrite,
	"ship":           TierWrite,
	"restore":        TierWrite,
	"tag_create":     TierWrite,
	"tag_delete":     TierWrite,
	"remote_add":     TierWrite,
	"remote_remove":  TierWrite,
	"remote_rename":  TierWrite,
	"config_set":     TierWrite,
	"worktree_create": TierWrite,
	"worktree_remove": TierWrite,
	"worktree_prune":  TierWrite,
	"worktree_finish": TierWrite,

	// Tier 3: Dangerous operations (require --write --force, blocked in agent mode)
	"push_force":          TierDangerous,
	"reset_hard":          TierDangerous,
	"reset_mixed":         TierDangerous,
	"rebase":              TierDangerous,
	"merge":               TierDangerous,
	"clean":               TierDangerous,
	"branch_force_delete": TierDangerous,
	"worktree_clean":      TierDangerous,
}

// GitOperationTier returns the safety tier for a git operation.
// Defaults to TierWrite for unknown operations.
func GitOperationTier(operation string) Tier {
	if tier, ok := gitOperationTiers[operation]; ok {
		return tier
	}
	return TierWrite
}

// CheckGitSafety validates a git operation against safety rules.
func CheckGitSafety(operation string, writeFlag, forceFlag, agentMode, interactive bool, targetBranch string, protectedBranches []string) error {
	tier := GitOperationTier(operation)

	// For force-push to a protected branch, escalate to PROTECTED
	if operation == "push_force" && targetBranch != "" {
		if IsProtectedBranch(targetBranch, protectedBranches) {
			return &SafetyError{
				Message:    "force push to protected branch '" + targetBranch + "' is not allowed",
				Tier:       TierProtected,
				Operation:  operation,
				Suggestion: "Use a feature branch instead",
			}
		}
	}

	return Check(CheckOpts{
		Operation:   operation,
		Tier:        tier,
		WriteFlag:   writeFlag,
		ForceFlag:   forceFlag,
		AgentMode:   agentMode,
		Interactive: interactive,
	})
}

// IsProtectedBranch checks if a branch name is in the protected list.
func IsProtectedBranch(branch string, protected []string) bool {
	lower := strings.ToLower(branch)
	for _, p := range protected {
		if strings.ToLower(p) == lower {
			return true
		}
	}
	return false
}
