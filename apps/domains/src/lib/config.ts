// Centralized configuration for Domain Finder
// DeepSeek V3.2 via OpenRouter, for zero-data-retention compliance. The IDs come
// from the model registry rather than being typed here, because a second copy of
// a model ID is a copy that drifts (#1602).

import { getModel, MODELS as REGISTRY } from "@autumnsgrove/lumen-registry";

export const MODELS = {
	DRIVER: REGISTRY.DEEPSEEK_V3_2,
	SWARM: REGISTRY.DEEPSEEK_V3_2,
} as const;

const V3_2_LABEL = `${getModel(REGISTRY.DEEPSEEK_V3_2)?.name ?? "DeepSeek V3.2"} (via OpenRouter)`;

export const DRIVER_MODEL_OPTIONS = [{ value: MODELS.DRIVER, label: V3_2_LABEL }] as const;

export const SWARM_MODEL_OPTIONS = [{ value: MODELS.SWARM, label: V3_2_LABEL }] as const;

// Default search configuration
export const SEARCH_DEFAULTS = {
	MAX_BATCHES: 6,
	CANDIDATES_PER_BATCH: 50,
	TARGET_GOOD_RESULTS: 25,
	CREATIVITY: 0.8,
	RDAP_DELAY_SECONDS: 10,
} as const;
