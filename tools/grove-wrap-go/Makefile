.PHONY: build install clean test lint dist

BINARY := gw
MODULE := github.com/AutumnsGrove/Lattice/tools/grove-wrap-go
VERSION := 0.1.0
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
