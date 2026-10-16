// First, so the translations are in place before anything renders.
import '#/lib/i18n'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { getRouter } from './router'
import { registerServiceWorker } from '#/lib/pwa'

const router = getRouter()

registerServiceWorker(router)

const rootElement = document.getElementById('app')!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(<RouterProvider router={router} />)
}
