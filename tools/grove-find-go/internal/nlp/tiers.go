package nlp

// EmbedTier defines a named embedding model configuration.
type EmbedTier struct {
	Name  string // tier name: tiny, small, full
	Model string // LM Studio model identifier
	Dims  int    // expected vector dimensions
	Desc  string // human-readable description
}

// Tiers maps tier names to their model configurations.
// Model IDs match LM Studio's naming convention (text-embedding- prefix).
var Tiers = map[string]EmbedTier{
	"tiny": {
		Name:  "tiny",
		Model: "text-embedding-snowflake-arctic-embed-xs",
		Dims:  384,
		Desc:  "22M params, fastest (~8 min), good for quick iteration",
	},
	"small": {
		Name:  "small",
		Model: "text-embedding-nomic-embed-text-v1.5@q8_0",
		Dims:  768,
		Desc:  "137M params, balanced (~30 min), good daily driver",
	},
	"full": {
		Name:  "full",
		Model: "text-embedding-jina-code-embeddings-0.5b",
		Dims:  896,
		Desc:  "500M params, best quality (~2 hr), code-specialized",
	},
}

// DefaultTier is the tier used when none is specified.
const DefaultTier = "full"

// DocsTier is the tier used for the docs index (always tiny — prose doesn't need code models).
const DocsTier = "tiny"

// TierNames returns the tier names in order of size.
func TierNames() []string {
	return []string{"tiny", "small", "full"}
}

// ResolveModel returns the model name for a given tier, falling back to the
// config's EmbedModel if the tier is empty or unknown.
func ResolveModel(tier string, configModel string) string {
	if tier == "" {
		return configModel
	}
	if t, ok := Tiers[tier]; ok {
		return t.Model
	}
	return configModel
}
