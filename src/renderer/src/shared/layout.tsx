import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { UserRole } from '../../../shared/types'
import { useAuth } from './auth-context'
import { usePosDraft } from './pos-draft-context'

type NavItem = {
  to: string
  label: string
  description: string
}

const navByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { to: '/dashboard', label: 'Dashboard', description: 'Resumen operativo del local' },
    { to: '/products', label: 'Productos', description: 'Catálogo y stock visible' },
    { to: '/suppliers', label: 'Proveedores', description: 'Relación con abastecimiento' },
    { to: '/inventory', label: 'Inventario', description: 'Entradas y ajustes' },
    { to: '/offers', label: 'Ofertas', description: 'Promociones por producto' },
    { to: '/customers', label: 'Clientes', description: 'Ficha e historial comercial' },
    { to: '/users', label: 'Usuarios', description: 'Alta, edición y desactivación' },
    { to: '/reports', label: 'Reportes', description: 'Ventas del día y del mes' },
    { to: '/audit', label: 'Auditoría', description: 'Trazabilidad de acciones' },
  ],
  vendor: [
    { to: '/pos', label: 'POS', description: 'Cobro rápido y ticket' },
    { to: '/customers', label: 'Clientes', description: 'Historial y alta rápida' },
  ],
  stock: [
    { to: '/products', label: 'Productos', description: 'Catálogo y stock visible' },
    { to: '/suppliers', label: 'Proveedores', description: 'Gestión de reposición' },
    { to: '/inventory', label: 'Inventario', description: 'Entradas y ajustes' },
    { to: '/offers', label: 'Ofertas', description: 'Promociones vigentes' },
  ],
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const { hasPendingCart, clearPendingCart } = usePosDraft()
  const location = useLocation()
  const navigate = useNavigate()

  if (!user) {
    return null
  }

  const handleLogout = async () => {
    if (hasPendingCart) {
      const confirmed = window.confirm('Tenés productos en el carrito del POS sin confirmar. ¿Seguro que querés cerrar sesión?')

      if (!confirmed) {
        return
      }
    }

    await logout()
    clearPendingCart()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-800 bg-slate-900/80 p-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">Mis Trapitos POS</p>
            <h1 className="text-2xl font-semibold">Operación offline</h1>
            <p className="text-sm text-slate-400">Mono-PC, SQLite local y roles estrictos. Bien, como tiene que ser.</p>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-sm text-slate-400">@{user.username}</p>
            <p className="mt-3 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              Rol: {user.role}
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {navByRole[user.role].map((item) => {
              const isActive = location.pathname === item.to

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    'block rounded-2xl border px-4 py-3 transition',
                    isActive
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                      : 'border-slate-800 bg-slate-950/50 text-slate-200 hover:border-slate-700 hover:bg-slate-900',
                  ].join(' ')}
                >
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-slate-400">{item.description}</p>
                </Link>
              )
            })}
          </nav>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-8 w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
          >
            Cerrar sesión
          </button>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Fases 1, 2, 3, 4, 5 y 6 en evolución</p>
                <h2 className="text-xl font-semibold">Operación offline con ventas, auditoría y reportes básicos</h2>
              </div>
              <div className="rounded-full border border-slate-800 px-4 py-2 text-sm text-slate-300">
                Main process + SQLite + IPC por dominio
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
