import { KYC_STATUS } from './codes.ts'
import type { ProviderEvent } from './ports.ts'
import { PROVIDER_TEST_KEY, sign } from './signature.ts'

/*
 * The applicants of incident 2 and the messages the (fake) identity provider sent about them.
 * Every name and number is invented.
 */

export const ANNA = 'anna'
export const BORIS = 'boris'

/**
 * Anna, yesterday: documents received, then approved automatically within the same second.
 * The right end state is APPROVED, whatever order the messages arrive in.
 */
export function annaMessages(): Promise<ProviderEvent[]> {
  return Promise.all([
    sign(
      {
        eventId: 'evt_anna_1',
        applicantId: ANNA,
        version: 1,
        status: KYC_STATUS.PENDING,
        sentAt: '2026-10-14T17:02:11Z',
      },
      PROVIDER_TEST_KEY,
    ),
    sign(
      {
        eventId: 'evt_anna_2',
        applicantId: ANNA,
        version: 2,
        status: KYC_STATUS.APPROVED,
        sentAt: '2026-10-14T17:02:11Z',
      },
      PROVIDER_TEST_KEY,
    ),
  ])
}

/** Boris: documents received, then a person at the provider started a review. The right end state is IN_REVIEW. */
export function borisMessages(): Promise<ProviderEvent[]> {
  return Promise.all([
    sign(
      {
        eventId: 'evt_boris_1',
        applicantId: BORIS,
        version: 1,
        status: KYC_STATUS.PENDING,
        sentAt: '2026-10-14T16:40:05Z',
      },
      PROVIDER_TEST_KEY,
    ),
    sign(
      {
        eventId: 'evt_boris_2',
        applicantId: BORIS,
        version: 2,
        status: KYC_STATUS.IN_REVIEW,
        sentAt: '2026-10-14T16:40:58Z',
      },
      PROVIDER_TEST_KEY,
    ),
  ])
}

/** A stranger's "approved" for Boris. It looks right in every field, but the signature was made without our key. */
export function forgedApprovalForBoris(): Promise<ProviderEvent> {
  return sign(
    {
      eventId: 'evt_boris_3',
      applicantId: BORIS,
      version: 3,
      status: KYC_STATUS.APPROVED,
      sentAt: '2026-10-15T03:12:40Z',
    },
    'a-key-the-stranger-guessed',
  )
}
