import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/_map/')({
  beforeLoad: () => {
    throw redirect({ to: '/buildings' })
  },
})