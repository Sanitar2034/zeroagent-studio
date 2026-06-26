import { describe, it, expect } from 'vitest'
import { SPONSOR_COINS } from '../../src/lib/sponsorAddresses'

describe('sponsorAddresses', () => {
  it('lists four coins matching FUNDING.yml', () => {
    expect(SPONSOR_COINS).toHaveLength(4)
    expect(SPONSOR_COINS.map((c) => c.label)).toEqual([
      'Bitcoin',
      'Ethereum',
      'Litecoin',
      'Dogecoin',
    ])
    expect(SPONSOR_COINS[0]!.address).toMatch(/^bc1/)
    expect(SPONSOR_COINS[1]!.address).toMatch(/^0x/)
  })
})
