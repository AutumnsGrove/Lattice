package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-find-go/internal/nlp"
)

func main() {
	config.Init("", false, false, false, false, 50)
	chunks, err := nlp.WalkAndChunk()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	byExt := make(map[string]int)
	filesByExt := make(map[string]int)
	seenFiles := make(map[string]bool)
	for _, c := range chunks {
		ext := strings.ToLower(filepath.Ext(c.FilePath))
		byExt[ext]++
		if !seenFiles[c.FilePath] {
			seenFiles[c.FilePath] = true
			filesByExt[ext]++
		}
	}

	type entry struct {
		ext    string
		chunks int
		files  int
	}
	var entries []entry
	for ext, count := range byExt {
		entries = append(entries, entry{ext, count, filesByExt[ext]})
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].chunks > entries[j].chunks })

	fmt.Printf("%-10s %8s %8s %8s\n", "EXT", "CHUNKS", "FILES", "RATIO")
	total := 0
	for _, e := range entries {
		ratio := float64(e.chunks) / float64(e.files)
		fmt.Printf("%-10s %8d %8d %8.1f\n", e.ext, e.chunks, e.files, ratio)
		total += e.chunks
	}
	fmt.Printf("%-10s %8d %8d\n", "TOTAL", total, len(seenFiles))
}
