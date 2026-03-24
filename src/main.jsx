import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CarTracker from './CarTracker.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CarTracker />
  </StrictMode>,
)
