import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/fredoka/500.css'
import '@fontsource/fredoka/600.css'
import '@fontsource/fredoka/700.css'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import './index.css'
import App from './App'
import { registerSW } from 'virtual:pwa-register'

// Offline support: caches the whole app (content, fonts, audio) after the first visit.
if (import.meta.env.PROD) registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
