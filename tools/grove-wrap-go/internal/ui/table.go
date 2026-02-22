package ui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/lipgloss/table"
)

// RenderTable renders a Grove-themed table with a title, headers, and rows.
// Returns an empty-state message if rows is empty.
func RenderTable(title string, headers []string, rows [][]string) string {
	var b strings.Builder

	if title != "" {
		b.WriteString(PanelTitleStyle.Render(title))
		b.WriteString("\n\n")
	}

	if len(rows) == 0 {
		b.WriteString(HintStyle.Render("  No data"))
		b.WriteString("\n")
		return b.String()
	}

	t := table.New().
		Border(lipgloss.RoundedBorder()).
		BorderStyle(TableBorderStyle).
		Headers(headers...).
		Rows(rows...).
		StyleFunc(func(row, col int) lipgloss.Style {
			if row == table.HeaderRow {
				return TableHeaderStyle
			}
			if row%2 == 0 {
				return TableRowEvenStyle
			}
			return TableRowOddStyle
		})

	b.WriteString(t.String())
	b.WriteString("\n")
	return b.String()
}

// RenderSimpleTable renders a table without a title.
func RenderSimpleTable(headers []string, rows [][]string) string {
	return RenderTable("", headers, rows)
}

// RenderPlainTable renders a tab-separated fallback for plain/agent mode.
func RenderPlainTable(headers []string, rows [][]string) string {
	var b strings.Builder
	b.WriteString(strings.Join(headers, "\t"))
	b.WriteString("\n")
	for _, row := range rows {
		b.WriteString(strings.Join(row, "\t"))
		b.WriteString("\n")
	}
	return b.String()
}
