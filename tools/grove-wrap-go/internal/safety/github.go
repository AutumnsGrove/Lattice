package safety

// GitHub operation → safety tier mapping.
// Ported directly from Python gw's safety/github.py.
var githubOperationTiers = map[string]Tier{
	// Tier 1: Read operations (always safe)
	"pr_list":      TierRead,
	"pr_view":      TierRead,
	"pr_status":    TierRead,
	"pr_checks":    TierRead,
	"issue_list":   TierRead,
	"issue_view":   TierRead,
	"issue_search": TierRead,
	"run_list":     TierRead,
	"run_view":     TierRead,
	"run_watch":    TierRead,
	"project_list": TierRead,
	"project_view": TierRead,
	"api_get":      TierRead,
	"rate_limit":   TierRead,

	// Tier 2: Write operations (require --write)
	"pr_create":    TierWrite,
	"pr_comment":   TierWrite,
	"pr_review":    TierWrite,
	"pr_edit":      TierWrite,
	"issue_create": TierWrite,
	"issue_comment": TierWrite,
	"issue_edit":   TierWrite,
	"run_rerun":    TierWrite,
	"run_cancel":   TierWrite,
	"workflow_run": TierWrite,
	"project_move": TierWrite,
	"project_field": TierWrite,
	"project_add":  TierWrite,
	"api_post":     TierWrite,
	"api_patch":    TierWrite,

	// Tier 3: Destructive operations (require --write + confirmation)
	"pr_merge":       TierDangerous,
	"pr_close":       TierDangerous,
	"issue_close":    TierDangerous,
	"issue_reopen":   TierDangerous,
	"project_remove": TierDangerous,
	"project_bulk":   TierDangerous,
	"api_delete":     TierDangerous,
}

// GitHubOperationTier returns the safety tier for a GitHub operation.
// Defaults to TierWrite for unknown operations.
func GitHubOperationTier(operation string) Tier {
	if tier, ok := githubOperationTiers[operation]; ok {
		return tier
	}
	return TierWrite
}

// CheckGitHubSafety validates a GitHub operation against safety rules.
func CheckGitHubSafety(operation string, writeFlag, agentMode, interactive bool) error {
	tier := GitHubOperationTier(operation)

	return Check(CheckOpts{
		Operation:   operation,
		Tier:        tier,
		WriteFlag:   writeFlag,
		ForceFlag:   true, // GitHub destructive ops don't need --force, just --write
		AgentMode:   agentMode,
		Interactive: interactive,
	})
}

// APITierFromMethod returns the safety tier for a raw API call based on HTTP method.
func APITierFromMethod(method string) Tier {
	switch method {
	case "GET":
		return TierRead
	case "POST", "PATCH", "PUT":
		return TierWrite
	case "DELETE":
		return TierDangerous
	default:
		return TierWrite
	}
}
