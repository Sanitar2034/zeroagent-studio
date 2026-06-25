/** Crypto donation addresses — keep in sync with `.github/FUNDING.yml` explorer URLs. */
export interface SponsorCoin {
  id: string
  label: string
  address: string
  explorer: string
}

export const SPONSOR_COINS: SponsorCoin[] = [
  {
    id: 'btc',
    label: 'Bitcoin',
    address: 'bc1qcrj9wreunffxm75fcz0a2gjkw87jshcwvmxv68',
    explorer: 'https://mempool.space/address/bc1qcrj9wreunffxm75fcz0a2gjkw87jshcwvmxv68',
  },
  {
    id: 'eth',
    label: 'Ethereum',
    address: '0xB85Bf389E5fC5E12636FB6F17b68Df7fC990a3dA',
    explorer: 'https://etherscan.io/address/0xB85Bf389E5fC5E12636FB6F17b68Df7fC990a3dA',
  },
  {
    id: 'ltc',
    label: 'Litecoin',
    address: 'ltc1q0nsarncmnz8vk34dav7l0vgu9m5k48drr8z6js',
    explorer: 'https://blockchair.com/litecoin/address/ltc1q0nsarncmnz8vk34dav7l0vgu9m5k48drr8z6js',
  },
  {
    id: 'doge',
    label: 'Dogecoin',
    address: 'D6YGoYWpFZxW8JXvEfT5iB9uNXcs8AeY7L',
    explorer: 'https://blockchair.com/dogecoin/address/D6YGoYWpFZxW8JXvEfT5iB9uNXcs8AeY7L',
  },
]
