import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from '@/app/App'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { ThemeProvider } from '@/features/auth/ThemeContext'
import { startAutoSync } from '@/lib/syncHandler'

// No mock data initialization - using Supabase real-time data

// Closes the offline-queue loop for citizen report forms: retries queued
// submissions automatically when connectivity returns, plus a periodic
// safety-net sync. Scoped to reporting only - responders/admins assume
// connectivity and are not part of this offline-first path.
startAutoSync();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
