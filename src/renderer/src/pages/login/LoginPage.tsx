import { useMemo, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LoginSchema } from '@/features/auth/schemas'
import { useAuth } from '@/shared/auth-context'

function getErrorMessage(error: string) {
  switch (error) {
    case 'invalid_credentials':
      return 'Usuario o contraseña incorrectos.'
    case 'validation_error':
      return 'Completa usuario y contraseña.'
    default:
      return 'No pudimos iniciar sesión. Inténtalo de nuevo.'
  }
}

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ username: 'admin', password: 'admin123' })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const nextPath = useMemo(() => {
    if (user?.mustChangePassword) {
      return '/change-password'
    }

    if (location.state && typeof location.state === 'object' && 'from' in location.state) {
      const from = location.state.from
      if (from && typeof from === 'object' && 'pathname' in from && typeof from.pathname === 'string') {
        return from.pathname
      }
    }

    if (user?.role === 'vendor') {
      return '/pos'
    }

    if (user?.role === 'stock') {
      return '/products'
    }

    return '/dashboard'
  }, [location.state, user])

  if (user) {
    return <Navigate to={nextPath} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const parsed = LoginSchema.safeParse(form)

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Completa el formulario.')
      return
    }

    setSubmitting(true)
    const response = await login(parsed.data)
    setSubmitting(false)

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden flex-col justify-between border-r border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(2,6,23,1))] p-10 text-slate-50 lg:flex">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-400">Mis Trapitos POS</p>
          <div className="space-y-3">
            <h1 className="max-w-xl text-5xl font-semibold leading-tight">
              Acceso local con roles definidos y control de operación.
            </h1>
            <p className="max-w-lg text-lg text-slate-300">
              Electron + React + SQLite.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['Admin', 'Configura usuarios y supervisa operación.'],
            ['Vendedor', 'Entra directo al POS para atender rápido.'],
            ['Almacenista', 'Mantiene catálogo, inventario y ofertas.'],
          ].map(([title, description]) => (
            <div key={title} className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
              <p className="text-sm font-semibold text-emerald-300">{title}</p>
              <p className="mt-2 text-sm text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <div className="space-y-2 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Bienvenido</p>
            <h2 className="text-3xl font-semibold text-slate-50">Inicia sesión</h2>
            <p className="text-sm text-slate-400">Seed inicial listo: admin / admin123</p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Usuario</span>
              <input
                value={form.username}
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none transition focus:border-emerald-400"
                autoComplete="username"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Contraseña</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none transition focus:border-emerald-400"
                autoComplete="current-password"
              />
            </label>

            {error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Ingresando...' : 'Entrar al sistema'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
