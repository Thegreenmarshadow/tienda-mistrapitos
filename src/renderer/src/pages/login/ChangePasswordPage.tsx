import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ChangePasswordSchema } from '@/features/auth/schemas'
import { useAuth } from '@/shared/auth-context'

function getErrorMessage(error: string) {
  switch (error) {
    case 'invalid_credentials':
      return 'La contraseña actual no coincide.'
    case 'validation_error':
      return 'Revisa los datos ingresados.'
    case 'unauthorized':
      return 'Tu sesión expiró. Vuelve a iniciar sesión.'
    default:
      return 'No pudimos actualizar la contraseña.'
  }
}

export function ChangePasswordPage() {
  const { user, changePassword } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    currentPassword: 'admin123',
    newPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.mustChangePassword) {
    return <Navigate to={user.role === 'vendor' ? '/pos' : user.role === 'stock' ? '/products' : '/dashboard'} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const parsed = ChangePasswordSchema.safeParse(form)

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa el formulario.')
      return
    }

    setSubmitting(true)
    const response = await changePassword({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    })
    setSubmitting(false)

    if (!response.ok) {
      setError(getErrorMessage(response.error))
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-400">Acción requerida</p>
          <h1 className="text-3xl font-semibold text-slate-50">Cambia la contraseña inicial</h1>
          <p className="text-sm text-slate-400">
            Para proteger el acceso, debes cambiar la contraseña inicial antes de continuar.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Contraseña actual</span>
            <input
              type="password"
              value={form.currentPassword}
              onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none transition focus:border-amber-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Nueva contraseña</span>
            <input
              type="password"
              value={form.newPassword}
              onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none transition focus:border-amber-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Confirmar nueva contraseña</span>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none transition focus:border-amber-400"
            />
          </label>

          {error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Actualizando...' : 'Guardar contraseña nueva'}
          </button>
        </form>
      </div>
    </main>
  )
}
