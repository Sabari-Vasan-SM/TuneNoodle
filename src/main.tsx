import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './style.css'
import { initializeSecurity } from './lib/security'

// Initialize security measures
initializeSecurity()

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

