import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthGate } from './auth'
import { MetconSimulatorPage } from './MetconSimulatorPage'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <MetconSimulatorPage />
    </AuthGate>
  </StrictMode>,
)
