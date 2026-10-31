import { useState, type FormEvent } from 'react'
import { Logo } from '../components/Layout'
import { useAuth } from '../lib/auth'

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') await login(email, password)
      else await register(name, email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-12 text-white lg:flex">
        <span className="flex items-center gap-2 text-lg font-bold">
          <img src="/favicon.svg" alt="" className="h-8 w-8 rounded-lg ring-2 ring-white/30" /> Warranty Wallet
        </span>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Never lose a receipt.
            <br />
            Never miss a warranty.
          </h1>
          <p className="mt-4 max-w-md text-indigo-100">
            Snap your receipt when you buy something. When it breaks, you'll know in seconds whether it's still covered,
            with the proof ready to show.
          </p>
          <ul className="mt-8 space-y-3 text-indigo-50">
            <li>📸 Every receipt in one place</li>
            <li>⏳ A countdown for every warranty</li>
            <li>🔔 Calendar reminders before coverage ends</li>
          </ul>
        </div>
        <p className="text-sm text-indigo-200">Built on Appwrite TablesDB</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold">{mode === 'login' ? 'Welcome back' : 'Create your wallet'}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'login' ? 'Log in to see your warranties.' : 'It takes 10 seconds.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label" htmlFor="name">
                  Name
                </label>
                <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="input"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === 'register' && <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>}
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              className="font-semibold text-indigo-600 hover:text-indigo-500"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError(null)
              }}
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
