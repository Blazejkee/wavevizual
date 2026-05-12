import React, { useState, useEffect } from 'react'
import AppShell from './components/AppShell'
import LandingPage from './components/LandingPage'
import AuthModal from './components/AuthModal'
import AccountModal from './components/AccountModal'
import { getMe } from './api/client'
import { useProjectStore } from './store/useProjectStore'

export default function App() {
  const [view, setView]         = useState<'landing' | 'editor'>('landing')
  const [showAuth, setShowAuth] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const { user, setUser } = useProjectStore()

  useEffect(() => {
    document.body.classList.toggle('editor-view', view === 'editor')
  }, [view])

  useEffect(() => {
    const token = localStorage.getItem('wv_token')
    if (token && !user) {
      getMe().then(u => setUser(u)).catch(() => localStorage.removeItem('wv_token'))
    }
  }, [])

  function handleAuthSuccess(_token: string, u: { id: string; email: string; token_balance: number }) {
    setUser(u)
    setShowAuth(false)
  }

  function handleSignOut() {
    localStorage.removeItem('wv_token')
    setUser(null)
    setShowAccount(false)
  }

  return (
    <>
      {showAuth && (
        <AuthModal onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} />
      )}
      {showAccount && user && (
        <AccountModal onClose={() => setShowAccount(false)} onSignOut={handleSignOut} />
      )}
      {view === 'editor'
        ? <AppShell
            onHome={() => setView('landing')}
            onSignIn={() => setShowAuth(true)}
            onSignOut={handleSignOut}
            onAccount={() => setShowAccount(true)}
          />
        : <LandingPage
            onStart={() => setView('editor')}
            onSignIn={() => setShowAuth(true)}
            onSignOut={handleSignOut}
            onAccount={() => setShowAccount(true)}
          />
      }
    </>
  )
}
