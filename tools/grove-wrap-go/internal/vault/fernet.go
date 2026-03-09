// Package vault implements an encrypted secrets vault compatible with
// Python gw's Fernet-based storage.
//
// File format: [version: 1 byte (0x01)] [salt: 16 bytes] [fernet token: rest]
// Key derivation: PBKDF2-SHA256(password, salt, 100000, 32) → base64url
// Fernet spec: https://github.com/fernet/spec/blob/master/Spec.md
package vault

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"fmt"
	"time"

	"golang.org/x/crypto/pbkdf2"
)

const (
	// fernetVersion is the Fernet token version byte.
	fernetVersion = 0x80

	// vaultFileVersion is our vault file format version.
	vaultFileVersion = 0x01

	// saltLen is the PBKDF2 salt length in bytes.
	saltLen = 16

	// pbkdf2Iterations matches Python's cryptography default.
	pbkdf2Iterations = 100_000

	// pbkdf2KeyLen is the derived key length (split into sign + encrypt).
	pbkdf2KeyLen = 32
)

var (
	ErrBadToken    = errors.New("fernet: invalid token")
	ErrBadVersion  = errors.New("fernet: wrong token version")
	ErrBadHMAC     = errors.New("fernet: HMAC verification failed")
	ErrBadPadding  = errors.New("fernet: invalid PKCS7 padding")
	ErrTokenExpired = errors.New("fernet: token expired")
)

// deriveKey derives a Fernet key from a password and salt using PBKDF2-SHA256.
// Returns the raw 32-byte key (first 16 = signing, last 16 = encryption).
func deriveKey(password string, salt []byte) []byte {
	return pbkdf2.Key([]byte(password), salt, pbkdf2Iterations, pbkdf2KeyLen, sha256.New)
}

// deriveKeyB64 derives a key and returns it base64url-encoded (with padding),
// matching Python's Fernet key format.
func deriveKeyB64(password string, salt []byte) string {
	raw := deriveKey(password, salt)
	return base64.URLEncoding.EncodeToString(raw)
}

// fernetEncrypt encrypts plaintext using the Fernet spec.
// key must be 32 bytes (16 signing + 16 encryption).
// Returns a base64url-encoded token.
func fernetEncrypt(key []byte, plaintext []byte) ([]byte, error) {
	if len(key) != 32 {
		return nil, fmt.Errorf("fernet: key must be 32 bytes, got %d", len(key))
	}

	signingKey := key[:16]
	encryptionKey := key[16:]

	// Generate IV
	iv := make([]byte, aes.BlockSize)
	if _, err := rand.Read(iv); err != nil {
		return nil, fmt.Errorf("fernet: failed to generate IV: %w", err)
	}

	// PKCS7 pad plaintext
	padded := pkcs7Pad(plaintext, aes.BlockSize)

	// AES-128-CBC encrypt
	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("fernet: %w", err)
	}
	ciphertext := make([]byte, len(padded))
	cipher.NewCBCEncrypter(block, iv).CryptBlocks(ciphertext, padded)

	// Build token body: version + timestamp + IV + ciphertext
	now := time.Now().Unix()
	body := make([]byte, 0, 1+8+16+len(ciphertext))
	body = append(body, fernetVersion)
	ts := make([]byte, 8)
	binary.BigEndian.PutUint64(ts, uint64(now))
	body = append(body, ts...)
	body = append(body, iv...)
	body = append(body, ciphertext...)

	// HMAC-SHA256 over the body
	mac := hmac.New(sha256.New, signingKey)
	mac.Write(body)
	sig := mac.Sum(nil)

	// Token = body + HMAC
	token := append(body, sig...)

	// Base64url encode
	encoded := make([]byte, base64.URLEncoding.EncodedLen(len(token)))
	base64.URLEncoding.Encode(encoded, token)

	return encoded, nil
}

// fernetDecrypt decrypts a base64url-encoded Fernet token.
// key must be 32 bytes. maxAge of 0 disables expiry checking.
func fernetDecrypt(key []byte, token []byte, maxAge time.Duration) ([]byte, error) {
	if len(key) != 32 {
		return nil, fmt.Errorf("fernet: key must be 32 bytes, got %d", len(key))
	}

	signingKey := key[:16]
	encryptionKey := key[16:]

	// Base64url decode
	raw := make([]byte, base64.URLEncoding.DecodedLen(len(token)))
	n, err := base64.URLEncoding.Decode(raw, token)
	if err != nil {
		return nil, ErrBadToken
	}
	raw = raw[:n]

	// Minimum: version(1) + timestamp(8) + IV(16) + 1 block(16) + HMAC(32) = 73
	if len(raw) < 73 {
		return nil, ErrBadToken
	}

	// Check version
	if raw[0] != fernetVersion {
		return nil, ErrBadVersion
	}

	// Split: body (everything before HMAC) and HMAC (last 32 bytes)
	body := raw[:len(raw)-32]
	tokenHMAC := raw[len(raw)-32:]

	// Verify HMAC
	mac := hmac.New(sha256.New, signingKey)
	mac.Write(body)
	expectedMAC := mac.Sum(nil)
	if !hmac.Equal(tokenHMAC, expectedMAC) {
		return nil, ErrBadHMAC
	}

	// Parse timestamp
	ts := binary.BigEndian.Uint64(body[1:9])
	if maxAge > 0 {
		tokenTime := time.Unix(int64(ts), 0)
		if time.Since(tokenTime) > maxAge {
			return nil, ErrTokenExpired
		}
	}

	// Extract IV and ciphertext
	iv := body[9:25]
	ciphertext := body[25:]

	// Ciphertext must be a multiple of block size
	if len(ciphertext)%aes.BlockSize != 0 {
		return nil, ErrBadToken
	}

	// AES-128-CBC decrypt
	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("fernet: %w", err)
	}
	plaintext := make([]byte, len(ciphertext))
	cipher.NewCBCDecrypter(block, iv).CryptBlocks(plaintext, ciphertext)

	// Remove PKCS7 padding
	plaintext, err = pkcs7Unpad(plaintext, aes.BlockSize)
	if err != nil {
		return nil, err
	}

	return plaintext, nil
}

// pkcs7Pad pads data to a multiple of blockSize using PKCS#7.
func pkcs7Pad(data []byte, blockSize int) []byte {
	padding := blockSize - (len(data) % blockSize)
	pad := make([]byte, padding)
	for i := range pad {
		pad[i] = byte(padding)
	}
	return append(data, pad...)
}

// pkcs7Unpad removes PKCS#7 padding.
func pkcs7Unpad(data []byte, blockSize int) ([]byte, error) {
	if len(data) == 0 || len(data)%blockSize != 0 {
		return nil, ErrBadPadding
	}
	padding := int(data[len(data)-1])
	if padding == 0 || padding > blockSize {
		return nil, ErrBadPadding
	}
	for i := len(data) - padding; i < len(data); i++ {
		if data[i] != byte(padding) {
			return nil, ErrBadPadding
		}
	}
	return data[:len(data)-padding], nil
}

// generateSalt creates a cryptographically random salt.
func generateSalt() ([]byte, error) {
	salt := make([]byte, saltLen)
	if _, err := rand.Read(salt); err != nil {
		return nil, fmt.Errorf("failed to generate salt: %w", err)
	}
	return salt, nil
}
