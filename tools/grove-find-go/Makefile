.PHONY: build install clean test lint dist release

BINARY := gf
MODULE := github.com/AutumnsGrove/Lattice/tools/grove-find-go
VERSION := $(shell git describe --tags --match 'gf/v*' --always --dirty 2>/dev/null || echo "dev")
LDFLAGS := -s -w -X $(MODULE)/cmd.Version=$(VERSION)

build:
	go build -ldflags "$(LDFLAGS)" -o $(BINARY) .

install:
	go build -ldflags "$(LDFLAGS)" -o ~/.local/bin/$(BINARY) .

clean:
	rm -f $(BINARY)
	rm -f dist/*

test:
	go test ./...

lint:
	go vet ./...

# Cross-compile for all supported platforms
dist:
	GOOS=linux GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/gf-linux-x86_64 .
	GOOS=linux GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o dist/gf-linux-arm64 .
	GOOS=darwin GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o dist/gf-darwin-arm64 .
	GOOS=windows GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/gf-windows-x86_64.exe .

# Tag and push a release (triggers CI build + GitHub Release)
# Usage: make release TAG=v1.1.0
release:
	@if [ -z "$(TAG)" ]; then echo "Usage: make release TAG=v1.1.0"; exit 1; fi
	@if [ -n "$$(git status --porcelain)" ]; then echo "Working tree is dirty — commit or stash first"; exit 1; fi
	git tag -a "gf/$(TAG)" -m "gf $(TAG)"
	git push origin "gf/$(TAG)"
	@echo ""
	@echo "Tagged gf/$(TAG) — release workflow running"
	@echo "Watch: gh run list --repo AutumnsGrove/Lattice --limit 2"
