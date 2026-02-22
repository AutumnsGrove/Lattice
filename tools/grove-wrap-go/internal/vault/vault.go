package vault

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// SecretEntry holds a secret's metadata and value inside the vault.
type SecretEntry struct {
	Value      string            `json:"value"`
	CreatedAt  string            `json:"created_at"`
	UpdatedAt  string            `json:"updated_at"`
	DeployedTo map[string]string `json:"deployed_to,omitempty"`
}

// vaultData is the JSON structure stored encrypted in the vault file.
type vaultData struct {
	Secrets map[string]*SecretEntry `json:"secrets"`
}

// SecretsVault manages encrypted secrets stored in ~/.grove/secrets.enc.
type SecretsVault struct {
	path     string
	salt     []byte
	key      []byte // 32-byte derived key
	data     *vaultData
	unlocked bool
}

// DefaultVaultPath returns the default vault file location.
func DefaultVaultPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".grove", "secrets.enc")
}

// VaultExists checks if a vault file exists at the default path.
func VaultExists() bool {
	_, err := os.Stat(DefaultVaultPath())
	return err == nil
}

// Create initializes a new vault with the given password.
func Create(password string) (*SecretsVault, error) {
	if len(password) < 8 {
		return nil, fmt.Errorf("password must be at least 8 characters")
	}

	salt, err := generateSalt()
	if err != nil {
		return nil, err
	}

	key := deriveKey(password, salt)

	v := &SecretsVault{
		path: DefaultVaultPath(),
		salt: salt,
		key:  key,
		data: &vaultData{
			Secrets: make(map[string]*SecretEntry),
		},
		unlocked: true,
	}

	if err := v.Save(); err != nil {
		return nil, fmt.Errorf("failed to save new vault: %w", err)
	}

	return v, nil
}

// Unlock opens an existing vault with the given password.
func Unlock(password string) (*SecretsVault, error) {
	path := DefaultVaultPath()
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read vault: %w", err)
	}

	if len(raw) < 1+saltLen {
		return nil, fmt.Errorf("vault file too short")
	}

	// Parse header
	version := raw[0]
	if version != vaultFileVersion {
		return nil, fmt.Errorf("unsupported vault version: %d", version)
	}

	salt := raw[1 : 1+saltLen]
	token := raw[1+saltLen:]

	// Derive key and decrypt
	key := deriveKey(password, salt)
	plaintext, err := fernetDecrypt(key, token, 0) // no expiry for vault
	if err != nil {
		return nil, fmt.Errorf("wrong password or corrupted vault")
	}

	// Parse JSON
	var data vaultData
	if err := json.Unmarshal(plaintext, &data); err != nil {
		return nil, fmt.Errorf("failed to parse vault data: %w", err)
	}
	if data.Secrets == nil {
		data.Secrets = make(map[string]*SecretEntry)
	}

	return &SecretsVault{
		path:     path,
		salt:     salt,
		key:      key,
		data:     &data,
		unlocked: true,
	}, nil
}

// UnlockOrCreate opens the vault if it exists, or creates a new one.
func UnlockOrCreate(password string) (*SecretsVault, error) {
	if VaultExists() {
		return Unlock(password)
	}
	return Create(password)
}

// Save encrypts and writes the vault to disk.
func (v *SecretsVault) Save() error {
	if !v.unlocked {
		return fmt.Errorf("vault is locked")
	}

	plaintext, err := json.Marshal(v.data)
	if err != nil {
		return fmt.Errorf("failed to marshal vault: %w", err)
	}

	token, err := fernetEncrypt(v.key, plaintext)
	if err != nil {
		return fmt.Errorf("failed to encrypt vault: %w", err)
	}

	// Build file: version + salt + token
	file := make([]byte, 0, 1+saltLen+len(token))
	file = append(file, vaultFileVersion)
	file = append(file, v.salt...)
	file = append(file, token...)

	// Ensure directory exists
	dir := filepath.Dir(v.path)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return fmt.Errorf("failed to create vault directory: %w", err)
	}

	// Write with restrictive permissions
	if err := os.WriteFile(v.path, file, 0o600); err != nil {
		return fmt.Errorf("failed to write vault: %w", err)
	}

	return nil
}

// Get retrieves a secret's value by name.
func (v *SecretsVault) Get(name string) (string, bool) {
	entry, ok := v.data.Secrets[name]
	if !ok {
		return "", false
	}
	return entry.Value, true
}

// Set stores or updates a secret.
func (v *SecretsVault) Set(name, value string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	if entry, ok := v.data.Secrets[name]; ok {
		entry.Value = value
		entry.UpdatedAt = now
	} else {
		v.data.Secrets[name] = &SecretEntry{
			Value:     value,
			CreatedAt: now,
			UpdatedAt: now,
		}
	}
	return v.Save()
}

// Delete removes a secret by name.
func (v *SecretsVault) Delete(name string) error {
	if _, ok := v.data.Secrets[name]; !ok {
		return fmt.Errorf("secret '%s' not found", name)
	}
	delete(v.data.Secrets, name)
	return v.Save()
}

// Exists checks whether a secret exists.
func (v *SecretsVault) Exists(name string) bool {
	_, ok := v.data.Secrets[name]
	return ok
}

// List returns metadata for all secrets (values are NOT included).
func (v *SecretsVault) List() map[string]*SecretEntry {
	// Return copies without values for safety
	result := make(map[string]*SecretEntry, len(v.data.Secrets))
	for name, entry := range v.data.Secrets {
		result[name] = &SecretEntry{
			CreatedAt:  entry.CreatedAt,
			UpdatedAt:  entry.UpdatedAt,
			DeployedTo: entry.DeployedTo,
		}
	}
	return result
}

// RecordDeployment records that a secret was deployed to a target.
func (v *SecretsVault) RecordDeployment(name, target string) error {
	entry, ok := v.data.Secrets[name]
	if !ok {
		return fmt.Errorf("secret '%s' not found", name)
	}
	if entry.DeployedTo == nil {
		entry.DeployedTo = make(map[string]string)
	}
	entry.DeployedTo[target] = time.Now().UTC().Format(time.RFC3339)
	return v.Save()
}

// Count returns the number of secrets in the vault.
func (v *SecretsVault) Count() int {
	return len(v.data.Secrets)
}

// Names returns a sorted list of secret names.
func (v *SecretsVault) Names() []string {
	names := make([]string, 0, len(v.data.Secrets))
	for name := range v.data.Secrets {
		names = append(names, name)
	}
	return names
}
