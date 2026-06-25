/** New users and cleared preferences resolve to session storage. */
export const DEFAULT_KEY_PERSISTENCE = 'session' as const

export const KEY_STORAGE_ONBOARDING_NOTE =
  'When you paste a key, the default is Forget when I close the browser — keys are not saved after you quit. That protects you on shared or borrowed PCs. In Privacy & keys you can switch to Remember on this device when only you use this login.'

export const KEY_PERSISTENCE_SESSION_DESCRIPTION =
  'Default for new users. Keys live only for this browsing session and disappear when you close the tab or quit the browser. Choose this on a shared PC, at school or a library, on a friend\'s desk, or whenever someone else might use this computer or the same OS login.'

export const KEY_PERSISTENCE_LOCAL_DESCRIPTION =
  'Reasonable when this operating-system user account is personal — you are the only person who signs into this profile, you keep the screen locked, and you trust no one else will use your logged-in session. Keys stay in the browser until you clear site data. Another person on a different OS account on the same machine usually has a separate browser profile; the risk is mainly someone using your same login.'
