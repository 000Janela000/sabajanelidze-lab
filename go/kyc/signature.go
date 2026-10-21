package kyc

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"strings"
)

// ProviderTestKey is the key the lab's fake identity provider signs with. Public on purpose: a demo with fake
// applicants. A real key lives only as a server secret.
const ProviderTestKey = "lab-kyc-provider-test-key"

// signedText is the exact bytes that are signed: every field, in a fixed order (the same as the TypeScript code).
func signedText(event ProviderEvent) []byte {
	fields := []string{event.EventID, event.ApplicantID, strconv.Itoa(event.Version), string(event.Status), event.SentAt}
	return []byte(strings.Join(fields, "|"))
}

// Sign returns the message signed the way the provider signs it (HMAC-SHA256, hex).
func Sign(event ProviderEvent, secret string) ProviderEvent {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(signedText(event))
	event.Signature = hex.EncodeToString(mac.Sum(nil))
	return event
}

// SignatureCheck checks signatures with the key we share with the provider.
type SignatureCheck struct {
	secret []byte
}

// NewSignatureCheck creates a check for one shared key.
func NewSignatureCheck(secret string) SignatureCheck {
	return SignatureCheck{secret: []byte(secret)}
}

// Verify is true only if the signature was made with our key. hmac.Equal compares in constant time.
func (c SignatureCheck) Verify(event ProviderEvent) bool {
	given, err := hex.DecodeString(strings.ToLower(event.Signature))
	if err != nil {
		return false
	}
	mac := hmac.New(sha256.New, c.secret)
	mac.Write(signedText(event))
	return hmac.Equal(given, mac.Sum(nil))
}
