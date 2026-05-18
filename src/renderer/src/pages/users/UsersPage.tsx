import { type FormEvent, useEffect, useState } from 'react'
import type { UserAccount, UserRole } from '../../../../shared/types'
import { createUserSchema, resetUserPasswordSchema, updateUserSchema } from '@/features/users/schemas'
import { useAuth } from '@/shared/auth-context'

type UserFormState = {
  username: string
  name: string
  password: string
  role: UserRole
}

type ResetPasswordFormState = {
  newPassword: string
  confirmPassword: string
}

const defaultUserForm: UserFormState = {
  username: '',
  name: '',
  password: '',
  role: 'vendor',
}

const defaultResetPasswordForm: ResetPasswordFormState = {
  newPassword: '',
  confirmPassword: '',
}

function getRoleLabel(role: UserRole) {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'vendor':
      return 'Vendedor'
    case 'stock':
      return 'Stock'
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getErrorMessage(error: string) {
  switch (error) {
    case 'validation_error':
      return 'Hay datos inválidos en el formulario de usuarios.'
    case 'username_taken':
      return 'Ese nombre de usuario ya existe. Elegí otro.'
    case 'user_not_found':
      return 'El usuario ya no existe. Recargá la lista.'
    case 'last_active_admin':
      return 'No podés dejar al sistema sin un admin activo. Primero asegurate de que exista otro.'
    case 'forbidden':
      return 'Solo admin puede gestionar usuarios.'
    case 'unauthorized':
      return 'La sesión expiró. Volvé a iniciar sesión.'
    default:
      return 'No se pudo guardar el usuario. Revisá los datos e intentá de nuevo.'
  }
}

export function UsersPage() {
  const { user, refreshUser } = useAuth()
  const [users, setUsers] = useState<UserAccount[]>([])
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null)
  const [userForm, setUserForm] = useState<UserFormState>(defaultUserForm)
  const [resetPasswordForm, setResetPasswordForm] = useState<ResetPasswordFormState>(defaultResetPasswordForm)
  const [loading, setLoading] = useState(true)
  const [savingUser, setSavingUser] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadUsers() {
    setLoading(true)
    setError(null)

    const response = await window.api.users.list()
    if (!response.ok) {
      setError(getErrorMessage(response.error))
      setLoading(false)
      return
    }

    setUsers(response.data)
    setLoading(false)
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const resetEditor = () => {
    setEditingUser(null)
    setUserForm(defaultUserForm)
    setResetPasswordForm(defaultResetPasswordForm)
  }

  const startEditing = (targetUser: UserAccount) => {
    setEditingUser(targetUser)
    setUserForm({
      username: targetUser.username,
      name: targetUser.name,
      password: '',
      role: targetUser.role,
    })
    setResetPasswordForm(defaultResetPasswordForm)
    setError(null)
    setFeedback(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setFeedback(null)

    setSavingUser(true)

    try {
      const response = editingUser
        ? await (async () => {
            const parsed = updateUserSchema.safeParse({ name: userForm.name, role: userForm.role })

            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? 'Revisá el formulario del usuario.')
              return null
            }

            return window.api.users.update({
              id: editingUser.id,
              name: parsed.data.name,
              role: parsed.data.role,
            })
          })()
        : await (async () => {
            const parsed = createUserSchema.safeParse(userForm)

            if (!parsed.success) {
              setError(parsed.error.issues[0]?.message ?? 'Revisá el formulario del usuario.')
              return null
            }

            return window.api.users.create({
              username: parsed.data.username,
              name: parsed.data.name,
              password: parsed.data.password,
              role: parsed.data.role,
            })
          })()

      if (!response) {
        return
      }

      if (!response.ok) {
        setError(getErrorMessage(response.error))
        return
      }

      const willLoseAdminAccess = user?.id === response.data.id && (!response.data.active || response.data.role !== 'admin')

      if (willLoseAdminAccess) {
        await refreshUser()
        return
      }

      await loadUsers()
      if (user?.id === response.data.id) {
        await refreshUser()
      }

      setFeedback(editingUser ? 'Usuario actualizado.' : 'Usuario creado.')
      resetEditor()
    } finally {
      setSavingUser(false)
    }
  }

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editingUser) {
      return
    }

    setError(null)
    setFeedback(null)

    const parsed = resetUserPasswordSchema.safeParse(resetPasswordForm)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisá la nueva contraseña.')
      return
    }

    setResettingPassword(true)

    try {
      const response = await window.api.users.resetPassword({
        id: editingUser.id,
        newPassword: parsed.data.newPassword,
      })

      if (!response.ok) {
        setError(getErrorMessage(response.error))
        return
      }

      const requiresPasswordChangeNow = user?.id === response.data.id && response.data.mustChangePassword

      if (requiresPasswordChangeNow) {
        await refreshUser()
        return
      }

      await loadUsers()
      if (user?.id === response.data.id) {
        await refreshUser()
      }

      setResetPasswordForm(defaultResetPasswordForm)
      setFeedback('Contraseña reseteada. El usuario deberá cambiarla al iniciar sesión.')
    } finally {
      setResettingPassword(false)
    }
  }

  const handleToggleActive = async (targetUser: UserAccount) => {
    setError(null)
    setFeedback(null)
    setTogglingUserId(targetUser.id)

    try {
      const response = await window.api.users.setActive({
        id: targetUser.id,
        active: !targetUser.active,
      })

      if (!response.ok) {
        setError(getErrorMessage(response.error))
        return
      }

      const willLoseAdminAccess = user?.id === response.data.id && (!response.data.active || response.data.role !== 'admin')

      if (willLoseAdminAccess) {
        await refreshUser()
        return
      }

      if (editingUser?.id === targetUser.id) {
        resetEditor()
      }

      await loadUsers()
      if (user?.id === targetUser.id) {
        await refreshUser()
      }

      setFeedback(targetUser.active ? 'Usuario desactivado.' : 'Usuario reactivado.')
    } finally {
      setTogglingUserId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Fase 1</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Usuarios y permisos</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Acá definís quién entra, qué rol tiene y si sigue activo. La seguridad mínima de un sistema no es opcional: si cualquiera toca todo, después el problema no es el software, es el criterio.
        </p>
        {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        {feedback ? <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{feedback}</p> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">{editingUser ? 'Editar usuario' : 'Alta de usuario'}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {editingUser
                    ? 'Podés corregir nombre y rol. El username queda fijo para no romper el acceso.'
                    : 'Creá admins, vendedores o usuarios de stock con una contraseña inicial.'}
                </p>
              </div>
              {editingUser ? (
                <button type="button" onClick={resetEditor} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800">
                  Cancelar edición
                </button>
              ) : null}
            </div>

            <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
              <label className="block space-y-2 text-sm text-slate-300">
                <span>Usuario</span>
                <input
                  value={userForm.username}
                  onChange={(event) => setUserForm((current) => ({ ...current, username: event.target.value }))}
                  disabled={Boolean(editingUser)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="maria.stock"
                />
              </label>

              <label className="block space-y-2 text-sm text-slate-300">
                <span>Nombre</span>
                <input
                  value={userForm.name}
                  onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                  placeholder="María Pérez"
                />
              </label>

              <label className="block space-y-2 text-sm text-slate-300">
                <span>Rol</span>
                <select
                  value={userForm.role}
                  onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value as UserRole }))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                >
                  <option value="admin">Admin</option>
                  <option value="vendor">Vendedor</option>
                  <option value="stock">Stock</option>
                </select>
              </label>

              {!editingUser ? (
                <label className="block space-y-2 text-sm text-slate-300">
                  <span>Contraseña inicial</span>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    placeholder="Mínimo 8 caracteres"
                  />
                </label>
              ) : null}

              <button type="submit" disabled={savingUser} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70">
                {savingUser ? 'Guardando usuario...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </form>
          </div>

          {editingUser ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <h3 className="text-xl font-semibold text-white">Reset de contraseña</h3>
              <p className="mt-1 text-sm text-slate-400">Definí una nueva clave temporal. El usuario la tendrá que cambiar en su próximo ingreso.</p>

              <form className="mt-5 space-y-3" onSubmit={handleResetPassword}>
                <label className="block space-y-2 text-sm text-slate-300">
                  <span>Nueva contraseña</span>
                  <input
                    type="password"
                    value={resetPasswordForm.newPassword}
                    onChange={(event) => setResetPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    placeholder="Mínimo 8 caracteres"
                  />
                </label>

                <label className="block space-y-2 text-sm text-slate-300">
                  <span>Confirmar nueva contraseña</span>
                  <input
                    type="password"
                    value={resetPasswordForm.confirmPassword}
                    onChange={(event) => setResetPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                    placeholder="Repetí la contraseña"
                  />
                </label>

                <button type="submit" disabled={resettingPassword} className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-medium text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-70">
                  {resettingPassword ? 'Reseteando contraseña...' : 'Resetear contraseña'}
                </button>
              </form>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-xl font-semibold text-white">Listado de usuarios</h3>
          <p className="mt-1 text-sm text-slate-400">El último admin activo no se puede desactivar ni convertir a otro rol. Esa es la línea roja mínima.</p>

          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-800">
            <div className="grid grid-cols-[1.2fr_1.1fr_0.8fr_0.9fr_1fr] gap-3 bg-slate-950/90 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <span>Usuario</span>
              <span>Nombre</span>
              <span>Rol</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>

            {loading ? <p className="px-4 py-6 text-sm text-slate-400">Cargando usuarios...</p> : null}
            {!loading && users.length === 0 ? <p className="px-4 py-6 text-sm text-slate-400">Todavía no hay usuarios cargados.</p> : null}

            <div className="divide-y divide-slate-800 bg-slate-900/60">
              {users.map((targetUser) => (
                <article key={targetUser.id} className="grid grid-cols-[1.2fr_1.1fr_0.8fr_0.9fr_1fr] gap-3 px-4 py-4 text-sm text-slate-200">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">@{targetUser.username}</p>
                      {user?.id === targetUser.id ? <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Sesión actual</span> : null}
                      {targetUser.mustChangePassword ? <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Debe cambiar clave</span> : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Creado {formatDate(targetUser.createdAt)}</p>
                  </div>
                  <span>{targetUser.name}</span>
                  <span>{getRoleLabel(targetUser.role)}</span>
                  <span>{targetUser.active ? 'Activo' : 'Inactivo'}</span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => startEditing(targetUser)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-800">
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(targetUser)}
                      disabled={togglingUserId === targetUser.id}
                      className={`rounded-xl border px-3 py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-70 ${targetUser.active ? 'border-rose-500/30 text-rose-200 hover:bg-rose-500/10' : 'border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10'}`}
                    >
                      {togglingUserId === targetUser.id ? 'Guardando...' : targetUser.active ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
