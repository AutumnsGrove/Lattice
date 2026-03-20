package safety

// Todoist operation → safety tier mapping.
var todoistOperationTiers = map[string]Tier{
	// Tier 0: Read operations (always safe)
	"todoist_list_tasks":    TierRead,
	"todoist_list_sections": TierRead,
	"todoist_list_projects": TierRead,

	// Tier 1: Write operations (require --write)
	"todoist_create_task":    TierWrite,
	"todoist_create_section": TierWrite,
	"todoist_batch":          TierWrite,
	"todoist_update_task":    TierWrite,
	"todoist_complete_task":  TierWrite,

	// Tier 2: Destructive operations (require --write + --force)
	"todoist_delete_task":   TierDangerous,
	"todoist_clear_section": TierDangerous,
}

// TodoistOperationTier returns the safety tier for a Todoist operation.
// Defaults to TierWrite for unknown operations.
func TodoistOperationTier(operation string) Tier {
	if tier, ok := todoistOperationTiers[operation]; ok {
		return tier
	}
	return TierWrite
}

// CheckTodoistSafety validates a Todoist operation against safety rules.
func CheckTodoistSafety(operation string, writeFlag, forceFlag, agentMode, interactive bool) error {
	tier := TodoistOperationTier(operation)

	return Check(CheckOpts{
		Operation:   operation,
		Tier:        tier,
		WriteFlag:   writeFlag,
		ForceFlag:   forceFlag,
		AgentMode:   agentMode,
		Interactive: interactive,
	})
}
