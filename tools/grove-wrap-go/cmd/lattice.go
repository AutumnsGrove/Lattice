package cmd

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/lattice"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// getLatticeClient creates an authenticated Lattice client using the
// saved token and configured tenant.
func getLatticeClient() (*lattice.Client, error) {
	token, err := getGroveToken()
	if err != nil {
		return nil, err
	}

	cfg := config.Get()
	tenant := cfg.Grove.Tenant
	if tenant == "" {
		return nil, fmt.Errorf("no tenant configured — run `gw config tenant <name>` first")
	}

	return lattice.NewClient(token, tenant, cfg.Grove.LatticeBaseURL), nil
}

// ── gw lattice ──────────────────────────────────────────────────────

var latticeCmd = &cobra.Command{
	Use:     "lattice",
	Aliases: []string{"blog"},
	Short:   "Lattice blog management",
	Long:    "Manage blog posts on your Grove Lattice site.",
}

var latticePostsCmd = &cobra.Command{
	Use:   "posts",
	Short: "Blog post operations",
}

// ── lattice posts list ──────────────────────────────────────────────

var latticePostsListCmd = &cobra.Command{
	Use:   "list",
	Short: "List blog posts",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		client, err := getLatticeClient()
		if err != nil {
			return err
		}

		status, _ := cmd.Flags().GetString("status")
		limit, _ := cmd.Flags().GetInt("limit")

		posts, err := client.ListPosts(lattice.ListOptions{
			Status: status,
			Limit:  limit,
		})
		if err != nil {
			return fmt.Errorf("failed to list posts: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]any{
				"posts": posts,
				"count": len(posts),
			})
			fmt.Println(string(data))
			return nil
		}

		if len(posts) == 0 {
			ui.Info("No posts found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Posts (%d)", len(posts)))
		fmt.Println()
		for _, p := range posts {
			statusBadge := formatPostStatus(p.Status)
			date := truncDate(p.UpdatedAt)
			fmt.Printf("  %s  %-40s  %s  %s\n",
				statusBadge,
				ui.CommandStyle.Render(truncateStr(p.Title, 40)),
				ui.HintStyle.Render(p.Slug),
				ui.HintStyle.Render(date),
			)
		}
		fmt.Println()
		return nil
	},
}

// ── lattice posts get ───────────────────────────────────────────────

var latticePostsGetCmd = &cobra.Command{
	Use:   "get <slug>",
	Short: "Get a single post by slug",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		client, err := getLatticeClient()
		if err != nil {
			return err
		}

		post, err := client.GetPost(args[0])
		if err != nil {
			return fmt.Errorf("failed to get post: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(post)
			fmt.Println(string(data))
			return nil
		}

		pairs := [][2]string{
			{"title", post.Title},
			{"slug", post.Slug},
			{"status", post.Status},
			{"created", truncDate(post.CreatedAt)},
			{"updated", truncDate(post.UpdatedAt)},
		}
		if post.PublishedAt != "" {
			pairs = append(pairs, [2]string{"published", truncDate(post.PublishedAt)})
		}
		if post.Author != nil {
			pairs = append(pairs, [2]string{"author", post.Author.Name})
		}
		if len(post.Tags) > 0 {
			pairs = append(pairs, [2]string{"tags", strings.Join(post.Tags, ", ")})
		}
		fmt.Print(ui.RenderInfoPanel("post", pairs))

		if post.Content != "" {
			fmt.Println()
			fmt.Println(post.Content)
		}
		return nil
	},
}

// ── lattice posts create ────────────────────────────────────────────

var latticePostsCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new blog post",
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("lattice_posts_create"); err != nil {
			return err
		}
		cfg := config.Get()
		client, err := getLatticeClient()
		if err != nil {
			return err
		}

		title, _ := cmd.Flags().GetString("title")
		content, _ := cmd.Flags().GetString("content")
		status, _ := cmd.Flags().GetString("status")
		tagsStr, _ := cmd.Flags().GetString("tags")

		if title == "" {
			return fmt.Errorf("--title is required")
		}

		data := lattice.CreatePostData{
			Title:   title,
			Content: content,
			Status:  status,
		}
		if tagsStr != "" {
			data.Tags = strings.Split(tagsStr, ",")
			for i := range data.Tags {
				data.Tags[i] = strings.TrimSpace(data.Tags[i])
			}
		}

		post, err := client.CreatePost(data)
		if err != nil {
			return fmt.Errorf("failed to create post: %w", err)
		}

		if cfg.JSONMode {
			out, _ := json.Marshal(post)
			fmt.Println(string(out))
		} else {
			ui.Success(fmt.Sprintf("Created post: %s (%s)", post.Title, post.Slug))
		}
		return nil
	},
}

// ── lattice posts update ────────────────────────────────────────────

var latticePostsUpdateCmd = &cobra.Command{
	Use:   "update <slug>",
	Short: "Update an existing post",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("lattice_posts_update"); err != nil {
			return err
		}
		cfg := config.Get()
		client, err := getLatticeClient()
		if err != nil {
			return err
		}

		data := lattice.UpdatePostData{}
		if cmd.Flags().Changed("title") {
			v, _ := cmd.Flags().GetString("title")
			data.Title = v
		}
		if cmd.Flags().Changed("content") {
			v, _ := cmd.Flags().GetString("content")
			data.Content = v
		}
		if cmd.Flags().Changed("status") {
			v, _ := cmd.Flags().GetString("status")
			data.Status = v
		}
		if cmd.Flags().Changed("tags") {
			v, _ := cmd.Flags().GetString("tags")
			tags := strings.Split(v, ",")
			for i := range tags {
				tags[i] = strings.TrimSpace(tags[i])
			}
			data.Tags = tags
		}

		post, err := client.UpdatePost(args[0], data)
		if err != nil {
			return fmt.Errorf("failed to update post: %w", err)
		}

		if cfg.JSONMode {
			out, _ := json.Marshal(post)
			fmt.Println(string(out))
		} else {
			ui.Success(fmt.Sprintf("Updated post: %s (%s)", post.Title, post.Slug))
		}
		return nil
	},
}

// ── lattice posts delete ────────────────────────────────────────────

var latticePostsDeleteCmd = &cobra.Command{
	Use:   "delete <slug>",
	Short: "Delete a blog post",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if err := requireCFSafety("lattice_posts_delete"); err != nil {
			return err
		}
		cfg := config.Get()
		client, err := getLatticeClient()
		if err != nil {
			return err
		}

		slug := args[0]
		if err := client.DeletePost(slug); err != nil {
			return fmt.Errorf("failed to delete post: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]any{"deleted": true, "slug": slug})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Deleted post: %s", slug))
		}
		return nil
	},
}

// ── lattice drafts ──────────────────────────────────────────────────

var latticeDraftsCmd = &cobra.Command{
	Use:   "drafts",
	Short: "List draft posts",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		client, err := getLatticeClient()
		if err != nil {
			return err
		}

		posts, err := client.ListDrafts()
		if err != nil {
			return fmt.Errorf("failed to list drafts: %w", err)
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]any{
				"drafts": posts,
				"count":  len(posts),
			})
			fmt.Println(string(data))
			return nil
		}

		if len(posts) == 0 {
			ui.Info("No drafts found")
			return nil
		}

		ui.PrintHeader(fmt.Sprintf("Drafts (%d)", len(posts)))
		fmt.Println()
		for _, p := range posts {
			date := truncDate(p.UpdatedAt)
			fmt.Printf("  %s  %s  %s\n",
				ui.CommandStyle.Render(truncateStr(p.Title, 40)),
				ui.HintStyle.Render(p.Slug),
				ui.HintStyle.Render(date),
			)
		}
		fmt.Println()
		return nil
	},
}

// ── Helpers ─────────────────────────────────────────────────────────

func formatPostStatus(status string) string {
	switch status {
	case "published":
		return ui.SafeReadStyle.Render("published")
	case "draft":
		return ui.WarningStyle.Render("draft    ")
	case "scheduled":
		return ui.InfoStyle.Render("scheduled")
	default:
		return ui.HintStyle.Render(status)
	}
}

func truncateStr(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max-1] + "…"
}

// ── Cozy Help ───────────────────────────────────────────────────────

var latticeHelpCategories = []ui.HelpCategory{
	{
		Title: "Read (Always Safe)",
		Icon:  "📖",
		Style: ui.SafeReadStyle,
		Commands: []ui.HelpCommand{
			{Name: "posts list", Desc: "List blog posts (filter by status)"},
			{Name: "posts get", Desc: "Get a single post by slug"},
			{Name: "drafts", Desc: "List draft posts"},
		},
	},
	{
		Title: "Write (--write)",
		Icon:  "✏️",
		Style: ui.SafeWriteStyle,
		Commands: []ui.HelpCommand{
			{Name: "posts create", Desc: "Create a new blog post"},
			{Name: "posts update", Desc: "Update an existing post"},
		},
	},
	{
		Title: "Dangerous (--write --force)",
		Icon:  "🔥",
		Style: ui.DangerStyle,
		Commands: []ui.HelpCommand{
			{Name: "posts delete", Desc: "Delete a blog post permanently"},
		},
	},
}

// ── Registration ────────────────────────────────────────────────────

func init() {
	rootCmd.AddCommand(latticeCmd)

	latticeCmd.SetHelpFunc(func(cmd *cobra.Command, args []string) {
		if cmd != latticeCmd {
			fmt.Println(cmd.UsageString())
			return
		}
		output := ui.RenderCozyHelp(
			"gw lattice",
			"blog management for your grove",
			latticeHelpCategories,
			true,
		)
		fmt.Print(output)
	})

	// posts subcommands
	latticeCmd.AddCommand(latticePostsCmd)
	latticePostsCmd.AddCommand(latticePostsListCmd)
	latticePostsCmd.AddCommand(latticePostsGetCmd)
	latticePostsCmd.AddCommand(latticePostsCreateCmd)
	latticePostsCmd.AddCommand(latticePostsUpdateCmd)
	latticePostsCmd.AddCommand(latticePostsDeleteCmd)

	// posts list flags
	latticePostsListCmd.Flags().String("status", "all", "Filter by status: draft, published, all")
	latticePostsListCmd.Flags().Int("limit", 25, "Maximum posts to return")

	// posts create flags
	latticePostsCreateCmd.Flags().String("title", "", "Post title (required)")
	latticePostsCreateCmd.Flags().String("content", "", "Post content (markdown)")
	latticePostsCreateCmd.Flags().String("status", "draft", "Post status: draft or published")
	latticePostsCreateCmd.Flags().String("tags", "", "Comma-separated tags")

	// posts update flags
	latticePostsUpdateCmd.Flags().String("title", "", "New title")
	latticePostsUpdateCmd.Flags().String("content", "", "New content")
	latticePostsUpdateCmd.Flags().String("status", "", "New status: draft, published, scheduled")
	latticePostsUpdateCmd.Flags().String("tags", "", "New comma-separated tags")

	// drafts shortcut
	latticeCmd.AddCommand(latticeDraftsCmd)
	latticeDraftsCmd.Flags().Int("limit", 20, "Maximum drafts to return")
}
