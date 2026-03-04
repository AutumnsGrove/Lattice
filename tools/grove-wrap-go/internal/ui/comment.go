package ui

import (
	"fmt"
	"strings"
)

// CommentItem represents a single comment in a thread.
type CommentItem struct {
	Author string
	Date   string
	Body   string
}

// RenderCommentThread renders a bordered panel containing a list of comments
// with author/date headers and horizontal separators between entries.
func RenderCommentThread(title string, comments []CommentItem) string {
	if len(comments) == 0 {
		return RenderPanel(title, HintStyle.Render("No comments"))
	}

	var parts []string
	for i, c := range comments {
		header := fmt.Sprintf("%s  %s",
			CommandStyle.Render(c.Author),
			HintStyle.Render(c.Date),
		)
		parts = append(parts, header)
		if c.Body != "" {
			parts = append(parts, c.Body)
		}
		if i < len(comments)-1 {
			parts = append(parts, HintStyle.Render("───────────────────────────────────"))
		}
	}

	w := TermWidth()
	content := strings.Join(parts, "\n")
	panel := PanelStyle.MaxWidth(w).Render(content)
	titleLine := PanelTitleStyle.Render(title)
	return titleLine + "\n" + panel + "\n"
}
