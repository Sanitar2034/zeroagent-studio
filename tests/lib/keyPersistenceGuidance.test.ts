import { describe, it, expect } from 'vitest'
import {
  DEFAULT_KEY_PERSISTENCE,
  KEY_STORAGE_ONBOARDING_NOTE,
  KEY_PERSISTENCE_SESSION_DESCRIPTION,
  KEY_PERSISTENCE_LOCAL_DESCRIPTION,
} from '../../src/lib/keyPersistenceGuidance'

describe('keyPersistenceGuidance', () => {
  it('defaults new users to session storage', () => {
    expect(DEFAULT_KEY_PERSISTENCE).toBe('session')
  })

  it('documents session vs local trade-offs for onboarding and settings', () => {
    expect(KEY_STORAGE_ONBOARDING_NOTE).toMatch(/Forget when I close the browser/i)
    expect(KEY_PERSISTENCE_SESSION_DESCRIPTION).toMatch(/Default for new users/i)
    expect(KEY_PERSISTENCE_LOCAL_DESCRIPTION).toMatch(/operating-system user account/i)
  })
})
