# Rust Testing Guide

## Overview

Rust has first-class testing support built into the language and toolchain. Tests are regular Rust code with the `#[test]` attribute, run via `cargo test`. The testing ecosystem emphasizes correctness, safety, and zero-cost abstractions.

**Key features:**
- Built-in test framework with `cargo test`
- Unit tests live in the same file as source code
- Integration tests in `tests/` directory
- Doc tests in documentation comments
- Property-based testing with `proptest`

**See also**: [testing_python.md](testing_python.md) for Python, [testing_javascript.md](testing_javascript.md) for JS/TS, [testing_go.md](testing_go.md) for Go.

---

## Quick Reference

```bash
# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_user_create

# Run tests matching pattern
cargo test user

# Run tests in specific module
cargo test auth::

# Run ignored tests
cargo test -- --ignored

# Run all tests including ignored
cargo test -- --include-ignored

# Run with specific threads
cargo test -- --test-threads=1

# Run doc tests only
cargo test --doc

# Run integration tests only
cargo test --test integration

# Show test output for passing tests
cargo test -- --show-output

# Run benchmarks (nightly)
cargo +nightly bench
```

---

## Unit Tests

### Basic Structure

```rust
// src/lib.rs or src/math.rs

pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

pub fn divide(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 {
        Err("division by zero".to_string())
    } else {
        Ok(a / b)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
    }

    #[test]
    fn test_add_negative() {
        assert_eq!(add(-1, -1), -2);
    }

    #[test]
    fn test_divide_success() {
        assert_eq!(divide(10, 2), Ok(5));
    }

    #[test]
    fn test_divide_by_zero() {
        assert!(divide(10, 0).is_err());
    }
}
```

### Test Attributes

```rust
#[test]
fn regular_test() {
    // Runs normally
}

#[test]
#[ignore]
fn slow_test() {
    // Skipped unless --ignored flag
}

#[test]
#[should_panic]
fn test_panic() {
    panic!("This should panic");
}

#[test]
#[should_panic(expected = "specific message")]
fn test_panic_message() {
    panic!("specific message here");
}

#[test]
fn test_with_result() -> Result<(), String> {
    let result = some_operation()?;
    assert_eq!(result, expected);
    Ok(())
}
```

---

## Assertions

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn assertion_examples() {
        // Basic equality
        assert_eq!(1 + 1, 2);
        assert_ne!(1 + 1, 3);

        // Boolean assertions
        assert!(true);
        assert!(vec![1, 2, 3].contains(&2));

        // With custom messages
        assert_eq!(result, expected, "values should match: got {}", result);
        assert!(
            value > 0,
            "expected positive value, got {}",
            value
        );

        // Floating point comparison
        let a = 0.1 + 0.2;
        assert!((a - 0.3).abs() < f64::EPSILON);

        // Option/Result assertions
        assert!(some_option.is_some());
        assert!(some_result.is_ok());
        assert!(some_result.is_err());

        // Pattern matching
        assert!(matches!(value, Pattern::Variant(_)));
    }
}
```

---

## Test Organization

### Module-Based Tests

```rust
// src/user.rs
pub struct User {
    pub id: u64,
    pub email: String,
}

impl User {
    pub fn new(email: &str) -> Result<Self, ValidationError> {
        if !email.contains('@') {
            return Err(ValidationError::InvalidEmail);
        }
        Ok(Self {
            id: generate_id(),
            email: email.to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    mod new {
        use super::*;

        #[test]
        fn creates_user_with_valid_email() {
            let user = User::new("test@example.com").unwrap();
            assert_eq!(user.email, "test@example.com");
        }

        #[test]
        fn rejects_invalid_email() {
            let result = User::new("invalid-email");
            assert!(matches!(result, Err(ValidationError::InvalidEmail)));
        }
    }
}
```

### Integration Tests

```rust
// tests/api_integration.rs
// Integration tests are external to your crate

use my_crate::{Config, Server};

#[test]
fn test_server_startup() {
    let config = Config::default();
    let server = Server::new(config);
    assert!(server.start().is_ok());
}

// Shared test utilities
// tests/common/mod.rs
pub fn setup_test_db() -> Database {
    // ...
}

// tests/database_integration.rs
mod common;

#[test]
fn test_database_operations() {
    let db = common::setup_test_db();
    // ...
}
```

### Directory Structure

```
project/
├── Cargo.toml
├── src/
│   ├── lib.rs          # Unit tests in #[cfg(test)] mod tests
│   ├── user.rs         # Module with inline tests
│   └── auth/
│       ├── mod.rs
│       └── token.rs    # Tests at bottom of file
└── tests/              # Integration tests
    ├── common/
    │   └── mod.rs      # Shared test utilities
    ├── api_test.rs
    └── database_test.rs
```

---

## Setup and Teardown

### Using Constructors and Drop

```rust
struct TestContext {
    db: Database,
    temp_dir: TempDir,
}

impl TestContext {
    fn new() -> Self {
        let temp_dir = TempDir::new().unwrap();
        let db = Database::connect(&temp_dir.path().join("test.db")).unwrap();
        Self { db, temp_dir }
    }
}

impl Drop for TestContext {
    fn drop(&mut self) {
        // Cleanup happens automatically
        self.db.close().unwrap();
    }
}

#[test]
fn test_with_context() {
    let ctx = TestContext::new();

    // Use ctx.db for testing
    ctx.db.insert_user("test@example.com").unwrap();

    // Cleanup happens when ctx is dropped
}
```

### Using once_cell for Expensive Setup

```rust
use once_cell::sync::Lazy;
use std::sync::Mutex;

static TEST_DB: Lazy<Mutex<Database>> = Lazy::new(|| {
    let db = Database::connect("test.db").unwrap();
    db.migrate().unwrap();
    Mutex::new(db)
});

#[test]
fn test_with_shared_db() {
    let db = TEST_DB.lock().unwrap();
    // Use shared database
}
```

---

## Mocking and Test Doubles

### Trait-Based Mocking

```rust
// Define trait for dependency
pub trait UserRepository {
    fn find_by_id(&self, id: u64) -> Option<User>;
    fn save(&self, user: &User) -> Result<(), Error>;
}

// Production implementation
pub struct PostgresUserRepo {
    pool: PgPool,
}

impl UserRepository for PostgresUserRepo {
    fn find_by_id(&self, id: u64) -> Option<User> {
        // Real database query
    }

    fn save(&self, user: &User) -> Result<(), Error> {
        // Real database insert
    }
}

// Mock for testing
#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::sync::Mutex;

    struct MockUserRepo {
        users: Mutex<HashMap<u64, User>>,
    }

    impl MockUserRepo {
        fn new() -> Self {
            Self {
                users: Mutex::new(HashMap::new()),
            }
        }

        fn with_user(self, user: User) -> Self {
            self.users.lock().unwrap().insert(user.id, user);
            self
        }
    }

    impl UserRepository for MockUserRepo {
        fn find_by_id(&self, id: u64) -> Option<User> {
            self.users.lock().unwrap().get(&id).cloned()
        }

        fn save(&self, user: &User) -> Result<(), Error> {
            self.users.lock().unwrap().insert(user.id, user.clone());
            Ok(())
        }
    }

    #[test]
    fn test_user_service() {
        let repo = MockUserRepo::new()
            .with_user(User { id: 1, email: "test@example.com".into() });

        let service = UserService::new(Box::new(repo));
        let user = service.get_user(1).unwrap();

        assert_eq!(user.email, "test@example.com");
    }
}
```

### Using mockall Crate

```rust
use mockall::{automock, predicate::*};

#[automock]
pub trait UserRepository {
    fn find_by_id(&self, id: u64) -> Option<User>;
    fn save(&self, user: &User) -> Result<(), Error>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_with_mockall() {
        let mut mock = MockUserRepository::new();

        mock.expect_find_by_id()
            .with(eq(1))
            .times(1)
            .returning(|_| Some(User {
                id: 1,
                email: "test@example.com".into(),
            }));

        let service = UserService::new(Box::new(mock));
        let user = service.get_user(1).unwrap();

        assert_eq!(user.id, 1);
    }
}
```

---

## Async Testing

### With tokio

```rust
// Cargo.toml
// [dev-dependencies]
// tokio = { version = "1", features = ["rt-multi-thread", "macros"] }

#[tokio::test]
async fn test_async_operation() {
    let result = fetch_data().await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_with_timeout() {
    let result = tokio::time::timeout(
        Duration::from_secs(5),
        slow_operation()
    ).await;

    assert!(result.is_ok());
}

// Multiple async tests sharing runtime
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn test_concurrent_operations() {
    let (result1, result2) = tokio::join!(
        operation_one(),
        operation_two()
    );

    assert!(result1.is_ok());
    assert!(result2.is_ok());
}
```

### With async-std

```rust
#[async_std::test]
async fn test_async_std() {
    let result = fetch_data().await;
    assert!(result.is_ok());
}
```

---

## Property-Based Testing

### Using proptest

```rust
// Cargo.toml
// [dev-dependencies]
// proptest = "1.0"

use proptest::prelude::*;

proptest! {
    #[test]
    fn test_add_commutative(a: i32, b: i32) {
        prop_assert_eq!(add(a, b), add(b, a));
    }

    #[test]
    fn test_parse_roundtrip(s in "[a-z]{1,10}") {
        let parsed = parse(&s)?;
        let serialized = serialize(&parsed);
        prop_assert_eq!(s, serialized);
    }

    #[test]
    fn test_vec_operations(v: Vec<i32>) {
        let sorted = sort(&v);
        prop_assert_eq!(sorted.len(), v.len());
        prop_assert!(is_sorted(&sorted));
    }
}

// Custom strategies
fn email_strategy() -> impl Strategy<Value = String> {
    ("[a-z]{1,10}", "[a-z]{2,5}")
        .prop_map(|(local, domain)| format!("{}@{}.com", local, domain))
}

proptest! {
    #[test]
    fn test_email_validation(email in email_strategy()) {
        let result = validate_email(&email);
        prop_assert!(result.is_ok());
    }
}
```

---

## Doc Tests

```rust
/// Adds two numbers together.
///
/// # Examples
///
/// ```
/// use my_crate::add;
///
/// let result = add(2, 3);
/// assert_eq!(result, 5);
/// ```
///
/// # Panics
///
/// This function doesn't panic.
///
/// ```should_panic
/// // This example is expected to panic
/// panic!("example panic");
/// ```
///
/// ```no_run
/// // This compiles but doesn't run (useful for network examples)
/// let response = fetch_from_api().await;
/// ```
///
/// ```ignore
/// // This is completely ignored
/// broken_code();
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// Run doc tests: cargo test --doc
```

---

## Coverage

### Using cargo-tarpaulin

```bash
# Install
cargo install cargo-tarpaulin

# Run with coverage
cargo tarpaulin

# Generate HTML report
cargo tarpaulin --out Html

# With specific options
cargo tarpaulin --ignore-tests --out Lcov
```

### Using cargo-llvm-cov

```bash
# Install
rustup component add llvm-tools-preview
cargo install cargo-llvm-cov

# Run with coverage
cargo llvm-cov

# Generate HTML report
cargo llvm-cov --html

# Generate LCOV for CI
cargo llvm-cov --lcov --output-path lcov.info
```

### CI Configuration

```yaml
# GitHub Actions
- name: Install tarpaulin
  run: cargo install cargo-tarpaulin

- name: Run tests with coverage
  run: cargo tarpaulin --out Xml

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: cobertura.xml
```

---

## Benchmarking

### Built-in (Nightly)

```rust
#![feature(test)]

extern crate test;

#[cfg(test)]
mod benchmarks {
    use super::*;
    use test::Bencher;

    #[bench]
    fn bench_add(b: &mut Bencher) {
        b.iter(|| {
            add(2, 3)
        });
    }
}

// Run: cargo +nightly bench
```

### Using criterion (Stable)

```rust
// Cargo.toml
// [dev-dependencies]
// criterion = "0.5"
//
// [[bench]]
// name = "my_benchmark"
// harness = false

// benches/my_benchmark.rs
use criterion::{criterion_group, criterion_main, Criterion, BenchmarkId};
use my_crate::sort;

fn bench_sort(c: &mut Criterion) {
    let mut group = c.benchmark_group("sort");

    for size in [100, 1000, 10000].iter() {
        group.bench_with_input(
            BenchmarkId::from_parameter(size),
            size,
            |b, &size| {
                let data: Vec<i32> = (0..size).rev().collect();
                b.iter(|| sort(&data));
            },
        );
    }

    group.finish();
}

criterion_group!(benches, bench_sort);
criterion_main!(benches);

// Run: cargo bench
```

---

## Testing Errors

```rust
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ValidationError {
    #[error("invalid email format")]
    InvalidEmail,
    #[error("password too short: minimum {0} characters")]
    PasswordTooShort(usize),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_type() {
        let result = validate_email("invalid");

        assert!(matches!(
            result,
            Err(ValidationError::InvalidEmail)
        ));
    }

    #[test]
    fn test_error_message() {
        let err = ValidationError::PasswordTooShort(8);
        assert_eq!(
            err.to_string(),
            "password too short: minimum 8 characters"
        );
    }

    #[test]
    fn test_error_chain() {
        let result = process_data(bad_input);

        let err = result.unwrap_err();
        assert!(err.source().is_some());
    }
}
```

---

## Troubleshooting

**Tests not found**
- Ensure `#[test]` attribute is present
- Check that `#[cfg(test)]` module is properly structured
- Verify function visibility within test module

**Tests interfering with each other**
- Use `--test-threads=1` for serial execution
- Avoid shared mutable state
- Use unique resources per test (temp directories, ports)

**Slow compilation**
- Split tests into integration tests (separate compilation)
- Use `cargo test --no-run` for compile-only checks

**Flaky tests**
- Avoid time-dependent logic
- Use deterministic random seeds
- Mock external dependencies

**Can't see println! output**
- Use `cargo test -- --nocapture`
- Or `cargo test -- --show-output`

---

## Related Guides

- **[testing_python.md](testing_python.md)** - Python testing with pytest
- **[testing_javascript.md](testing_javascript.md)** - JavaScript/TypeScript testing
- **[testing_go.md](testing_go.md)** - Go testing
- **[multi_language_guide.md](multi_language_guide.md)** - Rust project setup and patterns
- **[ci_cd_patterns.md](ci_cd_patterns.md)** - CI/CD pipelines

---

*Last updated: 2025-11-28*
