import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './shared/auth-context'
import { PosDraftProvider } from './shared/pos-draft-context'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <PosDraftProvider>
          <App />
        </PosDraftProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
)
