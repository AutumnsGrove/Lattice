package vault

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"os"
	"testing"
)

func TestPKCS7PadUnpad(t *testing.T) {
	tests := []struct {
		name      string
		input     []byte
		blockSize int
	}{
		{"empty", []byte{}, 16},
		{"one byte", []byte{0x42}, 16},
		{"exact block", bytes.Repeat([]byte{0x01}, 16), 16},
		{"multi block", bytes.Repeat([]byte{0x01}, 31), 16},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			padded := pkcs7Pad(tt.input, tt.blockSize)
			if len(padded)%tt.blockSize != 0 {
				t.Fatalf("padded length %d not multiple of %d", len(padded), tt.blockSize)
			}
			unpadded, err := pkcs7Unpad(padded, tt.blockSize)
			if err != nil {
				t.Fatalf("unpad error: %v", err)
			}
			if !bytes.Equal(unpadded, tt.input) {
				t.Fatalf("roundtrip failed: got %v, want %v", unpadded, tt.input)
			}
		})
	}
}

func TestPKCS7UnpadInvalid(t *testing.T) {
	tests := []struct {
		name  string
		input []byte
	}{
		{"empty", []byte{}},
		{"zero padding", append(bytes.Repeat([]byte{0x01}, 15), 0x00)},
		{"padding too large", append(bytes.Repeat([]byte{0x01}, 15), 0x11)},
		{"inconsistent padding", append(bytes.Repeat([]byte{0x01}, 14), 0x02, 0x03)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := pkcs7Unpad(tt.input, 16)
			if err == nil {
				t.Fatal("expected error for invalid padding")
			}
		})
	}
}

func TestFernetRoundtrip(t *testing.T) {
	// 32-byte key: 16 signing + 16 encryption
	key := make([]byte, 32)
	for i := range key {
		key[i] = byte(i)
	}

	plaintexts := []string{
		"hello world",
		"",
		"a",
		"this is a longer plaintext message that spans multiple AES blocks for testing",
		`{"secrets": {"API_KEY": "sk-test-123"}}`,
	}

	for _, pt := range plaintexts {
		t.Run(pt[:min(len(pt), 20)], func(t *testing.T) {
			token, err := fernetEncrypt(key, []byte(pt))
			if err != nil {
				t.Fatalf("encrypt error: %v", err)
			}

			// Verify token is valid base64url
			_, err = base64.URLEncoding.DecodeString(string(token))
			if err != nil {
				t.Fatalf("token not valid base64url: %v", err)
			}

			decrypted, err := fernetDecrypt(key, token, 0)
			if err != nil {
				t.Fatalf("decrypt error: %v", err)
			}

			if string(decrypted) != pt {
				t.Fatalf("roundtrip failed: got %q, want %q", decrypted, pt)
			}
		})
	}
}

func TestFernetBadKey(t *testing.T) {
	key := make([]byte, 32)
	token, err := fernetEncrypt(key, []byte("test"))
	if err != nil {
		t.Fatal(err)
	}

	// Wrong key should fail HMAC
	wrongKey := make([]byte, 32)
	wrongKey[0] = 0xFF
	_, err = fernetDecrypt(wrongKey, token, 0)
	if err != ErrBadHMAC {
		t.Fatalf("expected ErrBadHMAC, got %v", err)
	}
}

func TestFernetBadToken(t *testing.T) {
	key := make([]byte, 32)
	_, err := fernetDecrypt(key, []byte("not-valid-base64!@#$"), 0)
	if err != ErrBadToken {
		t.Fatalf("expected ErrBadToken, got %v", err)
	}
}

func TestDeriveKey(t *testing.T) {
	salt := []byte("sixteen_byte_sal") // 16 bytes
	key := deriveKey("testpassword", salt)
	if len(key) != 32 {
		t.Fatalf("expected 32-byte key, got %d", len(key))
	}

	// Same password + salt should produce same key (deterministic)
	key2 := deriveKey("testpassword", salt)
	if !bytes.Equal(key, key2) {
		t.Fatal("same inputs produced different keys")
	}

	// Different password should produce different key
	key3 := deriveKey("otherpassword", salt)
	if bytes.Equal(key, key3) {
		t.Fatal("different passwords produced same key")
	}
}

func TestVaultCreateAndUnlock(t *testing.T) {
	// Test the encrypt/decrypt flow that the vault uses
	password := "test-password-123"
	salt, err := generateSalt()
	if err != nil {
		t.Fatal(err)
	}

	key := deriveKey(password, salt)

	// Simulate vault create + save + unlock
	data := `{"secrets":{"API_KEY":{"value":"sk-test","created_at":"2025-01-01T00:00:00Z","updated_at":"2025-01-01T00:00:00Z"}}}`
	token, err := fernetEncrypt(key, []byte(data))
	if err != nil {
		t.Fatal(err)
	}

	// Build file content
	file := make([]byte, 0, 1+saltLen+len(token))
	file = append(file, vaultFileVersion)
	file = append(file, salt...)
	file = append(file, token...)

	// Simulate reading back
	version := file[0]
	if version != vaultFileVersion {
		t.Fatalf("bad version: %d", version)
	}
	readSalt := file[1 : 1+saltLen]
	readToken := file[1+saltLen:]

	readKey := deriveKey(password, readSalt)
	plaintext, err := fernetDecrypt(readKey, readToken, 0)
	if err != nil {
		t.Fatalf("decrypt failed: %v", err)
	}

	if string(plaintext) != data {
		t.Fatalf("vault roundtrip failed")
	}
}

func TestPythonVaultFormatCompat(t *testing.T) {
	// Python gw stores secrets as a flat dict (no "secrets" wrapper key):
	//   {"MY_KEY": {"value": "sk-test", "created_at": "...", "updated_at": "..."}}
	// Go gw expects: {"secrets": {"MY_KEY": {...}}}
	// The Unlock path must handle both formats.

	password := "test-password-123"
	salt, err := generateSalt()
	if err != nil {
		t.Fatal(err)
	}
	key := deriveKey(password, salt)

	// Simulate Python-format vault plaintext — includes deployed_to as an
	// ARRAY (Python format) rather than a map (Go format), plus last_deployed_at
	pythonJSON := `{"API_KEY":{"value":"sk-test-123","created_at":"2025-01-01T00:00:00","updated_at":"2025-01-01T00:00:00","deployed_to":["grove-lattice","grove-warden"],"last_deployed_at":"2025-01-02T00:00:00"},"DB_URL":{"value":"postgres://localhost","created_at":"2025-01-02T00:00:00","updated_at":"2025-01-02T00:00:00"}}`

	token, err := fernetEncrypt(key, []byte(pythonJSON))
	if err != nil {
		t.Fatal(err)
	}

	// Build vault file: version + salt + token
	file := make([]byte, 0, 1+saltLen+len(token))
	file = append(file, vaultFileVersion)
	file = append(file, salt...)
	file = append(file, token...)

	// Write to temp file
	tmpDir := t.TempDir()
	vaultPath := tmpDir + "/secrets.enc"
	if err := os.WriteFile(vaultPath, file, 0o600); err != nil {
		t.Fatal(err)
	}

	// Now simulate the Unlock parsing logic (can't call Unlock directly
	// since it reads from DefaultVaultPath, so test the parsing inline)
	raw, _ := os.ReadFile(vaultPath)
	readSalt := raw[1 : 1+saltLen]
	readToken := raw[1+saltLen:]
	readKey := deriveKey(password, readSalt)
	plaintext, err := fernetDecrypt(readKey, readToken, 0)
	if err != nil {
		t.Fatalf("decrypt failed: %v", err)
	}

	// Step 1: Try Go format
	var data vaultData
	if err := json.Unmarshal(plaintext, &data); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if data.Secrets == nil {
		data.Secrets = make(map[string]*SecretEntry)
	}

	// Go format should find nothing (Python doesn't use "secrets" wrapper)
	if len(data.Secrets) != 0 {
		t.Fatalf("expected 0 secrets from Go-format parse of Python vault, got %d", len(data.Secrets))
	}

	// Step 2: Fallback to flat Python format via parsePythonSecrets
	if len(data.Secrets) == 0 {
		var flat map[string]json.RawMessage
		if err := json.Unmarshal(plaintext, &flat); err != nil {
			t.Fatalf("flat unmarshal failed: %v", err)
		}
		if len(flat) == 0 {
			t.Fatal("flat parse found 0 entries — Python compat broken")
		}
		data.Secrets = parsePythonSecrets(flat)
	}

	// Verify secrets were recovered
	if len(data.Secrets) != 2 {
		t.Fatalf("expected 2 secrets, got %d", len(data.Secrets))
	}

	apiKey, ok := data.Secrets["API_KEY"]
	if !ok || apiKey.Value != "sk-test-123" {
		t.Fatalf("API_KEY not recovered correctly: %+v", apiKey)
	}
	// Verify deployed_to was converted from array to map
	if len(apiKey.DeployedTo) != 2 {
		t.Fatalf("API_KEY deployed_to should have 2 targets, got %d: %v", len(apiKey.DeployedTo), apiKey.DeployedTo)
	}
	if _, ok := apiKey.DeployedTo["grove-lattice"]; !ok {
		t.Fatalf("API_KEY deployed_to missing 'grove-lattice': %v", apiKey.DeployedTo)
	}

	dbURL, ok := data.Secrets["DB_URL"]
	if !ok || dbURL.Value != "postgres://localhost" {
		t.Fatalf("DB_URL not recovered correctly: %+v", dbURL)
	}
	// DB_URL has no deployed_to — should be nil or empty
	if len(dbURL.DeployedTo) != 0 {
		t.Fatalf("DB_URL should have no deploy targets, got %v", dbURL.DeployedTo)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
