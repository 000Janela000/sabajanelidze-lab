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

// signedText is the exact bytes that are signed: every field, in a fixed order, each one after its length in bytes
// and a colon ("4:anna"), the same as the TypeScript code. The lengths keep the fields apart: with a plain separator,
// event "e|anna" for applicant "boris" would be signed as the same bytes as event "e" for applicant "anna|boris".
func signedText(event ProviderEvent) []byte {
	fields := []string{event.EventID, event.ApplicantID, strconv.Itoa(event.Version), string(event.Status), event.SentAt}
	var text strings.Builder
	for _, field := range fields {
		text.WriteString(strconv.Itoa(len(field)))
		text.WriteString(":")
		text.WriteString(field)
	}
	return []byte(text.String())
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
