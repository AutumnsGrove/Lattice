package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	lastActivity   time.Time
	lastActivityMu sync.RWMutex
	fireflySecret  string
)

func init() {
	lastActivity = time.Now()
	fireflySecret = os.Getenv("FIREFLY_SECRET")
}

func main() {
	port := os.Getenv("FIREFLY_PORT")
	if port == "" {
		port = "9090"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/firefly/health", handleHealth)
	mux.HandleFunc("/firefly/activity", requireAuth(handleActivity))
	mux.HandleFunc("/firefly/exec", requireAuth(handleExec))

	addr := ":" + port
	log.Printf("[firefly-agent] listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("[firefly-agent] failed to start: %v", err)
	}
}

// requireAuth wraps a handler with X-Firefly-Secret validation.
func requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if fireflySecret != "" && r.Header.Get("X-Firefly-Secret") != fireflySecret {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

// handleHealth is the liveness probe — always returns ok.
func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprint(w, `{"ok":true}`)
}

// handleActivity reports current activity metrics for idle detection.
func handleActivity(w http.ResponseWriter, r *http.Request) {
	sshSessions := countSSHSessions()
	codeServerClients := countCodeServerClients()

	// Any active session counts as activity
	if sshSessions > 0 || codeServerClients > 0 {
		recordActivity()
	}

	lastActivityMu.RLock()
	lastMs := lastActivity.UnixMilli()
	lastActivityMu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"lastActivity":      lastMs,
		"sshSessions":       sshSessions,
		"codeServerClients": codeServerClients,
	})
}

// handleExec runs a command and returns the result (WebhookExecutor compat).
func handleExec(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Command string `json:"command"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Command == "" {
		http.Error(w, `{"error":"command is required"}`, http.StatusBadRequest)
		return
	}

	recordActivity()

	cmd := exec.Command("bash", "-c", req.Command)
	cmd.Dir = "/workspace"
	output, err := cmd.CombinedOutput()

	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = 1
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"exitCode": exitCode,
		"output":   string(output),
	})
}

func recordActivity() {
	lastActivityMu.Lock()
	lastActivity = time.Now()
	lastActivityMu.Unlock()
}

// countSSHSessions counts active SSH connections via /var/run/sshd.pid or `who`.
func countSSHSessions() int {
	out, err := exec.Command("who").Output()
	if err != nil {
		return 0
	}
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	if len(lines) == 1 && lines[0] == "" {
		return 0
	}
	return len(lines)
}

// countCodeServerClients checks code-server's active websocket connections.
func countCodeServerClients() int {
	// Count established connections on port 8080 (code-server)
	out, err := exec.Command("bash", "-c",
		"ss -tn state established '( dport = :8080 or sport = :8080 )' 2>/dev/null | tail -n +2 | wc -l").Output()
	if err != nil {
		return 0
	}
	n, _ := strconv.Atoi(strings.TrimSpace(string(out)))
	return n
}
