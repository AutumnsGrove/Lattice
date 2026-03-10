package cmd

import (
	"fmt"
	"os"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"golang.org/x/term"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// browseItem wraps a domain-specific item for the generic browser.
type browseItem struct {
	Labels []string // used for label-based filtering and skill suggestions
	Data   any      // domain-specific data (browseIssue, browsePR, etc.)
}

// browseAction defines a domain-specific keybinding in the browser.
type browseAction struct {
	Key     string             // keybinding (e.g., "W", "C")
	Hint    string             // footer hint text (e.g., "W tree")
	Inline  bool               // true = execute without quitting TUI
	Handler func(data any) error
}

// browseConfig configures the generic browser for a specific domain.
type browseConfig struct {
	Title        string                                    // e.g., "Issue Browser"
	CountLabel   string                                    // e.g., "issues", "pull requests"
	RenderRow    func(data any, width int) string          // render a single list row
	RenderDetail func(data any) string                     // render detail view (nil = no detail)
	FetchDetail  func(data any) any                        // fetch full details on 'v' (nil = no fetch)
	Actions      []browseAction                            // domain-specific keybindings
	FetchMore    func(currentCount int) ([]browseItem, error) // pagination (nil = disabled)
	AllLoaded    bool                                      // true if initial fetch returned all items
	FilterMatch  func(data any, query string) bool         // custom filter (nil = label filter)
	OnSkill      func(skillName string, data any) error    // skill dispatch (nil = no skills)
	OnBoardSkill func(skillName string) error              // board-scoped skill dispatch
}

// --- Bubble Tea messages ---

type itemsFetchedMsg struct {
	items []browseItem
	err   error
}

// --- Model ---

type browseModel struct {
	config       browseConfig
	items        []browseItem
	filtered     []int // indices into items that match filter
	cursor       int
	offset       int
	pageSize     int
	filter       string
	filterBuf    string
	filtering    bool
	detailIdx    int // index into items, -1 = no detail
	showHelp     bool
	helpOffset   int
	showSettings bool
	settings     *tuiSettings
	width        int
	height       int
	err          error
	quitting     bool

	// Post-quit action state
	pendingAction string // action key, "skill", or "board-skill"
	pendingSkill  string
	pendingIdx    int // index into items (-1 = none)

	allLoaded bool
	loading   bool
}

func newBrowseModel(items []browseItem, pageSize int, config browseConfig) browseModel {
	w, h, err := term.GetSize(int(os.Stdout.Fd()))
	if err != nil {
		w, h = 80, 24
	}

	filtered := make([]int, len(items))
	for i := range items {
		filtered[i] = i
	}

	allLoaded := config.FetchMore == nil || config.AllLoaded

	return browseModel{
		config:     config,
		items:      items,
		filtered:   filtered,
		pageSize:   pageSize,
		width:      w,
		height:     h,
		detailIdx:  -1,
		pendingIdx: -1,
		allLoaded:  allLoaded,
	}
}

func (m browseModel) Init() tea.Cmd { return nil }

// selectedItem returns the currently highlighted item, or nil if none.
func (m browseModel) selectedItem() *browseItem {
	if m.cursor >= 0 && m.cursor < len(m.filtered) {
		return &m.items[m.filtered[m.cursor]]
	}
	return nil
}

func (m browseModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case itemsFetchedMsg:
		m.loading = false
		if msg.err != nil {
			m.err = msg.err
			return m, nil
		}
		if len(msg.items) <= len(m.items) {
			m.allLoaded = true
			return m, nil
		}
		m.items = msg.items
		m.applyFilter()
		return m, nil

	case tea.KeyMsg:
		// Help overlay — scroll with j/k, dismiss with any other key
		if m.showHelp {
			switch msg.String() {
			case "j", "down":
				m.helpOffset++
			case "k", "up":
				if m.helpOffset > 0 {
					m.helpOffset--
				}
			case "pgdown":
				m.helpOffset += m.height - 2
			case "pgup":
				m.helpOffset -= m.height - 2
				if m.helpOffset < 0 {
					m.helpOffset = 0
				}
			default:
				m.showHelp = false
				m.helpOffset = 0
			}
			return m, nil
		}

		// Settings overlay — delegate to settings handler
		if m.showSettings {
			if m.settings.handleKey(msg.String()) {
				m.showSettings = false
			}
			return m, nil
		}

		// Detail view mode — only accept dismiss keys
		if m.detailIdx >= 0 {
			switch msg.String() {
			case "q", "esc":
				m.detailIdx = -1
			}
			return m, nil
		}

		// Filter input mode
		if m.filtering {
			switch msg.String() {
			case "enter":
				m.filter = m.filterBuf
				m.applyFilter()
				m.filtering = false
			case "esc":
				m.filterBuf = ""
				m.filtering = false
			case "backspace":
				if len(m.filterBuf) > 0 {
					m.filterBuf = m.filterBuf[:len(m.filterBuf)-1]
				}
			default:
				if len(msg.String()) == 1 {
					m.filterBuf += msg.String()
				}
			}
			return m, nil
		}

		// Normal list mode
		key := msg.String()

		switch key {
		case "q", "ctrl+c":
			m.quitting = true
			return m, tea.Quit

		case "j", "down":
			if m.cursor < len(m.filtered)-1 {
				m.cursor++
				if m.cursor >= m.offset+m.pageSize {
					m.offset++
				}
			}

		case "k", "up":
			if m.cursor > 0 {
				m.cursor--
				if m.cursor < m.offset {
					m.offset = m.cursor
				}
			}

		case "pgdown":
			m.cursor += m.pageSize
			if m.cursor >= len(m.filtered) {
				m.cursor = len(m.filtered) - 1
			}
			m.offset = m.cursor - m.pageSize + 1
			if m.offset < 0 {
				m.offset = 0
			}

		case "pgup":
			m.cursor -= m.pageSize
			if m.cursor < 0 {
				m.cursor = 0
			}
			m.offset = m.cursor

		case "v":
			if item := m.selectedItem(); item != nil && m.config.RenderDetail != nil {
				if m.config.FetchDetail != nil {
					item.Data = m.config.FetchDetail(item.Data)
				}
				m.detailIdx = m.filtered[m.cursor]
			}

		case "N":
			if !m.loading && !m.allLoaded && m.config.FetchMore != nil {
				m.loading = true
				fetchMore := m.config.FetchMore
				count := len(m.items)
				return m, func() tea.Msg {
					items, err := fetchMore(count)
					return itemsFetchedMsg{items: items, err: err}
				}
			}

		case "/":
			m.filtering = true
			m.filterBuf = m.filter

		case "?":
			m.showHelp = true

		case ",":
			m.showSettings = true
			if m.settings == nil {
				m.settings = newTUISettings()
			}

		case "esc":
			if m.filter != "" {
				m.filter = ""
				m.filterBuf = ""
				m.applyFilter()
			}

		default:
			// Check domain-specific actions first
			handled := false
			for _, action := range m.config.Actions {
				if key == action.Key {
					if item := m.selectedItem(); item != nil {
						if action.Inline {
							action.Handler(item.Data)
						} else {
							m.pendingAction = action.Key
							m.pendingIdx = m.filtered[m.cursor]
							m.quitting = true
							return m, tea.Quit
						}
					}
					handled = true
					break
				}
			}

			// Check skill hotkeys (only if no domain action matched)
			if !handled {
				if skill, ok := skillByKey[key]; ok {
					if skillScope(skill) == ScopeBoard && m.config.OnBoardSkill != nil {
						m.pendingAction = "board-skill"
						m.pendingSkill = skill.Name
						m.quitting = true
						return m, tea.Quit
					}
					if m.config.OnSkill != nil {
						if item := m.selectedItem(); item != nil {
							m.pendingAction = "skill"
							m.pendingSkill = skill.Name
							m.pendingIdx = m.filtered[m.cursor]
							m.quitting = true
							return m, tea.Quit
						}
					}
				}
			}
		}
	}
	return m, nil
}

func (m *browseModel) applyFilter() {
	if m.filter == "" {
		m.filtered = make([]int, len(m.items))
		for i := range m.items {
			m.filtered[i] = i
		}
	} else {
		var result []int
		for i, item := range m.items {
			if m.config.FilterMatch != nil {
				if m.config.FilterMatch(item.Data, m.filter) {
					result = append(result, i)
				}
			} else {
				// Default: match against item labels
				lower := strings.ToLower(m.filter)
				for _, label := range item.Labels {
					if strings.Contains(strings.ToLower(label), lower) {
						result = append(result, i)
						break
					}
				}
			}
		}
		m.filtered = result
	}
	m.cursor = 0
	m.offset = 0
}

// --- View ---

func (m browseModel) View() string {
	if m.quitting {
		return ""
	}

	if m.showHelp {
		return m.renderHelp()
	}
	if m.showSettings && m.settings != nil {
		return m.settings.render()
	}
	if m.detailIdx >= 0 {
		return m.renderDetail()
	}

	var b strings.Builder

	// Header
	label := m.config.CountLabel
	if label == "" {
		label = "items"
	}
	title := browseHeaderStyle.Render("🌿 " + m.config.Title)
	count := browseHintStyle.Render(fmt.Sprintf("(%d %s)", len(m.filtered), label))
	b.WriteString(title + " " + count + "\n")

	if m.filter != "" {
		b.WriteString(browseFilterStyle.Render(fmt.Sprintf("  filter: %s", m.filter)) + "\n")
	}
	if m.filtering {
		b.WriteString(browseFilterStyle.Render(fmt.Sprintf("  / %s▌", m.filterBuf)) + "\n")
	}
	b.WriteString("\n")

	// Item list
	if len(m.filtered) == 0 {
		b.WriteString(browseHintStyle.Render("  No items match filter\n"))
	} else {
		end := m.offset + m.pageSize
		if end > len(m.filtered) {
			end = len(m.filtered)
		}

		for i := m.offset; i < end; i++ {
			item := m.items[m.filtered[i]]
			line := m.config.RenderRow(item.Data, m.width)

			if i == m.cursor {
				b.WriteString(browseSelectedStyle.Render(line) + "\n")
			} else {
				b.WriteString(browseNormalStyle.Render(line) + "\n")
			}
		}
	}

	// Loading indicator
	if m.loading {
		b.WriteString(browseFilterStyle.Render("  Loading more...") + "\n")
	}

	// Footer hints — wrap to multiple lines based on terminal width
	b.WriteString("\n")
	hints := []string{"j/k nav", "v view"}
	for _, a := range m.config.Actions {
		hints = append(hints, a.Hint)
	}
	baseHints := []string{"/ filter", "? skills", ", settings", "q quit"}
	if !m.allLoaded && m.config.FetchMore != nil {
		baseHints = append([]string{"N more"}, baseHints...)
	}
	hints = append(hints, baseHints...)

	maxWidth := m.width - 4 // leave margin
	if maxWidth < 40 {
		maxWidth = 40
	}
	var lines []string
	current := " "
	for i, h := range hints {
		sep := " • "
		if i == 0 {
			sep = " "
		}
		candidate := current + sep + h
		if len(candidate) > maxWidth && current != " " {
			lines = append(lines, current)
			current = "  " + h
		} else {
			current = candidate
		}
	}
	if current != " " {
		lines = append(lines, current)
	}
	for _, line := range lines {
		b.WriteString(browseHintStyle.Render(line) + "\n")
	}

	// Label-based skill suggestions
	if m.config.OnSkill != nil && len(m.filtered) > 0 {
		item := m.items[m.filtered[m.cursor]]
		suggestions := suggestSkills(item.Labels)
		if len(suggestions) > 0 {
			var parts []string
			for _, s := range suggestions {
				if entry, ok := skillByName[s]; ok {
					parts = append(parts, fmt.Sprintf("[%s] %s", entry.Key, entry.Name))
				}
				if len(parts) >= 2 {
					break
				}
			}
			b.WriteString("\n")
			b.WriteString(browseSuggestStyle.Render("  suggested: " + strings.Join(parts, " or ")))
		}
	}

	return b.String()
}

func (m browseModel) renderDetail() string {
	if m.detailIdx < 0 || m.detailIdx >= len(m.items) {
		return ""
	}
	item := m.items[m.detailIdx]
	detail := m.config.RenderDetail(item.Data)

	var b strings.Builder
	b.WriteString(detail)
	b.WriteString("\n")
	b.WriteString(browseHintStyle.Render("  q/esc back to list"))
	return browseDetailStyle.Render(b.String())
}

func (m browseModel) renderHelp() string {
	var b strings.Builder
	b.WriteString(browseHeaderStyle.Render("🌿 "+m.config.Title+" — Hotkey Reference") + "\n\n")

	// Browser controls
	b.WriteString(browseHelpCatStyle.Render("  Browser") + "\n")
	b.WriteString(fmt.Sprintf("    %s  Navigate           %s  View detail\n",
		browseHelpKeyStyle.Render("j/k"), browseHelpKeyStyle.Render("v")))

	// Domain-specific action pairs
	actions := m.config.Actions
	for i := 0; i < len(actions); i += 2 {
		a1 := actions[i]
		left := fmt.Sprintf("    %s    %-19s",
			browseHelpKeyStyle.Render(a1.Key), a1.Hint)
		if i+1 < len(actions) {
			a2 := actions[i+1]
			b.WriteString(fmt.Sprintf("%s%s    %s\n", left,
				browseHelpKeyStyle.Render(a2.Key), a2.Hint))
		} else {
			b.WriteString(left + "\n")
		}
	}

	b.WriteString(fmt.Sprintf("    %s    Filter by label    %s  Load more\n",
		browseHelpKeyStyle.Render("/"), browseHelpKeyStyle.Render("N")))
	b.WriteString(fmt.Sprintf("    %s    Settings           %s  Quit\n",
		browseHelpKeyStyle.Render(","), browseHelpKeyStyle.Render("q")))
	b.WriteString("\n")

	// Skill categories (only if skills are enabled)
	if m.config.OnSkill != nil {
		for _, cat := range skillCategories {
			b.WriteString(browseHelpCatStyle.Render("  "+cat) + "\n")
			for i := range skillRegistry {
				skill := &skillRegistry[i]
				if skill.Category == cat {
					keyDisplay := skill.Key
					if len(keyDisplay) == 1 && keyDisplay[0] >= 'A' && keyDisplay[0] <= 'Z' {
						keyDisplay = "⇧" + strings.ToLower(keyDisplay)
					}
					scopeTag := ""
					if skillScope(skill) == ScopeBoard {
						scopeTag = " [board]"
					}
					b.WriteString(fmt.Sprintf("    %s  %-24s %s\n",
						browseHelpKeyStyle.Render(fmt.Sprintf("%-3s", keyDisplay)),
						skill.Name+scopeTag,
						browseHintStyle.Render(skill.Purpose)))
				}
			}
		}
		b.WriteString("\n")
		b.WriteString(browseHintStyle.Render("  j/k scroll • any other key to return"))
		b.WriteString("\n")
		b.WriteString(browseHintStyle.Render("  [board] = no item selection needed"))
	}

	return viewportSlice(b.String(), m.helpOffset, m.height)
}

// --- Shared styles (used by all browsers) ---

var (
	browseHeaderStyle = lipgloss.NewStyle().
				Bold(true).
				Foreground(ui.ForestGreen)

	browseSelectedStyle = lipgloss.NewStyle().
				Bold(true).
				Foreground(lipgloss.Color("#ffffff")).
				Background(ui.ForestGreen).
				Padding(0, 1)

	browseNormalStyle = lipgloss.NewStyle().
				Padding(0, 1)

	browseFilterStyle = lipgloss.NewStyle().
				Foreground(ui.SunsetAmber)

	browseLabelStyle = lipgloss.NewStyle().
				Foreground(ui.RiverCyan)

	browseHintStyle = lipgloss.NewStyle().
			Foreground(ui.DimGray)

	browseSuggestStyle = lipgloss.NewStyle().
				Foreground(ui.SunsetAmber).
				Italic(true)

	browseDetailStyle = lipgloss.NewStyle().
				Padding(1, 2)

	browseHelpKeyStyle = lipgloss.NewStyle().
				Foreground(ui.ForestGreen).
				Bold(true)

	browseHelpCatStyle = lipgloss.NewStyle().
				Foreground(ui.SunsetAmber).
				Bold(true)
)

// RunBrowser launches the interactive TUI browser with the given items and config.
func RunBrowser(items []browseItem, pageSize int, config browseConfig) error {
	m := newBrowseModel(items, pageSize, config)
	p := tea.NewProgram(m, tea.WithAltScreen())
	finalModel, err := p.Run()
	if err != nil {
		return err
	}

	final := finalModel.(browseModel)

	// Handle post-quit actions
	switch final.pendingAction {
	case "":
		return nil // clean quit

	case "board-skill":
		if final.config.OnBoardSkill != nil {
			return final.config.OnBoardSkill(final.pendingSkill)
		}
		return launchBoardSkill(final.pendingSkill)

	case "skill":
		if final.pendingIdx >= 0 && final.config.OnSkill != nil {
			return final.config.OnSkill(final.pendingSkill, final.items[final.pendingIdx].Data)
		}

	default:
		// Domain-specific action — find matching handler
		if final.pendingIdx >= 0 {
			for _, a := range final.config.Actions {
				if a.Key == final.pendingAction {
					return a.Handler(final.items[final.pendingIdx].Data)
				}
			}
		}
	}

	return nil
}
