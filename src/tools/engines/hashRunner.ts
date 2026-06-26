export type HashPreset = 'sha-256' | 'sha-1' | 'sha-384' | 'sha-512' | 'md5'

async function digest(algorithm: string, text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest(algorithm, data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function md5(text: string): string {
  function rotateLeft(value: number, shift: number): number {
    return (value << shift) | (value >>> (32 - shift))
  }

  function toWords(input: string): number[] {
    const bytes = new TextEncoder().encode(input)
    const bitLen = bytes.length * 8
    const words: number[] = []
    for (let i = 0; i < bytes.length; i++) {
      words[i >> 2] = (words[i >> 2] ?? 0) | (bytes[i]! << ((i % 4) * 8))
    }
    words[bitLen >> 5] = (words[bitLen >> 5] ?? 0) | (0x80 << (bitLen % 32))
    words[(((bitLen + 64) >>> 9) << 4) + 14] = bitLen
    return words
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return rotateLeft((a + ((b & c) | (~b & d)) + x + t) | 0, s) + b
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return rotateLeft((a + ((b & d) | (c & ~d)) + x + t) | 0, s) + b
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return rotateLeft((a + (b ^ c ^ d) + x + t) | 0, s) + b
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return rotateLeft((a + (c ^ (b | ~d)) + x + t) | 0, s) + b
  }

  const x = toWords(text)
  let a = 0x67452301
  let b = 0xefcdab89
  let c = 0x98badcfe
  let d = 0x10325476

  /* v8 ignore start -- MD5 rounds read sparse padded word indices */
  for (let i = 0; i < x.length; i += 16) {
    const oa = a
    const ob = b
    const oc = c
    const od = d

    a = ff(a, b, c, d, x[i] ?? 0, 7, 0xd76aa478)
    d = ff(d, a, b, c, x[i + 1] ?? 0, 12, 0xe8b7d7b6)
    c = ff(c, d, a, b, x[i + 2] ?? 0, 17, 0x242070db)
    b = ff(b, c, d, a, x[i + 3] ?? 0, 22, 0xc1bdceee)
    a = ff(a, b, c, d, x[i + 4] ?? 0, 7, 0xf57c0faf)
    d = ff(d, a, b, c, x[i + 5] ?? 0, 12, 0x4787c62a)
    c = ff(c, d, a, b, x[i + 6] ?? 0, 17, 0xa8304613)
    b = ff(b, c, d, a, x[i + 7] ?? 0, 22, 0xfd469501)
    a = ff(a, b, c, d, x[i + 8] ?? 0, 7, 0x698098d8)
    d = ff(d, a, b, c, x[i + 9] ?? 0, 12, 0x8b44f7af)
    c = ff(c, d, a, b, x[i + 10] ?? 0, 17, 0xffff5bb1)
    b = ff(b, c, d, a, x[i + 11] ?? 0, 22, 0x895cd7be)
    a = ff(a, b, c, d, x[i + 12] ?? 0, 7, 0x6b901122)
    d = ff(d, a, b, c, x[i + 13] ?? 0, 12, 0xfd987193)
    c = ff(c, d, a, b, x[i + 14] ?? 0, 17, 0xa679438e)
    b = ff(b, c, d, a, x[i + 15] ?? 0, 22, 0x49b40821)

    a = gg(a, b, c, d, x[i + 1] ?? 0, 5, 0xf61e2562)
    d = gg(d, a, b, c, x[i + 6] ?? 0, 9, 0xc040b340)
    c = gg(c, d, a, b, x[i + 11] ?? 0, 14, 0x265e5a51)
    b = gg(b, c, d, a, x[i] ?? 0, 20, 0xe9b6c7aa)
    a = gg(a, b, c, d, x[i + 5] ?? 0, 5, 0xd62f105d)
    d = gg(d, a, b, c, x[i + 10] ?? 0, 9, 0x02441453)
    c = gg(c, d, a, b, x[i + 15] ?? 0, 14, 0xd8a1e681)
    b = gg(b, c, d, a, x[i + 4] ?? 0, 20, 0xe7d3fbc8)
    a = gg(a, b, c, d, x[i + 9] ?? 0, 5, 0x21e1cde6)
    d = gg(d, a, b, c, x[i + 14] ?? 0, 9, 0xc33707d6)
    c = gg(c, d, a, b, x[i + 3] ?? 0, 14, 0xf4d50d87)
    b = gg(b, c, d, a, x[i + 8] ?? 0, 20, 0x455a14ed)
    a = gg(a, b, c, d, x[i + 13] ?? 0, 5, 0xa9e3e905)
    d = gg(d, a, b, c, x[i + 2] ?? 0, 9, 0xfcefa3f8)
    c = gg(c, d, a, b, x[i + 7] ?? 0, 14, 0x676f02d9)
    b = gg(b, c, d, a, x[i + 12] ?? 0, 20, 0x8d2a4c8a)

    a = hh(a, b, c, d, x[i + 5] ?? 0, 4, 0xfffa3942)
    d = hh(d, a, b, c, x[i + 8] ?? 0, 11, 0x8771f681)
    c = hh(c, d, a, b, x[i + 11] ?? 0, 16, 0x6d9d6122)
    b = hh(b, c, d, a, x[i + 14] ?? 0, 23, 0xfde5380c)
    a = hh(a, b, c, d, x[i + 1] ?? 0, 4, 0xa4beea44)
    d = hh(d, a, b, c, x[i + 4] ?? 0, 11, 0x4bdecfa9)
    c = hh(c, d, a, b, x[i + 7] ?? 0, 16, 0xf6bb4b60)
    b = hh(b, c, d, a, x[i + 10] ?? 0, 23, 0xbebfbc70)
    a = hh(a, b, c, d, x[i + 13] ?? 0, 4, 0x289b7ec6)
    d = hh(d, a, b, c, x[i] ?? 0, 11, 0xeaa127fa)
    c = hh(c, d, a, b, x[i + 3] ?? 0, 16, 0xd4ef3085)
    b = hh(b, c, d, a, x[i + 6] ?? 0, 23, 0x04881d05)
    a = hh(a, b, c, d, x[i + 9] ?? 0, 4, 0xd9d4d039)
    d = hh(d, a, b, c, x[i + 12] ?? 0, 11, 0xe6db99e5)
    c = hh(c, d, a, b, x[i + 15] ?? 0, 16, 0x1fa27cf8)
    b = hh(b, c, d, a, x[i + 2] ?? 0, 23, 0xc4ac5665)

    a = ii(a, b, c, d, x[i] ?? 0, 6, 0xf4292244)
    d = ii(d, a, b, c, x[i + 7] ?? 0, 10, 0x432aff97)
    c = ii(c, d, a, b, x[i + 14] ?? 0, 15, 0xab9423a7)
    b = ii(b, c, d, a, x[i + 5] ?? 0, 21, 0xfc93a039)
    a = ii(a, b, c, d, x[i + 12] ?? 0, 6, 0x655b59c3)
    d = ii(d, a, b, c, x[i + 3] ?? 0, 10, 0x8f0ccc92)
    c = ii(c, d, a, b, x[i + 10] ?? 0, 15, 0xffeff47d)
    b = ii(b, c, d, a, x[i + 1] ?? 0, 21, 0x85845dd1)
    a = ii(a, b, c, d, x[i + 8] ?? 0, 6, 0x6fa87e4f)
    d = ii(d, a, b, c, x[i + 15] ?? 0, 10, 0xfe2ce6e0)
    c = ii(c, d, a, b, x[i + 6] ?? 0, 15, 0xa3014314)
    b = ii(b, c, d, a, x[i + 13] ?? 0, 21, 0x4e0811a1)
    a = ii(a, b, c, d, x[i + 4] ?? 0, 6, 0xf7537e82)
    d = ii(d, a, b, c, x[i + 11] ?? 0, 10, 0xbd3af235)
    c = ii(c, d, a, b, x[i + 2] ?? 0, 15, 0x2ad7d2bb)
    b = ii(b, c, d, a, x[i + 9] ?? 0, 21, 0xeb86d391)

    a = (a + oa) | 0
    b = (b + ob) | 0
    c = (c + oc) | 0
    d = (d + od) | 0
  }
  /* v8 ignore stop */

  return [a, b, c, d]
    .map((n) => (n >>> 0).toString(16).padStart(8, '0'))
    .join('')
}

export async function runHashPreset(preset: HashPreset, input: string): Promise<string> {
  switch (preset) {
    case 'sha-256':
      return digest('SHA-256', input)
    case 'sha-1':
      return digest('SHA-1', input)
    case 'sha-384':
      return digest('SHA-384', input)
    case 'sha-512':
      return digest('SHA-512', input)
    case 'md5':
      return md5(input)
    default:
      return digest('SHA-256', input)
  }
}
