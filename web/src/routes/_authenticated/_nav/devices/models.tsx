import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/_nav/devices/models')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/_nav/devices/models"!</div>
}
