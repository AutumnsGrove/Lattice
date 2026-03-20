// Package todoist provides an API client for the Todoist API v1.
//
// It supports project/section/task CRUD via REST endpoints, and batch task
// creation via the Sync endpoint for high-throughput imports.
package todoist

// paginatedResponse wraps list endpoints that return {"results": [...], "next_cursor": "..."}.
type paginatedResponse[T any] struct {
	Results    []T    `json:"results"`
	NextCursor string `json:"next_cursor"`
}

// Project represents a Todoist project.
type Project struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Section represents a section within a project.
type Section struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	ProjectID    string `json:"project_id"`
	SectionOrder int    `json:"section_order"`
}

// Task represents a Todoist task.
type Task struct {
	ID          string   `json:"id"`
	Content     string   `json:"content"`
	Description string   `json:"description"`
	ProjectID   string   `json:"project_id"`
	SectionID   string   `json:"section_id"`
	Labels      []string `json:"labels"`
	Checked     bool     `json:"checked"`
	AddedAt     string   `json:"added_at"`
}

// CreateTaskRequest is the request body for POST /api/v1/tasks.
type CreateTaskRequest struct {
	Content     string   `json:"content"`
	Description string   `json:"description,omitempty"`
	ProjectID   string   `json:"project_id,omitempty"`
	SectionID   string   `json:"section_id,omitempty"`
	Labels      []string `json:"labels,omitempty"`
}

// CreateSectionRequest is the request body for POST /api/v1/sections.
type CreateSectionRequest struct {
	Name      string `json:"name"`
	ProjectID string `json:"project_id"`
}

// UpdateTaskRequest is the request body for POST /api/v1/tasks/{id}.
type UpdateTaskRequest struct {
	Content     *string  `json:"content,omitempty"`
	Description *string  `json:"description,omitempty"`
	Labels      []string `json:"labels,omitempty"`
}

// SyncCommand is one command in the Sync batch payload.
type SyncCommand struct {
	Type   string         `json:"type"`
	UUID   string         `json:"uuid"`
	TempID string         `json:"temp_id"`
	Args   map[string]any `json:"args"`
}

// SyncResponse is the response from POST /api/v1/sync.
type SyncResponse struct {
	SyncStatus map[string]any    `json:"sync_status"`
	TempIDMap  map[string]string `json:"temp_id_mapping"`
}

// BatchInput is the JSON format the goose-migrate skill produces.
type BatchInput struct {
	Content     string   `json:"content"`
	Section     string   `json:"section,omitempty"`
	Description string   `json:"description,omitempty"`
	Tag         string   `json:"tag,omitempty"`
	Labels      []string `json:"labels,omitempty"`
}
