.PHONY: build install clean test lint dist release

BINARY := gw
MODULE := github.com/AutumnsGrove/Lattice/tools/grove-wrap-go
VERSION := $(shell git describe --tags --match 'gw/v*' --always --dirty 2>/dev/null || echo "dev")
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
	GOOS=linux GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/gw-linux-x86_64 .
	GOOS=linux GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o dist/gw-linux-arm64 .
	GOOS=darwin GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o dist/gw-darwin-arm64 .
	GOOS=windows GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o dist/gw-windows-x86_64.exe .

# Tag and push a release (triggers CI build + GitHub Release)
# Usage: make release TAG=v1.1.0
release:
	@if [ -z "$(TAG)" ]; then echo "Usage: make release TAG=v1.1.0"; exit 1; fi
	@if [ -n "$$(git status --porcelain)" ]; then echo "Working tree is dirty — commit or stash first"; exit 1; fi
	git tag -a "gw/$(TAG)" -m "gw $(TAG)"
	git push origin "gw/$(TAG)"
	@echo ""
	@echo "Tagged gw/$(TAG) — release workflow running"
	@echo "Watch: gh run list --repo AutumnsGrove/Lattice --limit 2"
