import { useState } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import styles from './Auth.module.css'

export default function Auth() {
  const supabase = useSupabaseClient()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false) // waiting for email confirmation

  async function handle() {
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (error) throw error
      } else {
        if (!name.trim()) throw new Error('Please enter your full name')
        if (pass.length < 6) throw new Error('Password must be at least 6 characters')
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { data: { full_name: name.trim() } },
        })
        if (error) throw error

        // If Supabase returns a session immediately, email confirmation is disabled —
        // the user is already logged in and _app.js will handle the redirect.
        // If there's no session, they need to confirm their email first.
        if (!data.session) {
          setConfirmed(true) // show the "check your email" screen
        }
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Email confirmation pending screen ─────────────────────────────────────
  if (confirmed) {
    return (
      <div className={styles.screen}>
        <div className={styles.card}>
          <div className={styles.confirmIcon}>✉️</div>
          <div className={styles.title}>Check your email</div>
          <div className={styles.subtitle}>
            We sent a confirmation link to <strong>{email}</strong>.
            Click the link in that email to verify your account, then come back here to sign in.
          </div>
          <button
            className={styles.btn}
            onClick={() => { setConfirmed(false); setMode('login'); setPass('') }}
          >
            Go to sign in
          </button>
          <div className={styles.toggle}>
            Didn't get it? Check your spam folder, or{' '}
            <button className={styles.link} onClick={() => { setConfirmed(false); setMode('signup') }}>
              try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Login / Signup form ───────────────────────────────────────────────────
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.title}>{mode === 'login' ? 'Welcome back' : 'Create account'}</div>
        <div className={styles.subtitle}>
          {mode === 'login'
            ? 'Sign in to view or edit your picks.'
            : 'Join the competition. You can submit up to 2 entries.'}
        </div>
        {mode === 'signup' && (
          <div className={styles.group}>
            <label className={styles.label}>Full name</label>
            <input
              className={styles.input}
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        )}
        <div className={styles.group}>
          <label className={styles.label}>Email</label>
          <input
            className={styles.input}
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div className={styles.group}>
          <label className={styles.label}>Password</label>
          <input
            className={styles.input}
            type="password"
            placeholder="••••••••"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()}
          />
        </div>
        {error && <div className={styles.error}>{error}</div>}
        <button className={styles.btn} onClick={handle} disabled={loading}>
          {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <div className={styles.toggle}>
          {mode === 'login'
            ? <>New here? <button className={styles.link} onClick={() => { setMode('signup'); setError('') }}>Create account</button></>
            : <>Already have an account? <button className={styles.link} onClick={() => { setMode('login'); setError('') }}>Sign in</button></>}
        </div>
      </div>
    </div>
  )
}
