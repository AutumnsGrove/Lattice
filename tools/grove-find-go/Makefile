.PHONY: build install clean test

BINARY := gf
MODULE := github.com/AutumnsGrove/GroveEngine/tools/grove-find-go

build:
	go build -o $(BINARY) .

install:
	go install .

clean:
	rm -f $(BINARY)

test:
	go test ./...

lint:
	go vet ./...
