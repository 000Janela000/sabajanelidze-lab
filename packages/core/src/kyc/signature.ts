import type { ProviderEvent, SignatureCheck } from './ports.ts'

/**
 * The key the lab's fake identity provider signs with. It is public on purpose: this is a demo with
 * fake applicants. A real key lives only as a server secret.
 */
export const PROVIDER_TEST_KEY = 'lab-kyc-provider-test-key'

type Unsigned = Omit<ProviderEvent, 'signature'>

/** The exact bytes that are signed: every field, in a fixed order. */
function signedText(event: Unsigned): Uint8Array<ArrayBuffer> {
  const { eventId, applicantId, version, status, sentAt } = event
  return new TextEncoder().encode([eventId, applicantId, version, status, sentAt].join('|'))
}

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/** Signs a message the way the provider does (HMAC-SHA256, hex). */
export async function sign(event: Unsigned, secret: string): Promise<ProviderEvent> {
  const key = await hmacKey(secret)
  const mac = await crypto.subtle.sign('HMAC', key, signedText(event))
  const signature = [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return { ...event, signature }
}

/** Checks signatures with the shared key. `crypto.subtle.verify` compares in constant time. */
export function signatureCheck(secret: string): SignatureCheck {
  const pendingKey = hmacKey(secret)
  return {
    async verify(event) {
      const bytes = event.signature.match(/^[0-9a-f]{64}$/) ? hexToBytes(event.signature) : null
      if (!bytes) return false
      const key = await pendingKey
      return crypto.subtle.verify('HMAC', key, bytes, signedText(event))
    },
  }
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}
