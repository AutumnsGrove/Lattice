package ui

import (
	"os"

	"github.com/charmbracelet/log"
)

// Logger is the global structured logger for gw.
var Logger = log.NewWithOptions(os.Stderr, log.Options{
	ReportTimestamp: false,
})

// SetVerbose enables debug-level logging.
func SetVerbose(v bool) {
	if v {
		Logger.SetLevel(log.DebugLevel)
	} else {
		Logger.SetLevel(log.InfoLevel)
	}
}

// SetPlain disables styling for agent/JSON mode.
func SetPlain(plain bool) {
	if plain {
		Logger.SetStyles(log.DefaultStyles())
	}
}
