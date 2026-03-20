package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"unicode"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/safety"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/todoist"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/vault"
)

// requireTodoSafety checks Todoist operation safety.
func requireTodoSafety(operation string) error {
	cfg := config.Get()
	return safety.CheckTodoistSafety(
		operation, cfg.WriteFlag, cfg.ForceFlag, cfg.AgentMode, cfg.IsInteractive(),
	)
}

// resolveTodoistToken resolves the Todoist API token with a 3-tier fallback:
// 1. Config file (todoist.api_token)
// 2. TODOIST_API_TOKEN env var
// 3. Encrypted vault
func resolveTodoistToken() (string, error) {
	// Tier 1: config file
	cfg := config.Get()
	if cfg.Todoist.APIToken != "" {
		return cfg.Todoist.APIToken, nil
	}

	// Tier 2: environment variable
	if token := os.Getenv("TODOIST_API_TOKEN"); token != "" {
		return token, nil
	}

	// Tier 3: encrypted vault
	if vault.VaultExists() {
		password, err := vault.GetVaultPassword()
		if err == nil {
			v, err := vault.Unlock(password)
			if err == nil {
				if token, ok := v.Get("TODOIST_API_TOKEN"); ok && token != "" {
					return token, nil
				}
			}
		}
	}

	return "", fmt.Errorf("TODOIST_API_TOKEN not found — set in ~/.grove/gw.toml [todoist], env var, or vault (gw secret set TODOIST_API_TOKEN)")
}

// todoClient creates a Todoist API client.
func todoClient() (*todoist.Client, error) {
	token, err := resolveTodoistToken()
	if err != nil {
		return nil, err
	}
	return todoist.NewClient(token), nil
}

// resolveTodoProjectID resolves a project flag to a Todoist project ID.
// When projectFlag is empty, config defaults are used.
func resolveTodoProjectID(client *todoist.Client, projectFlag string) (string, error) {
	cfg := config.Get()

	if projectFlag == "" {
		// Use config defaults
		if cfg.Todoist.DefaultProjectID != "" {
			return cfg.Todoist.DefaultProjectID, nil
		}
		if cfg.Todoist.DefaultProject != "" {
			return client.ResolveProjectByName(cfg.Todoist.DefaultProject)
		}
		return "", fmt.Errorf("no project specified — use --project or set todoist.default_project in config")
	}

	// If it looks like an ID (10+ digits), use directly
	if len(projectFlag) >= 10 && isAllDigits(projectFlag) {
		return projectFlag, nil
	}

	// If it matches the config default project name, use the cached ID
	if cfg.Todoist.DefaultProjectID != "" && strings.EqualFold(projectFlag, cfg.Todoist.DefaultProject) {
		return cfg.Todoist.DefaultProjectID, nil
	}

	// Otherwise resolve by name via API
	return client.ResolveProjectByName(projectFlag)
}

// isAllDigits returns true if s is non-empty and contains only ASCII digits.
func isAllDigits(s string) bool {
	for _, r := range s {
		if !unicode.IsDigit(r) {
			return false
		}
	}
	return len(s) > 0
}

// truncate shortens a string to max characters, appending "..." if truncated.
func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	if max <= 3 {
		return s[:max]
	}
	return s[:max-3] + "..."
}

// resolveSectionID finds a section ID by name within a project.
func resolveSectionID(client *todoist.Client, projectID, sectionName string) (string, error) {
	sections, err := client.ListSections(projectID)
	if err != nil {
		return "", err
	}
	lower := strings.ToLower(sectionName)
	for _, s := range sections {
		if strings.ToLower(s.Name) == lower {
			return s.ID, nil
		}
	}
	return "", fmt.Errorf("section %q not found in project %s", sectionName, projectID)
}

// --- todo command group ---

var todoCmd = &cobra.Command{
	Use:   "todo",
	Short: "Todoist task management with safety guards",
	Long:  "Manage Todoist tasks, sections, and projects. Primary consumer: goose-migrate skill.",
}

// --- todo list-projects ---

var todoListProjectsCmd = &cobra.Command{
	Use:   "list-projects",
	Short: "List all Todoist projects",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		client, err := todoClient()
		if err != nil {
			return err
		}

		projects, err := client.ListProjects()
		if err != nil {
			return err
		}

		if cfg.JSONMode {
			return printJSON(projects)
		}

		headers := []string{"ID", "Name"}
		var rows [][]string
		for _, p := range projects {
			rows = append(rows, []string{p.ID, p.Name})
		}
		fmt.Print(ui.RenderTable("Todoist Projects", headers, rows))
		return nil
	},
}

// --- todo list-sections ---

var todoListSectionsCmd = &cobra.Command{
	Use:   "list-sections",
	Short: "List sections in a project",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		client, err := todoClient()
		if err != nil {
			return err
		}

		projectFlag, _ := cmd.Flags().GetString("project")
		projectID, err := resolveTodoProjectID(client, projectFlag)
		if err != nil {
			return err
		}

		sections, err := client.ListSections(projectID)
		if err != nil {
			return err
		}

		if cfg.JSONMode {
			return printJSON(sections)
		}

		headers := []string{"ID", "Name", "Order"}
		var rows [][]string
		for _, s := range sections {
			rows = append(rows, []string{s.ID, s.Name, fmt.Sprintf("%d", s.SectionOrder)})
		}
		fmt.Print(ui.RenderTable("Sections", headers, rows))
		return nil
	},
}

// --- todo list-tasks ---

var todoListTasksCmd = &cobra.Command{
	Use:   "list-tasks",
	Short: "List tasks (filter by project/section/label)",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		client, err := todoClient()
		if err != nil {
			return err
		}

		projectFlag, _ := cmd.Flags().GetString("project")
		sectionFlag, _ := cmd.Flags().GetString("section")
		labelFlag, _ := cmd.Flags().GetString("label")

		projectID, err := resolveTodoProjectID(client, projectFlag)
		if err != nil {
			return err
		}

		// Resolve section name to ID if provided
		sectionID := ""
		if sectionFlag != "" {
			sectionID, err = resolveSectionID(client, projectID, sectionFlag)
			if err != nil {
				return err
			}
		}

		tasks, err := client.ListTasks(projectID, sectionID, labelFlag)
		if err != nil {
			return err
		}

		if cfg.JSONMode {
			return printJSON(tasks)
		}

		headers := []string{"ID", "Content", "Section", "Labels"}
		var rows [][]string
		for _, t := range tasks {
			rows = append(rows, []string{
				t.ID,
				truncate(t.Content, 60),
				t.SectionID,
				strings.Join(t.Labels, ", "),
			})
		}
		fmt.Print(ui.RenderTable(fmt.Sprintf("Tasks (%d)", len(tasks)), headers, rows))
		return nil
	},
}

// --- todo create-task ---

var todoCreateTaskCmd = &cobra.Command{
	Use:   "create-task <content>",
	Short: "Create a single task",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireTodoSafety("todoist_create_task"); err != nil {
			return err
		}

		cfg := config.Get()

		client, err := todoClient()
		if err != nil {
			return err
		}

		projectFlag, _ := cmd.Flags().GetString("project")
		sectionFlag, _ := cmd.Flags().GetString("section")
		description, _ := cmd.Flags().GetString("description")
		labels, _ := cmd.Flags().GetStringSlice("label")

		projectID, err := resolveTodoProjectID(client, projectFlag)
		if err != nil {
			return err
		}

		// Resolve section name to ID if provided
		sectionID := ""
		if sectionFlag != "" {
			sectionMap, err := client.ResolveSections(projectID, []string{sectionFlag})
			if err != nil {
				return err
			}
			sectionID = sectionMap[sectionFlag]
		}

		task, err := client.CreateTask(todoist.CreateTaskRequest{
			Content:     args[0],
			Description: description,
			ProjectID:   projectID,
			SectionID:   sectionID,
			Labels:      labels,
		})
		if err != nil {
			return err
		}

		if cfg.JSONMode {
			return printJSON(task)
		}

		ui.Success(fmt.Sprintf("Created task %s: %s", task.ID, task.Content))
		return nil
	},
}

// --- todo create-section ---

var todoCreateSectionCmd = &cobra.Command{
	Use:   "create-section <name>",
	Short: "Create a section in a project",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireTodoSafety("todoist_create_section"); err != nil {
			return err
		}

		cfg := config.Get()

		client, err := todoClient()
		if err != nil {
			return err
		}

		projectFlag, _ := cmd.Flags().GetString("project")
		projectID, err := resolveTodoProjectID(client, projectFlag)
		if err != nil {
			return err
		}

		section, err := client.CreateSection(todoist.CreateSectionRequest{
			Name:      args[0],
			ProjectID: projectID,
		})
		if err != nil {
			return err
		}

		if cfg.JSONMode {
			return printJSON(section)
		}

		ui.Success(fmt.Sprintf("Created section %q (ID: %s)", section.Name, section.ID))
		return nil
	},
}

// --- todo batch ---

var todoBatchCmd = &cobra.Command{
	Use:   "batch",
	Short: "Batch create tasks from JSON file",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireTodoSafety("todoist_batch"); err != nil {
			return err
		}

		cfg := config.Get()

		client, err := todoClient()
		if err != nil {
			return err
		}

		filePath, _ := cmd.Flags().GetString("file")
		projectFlag, _ := cmd.Flags().GetString("project")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		// Read and parse JSON file
		data, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("failed to read file: %w", err)
		}

		var tasks []todoist.BatchInput
		if err := json.Unmarshal(data, &tasks); err != nil {
			return fmt.Errorf("failed to parse JSON: %w", err)
		}

		// Validate
		if len(tasks) == 0 {
			return fmt.Errorf("no tasks in file")
		}
		if len(tasks) > 100 {
			return fmt.Errorf("too many tasks (%d) — max 100 per batch", len(tasks))
		}
		for i, t := range tasks {
			if t.Content == "" {
				return fmt.Errorf("task %d has no content", i)
			}
		}

		// Resolve project
		projectID, err := resolveTodoProjectID(client, projectFlag)
		if err != nil {
			return err
		}

		// Collect unique section names
		sectionSet := make(map[string]bool)
		for _, t := range tasks {
			if t.Section != "" {
				sectionSet[t.Section] = true
			}
		}
		var sectionNames []string
		for name := range sectionSet {
			sectionNames = append(sectionNames, name)
		}

		// Dry run: preview table
		if dryRun {
			if cfg.JSONMode {
				return printJSON(map[string]any{
					"dry_run":    true,
					"project_id": projectID,
					"task_count": len(tasks),
					"sections":  sectionNames,
					"tasks":     tasks,
				})
			}

			headers := []string{"Content", "Section", "Labels"}
			var rows [][]string
			for _, t := range tasks {
				labels := strings.Join(t.Labels, ", ")
				if t.Tag != "" {
					if labels != "" {
						labels += ", "
					}
					labels += t.Tag
				}
				rows = append(rows, []string{
					truncate(t.Content, 60),
					t.Section,
					labels,
				})
			}
			fmt.Print(ui.RenderTable(fmt.Sprintf("Batch Preview (%d tasks)", len(tasks)), headers, rows))
			ui.Muted("Dry run — no tasks created. Remove --dry-run to execute.")
			return nil
		}

		// Resolve sections (creates missing ones)
		sectionMap := make(map[string]string)
		if len(sectionNames) > 0 {
			sectionMap, err = client.ResolveSections(projectID, sectionNames)
			if err != nil {
				return err
			}
		}

		// Batch create
		resp, err := client.BatchCreateTasks(projectID, sectionMap, tasks)
		if err != nil {
			return err
		}

		// Count successes
		successes := 0
		for _, status := range resp.SyncStatus {
			if s, ok := status.(string); ok && s == "ok" {
				successes++
			}
		}

		if cfg.JSONMode {
			return printJSON(resp)
		}

		ui.Success(fmt.Sprintf("Created %d tasks across %d sections", successes, len(sectionNames)))
		return nil
	},
}

// --- todo update-task ---

var todoUpdateTaskCmd = &cobra.Command{
	Use:   "update-task <task-id>",
	Short: "Update an existing task",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireTodoSafety("todoist_update_task"); err != nil {
			return err
		}

		cfg := config.Get()

		client, err := todoClient()
		if err != nil {
			return err
		}

		taskID := args[0]
		contentFlag, _ := cmd.Flags().GetString("content")
		descFlag, _ := cmd.Flags().GetString("description")
		labelsFlag, _ := cmd.Flags().GetStringSlice("label")

		req := todoist.UpdateTaskRequest{}
		if contentFlag != "" {
			req.Content = &contentFlag
		}
		if descFlag != "" {
			req.Description = &descFlag
		}
		if len(labelsFlag) > 0 {
			req.Labels = labelsFlag
		}

		task, err := client.UpdateTask(taskID, req)
		if err != nil {
			return err
		}

		if cfg.JSONMode {
			return printJSON(task)
		}

		ui.Success(fmt.Sprintf("Updated task %s", task.ID))
		return nil
	},
}

// --- todo complete-task ---

var todoCompleteTaskCmd = &cobra.Command{
	Use:   "complete-task <task-id> [task-id...]",
	Short: "Mark task(s) as complete",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireTodoSafety("todoist_complete_task"); err != nil {
			return err
		}

		cfg := config.Get()

		client, err := todoClient()
		if err != nil {
			return err
		}

		var completed []string
		for _, taskID := range args {
			if err := client.CompleteTask(taskID); err != nil {
				return fmt.Errorf("failed to complete task %s: %w", taskID, err)
			}
			completed = append(completed, taskID)
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"completed": completed,
			})
		}

		for _, taskID := range completed {
			ui.Success(fmt.Sprintf("Completed task %s", taskID))
		}
		return nil
	},
}

// --- todo delete-task ---

var todoDeleteTaskCmd = &cobra.Command{
	Use:   "delete-task <task-id>",
	Short: "Delete a task",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireTodoSafety("todoist_delete_task"); err != nil {
			return err
		}

		cfg := config.Get()

		client, err := todoClient()
		if err != nil {
			return err
		}

		taskID := args[0]
		if err := client.DeleteTask(taskID); err != nil {
			return err
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"deleted": taskID,
			})
		}

		ui.Success(fmt.Sprintf("Deleted task %s", taskID))
		return nil
	},
}

// --- todo clear-section ---

var todoClearSectionCmd = &cobra.Command{
	Use:   "clear-section <section-name>",
	Short: "Delete all tasks in a section",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireTodoSafety("todoist_clear_section"); err != nil {
			return err
		}

		cfg := config.Get()

		client, err := todoClient()
		if err != nil {
			return err
		}

		sectionName := args[0]
		projectFlag, _ := cmd.Flags().GetString("project")

		// Resolve project
		projectID, err := resolveTodoProjectID(client, projectFlag)
		if err != nil {
			return err
		}

		// Find section by name
		sectionID, err := resolveSectionID(client, projectID, sectionName)
		if err != nil {
			return err
		}

		// List tasks in section
		tasks, err := client.ListTasks(projectID, sectionID, "")
		if err != nil {
			return err
		}

		if len(tasks) == 0 {
			if cfg.JSONMode {
				return printJSON(map[string]any{
					"section": sectionName,
					"deleted": 0,
				})
			}
			ui.Muted(fmt.Sprintf("Section %q is already empty", sectionName))
			return nil
		}

		// Delete each task
		deleted := 0
		for _, t := range tasks {
			if err := client.DeleteTask(t.ID); err != nil {
				return fmt.Errorf("failed to delete task %s: %w", t.ID, err)
			}
			deleted++
		}

		if cfg.JSONMode {
			return printJSON(map[string]any{
				"section": sectionName,
				"deleted": deleted,
			})
		}

		ui.Success(fmt.Sprintf("Deleted %d tasks from section %q", deleted, sectionName))
		return nil
	},
}

// --- cozy help ---

var todoHelpCategories = []ui.HelpCategory{
	{
		Title: "Read (Always Safe)",
		Icon:  "\U0001F4D6",
		Style: ui.SafeReadStyle,
		Commands: []ui.HelpCommand{
			{Name: "list-projects", Desc: "List all Todoist projects"},
			{Name: "list-sections", Desc: "List sections in a project"},
			{Name: "list-tasks", Desc: "List tasks (filter by project/section/label)"},
		},
	},
	{
		Title: "Write (--write)",
		Icon:  "\u270F\uFE0F",
		Style: ui.SafeWriteStyle,
		Commands: []ui.HelpCommand{
			{Name: "create-task", Desc: "Create a single task"},
			{Name: "create-section", Desc: "Create a section in a project"},
			{Name: "batch", Desc: "Batch create tasks from JSON file"},
			{Name: "update-task", Desc: "Update an existing task"},
			{Name: "complete-task", Desc: "Mark task(s) as complete"},
		},
	},
	{
		Title: "Dangerous (--write --force)",
		Icon:  "\u26A0\uFE0F",
		Style: ui.DangerStyle,
		Commands: []ui.HelpCommand{
			{Name: "delete-task", Desc: "Delete a task"},
			{Name: "clear-section", Desc: "Delete all tasks in a section"},
		},
	},
}

func init() {
	rootCmd.AddCommand(todoCmd)

	todoCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		output := ui.RenderCozyHelp("gw todo", "Todoist task management", todoHelpCategories, true)
		fmt.Print(output)
	})

	// todo list-projects
	todoCmd.AddCommand(todoListProjectsCmd)

	// todo list-sections
	todoListSectionsCmd.Flags().StringP("project", "p", "", "Project name or ID")
	todoCmd.AddCommand(todoListSectionsCmd)

	// todo list-tasks
	todoListTasksCmd.Flags().StringP("project", "p", "", "Project name or ID")
	todoListTasksCmd.Flags().String("section", "", "Filter by section name")
	todoListTasksCmd.Flags().String("label", "", "Filter by label")
	todoCmd.AddCommand(todoListTasksCmd)

	// todo create-task
	todoCreateTaskCmd.Flags().StringP("project", "p", "", "Project name or ID")
	todoCreateTaskCmd.Flags().String("section", "", "Section name (created if missing)")
	todoCreateTaskCmd.Flags().StringP("description", "d", "", "Task description")
	todoCreateTaskCmd.Flags().StringSliceP("label", "l", nil, "Task label(s)")
	todoCmd.AddCommand(todoCreateTaskCmd)

	// todo create-section
	todoCreateSectionCmd.Flags().StringP("project", "p", "", "Project name or ID (required)")
	_ = todoCreateSectionCmd.MarkFlagRequired("project")
	todoCmd.AddCommand(todoCreateSectionCmd)

	// todo batch
	todoBatchCmd.Flags().StringP("project", "p", "", "Project name or ID")
	todoBatchCmd.Flags().StringP("file", "f", "", "Path to JSON file with tasks")
	todoBatchCmd.Flags().Bool("dry-run", false, "Preview tasks without creating them")
	_ = todoBatchCmd.MarkFlagRequired("file")
	todoCmd.AddCommand(todoBatchCmd)

	// todo update-task
	todoUpdateTaskCmd.Flags().String("content", "", "New task content")
	todoUpdateTaskCmd.Flags().StringP("description", "d", "", "New task description")
	todoUpdateTaskCmd.Flags().StringSliceP("label", "l", nil, "New task label(s)")
	todoCmd.AddCommand(todoUpdateTaskCmd)

	// todo complete-task
	todoCmd.AddCommand(todoCompleteTaskCmd)

	// todo delete-task
	todoCmd.AddCommand(todoDeleteTaskCmd)

	// todo clear-section
	todoClearSectionCmd.Flags().StringP("project", "p", "", "Project name or ID (required)")
	_ = todoClearSectionCmd.MarkFlagRequired("project")
	todoCmd.AddCommand(todoClearSectionCmd)
}
