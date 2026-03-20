package todoist

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
)

// ListProjects retrieves all projects.
func (c *Client) ListProjects() ([]Project, error) {
	body, err := c.restGet("/projects", nil)
	if err != nil {
		return nil, err
	}
	var resp paginatedResponse[Project]
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse projects: %w", err)
	}
	return resp.Results, nil
}

// ListSections retrieves all sections for a project.
func (c *Client) ListSections(projectID string) ([]Section, error) {
	params := url.Values{}
	params.Set("project_id", projectID)

	body, err := c.restGet("/sections", params)
	if err != nil {
		return nil, err
	}
	var resp paginatedResponse[Section]
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse sections: %w", err)
	}
	return resp.Results, nil
}

// ListTasks retrieves tasks with optional filtering by project, section, or label.
func (c *Client) ListTasks(projectID, sectionID, label string) ([]Task, error) {
	params := url.Values{}
	if projectID != "" {
		params.Set("project_id", projectID)
	}
	if sectionID != "" {
		params.Set("section_id", sectionID)
	}
	if label != "" {
		params.Set("label", label)
	}

	body, err := c.restGet("/tasks", params)
	if err != nil {
		return nil, err
	}
	var resp paginatedResponse[Task]
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse tasks: %w", err)
	}
	return resp.Results, nil
}

// CreateTask creates a new task.
func (c *Client) CreateTask(req CreateTaskRequest) (*Task, error) {
	body, err := c.restPost("/tasks", req)
	if err != nil {
		return nil, err
	}
	var task Task
	if err := json.Unmarshal(body, &task); err != nil {
		return nil, fmt.Errorf("failed to parse task: %w", err)
	}
	return &task, nil
}

// CreateSection creates a new section in a project.
func (c *Client) CreateSection(req CreateSectionRequest) (*Section, error) {
	body, err := c.restPost("/sections", req)
	if err != nil {
		return nil, err
	}
	var section Section
	if err := json.Unmarshal(body, &section); err != nil {
		return nil, fmt.Errorf("failed to parse section: %w", err)
	}
	return &section, nil
}

// UpdateTask updates an existing task by ID.
func (c *Client) UpdateTask(taskID string, req UpdateTaskRequest) (*Task, error) {
	body, err := c.restPost("/tasks/"+taskID, req)
	if err != nil {
		return nil, err
	}
	var task Task
	if err := json.Unmarshal(body, &task); err != nil {
		return nil, fmt.Errorf("failed to parse task: %w", err)
	}
	return &task, nil
}

// CompleteTask marks a task as completed.
func (c *Client) CompleteTask(taskID string) error {
	_, err := c.restPost("/tasks/"+taskID+"/close", nil)
	return err
}

// DeleteTask deletes a task by ID.
func (c *Client) DeleteTask(taskID string) error {
	return c.restDelete("/tasks/" + taskID)
}

// ResolveProjectByName finds a project ID by case-insensitive name match.
// Tries exact match first, then prefix match (so "Grove" matches "Grove 🌲").
func (c *Client) ResolveProjectByName(name string) (string, error) {
	projects, err := c.ListProjects()
	if err != nil {
		return "", fmt.Errorf("failed to list projects: %w", err)
	}

	lower := strings.ToLower(name)

	// Exact match first.
	for _, p := range projects {
		if strings.ToLower(p.Name) == lower {
			return p.ID, nil
		}
	}

	// Prefix match (handles emoji suffixes like "Grove 🌲").
	for _, p := range projects {
		if strings.HasPrefix(strings.ToLower(p.Name), lower) {
			return p.ID, nil
		}
	}

	return "", fmt.Errorf("project %q not found", name)
}

// ResolveSections maps section names to IDs, creating any that don't exist.
func (c *Client) ResolveSections(projectID string, names []string) (map[string]string, error) {
	existing, err := c.ListSections(projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to list sections: %w", err)
	}

	// Build case-insensitive lookup from existing sections.
	byName := make(map[string]string, len(existing))
	for _, s := range existing {
		byName[strings.ToLower(s.Name)] = s.ID
	}

	result := make(map[string]string, len(names))
	for _, name := range names {
		lower := strings.ToLower(name)
		if id, ok := byName[lower]; ok {
			result[name] = id
			continue
		}

		// Section doesn't exist — create it.
		section, err := c.CreateSection(CreateSectionRequest{
			Name:      name,
			ProjectID: projectID,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create section %q: %w", name, err)
		}
		result[name] = section.ID
		byName[lower] = section.ID
	}
	return result, nil
}

// BatchCreateTasks creates multiple tasks via the Sync v9 API.
// sectionMap maps section names to IDs (as returned by ResolveSections).
func (c *Client) BatchCreateTasks(projectID string, sectionMap map[string]string, tasks []BatchInput) (*SyncResponse, error) {
	commands := make([]SyncCommand, 0, len(tasks))

	for _, t := range tasks {
		args := map[string]any{
			"content":    t.Content,
			"project_id": projectID,
		}

		if t.Description != "" {
			args["description"] = t.Description
		}

		if t.Section != "" {
			if sectionID, ok := sectionMap[t.Section]; ok {
				args["section_id"] = sectionID
			}
		}

		// Merge Tag into Labels (deduplicated).
		labels := append([]string{}, t.Labels...)
		if t.Tag != "" {
			found := false
			for _, l := range labels {
				if strings.EqualFold(l, t.Tag) {
					found = true
					break
				}
			}
			if !found {
				labels = append(labels, t.Tag)
			}
		}
		if len(labels) > 0 {
			args["labels"] = labels
		}

		commands = append(commands, SyncCommand{
			Type:   "item_add",
			UUID:   newUUID(),
			TempID: newUUID(),
			Args:   args,
		})
	}

	resp, err := c.syncBatch(commands)
	if err != nil {
		return nil, err
	}

	// Count successes vs failures for diagnostics.
	successes, failures := 0, 0
	for _, status := range resp.SyncStatus {
		if s, ok := status.(string); ok && s == "ok" {
			successes++
		} else {
			failures++
		}
	}

	if failures > 0 {
		return resp, fmt.Errorf("batch completed with %d successes and %d failures", successes, failures)
	}
	return resp, nil
}
