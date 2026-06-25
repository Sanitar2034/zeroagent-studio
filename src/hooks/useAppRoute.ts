import { useEffect, useState } from 'react'
import { getRouteFromHash, type AppRoute } from '../lib/appRoute'

export function useAppRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromHash())

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return route
}
