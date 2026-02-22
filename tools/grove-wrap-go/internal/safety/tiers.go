// Package safety implements the 4-tiered safety system for gw.
//
// Safety Tiers:
//   - READ:      Always safe, no flags needed
//   - WRITE:     Requires --write flag (auto-implied for interactive humans)
//   - DANGEROUS: Requires --write AND --force, blocked in agent mode
//   - PROTECTED: Never allowed
package safety

import "fmt"

// Tier represents a safety tier level.
type Tier int

const (
	TierRead      Tier = iota // Always safe, no flags needed
	TierWrite                 // Requires --write flag
	TierDangerous             // Requires --write AND --force
	TierProtected             // Never allowed
)

// String returns the human-readable name of the tier.
func (t Tier) String() string {
	switch t {
	case TierRead:
		return "READ"
	case TierWrite:
		return "WRITE"
	case TierDangerous:
		return "DANGEROUS"
	case TierProtected:
		return "PROTECTED"
	default:
		return "UNKNOWN"
	}
}

// Description returns a user-friendly explanation of the tier.
func (t Tier) Description() string {
	switch t {
	case TierRead:
		return "Read-only operation (always safe)"
	case TierWrite:
		return "Write operation (requires --write flag)"
	case TierDangerous:
		return "Dangerous operation (requires --write --force, blocked in agent mode)"
	case TierProtected:
		return "Protected operation (never allowed)"
	default:
		return "Unknown tier"
	}
}

// SafetyError is returned when an operation violates safety rules.
type SafetyError struct {
	Message    string
	Tier       Tier
	Operation  string
	Suggestion string
}

func (e *SafetyError) Error() string {
	return e.Message
}

// CheckOpts holds the parameters for a safety check.
type CheckOpts struct {
	Operation    string
	Tier         Tier
	WriteFlag    bool
	ForceFlag    bool
	AgentMode    bool
	Interactive  bool
	TargetBranch string // For branch-specific checks
}

// Check validates an operation against the safety tier system.
// Returns nil if the operation is allowed, or a SafetyError if blocked.
func Check(opts CheckOpts) error {
	switch opts.Tier {
	case TierRead:
		return nil

	case TierWrite:
		// Interactive humans get --write auto-implied
		effectiveWrite := opts.WriteFlag || (opts.Interactive && !opts.AgentMode)
		if !effectiveWrite {
			return &SafetyError{
				Message:   fmt.Sprintf("operation '%s' requires --write flag", opts.Operation),
				Tier:      opts.Tier,
				Operation: opts.Operation,
				Suggestion: fmt.Sprintf("Add --write flag: gw %s --write", opts.Operation),
			}
		}
		return nil

	case TierDangerous:
		if opts.AgentMode {
			return &SafetyError{
				Message:    fmt.Sprintf("operation '%s' is blocked in agent mode", opts.Operation),
				Tier:       opts.Tier,
				Operation:  opts.Operation,
				Suggestion: "This operation can only be performed by a human operator",
			}
		}
		if !opts.WriteFlag {
			return &SafetyError{
				Message:   fmt.Sprintf("operation '%s' requires --write flag", opts.Operation),
				Tier:      opts.Tier,
				Operation: opts.Operation,
				Suggestion: fmt.Sprintf("Add flags: gw %s --write --force", opts.Operation),
			}
		}
		if !opts.ForceFlag {
			return &SafetyError{
				Message:   fmt.Sprintf("operation '%s' is dangerous and requires --force flag", opts.Operation),
				Tier:      opts.Tier,
				Operation: opts.Operation,
				Suggestion: fmt.Sprintf("Add --force flag: gw %s --write --force", opts.Operation),
			}
		}
		return nil

	case TierProtected:
		return &SafetyError{
			Message:   fmt.Sprintf("operation '%s' is not allowed", opts.Operation),
			Tier:      opts.Tier,
			Operation: opts.Operation,
		}

	default:
		return &SafetyError{
			Message:   fmt.Sprintf("unknown safety tier for operation '%s'", opts.Operation),
			Tier:      opts.Tier,
			Operation: opts.Operation,
		}
	}
}
