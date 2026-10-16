import { SidebarProvider } from '#/components/ui/sidebar'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import {
  getGetAccountPreferencesQueryOptions,
  useGetAccountPreferences,
} from '#/api/auth/auth'
import { currentUserQueryOptions } from '#/lib/auth'
import { applyTheme, watchSystemTheme } from '#/lib/theme'
import { applyLanguage } from '#/lib/i18n'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const response = await context.queryClient.ensureQueryData(
      currentUserQueryOptions,
    )

    if (response.status !== 200) {
      throw redirect({
        to: '/auth/login',
        search: { redirect: location.href },
      })
    }

    const preferences = await context.queryClient.ensureQueryData(
      getGetAccountPreferencesQueryOptions(),
    )
    if (preferences.status === 200) {
      applyTheme(preferences.data.theme)
      applyLanguage(preferences.data.language)
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <SidebarProvider
      className="max-md:h-svh max-md:flex-col"
      style={{ '--sidebar-width': '30rem' } as CSSProperties}
    >
      <PreferencesSync />
      <Outlet />
    </SidebarProvider>
  )
}

/**
 * Applies the saved theme and language whenever they change, and follows the
 * OS while the theme is "system".
 */
function PreferencesSync() {
  const { data } = useGetAccountPreferences()
  const preferences = data?.status === 200 ? data.data : undefined
  const theme = preferences?.theme
  const language = preferences?.language

  useEffect(() => {
    if (language) applyLanguage(language)
  }, [language])

  useEffect(() => {
    if (!theme) return

    applyTheme(theme)

    return watchSystemTheme(theme)
  }, [theme])

  return null
}
