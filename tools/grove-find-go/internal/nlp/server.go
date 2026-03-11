package nlp

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/tools"
)

// serverPollInterval is how often we poll for the server to come up.
const serverPollInterval = 1 * time.Second

// serverStartTimeout is the max time to wait for lms server start.
const serverStartTimeout = 10 * time.Second

// modelLoadTimeout is the max time to wait for a model to load.
const modelLoadTimeout = 30 * time.Second

// EnsureServer checks that LM Studio is running and a model is loaded.
// If autostart is true, it will attempt to start the server and load a model.
func EnsureServer(ctx context.Context, autostart bool, onStatus func(string)) (*Client, error) {
	cfg := config.Get()
	client := NewClientWithEmbed(cfg.LLMEndpoint, cfg.LLMModel, cfg.EmbedModel, time.Duration(cfg.LLMTimeout)*time.Second)

	// Step 1: Check if server is already running
	if client.IsHealthy(ctx) {
		if onStatus != nil {
			onStatus("Connected to LM Studio")
		}
		// Check if model is loaded
		return ensureModel(ctx, client, autostart, onStatus)
	}

	// Server not running
	if !autostart {
		return nil, fmt.Errorf("GF-ASK-001: LM Studio is not running at %s. Start it manually or use --no-autostart=false", cfg.LLMEndpoint)
	}

	// Step 2: Try to auto-start
	t := tools.Discover()
	if !t.HasLms() {
		return nil, fmt.Errorf("GF-ASK-001: LM Studio is required for gf ask. Install from lmstudio.ai")
	}

	if onStatus != nil {
		onStatus("Starting LM Studio server...")
	}

	// Start the server
	if err := startServer(t.Lms); err != nil {
		return nil, fmt.Errorf("GF-ASK-002: Could not start LM Studio: %w. Start it manually and try again", err)
	}

	// Poll until the server responds
	deadline := time.Now().Add(serverStartTimeout)
	for time.Now().Before(deadline) {
		if client.IsHealthy(ctx) {
			if onStatus != nil {
				onStatus("LM Studio server is up")
			}
			return ensureModel(ctx, client, autostart, onStatus)
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(serverPollInterval):
		}
	}

	return nil, fmt.Errorf("GF-ASK-002: LM Studio server did not start within %s. Start it manually and try again", serverStartTimeout)
}

// ensureModel checks if the desired model is loaded. If not and autostart is true, loads it.
func ensureModel(ctx context.Context, client *Client, autostart bool, onStatus func(string)) (*Client, error) {
	cfg := config.Get()

	models, err := client.ListModels(ctx)
	if err != nil {
		return nil, fmt.Errorf("could not list models: %w", err)
	}

	// Check if any model is loaded (if no specific model requested, use whatever is loaded)
	if len(models) > 0 {
		// If a specific model is configured, check for it
		if cfg.LLMModel != "" {
			for _, m := range models {
				if strings.Contains(m, cfg.LLMModel) || strings.Contains(cfg.LLMModel, m) {
					client.model = m
					return client, nil
				}
			}
			// Desired model not loaded, but others are. Use first available.
			client.model = models[0]
			return client, nil
		}
		client.model = models[0]
		return client, nil
	}

	// No models loaded
	if !autostart {
		return nil, fmt.Errorf("GF-ASK-003: No model loaded in LM Studio. Load one manually: lms load %s --gpu max", cfg.LLMModel)
	}

	t := tools.Discover()
	if !t.HasLms() {
		return nil, fmt.Errorf("GF-ASK-003: No model loaded and lms CLI not found. Load a model manually in LM Studio")
	}

	if onStatus != nil {
		onStatus(fmt.Sprintf("Loading model %s...", cfg.LLMModel))
	}

	if err := loadModel(t.Lms, cfg.LLMModel); err != nil {
		return nil, fmt.Errorf("GF-ASK-003: Could not load model: %w. Run: lms load %s --gpu max", err, cfg.LLMModel)
	}

	// Poll until model appears
	deadline := time.Now().Add(modelLoadTimeout)
	for time.Now().Before(deadline) {
		models, err := client.ListModels(ctx)
		if err == nil && len(models) > 0 {
			client.model = models[0]
			if onStatus != nil {
				onStatus("Model loaded")
			}
			return client, nil
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}

	return nil, fmt.Errorf("GF-ASK-003: Model failed to load within %s. Run: lms load %s --gpu max", modelLoadTimeout, cfg.LLMModel)
}

// startServer runs lms server start in the background.
func startServer(lmsBinary string) error {
	cmd := exec.Command(lmsBinary, "server", "start")
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("lms server start: %w", err)
	}

	// Don't wait for completion — server runs in foreground mode but we just need it started.
	// Release the process so it doesn't become a zombie.
	go cmd.Wait()

	return nil
}

// loadModel runs lms load <model> --gpu max.
func loadModel(lmsBinary, model string) error {
	cmd := exec.Command(lmsBinary, "load", model, "--gpu", "max", "--identifier", "gf-search")
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		errMsg := strings.TrimSpace(stderr.String())
		if errMsg != "" {
			return fmt.Errorf("%s: %s", err, errMsg)
		}
		return err
	}

	return nil
}
