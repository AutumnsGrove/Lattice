# Go Testing Guide

## Overview

Go has excellent built-in testing support via the `testing` package. No external frameworks are required for most use cases. The Go testing philosophy emphasizes simplicity, table-driven tests, and treating tests as regular Go code.

**Key principles:**
- Tests live in `*_test.go` files alongside source code
- Test functions start with `Test` prefix
- Use table-driven tests for comprehensive coverage
- Interfaces enable easy mocking without external libraries

**See also**: [testing_python.md](testing_python.md) for Python, [testing_javascript.md](testing_javascript.md) for JS/TS, [testing_rust.md](testing_rust.md) for Rust.

---

## Quick Reference

```bash
# Run all tests
go test ./...

# Run tests in current package
go test

# Run specific test
go test -run TestUserCreate

# Run tests matching pattern
go test -run "TestUser.*"

# Verbose output
go test -v ./...

# With coverage
go test -cover ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Run benchmarks
go test -bench=. ./...

# Run with race detector
go test -race ./...

# Short mode (skip long tests)
go test -short ./...

# Timeout
go test -timeout 30s ./...
```

---

## Basic Test Structure

### Simple Test

```go
// math.go
package math

func Add(a, b int) int {
    return a + b
}

// math_test.go
package math

import "testing"

func TestAdd(t *testing.T) {
    result := Add(2, 3)
    expected := 5

    if result != expected {
        t.Errorf("Add(2, 3) = %d; want %d", result, expected)
    }
}
```

### Test Function Signatures

```go
func TestXxx(t *testing.T)      // Regular test
func BenchmarkXxx(b *testing.B) // Benchmark
func ExampleXxx()               // Example (appears in docs)
func FuzzXxx(f *testing.F)      // Fuzz test (Go 1.18+)
```

---

## Table-Driven Tests

The idiomatic Go approach for testing multiple cases:

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -1, -1, -2},
        {"mixed signs", -1, 5, 4},
        {"zeros", 0, 0, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d",
                    tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

### With Error Cases

```go
func TestDivide(t *testing.T) {
    tests := []struct {
        name      string
        a, b      int
        expected  int
        wantError bool
    }{
        {"valid division", 10, 2, 5, false},
        {"division by zero", 10, 0, 0, true},
        {"negative result", -10, 2, -5, false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result, err := Divide(tt.a, tt.b)

            if tt.wantError {
                if err == nil {
                    t.Error("expected error, got nil")
                }
                return
            }

            if err != nil {
                t.Errorf("unexpected error: %v", err)
            }

            if result != tt.expected {
                t.Errorf("Divide(%d, %d) = %d; want %d",
                    tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

---

## Subtests

Subtests allow grouping and selective test execution:

```go
func TestUserService(t *testing.T) {
    t.Run("Create", func(t *testing.T) {
        t.Run("with valid data", func(t *testing.T) {
            // test implementation
        })

        t.Run("with invalid email", func(t *testing.T) {
            // test implementation
        })
    })

    t.Run("Delete", func(t *testing.T) {
        // ...
    })
}

// Run specific subtest:
// go test -run "TestUserService/Create/with_valid_data"
```

### Parallel Subtests

```go
func TestAPIEndpoints(t *testing.T) {
    tests := []struct {
        name     string
        endpoint string
        status   int
    }{
        {"health", "/health", 200},
        {"users", "/api/users", 200},
        {"not found", "/invalid", 404},
    }

    for _, tt := range tests {
        tt := tt // capture range variable
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel() // run in parallel

            resp := makeRequest(tt.endpoint)
            if resp.StatusCode != tt.status {
                t.Errorf("GET %s = %d; want %d",
                    tt.endpoint, resp.StatusCode, tt.status)
            }
        })
    }
}
```

---

## Test Helpers

### Helper Functions

```go
// Mark as helper so line numbers point to caller
func assertEqual(t *testing.T, got, want int) {
    t.Helper()
    if got != want {
        t.Errorf("got %d; want %d", got, want)
    }
}

func assertNoError(t *testing.T, err error) {
    t.Helper()
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
}

func assertError(t *testing.T, err error, contains string) {
    t.Helper()
    if err == nil {
        t.Fatal("expected error, got nil")
    }
    if !strings.Contains(err.Error(), contains) {
        t.Errorf("error %q should contain %q", err.Error(), contains)
    }
}
```

### Setup and Teardown

```go
func TestDatabase(t *testing.T) {
    // Setup
    db := setupTestDB(t)

    // Teardown (runs after test completes)
    t.Cleanup(func() {
        db.Close()
    })

    // Test code
    user, err := db.CreateUser("test@example.com")
    assertNoError(t, err)
    assertEqual(t, user.Email, "test@example.com")
}

func setupTestDB(t *testing.T) *Database {
    t.Helper()
    db, err := NewDatabase(":memory:")
    if err != nil {
        t.Fatalf("failed to create test db: %v", err)
    }
    return db
}
```

### TestMain for Package-Level Setup

```go
func TestMain(m *testing.M) {
    // Setup before all tests
    setup()

    // Run tests
    code := m.Run()

    // Teardown after all tests
    teardown()

    os.Exit(code)
}

func setup() {
    // Initialize test database, environment, etc.
}

func teardown() {
    // Cleanup resources
}
```

---

## Mocking with Interfaces

Go's interface system enables clean mocking without external libraries:

```go
// Define interface for dependencies
type UserRepository interface {
    FindByID(id string) (*User, error)
    Save(user *User) error
}

// Production implementation
type PostgresUserRepo struct {
    db *sql.DB
}

func (r *PostgresUserRepo) FindByID(id string) (*User, error) {
    // Real database query
}

// Mock implementation for tests
type MockUserRepo struct {
    FindByIDFunc func(id string) (*User, error)
    SaveFunc     func(user *User) error
}

func (m *MockUserRepo) FindByID(id string) (*User, error) {
    return m.FindByIDFunc(id)
}

func (m *MockUserRepo) Save(user *User) error {
    return m.SaveFunc(user)
}

// Service that depends on interface
type UserService struct {
    repo UserRepository
}

// Test with mock
func TestUserService_GetUser(t *testing.T) {
    expectedUser := &User{ID: "123", Email: "test@example.com"}

    mock := &MockUserRepo{
        FindByIDFunc: func(id string) (*User, error) {
            if id != "123" {
                t.Errorf("unexpected id: %s", id)
            }
            return expectedUser, nil
        },
    }

    service := &UserService{repo: mock}
    user, err := service.GetUser("123")

    assertNoError(t, err)
    if user.Email != expectedUser.Email {
        t.Errorf("got %s; want %s", user.Email, expectedUser.Email)
    }
}
```

---

## Testing HTTP Handlers

### Using httptest

```go
import (
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestHealthHandler(t *testing.T) {
    // Create request
    req := httptest.NewRequest("GET", "/health", nil)

    // Create response recorder
    rr := httptest.NewRecorder()

    // Call handler
    handler := http.HandlerFunc(HealthHandler)
    handler.ServeHTTP(rr, req)

    // Check status
    if rr.Code != http.StatusOK {
        t.Errorf("status = %d; want %d", rr.Code, http.StatusOK)
    }

    // Check body
    expected := `{"status":"ok"}`
    if rr.Body.String() != expected {
        t.Errorf("body = %s; want %s", rr.Body.String(), expected)
    }
}

func TestCreateUserHandler(t *testing.T) {
    body := strings.NewReader(`{"email":"test@example.com"}`)
    req := httptest.NewRequest("POST", "/users", body)
    req.Header.Set("Content-Type", "application/json")

    rr := httptest.NewRecorder()
    handler := http.HandlerFunc(CreateUserHandler)
    handler.ServeHTTP(rr, req)

    if rr.Code != http.StatusCreated {
        t.Errorf("status = %d; want %d", rr.Code, http.StatusCreated)
    }
}
```

### Testing Full Server

```go
func TestAPIServer(t *testing.T) {
    // Create test server
    server := httptest.NewServer(NewRouter())
    defer server.Close()

    // Make requests to test server
    resp, err := http.Get(server.URL + "/health")
    if err != nil {
        t.Fatalf("request failed: %v", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        t.Errorf("status = %d; want %d", resp.StatusCode, http.StatusOK)
    }
}
```

---

## Benchmarks

```go
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Add(2, 3)
    }
}

// With setup that shouldn't be timed
func BenchmarkProcess(b *testing.B) {
    data := generateTestData(1000)
    b.ResetTimer() // Reset after setup

    for i := 0; i < b.N; i++ {
        Process(data)
    }
}

// Benchmark with different sizes
func BenchmarkSort(b *testing.B) {
    sizes := []int{10, 100, 1000, 10000}

    for _, size := range sizes {
        b.Run(fmt.Sprintf("size-%d", size), func(b *testing.B) {
            data := generateRandomSlice(size)
            b.ResetTimer()

            for i := 0; i < b.N; i++ {
                Sort(data)
            }
        })
    }
}

// Run: go test -bench=. -benchmem
```

---

## Fuzz Testing (Go 1.18+)

```go
func FuzzParseJSON(f *testing.F) {
    // Add seed corpus
    f.Add([]byte(`{"name":"test"}`))
    f.Add([]byte(`{}`))
    f.Add([]byte(`{"nested":{"key":"value"}}`))

    f.Fuzz(func(t *testing.T, data []byte) {
        var result map[string]any
        err := json.Unmarshal(data, &result)

        if err == nil {
            // If parsing succeeded, re-encoding should work
            _, err := json.Marshal(result)
            if err != nil {
                t.Errorf("re-encode failed: %v", err)
            }
        }
    })
}

// Run: go test -fuzz=FuzzParseJSON
```

---

## Coverage

```bash
# Show coverage percentage
go test -cover ./...

# Generate coverage profile
go test -coverprofile=coverage.out ./...

# View in browser
go tool cover -html=coverage.out

# Coverage by function
go tool cover -func=coverage.out

# Coverage for specific package
go test -cover -coverprofile=coverage.out ./pkg/...
```

### Coverage in CI

```yaml
# GitHub Actions
- name: Test with coverage
  run: go test -coverprofile=coverage.out ./...

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: coverage.out
```

---

## Test Organization

### Directory Structure

```
project/
├── go.mod
├── main.go
├── internal/
│   ├── user/
│   │   ├── user.go
│   │   ├── user_test.go        # Unit tests
│   │   └── repository.go
│   └── api/
│       ├── handler.go
│       └── handler_test.go
├── pkg/
│   └── utils/
│       ├── utils.go
│       └── utils_test.go
└── test/
    └── integration/            # Integration tests
        └── api_test.go
```

### Build Tags for Test Types

```go
//go:build integration

package integration

// Integration tests that require external services
func TestDatabaseIntegration(t *testing.T) {
    // ...
}

// Run: go test -tags=integration ./test/integration/
```

---

## Common Patterns

### Testing Errors

```go
func TestReadFile(t *testing.T) {
    t.Run("file not found", func(t *testing.T) {
        _, err := ReadFile("nonexistent.txt")
        if err == nil {
            t.Error("expected error for missing file")
        }

        // Check specific error type
        if !errors.Is(err, os.ErrNotExist) {
            t.Errorf("expected ErrNotExist, got %v", err)
        }
    })
}
```

### Testing with Temporary Files

```go
func TestFileProcessor(t *testing.T) {
    // Create temp directory (auto-cleaned)
    dir := t.TempDir()

    // Create test file
    testFile := filepath.Join(dir, "test.txt")
    err := os.WriteFile(testFile, []byte("test content"), 0644)
    if err != nil {
        t.Fatalf("failed to create test file: %v", err)
    }

    // Test
    result, err := ProcessFile(testFile)
    assertNoError(t, err)
    assertEqual(t, result.WordCount, 2)
}
```

### Testing Context Cancellation

```go
func TestWithContext(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
    defer cancel()

    result, err := SlowOperation(ctx)

    if !errors.Is(err, context.DeadlineExceeded) {
        t.Errorf("expected timeout, got: %v", err)
    }
}
```

### Skipping Tests

```go
func TestRequiresNetwork(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping network test in short mode")
    }
    // ... network-dependent test
}

func TestRequiresDocker(t *testing.T) {
    if os.Getenv("DOCKER_HOST") == "" {
        t.Skip("docker not available")
    }
    // ...
}
```

---

## Popular Testing Libraries

While the standard library covers most needs, these are useful additions:

```go
// testify - assertions and mocking
import "github.com/stretchr/testify/assert"
assert.Equal(t, expected, actual)
assert.NoError(t, err)

// gomock - interface mocking
//go:generate mockgen -source=repo.go -destination=mock_repo.go

// go-cmp - deep comparison
import "github.com/google/go-cmp/cmp"
if diff := cmp.Diff(want, got); diff != "" {
    t.Errorf("mismatch (-want +got):\n%s", diff)
}
```

---

## Troubleshooting

**Tests not running**
- Ensure file ends with `_test.go`
- Function must start with `Test` and take `*testing.T`
- Must be in same package or `package x_test`

**Flaky tests**
- Check for race conditions: `go test -race`
- Avoid time-dependent assertions
- Use `t.Parallel()` carefully

**Slow tests**
- Use `-short` flag and `testing.Short()` to skip slow tests
- Run specific tests: `go test -run TestName`
- Profile with: `go test -cpuprofile=cpu.out`

---

## Related Guides

- **[testing_python.md](testing_python.md)** - Python testing with pytest
- **[testing_javascript.md](testing_javascript.md)** - JavaScript/TypeScript testing
- **[testing_rust.md](testing_rust.md)** - Rust testing
- **[multi_language_guide.md](multi_language_guide.md)** - Go project setup and patterns
- **[ci_cd_patterns.md](ci_cd_patterns.md)** - CI/CD pipelines

---

*Last updated: 2025-11-28*
