import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/pages/login/LoginPage'
import { ChangePasswordPage } from '@/pages/login/ChangePasswordPage'
import { CatalogPage } from '@/pages/catalog/CatalogPage'
import { SuppliersPage } from '@/pages/catalog/SuppliersPage'
import { CustomersPage } from '@/pages/customers/CustomersPage'
import { InventoryPage } from '@/pages/inventory/InventoryPage'
import { OffersPage } from '@/pages/offers/OffersPage'
import { PosPage } from '@/pages/pos/PosPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { AuditPage } from '@/pages/audit/AuditPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { useAuth } from '@/shared/auth-context'
import { AppLayout } from '@/shared/layout'
import { ProtectedRoute } from '@/shared/protected-route'
import { RoleRoute } from '@/shared/role-route'

function HomeRedirect() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'vendor') {
    return <Navigate to="/pos" replace />
  }

  if (user.role === 'stock') {
    return <Navigate to="/products" replace />
  }

  return <Navigate to="/reports" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route element={<AppLayout />}>
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/dashboard" element={<Navigate to="/reports" replace />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/audit" element={<AuditPage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['admin', 'vendor']} />}>
            <Route path="/pos" element={<PosPage />} />
            <Route path="/customers" element={<CustomersPage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['admin', 'stock']} />}>
            <Route path="/products" element={<CatalogPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/offers" element={<OffersPage />} />
          </Route>

          <Route path="/" element={<HomeRedirect />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
