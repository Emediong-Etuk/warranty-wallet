import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-bold text-slate-900">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      <span className="text-lg tracking-tight">Warranty Wallet</span>
    </span>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:block">{user?.name || user?.email}</span>
            <button onClick={logout} className="btn-secondary px-3 py-1.5">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
