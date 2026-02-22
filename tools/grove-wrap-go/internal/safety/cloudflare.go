package safety

// Cloudflare operation → safety tier mapping.
// Ported from Python gw's safety model for Wrangler commands.
var cloudflareOperationTiers = map[string]Tier{
	// Tier 0: Read operations (always safe)
	"d1_list":       TierRead,
	"d1_tables":     TierRead,
	"d1_schema":     TierRead,
	"d1_query_read": TierRead,
	"kv_list":       TierRead,
	"kv_keys":       TierRead,
	"kv_get":        TierRead,
	"r2_list":       TierRead,
	"r2_ls":         TierRead,
	"r2_get":        TierRead,
	"deploy_dry":    TierRead,
	"logs_tail":     TierRead,
	"flag_list":     TierRead,
	"flag_get":      TierRead,
	"backup_list":   TierRead,
	"backup_download": TierRead,
	"do_list":       TierRead,
	"do_info":       TierRead,
	"do_alarm":      TierRead,
	"email_status":  TierRead,
	"email_rules":   TierRead,

	// Tier 1: Write operations (require --write)
	"d1_query_write": TierWrite,
	"d1_migrate":     TierWrite,
	"kv_put":         TierWrite,
	"kv_delete":      TierWrite,
	"r2_create":      TierWrite,
	"r2_put":         TierWrite,
	"deploy":         TierWrite,
	"flag_enable":    TierWrite,
	"flag_disable":   TierWrite,
	"backup_create":  TierWrite,
	"email_test":     TierWrite,

	// Tier 2: Destructive operations (require --write + --force)
	"r2_rm":           TierDangerous,
	"flag_delete":     TierDangerous,
	"backup_restore":  TierDangerous,
}

// CloudflareOperationTier returns the safety tier for a Cloudflare operation.
// Defaults to TierWrite for unknown operations.
func CloudflareOperationTier(operation string) Tier {
	if tier, ok := cloudflareOperationTiers[operation]; ok {
		return tier
	}
	return TierWrite
}

// CheckCloudflareSafety validates a Cloudflare operation against safety rules.
func CheckCloudflareSafety(operation string, writeFlag, forceFlag, agentMode, interactive bool) error {
	tier := CloudflareOperationTier(operation)

	return Check(CheckOpts{
		Operation:   operation,
		Tier:        tier,
		WriteFlag:   writeFlag,
		ForceFlag:   forceFlag,
		AgentMode:   agentMode,
		Interactive: interactive,
	})
}
