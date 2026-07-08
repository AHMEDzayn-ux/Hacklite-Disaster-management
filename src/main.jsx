import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { startAutoSync } from './utils/syncHandler.js'

// No mock data initialization - using Supabase real-time data

// Closes the offline-queue loop for citizen report forms: retries queued
// submissions automatically when connectivity returns, plus a periodic
// safety-net sync. Scoped to reporting only - responders/admins assume
// connectivity and are not part of this offline-first path.
startAutoSync();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
