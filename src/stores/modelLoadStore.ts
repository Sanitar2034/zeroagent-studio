import { create } from 'zustand'

interface ModelLoadState {
  isLoading: boolean
  engineName: string
  progress: number
  statusText: string
  setLoading: (loading: boolean, engineName?: string) => void
  setProgress: (progress: number, statusText: string) => void
  reset: () => void
}

export const useModelLoadStore = create<ModelLoadState>((set) => ({
  isLoading: false,
  engineName: '',
  progress: 0,
  statusText: '',

  setLoading: (loading, engineName = '') =>
    set({ isLoading: loading, engineName, progress: loading ? 0 : 0, statusText: '' }),

  setProgress: (progress, statusText) =>
    set({ progress, statusText }),

  reset: () =>
    set({ isLoading: false, engineName: '', progress: 0, statusText: '' }),
}))

export function createModelLoadCallback(engineName: string) {
  const store = useModelLoadStore.getState()
  store.setLoading(true, engineName)
  return (report: { text: string; progress: number }) => {
    useModelLoadStore.getState().setProgress(report.progress, report.text)
    if (report.progress >= 1) {
      setTimeout(() => useModelLoadStore.getState().reset(), 1500)
    }
  }
}
