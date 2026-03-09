package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// ── GraphQL queries ─────────────────────────────────────────────────

const projectListQuery = `query($owner: String!) {
  user(login: $owner) {
    projectsV2(first: 20) {
      nodes { number title closed items { totalCount } }
    }
  }
}`

const projectListOrgQuery = `query($owner: String!) {
  organization(login: $owner) {
    projectsV2(first: 20) {
      nodes { number title closed items { totalCount } }
    }
  }
}`

const projectViewQuery = `query($owner: String!, $number: Int!) {
  user(login: $owner) {
    projectV2(number: $number) {
      title
      fields(first: 30) {
        nodes {
          ... on ProjectV2SingleSelectField {
            name
            options { id name }
          }
          ... on ProjectV2Field { name }
          ... on ProjectV2IterationField { name }
        }
      }
      items(first: 100) {
        nodes {
          fieldValues(first: 20) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } }
            }
          }
        }
      }
    }
  }
}`

const projectViewOrgQuery = `query($owner: String!, $number: Int!) {
  organization(login: $owner) {
    projectV2(number: $number) {
      title
      fields(first: 30) {
        nodes {
          ... on ProjectV2SingleSelectField {
            name
            options { id name }
          }
          ... on ProjectV2Field { name }
          ... on ProjectV2IterationField { name }
        }
      }
      items(first: 100) {
        nodes {
          fieldValues(first: 20) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } }
            }
          }
        }
      }
    }
  }
}`

const projectItemsQuery = `query($owner: String!, $number: Int!) {
  user(login: $owner) {
    projectV2(number: $number) {
      items(first: 100) {
        nodes {
          content {
            ... on Issue { number title state }
            ... on PullRequest { number title state }
            ... on DraftIssue { title }
          }
          fieldValues(first: 20) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } }
            }
          }
        }
      }
    }
  }
}`

const projectItemsOrgQuery = `query($owner: String!, $number: Int!) {
  organization(login: $owner) {
    projectV2(number: $number) {
      items(first: 100) {
        nodes {
          content {
            ... on Issue { number title state }
            ... on PullRequest { number title state }
            ... on DraftIssue { title }
          }
          fieldValues(first: 20) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } }
            }
          }
        }
      }
    }
  }
}`

// ── helpers ─────────────────────────────────────────────────────────

// projectOwner returns the configured GitHub owner.
func projectOwner() string {
	return config.Get().GitHub.Owner
}

// resolveProjectNumber returns the project number from flag or config.
func resolveProjectNumber(cmd *cobra.Command) (int, error) {
	number, _ := cmd.Flags().GetInt("number")
	if number > 0 {
		return number, nil
	}
	cfg := config.Get()
	if cfg.GitHub.ProjectNumber != nil {
		return *cfg.GitHub.ProjectNumber, nil
	}
	return 0, fmt.Errorf("project number required — use --number or set github.project_number in gw.toml")
}

// runGraphQLWithFallback tries user query first, falls back to org query.
func runGraphQLWithFallback(userQuery, orgQuery string, vars map[string]string) (string, error) {
	result, err := exec.GHGraphQL(userQuery, vars)
	if err == nil {
		return result, nil
	}
	// Fallback to org query
	return exec.GHGraphQL(orgQuery, vars)
}

// extractProjectData digs into the nested GraphQL response to find project data.
// Returns the value at data.user.projectV2 or data.organization.projectV2.
func extractProjectData(raw string, field string) (interface{}, error) {
	var response map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &response); err != nil {
		return nil, fmt.Errorf("invalid GraphQL response: %w", err)
	}
	data, ok := response["data"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected GraphQL response structure")
	}
	// Try user first, then organization
	for _, root := range []string{"user", "organization"} {
		if owner, ok := data[root].(map[string]interface{}); ok {
			if val, ok := owner[field]; ok {
				return val, nil
			}
		}
	}
	return nil, fmt.Errorf("field %q not found in response", field)
}

// ── project command group ───────────────────────────────────────────

var projectCmd = &cobra.Command{
	Use:   "project",
	Short: "Project board operations",
	Long:  "Manage GitHub Project V2 boards with safety-tiered access.",
}

// ── project list ────────────────────────────────────────────────────

var projectListCmd = &cobra.Command{
	Use:   "list",
	Short: "List project boards",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		owner := projectOwner()

		vars := map[string]string{"owner": owner}
		result, err := runGraphQLWithFallback(projectListQuery, projectListOrgQuery, vars)
		if err != nil {
			return fmt.Errorf("failed to list projects: %w", err)
		}

		rawList, err := extractProjectData(result, "projectsV2")
		if err != nil {
			return fmt.Errorf("failed to parse projects: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.MarshalIndent(rawList, "", "  ")
			fmt.Println(string(data))
			return nil
		}

		projectsMap, ok := rawList.(map[string]interface{})
		if !ok {
			return fmt.Errorf("unexpected projects format")
		}
		nodes, ok := projectsMap["nodes"].([]interface{})
		if !ok || len(nodes) == 0 {
			ui.Muted("No project boards found")
			return nil
		}

		headers := []string{"#", "Title", "Items", "Status"}
		var rows [][]string
		for _, n := range nodes {
			p, ok := n.(map[string]interface{})
			if !ok {
				continue
			}
			num := fmt.Sprintf("%v", p["number"])
			title := fmt.Sprintf("%v", p["title"])
			items := "0"
			if itemsMap, ok := p["items"].(map[string]interface{}); ok {
				items = fmt.Sprintf("%v", itemsMap["totalCount"])
			}
			status := "Open"
			if closed, ok := p["closed"].(bool); ok && closed {
				status = "Closed"
			}
			rows = append(rows, []string{num, TruncateStr(title, 40), items, status})
		}
		fmt.Print(ui.RenderTable("Project Boards", headers, rows))
		return nil
	},
}

// ── project view ────────────────────────────────────────────────────

var projectViewCmd = &cobra.Command{
	Use:   "view",
	Short: "View project board fields and status counts",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		owner := projectOwner()
		number, err := resolveProjectNumber(cmd)
		if err != nil {
			return err
		}

		vars := map[string]string{
			"owner":  owner,
			"number": fmt.Sprintf("%d", number),
		}
		result, err := runGraphQLWithFallback(projectViewQuery, projectViewOrgQuery, vars)
		if err != nil {
			return fmt.Errorf("failed to view project: %w", err)
		}

		raw, err := extractProjectData(result, "projectV2")
		if err != nil {
			return fmt.Errorf("failed to parse project: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.MarshalIndent(raw, "", "  ")
			fmt.Println(string(data))
			return nil
		}

		project, ok := raw.(map[string]interface{})
		if !ok {
			return fmt.Errorf("unexpected project format")
		}

		title := fmt.Sprintf("%v", project["title"])
		ui.PrintHeader(fmt.Sprintf("Project: %s (#%d)", title, number))

		// Count items by status
		statusCounts := countItemsByStatus(project)
		if len(statusCounts) > 0 {
			fmt.Println()
			headers := []string{"Status", "Count"}
			var rows [][]string
			for _, sc := range statusCounts {
				rows = append(rows, []string{sc.name, fmt.Sprintf("%d", sc.count)})
			}
			fmt.Print(ui.RenderSimpleTable(headers, rows))
		}

		// Show fields
		fields := extractFieldNames(project)
		if len(fields) > 0 {
			fmt.Println()
			ui.Muted("Fields: " + strings.Join(fields, ", "))
		}

		return nil
	},
}

type statusCount struct {
	name  string
	count int
}

func countItemsByStatus(project map[string]interface{}) []statusCount {
	counts := make(map[string]int)
	items, ok := project["items"].(map[string]interface{})
	if !ok {
		return nil
	}
	nodes, ok := items["nodes"].([]interface{})
	if !ok {
		return nil
	}
	for _, node := range nodes {
		item, ok := node.(map[string]interface{})
		if !ok {
			continue
		}
		status := extractStatusField(item)
		if status == "" {
			status = "(none)"
		}
		counts[status]++
	}
	var result []statusCount
	for name, count := range counts {
		result = append(result, statusCount{name, count})
	}
	return result
}

func extractStatusField(item map[string]interface{}) string {
	fieldValues, ok := item["fieldValues"].(map[string]interface{})
	if !ok {
		return ""
	}
	nodes, ok := fieldValues["nodes"].([]interface{})
	if !ok {
		return ""
	}
	for _, node := range nodes {
		fv, ok := node.(map[string]interface{})
		if !ok {
			continue
		}
		if field, ok := fv["field"].(map[string]interface{}); ok {
			if fieldName, ok := field["name"].(string); ok && fieldName == "Status" {
				if name, ok := fv["name"].(string); ok {
					return name
				}
			}
		}
	}
	return ""
}

func extractFieldNames(project map[string]interface{}) []string {
	fields, ok := project["fields"].(map[string]interface{})
	if !ok {
		return nil
	}
	nodes, ok := fields["nodes"].([]interface{})
	if !ok {
		return nil
	}
	var names []string
	for _, node := range nodes {
		f, ok := node.(map[string]interface{})
		if !ok {
			continue
		}
		if name, ok := f["name"].(string); ok && name != "" {
			names = append(names, name)
		}
	}
	return names
}

// ── project items ───────────────────────────────────────────────────

var projectItemsCmd = &cobra.Command{
	Use:   "items",
	Short: "List project items with status",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGHSafety("project_items"); err != nil {
			return err
		}

		cfg := config.Get()
		owner := projectOwner()
		number, err := resolveProjectNumber(cmd)
		if err != nil {
			return err
		}

		vars := map[string]string{
			"owner":  owner,
			"number": fmt.Sprintf("%d", number),
		}
		result, err := runGraphQLWithFallback(projectItemsQuery, projectItemsOrgQuery, vars)
		if err != nil {
			return fmt.Errorf("failed to list items: %w", err)
		}

		raw, err := extractProjectData(result, "projectV2")
		if err != nil {
			return fmt.Errorf("failed to parse project: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.MarshalIndent(raw, "", "  ")
			fmt.Println(string(data))
			return nil
		}

		project, ok := raw.(map[string]interface{})
		if !ok {
			return fmt.Errorf("unexpected project format")
		}
		items, ok := project["items"].(map[string]interface{})
		if !ok {
			ui.Muted("No items found")
			return nil
		}
		nodes, ok := items["nodes"].([]interface{})
		if !ok || len(nodes) == 0 {
			ui.Muted("No items found")
			return nil
		}

		headers := []string{"#", "Title", "Type", "State", "Status"}
		var rows [][]string
		for _, node := range nodes {
			item, ok := node.(map[string]interface{})
			if !ok {
				continue
			}
			content, ok := item["content"].(map[string]interface{})
			num := ""
			title := "(draft)"
			itemType := "Draft"
			state := ""
			if ok {
				if n, ok := content["number"]; ok {
					num = fmt.Sprintf("%v", n)
				}
				if t, ok := content["title"]; ok {
					title = fmt.Sprintf("%v", t)
				}
				if s, ok := content["state"]; ok {
					state = fmt.Sprintf("%v", s)
				}
				if num != "" {
					if state == "MERGED" || state == "CLOSED" {
						itemType = "PR"
					} else if state == "OPEN" && content["state"] != nil {
						// Detect type heuristically
						itemType = "Issue"
					}
				}
			}
			status := extractStatusField(item)
			rows = append(rows, []string{num, TruncateStr(title, 45), itemType, state, status})
		}
		fmt.Print(ui.RenderTable(fmt.Sprintf("Project #%d Items", number), headers, rows))
		return nil
	},
}

// ── project move ────────────────────────────────────────────────────

const findProjectItemQuery = `query($owner: String!, $number: Int!) {
  user(login: $owner) {
    projectV2(number: $number) {
      id
      fields(first: 30) {
        nodes {
          ... on ProjectV2SingleSelectField {
            id name options { id name }
          }
        }
      }
      items(first: 100) {
        nodes {
          id
          content {
            ... on Issue { number }
            ... on PullRequest { number }
          }
        }
      }
    }
  }
}`

const findProjectItemOrgQuery = `query($owner: String!, $number: Int!) {
  organization(login: $owner) {
    projectV2(number: $number) {
      id
      fields(first: 30) {
        nodes {
          ... on ProjectV2SingleSelectField {
            id name options { id name }
          }
        }
      }
      items(first: 100) {
        nodes {
          id
          content {
            ... on Issue { number }
            ... on PullRequest { number }
          }
        }
      }
    }
  }
}`

const updateProjectItemFieldMutation = `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $projectId
    itemId: $itemId
    fieldId: $fieldId
    value: { singleSelectOptionId: $optionId }
  }) { projectV2Item { id } }
}`

// projectMoveContext resolves project, item, field, and option IDs.
type projectMoveContext struct {
	ProjectID string
	ItemID    string
	FieldID   string
	OptionID  string
}

func resolveProjectMoveContext(owner string, projectNum int, issueNum int, fieldName, valueName string) (*projectMoveContext, error) {
	vars := map[string]string{
		"owner":  owner,
		"number": fmt.Sprintf("%d", projectNum),
	}
	result, err := runGraphQLWithFallback(findProjectItemQuery, findProjectItemOrgQuery, vars)
	if err != nil {
		return nil, fmt.Errorf("failed to query project: %w", err)
	}

	raw, err := extractProjectData(result, "projectV2")
	if err != nil {
		return nil, err
	}
	project, ok := raw.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected project data")
	}

	projectID, _ := project["id"].(string)
	if projectID == "" {
		return nil, fmt.Errorf("could not resolve project ID")
	}

	// Find item by issue number
	itemID := ""
	if items, ok := project["items"].(map[string]interface{}); ok {
		if nodes, ok := items["nodes"].([]interface{}); ok {
			for _, node := range nodes {
				item, ok := node.(map[string]interface{})
				if !ok {
					continue
				}
				if content, ok := item["content"].(map[string]interface{}); ok {
					if num, ok := content["number"].(float64); ok && int(num) == issueNum {
						itemID, _ = item["id"].(string)
						break
					}
				}
			}
		}
	}
	if itemID == "" {
		return nil, fmt.Errorf("issue #%d not found in project #%d", issueNum, projectNum)
	}

	// Find field and option
	fieldID := ""
	optionID := ""
	if fields, ok := project["fields"].(map[string]interface{}); ok {
		if nodes, ok := fields["nodes"].([]interface{}); ok {
			for _, node := range nodes {
				f, ok := node.(map[string]interface{})
				if !ok {
					continue
				}
				name, _ := f["name"].(string)
				if !strings.EqualFold(name, fieldName) {
					continue
				}
				fieldID, _ = f["id"].(string)
				if options, ok := f["options"].([]interface{}); ok {
					for _, opt := range options {
						o, ok := opt.(map[string]interface{})
						if !ok {
							continue
						}
						optName, _ := o["name"].(string)
						if strings.EqualFold(optName, valueName) {
							optionID, _ = o["id"].(string)
							break
						}
					}
				}
				break
			}
		}
	}
	if fieldID == "" {
		return nil, fmt.Errorf("field %q not found in project", fieldName)
	}
	if optionID == "" {
		return nil, fmt.Errorf("value %q not found for field %q", valueName, fieldName)
	}

	return &projectMoveContext{
		ProjectID: projectID,
		ItemID:    itemID,
		FieldID:   fieldID,
		OptionID:  optionID,
	}, nil
}

var projectMoveCmd = &cobra.Command{
	Use:   "move <issue-number>",
	Short: "Move an issue to a different status column",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGHSafety("project_move"); err != nil {
			return err
		}

		cfg := config.Get()
		issueNum := args[0]
		if err := validateGHNumber(issueNum); err != nil {
			return err
		}

		status, _ := cmd.Flags().GetString("status")
		if status == "" {
			return fmt.Errorf("--status required")
		}

		owner := projectOwner()
		projectNum, err := resolveProjectNumber(cmd)
		if err != nil {
			return err
		}

		var issueNumInt int
		fmt.Sscanf(issueNum, "%d", &issueNumInt)

		ctx, err := resolveProjectMoveContext(owner, projectNum, issueNumInt, "Status", status)
		if err != nil {
			return err
		}

		// Execute mutation
		vars := map[string]string{
			"projectId": ctx.ProjectID,
			"itemId":    ctx.ItemID,
			"fieldId":   ctx.FieldID,
			"optionId":  ctx.OptionID,
		}
		_, err = exec.GHGraphQL(updateProjectItemFieldMutation, vars)
		if err != nil {
			return fmt.Errorf("failed to move issue: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"issue":  issueNum,
				"status": status,
				"moved":  true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Moved issue #%s to %q", issueNum, status))
		}
		return nil
	},
}

// ── project set ─────────────────────────────────────────────────────

var projectSetCmd = &cobra.Command{
	Use:   "set <issue-number>",
	Short: "Set a single-select field on an issue",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGHSafety("project_field"); err != nil {
			return err
		}

		cfg := config.Get()
		issueNum := args[0]
		if err := validateGHNumber(issueNum); err != nil {
			return err
		}

		fieldName, _ := cmd.Flags().GetString("field")
		value, _ := cmd.Flags().GetString("value")
		if fieldName == "" || value == "" {
			return fmt.Errorf("--field and --value required")
		}

		owner := projectOwner()
		projectNum, err := resolveProjectNumber(cmd)
		if err != nil {
			return err
		}

		var issueNumInt int
		fmt.Sscanf(issueNum, "%d", &issueNumInt)

		ctx, err := resolveProjectMoveContext(owner, projectNum, issueNumInt, fieldName, value)
		if err != nil {
			return err
		}

		vars := map[string]string{
			"projectId": ctx.ProjectID,
			"itemId":    ctx.ItemID,
			"fieldId":   ctx.FieldID,
			"optionId":  ctx.OptionID,
		}
		_, err = exec.GHGraphQL(updateProjectItemFieldMutation, vars)
		if err != nil {
			return fmt.Errorf("failed to set field: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"issue": issueNum,
				"field": fieldName,
				"value": value,
				"set":   true,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Set %q = %q on issue #%s", fieldName, value, issueNum))
		}
		return nil
	},
}

// ── project batch-move ──────────────────────────────────────────────

type batchMoveItem struct {
	Issue  int    `json:"issue"`
	Status string `json:"status"`
}

var projectBatchMoveCmd = &cobra.Command{
	Use:   "batch-move",
	Short: "Bulk move issues from a JSON file",
	Long: `Move multiple issues to new status columns from a JSON file.
Format: [{"issue": 123, "status": "In Progress"}, ...]`,
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireGHSafety("project_bulk"); err != nil {
			return err
		}

		cfg := config.Get()
		filePath, _ := cmd.Flags().GetString("file")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		// Validate file path — no symlinks
		fileInfo, err := os.Lstat(filePath)
		if err != nil {
			return fmt.Errorf("cannot read file: %w", err)
		}
		if fileInfo.Mode()&os.ModeSymlink != 0 {
			return fmt.Errorf("symlinks not allowed for safety")
		}
		if fileInfo.Size() > maxBatchFileSize {
			return fmt.Errorf("file too large (%d bytes, max %d)", fileInfo.Size(), maxBatchFileSize)
		}

		data, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("cannot read file: %w", err)
		}

		var items []batchMoveItem
		if err := json.Unmarshal(data, &items); err != nil {
			return fmt.Errorf("invalid JSON: %w", err)
		}
		if len(items) == 0 {
			return fmt.Errorf("no items found in file")
		}
		if len(items) > maxBatchSize {
			return fmt.Errorf("too many items (%d, max %d)", len(items), maxBatchSize)
		}

		// Validate all items
		for i, item := range items {
			if item.Issue <= 0 {
				return fmt.Errorf("item %d: invalid issue number", i+1)
			}
			if item.Status == "" {
				return fmt.Errorf("item %d: status required", i+1)
			}
		}

		// Dry-run preview
		if dryRun {
			if cfg.JSONMode {
				out, _ := json.MarshalIndent(items, "", "  ")
				fmt.Println(string(out))
				return nil
			}
			headers := []string{"#", "Issue", "Status"}
			var rows [][]string
			for i, item := range items {
				rows = append(rows, []string{
					fmt.Sprintf("%d", i+1),
					fmt.Sprintf("#%d", item.Issue),
					item.Status,
				})
			}
			fmt.Printf("Batch Move Preview (%d items)\n\n", len(items))
			fmt.Print(ui.RenderSimpleTable(headers, rows))
			fmt.Println()
			ui.Hint("Use without --dry-run to execute.")
			return nil
		}

		owner := projectOwner()
		projectNum, err := resolveProjectNumber(cmd)
		if err != nil {
			return err
		}

		moved := 0
		failed := 0
		for _, item := range items {
			ctx, err := resolveProjectMoveContext(owner, projectNum, item.Issue, "Status", item.Status)
			if err != nil {
				if !cfg.JSONMode {
					ui.Warning(fmt.Sprintf("Issue #%d: %v", item.Issue, err))
				}
				failed++
				continue
			}

			vars := map[string]string{
				"projectId": ctx.ProjectID,
				"itemId":    ctx.ItemID,
				"fieldId":   ctx.FieldID,
				"optionId":  ctx.OptionID,
			}
			_, err = exec.GHGraphQL(updateProjectItemFieldMutation, vars)
			if err != nil {
				if !cfg.JSONMode {
					ui.Warning(fmt.Sprintf("Issue #%d: %v", item.Issue, err))
				}
				failed++
				continue
			}
			moved++
		}

		if cfg.JSONMode {
			out, _ := json.Marshal(map[string]interface{}{
				"moved":  moved,
				"failed": failed,
				"total":  len(items),
			})
			fmt.Println(string(out))
		} else if failed == 0 {
			ui.Success(fmt.Sprintf("Moved %d items", moved))
		} else {
			ui.Warning(fmt.Sprintf("Moved %d items, %d failed", moved, failed))
		}
		return nil
	},
}

// ── project help & init ─────────────────────────────────────────────

var projectHelpCategories = []ui.HelpCategory{
	{Title: "Read (Always Safe)", Icon: "📖", Style: ui.SafeReadStyle, Commands: []ui.HelpCommand{
		{Name: "list", Desc: "List project boards"},
		{Name: "view", Desc: "View project fields and status counts"},
		{Name: "items", Desc: "List items with status"},
	}},
	{Title: "Write (--write)", Icon: "✏️", Style: ui.SafeWriteStyle, Commands: []ui.HelpCommand{
		{Name: "move", Desc: "Move issue to a status column"},
		{Name: "set", Desc: "Set a single-select field value"},
	}},
	{Title: "Dangerous (--write --force)", Icon: "🔥", Style: ui.DangerStyle, Commands: []ui.HelpCommand{
		{Name: "batch-move", Desc: "Bulk move issues from JSON file"},
	}},
}

func init() {
	ghCmd.AddCommand(projectCmd)

	projectCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		output := ui.RenderCozyHelp("gw gh project", "project board operations", projectHelpCategories, true)
		fmt.Print(output)
	})

	// Shared --number flag on all subcommands
	for _, c := range []*cobra.Command{projectViewCmd, projectItemsCmd, projectMoveCmd, projectSetCmd, projectBatchMoveCmd} {
		c.Flags().Int("number", 0, "Project number (or set github.project_number in gw.toml)")
	}

	// project list
	projectCmd.AddCommand(projectListCmd)

	// project view
	projectCmd.AddCommand(projectViewCmd)

	// project items
	projectCmd.AddCommand(projectItemsCmd)

	// project move
	projectMoveCmd.Flags().String("status", "", "Target status column")
	projectCmd.AddCommand(projectMoveCmd)

	// project set
	projectSetCmd.Flags().String("field", "", "Field name")
	projectSetCmd.Flags().String("value", "", "Field value")
	projectCmd.AddCommand(projectSetCmd)

	// project batch-move
	projectBatchMoveCmd.Flags().StringP("file", "f", "", "JSON file with move definitions")
	projectBatchMoveCmd.MarkFlagRequired("file")
	projectBatchMoveCmd.Flags().Bool("dry-run", false, "Preview without executing")
	projectCmd.AddCommand(projectBatchMoveCmd)
}
