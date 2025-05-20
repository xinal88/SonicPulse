import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import PlayerContextProvider from './context/PlayerContext.jsx'
import AuthSync from './components/AuthSync'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import ClerkWrapper from './components/ClerkWrapper.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkWrapper publishableKey={PUBLISHABLE_KEY}>
      <BrowserRouter>
        <PlayerContextProvider>
          <AuthSync />
          <App />
          <ToastContainer position="bottom-right" autoClose={3000} />
        </PlayerContextProvider>
      </BrowserRouter>
    </ClerkWrapper>
  </StrictMode>,
)
