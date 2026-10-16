/// <reference types="vite-plugin-pwa/vanillajs" />
import type { AnyRouter } from '@tanstack/react-router'
import { registerSW } from 'virtual:pwa-register'

/** An installed app can stay open for days; this is how often it looks for a deploy. */
const UPDATE_INTERVAL_MS = 60 * 60 * 1000

/**
 * Registers the service worker and keeps the app on the deployed version.
 *
 * The worker serves the app from its precache, so a deploy only reaches the
 * page once a new worker has installed and the page has reloaded. Browsers
 * look for a new worker on navigation, which a single-page app hardly does, so
 * this also checks when the tab comes back and once an hour.
 *
 * The reload waits for the next in-app navigation, or for the tab to be
 * hidden, so it doesn't throw a half-filled form.
 */
export function registerServiceWorker(router: AnyRouter) {
  let updateReady = false

  registerSW({
    immediate: true,
    onNeedReload() {
      if (document.visibilityState === 'hidden') window.location.reload()
      else updateReady = true
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return

      const check = () => {
        if (navigator.onLine) void registration.update()
      }

      setInterval(check, UPDATE_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  document.addEventListener('visibilitychange', () => {
    if (updateReady && document.visibilityState === 'hidden') {
      window.location.reload()
    }
  })

  // Loading the destination in full instead of routing to it on the old code.
  router.subscribe('onBeforeNavigate', ({ toLocation, pathChanged }) => {
    if (updateReady && pathChanged) window.location.assign(toLocation.href)
  })
}
