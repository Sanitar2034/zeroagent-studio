export function parseUrlTool(input: string): string {
  const raw = input.trim()
  if (!raw) throw new Error('No URL provided')
  const url = new URL(raw)
  const params: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })
  return JSON.stringify(
    {
      href: url.href,
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      origin: url.origin,
      params,
    },
    null,
    2
  )
}
