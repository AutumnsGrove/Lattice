package vault

import (
	"fmt"
	"os"
	"strings"
	"syscall"

	"golang.org/x/term"
)

// GetVaultPassword retrieves the vault password from the environment
// or prompts the user interactively.
func GetVaultPassword() (string, error) {
	// Check environment variable first (for CI/agent use)
	if pw := os.Getenv("GW_VAULT_PASSWORD"); pw != "" {
		return pw, nil
	}

	// Interactive prompt
	fmt.Fprint(os.Stderr, "Vault password: ")
	pw, err := term.ReadPassword(int(syscall.Stdin))
	fmt.Fprintln(os.Stderr) // newline after hidden input
	if err != nil {
		return "", fmt.Errorf("failed to read password: %w", err)
	}

	password := strings.TrimSpace(string(pw))
	if password == "" {
		return "", fmt.Errorf("password must not be empty")
	}

	return password, nil
}

// GetNewVaultPassword prompts for a new password with confirmation.
func GetNewVaultPassword() (string, error) {
	// Check environment variable first
	if pw := os.Getenv("GW_VAULT_PASSWORD"); pw != "" {
		if len(pw) < 8 {
			return "", fmt.Errorf("password must be at least 8 characters")
		}
		return pw, nil
	}

	fmt.Fprint(os.Stderr, "New vault password (min 8 chars): ")
	pw1, err := term.ReadPassword(int(syscall.Stdin))
	fmt.Fprintln(os.Stderr)
	if err != nil {
		return "", fmt.Errorf("failed to read password: %w", err)
	}

	password := strings.TrimSpace(string(pw1))
	if len(password) < 8 {
		return "", fmt.Errorf("password must be at least 8 characters")
	}

	fmt.Fprint(os.Stderr, "Confirm password: ")
	pw2, err := term.ReadPassword(int(syscall.Stdin))
	fmt.Fprintln(os.Stderr)
	if err != nil {
		return "", fmt.Errorf("failed to read password: %w", err)
	}

	if string(pw1) != string(pw2) {
		return "", fmt.Errorf("passwords do not match")
	}

	return password, nil
}
