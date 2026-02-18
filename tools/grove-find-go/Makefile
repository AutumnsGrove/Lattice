.PHONY: build install clean test

BINARY := gf
MODULE := github.com/AutumnsGrove/Lattice/tools/grove-find-go

build:
	go build -o $(BINARY) .

install:
	go build -o ~/.local/bin/$(BINARY) .

clean:
	rm -f $(BINARY)

test:
	go test ./...

lint:
	go vet ./...
