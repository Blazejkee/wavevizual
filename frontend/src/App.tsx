import React, { useState, useEffect } from 'react'
import AppShell from './components/AppShell'
import LandingPage from './components/LandingPage'
import AuthModal from './components/AuthModal'
import AccountModal from './components/AccountModal'
import BlogPage from './components/BlogPage'
import LegalPage from './components/LegalPage'
import { getMe } from './api/client'
import { useProjectStore } from './store/useProjectStore'

export type AppView = 'landing' | 'editor' | 'blog' | 'legal'

export default function App() {
  const [view, setView]               = useState<AppView>('landing')
  const [showAuth, setShowAuth]       = useState(false)
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

  const commonProps = {
    onSignIn:  () => setShowAuth(true),
    onSignOut: handleSignOut,
    onAccount: () => setShowAccount(true),
    onHome:    () => setView('landing'),
    onBlog:    () => setView('blog'),
    onLegal:   () => setView('legal'),
  }

  return (
    <>
      {showAuth && (
        <AuthModal onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} />
      )}
      {showAccount && user && (
        <AccountModal onClose={() => setShowAccount(false)} onSignOut={handleSignOut} />
      )}

      {view === 'editor' && (
        <AppShell
          onHome={() => setView('landing')}
          onSignIn={commonProps.onSignIn}
          onSignOut={commonProps.onSignOut}
          onAccount={commonProps.onAccount}
        />
      )}
      {view === 'landing' && (
        <LandingPage onStart={() => setView('editor')} {...commonProps} />
      )}
      {view === 'blog' && (
        <BlogPage {...commonProps} />
      )}
      {view === 'legal' && (
        <LegalPage {...commonProps} />
      )}
    </>
  )
}
