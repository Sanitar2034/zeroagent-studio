export type AppRoute = 'studio' | 'guide'

export function getRouteFromHash(): AppRoute {
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  return hash === 'guide' ? 'guide' : 'studio'
}

export function navigateTo(route: AppRoute): void {
  const next = route === 'guide' ? '#/guide' : '#/'
  if (window.location.hash !== next) {
    window.location.hash = next
  }
}

/** Open the in-app guide and scroll to a section (e.g. staying-safe). */
export function navigateToGuideSection(sectionId: string): void {
  navigateTo('guide')
  window.setTimeout(() => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 120)
}
