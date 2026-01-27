import { useEffect } from 'react'
import { loginWithMicrosoft } from '../services/api'
import './LoginPage.css'

export default function LoginPage() {
  useEffect(() => {
    // Check if redirected from OAuth callback
    const params = new URLSearchParams(window.location.search)
    if (params.get('code')) {
      // OAuth callback - let backend handle it via redirect
      window.location.href = '/auth/callback?' + window.location.search.substring(1)
    }
  }, [])

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Context Orchestrator</h1>
        <p className="subtitle">Convert meeting transcripts to actionable tasks</p>

        <div className="login-content">
          <p className="description">
            Connect your Microsoft 365 account to get started. Your tasks will be created in your personal ClickUp list.
          </p>

          <button
            className="login-button"
            onClick={() => loginWithMicrosoft()}
            aria-label="Sign in with Microsoft account"
          >
            <svg width="20" height="20" viewBox="0 0 21 21" fill="currentColor">
              <path d="M0 0h9v9H0V0zm11 0h10v9H11V0zM0 11h9v10H0V11zm11 0h10v10H11V11z" />
            </svg>
            Sign in with Microsoft
          </button>
        </div>

        <footer className="login-footer">
          <p>You'll need:</p>
          <ul>
            <li>Microsoft 365 account</li>
            <li>ClickUp workspace access</li>
            <li>Fireflies.ai meeting data</li>
          </ul>
        </footer>
      </div>
    </div>
  )
}
