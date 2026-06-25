import { create } from 'zustand'

export type ConfirmVariant = 'danger' | 'default'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  /** When true, only an OK button is shown (informational). */
  alertOnly?: boolean
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void
}

interface ConfirmState {
  pending: PendingConfirm | null
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: Omit<ConfirmOptions, 'alertOnly' | 'confirmLabel' | 'cancelLabel'>) => Promise<void>
  respond: (confirmed: boolean) => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  pending: null,

  confirm: (options) =>
    new Promise<boolean>((resolve) => {
      set({
        pending: {
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel ?? 'Continue',
          cancelLabel: options.cancelLabel ?? 'Cancel',
          variant: options.variant ?? 'danger',
          alertOnly: false,
          resolve,
        },
      })
    }),

  alert: (options) =>
    new Promise<void>((resolve) => {
      set({
        pending: {
          title: options.title,
          message: options.message,
          confirmLabel: 'OK',
          cancelLabel: undefined,
          variant: options.variant ?? 'default',
          alertOnly: true,
          resolve: () => resolve(),
        },
      })
    }),

  respond: (confirmed) => {
    const pending = get().pending
    if (!pending) return
    pending.resolve(confirmed)
    set({ pending: null })
  },
}))
