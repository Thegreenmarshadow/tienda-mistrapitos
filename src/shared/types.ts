export type UserRole = 'admin' | 'vendor' | 'stock'

export type PaymentMethod = 'cash' | 'card' | 'transfer'

export type OfferStatus = 'active' | 'scheduled' | 'expired'

export type StockMovementReason = 'sale' | 'entry' | 'adjustment'

export type ReportPeriod = 'today' | 'month' | 'custom'

export type SessionUser = {
  id: number
  username: string
  name: string
  role: UserRole
  active: boolean
  mustChangePassword: boolean
}

export type UserAccount = {
  id: number
  username: string
  name: string
  role: UserRole
  active: boolean
  mustChangePassword: boolean
  createdAt: string
  updatedAt: string
}

export type CreateUserInput = {
  username: string
  name: string
  password: string
  role: UserRole
}

export type UpdateUserInput = {
  id: number
  name: string
  role: UserRole
}

export type ResetUserPasswordInput = {
  id: number
  newPassword: string
}

export type SetUserActiveInput = {
  id: number
  active: boolean
}

export type ApiSuccess<T> = {
  ok: true
  data: T
}

export type ApiError = {
  ok: false
  error: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export type LoginInput = {
  username: string
  password: string
}

export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

export type Category = {
  id: number
  name: string
  productsCount: number
  createdAt: string
  updatedAt: string
}

export type Supplier = {
  id: number
  name: string
  phone: string | null
  email: string | null
  active: boolean
  productsCount: number
  createdAt: string
  updatedAt: string
}

export type Product = {
  id: number
  name: string
  sku: string | null
  description: string | null
  categoryId: number
  categoryName: string
  supplierId: number | null
  supplierName: string | null
  size: string | null
  color: string | null
  priceInCents: number
  stock: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export type Offer = {
  id: number
  productId: number
  productName: string
  categoryName: string
  discountPercent: number
  startAt: string
  endAt: string
  status: OfferStatus
  hasOverlap: boolean
  createdAt: string
}

export type OfferFilters = {
  productId?: number | null
  status?: 'all' | OfferStatus
}

export type ProductFilters = {
  search?: string
  categoryId?: number | null
  supplierId?: number | null
  active?: 'all' | 'active' | 'inactive'
}

export type CreateCategoryInput = {
  name: string
}

export type UpdateCategoryInput = {
  id: number
  name: string
}

export type DeleteCategoryInput = {
  id: number
}

export type CreateSupplierInput = {
  name: string
  phone?: string | null
  email?: string | null
}

export type UpdateSupplierInput = {
  id: number
  name: string
  phone?: string | null
  email?: string | null
}

export type SetSupplierActiveInput = {
  id: number
  active: boolean
}

export type CreateProductInput = {
  name: string
  sku?: string | null
  description?: string | null
  categoryId: number
  supplierId?: number | null
  size?: string | null
  color?: string | null
  priceInCents: number
  initialStock: number
}

export type UpdateProductInput = {
  id: number
  name: string
  sku?: string | null
  description?: string | null
  categoryId: number
  supplierId?: number | null
  size?: string | null
  color?: string | null
  priceInCents: number
}

export type SetProductActiveInput = {
  id: number
  active: boolean
}

export type CreateOfferInput = {
  productId: number
  discountPercent: number
  startAt: string
  endAt: string
}

export type UpdateOfferInput = CreateOfferInput & {
  id: number
}

export type DeleteOfferInput = {
  id: number
}

export type Customer = {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  purchasesCount: number
  lastPurchaseAt: string | null
  createdAt: string
  updatedAt: string
}

export type CustomerFilters = {
  search?: string
}

export type CreateCustomerInput = {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
}

export type UpdateCustomerInput = {
  id: number
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
}

export type CustomerSaleSummary = {
  saleId: number
  totalInCents: number
  paymentMethod: PaymentMethod
  itemCount: number
  createdAt: string
}

export type PosProduct = {
  id: number
  name: string
  sku: string | null
  categoryName: string
  size: string | null
  color: string | null
  priceInCents: number
  activeDiscountPercent: number
  priceWithDiscountInCents: number
  stock: number
}

export type PosProductFilters = {
  search?: string
}

export type CheckoutItemInput = {
  productId: number
  quantity: number
}

export type CheckoutInput = {
  customerId?: number | null
  paymentMethod: PaymentMethod
  items: CheckoutItemInput[]
}

export type SaleTicketItem = {
  productId: number
  productName: string
  quantity: number
  unitPriceInCents: number
  discountPercent: number
  subtotalInCents: number
}

export type SaleTicket = {
  saleId: number
  createdAt: string
  paymentMethod: PaymentMethod
  totalInCents: number
  seller: {
    id: number
    name: string
  }
  customer: {
    id: number
    name: string
    phone: string | null
    email: string | null
  } | null
  items: SaleTicketItem[]
}

export type StockEntryItemInput = {
  productId: number
  quantity: number
}

export type CreateStockEntryInput = {
  items: StockEntryItemInput[]
  note?: string | null
}

export type CreateStockAdjustmentInput = {
  productId: number
  delta: number
  note: string
}

export type InventoryMovement = {
  id: number
  productId: number
  productName: string
  categoryName: string
  delta: number
  reason: StockMovementReason
  note: string | null
  referenceId: number | null
  userName: string
  createdAt: string
}

export type SalesReportFilters = {
  period: ReportPeriod
  startDate?: string
  endDate?: string
}

export type SalesReportRow = {
  saleId: number
  createdAt: string
  totalInCents: number
  paymentMethod: PaymentMethod
  sellerName: string
  customerName: string | null
  itemCount: number
}

export type SalesReportDayGroup = {
  day: string
  totalInCents: number
  sales: SalesReportRow[]
}

export type SalesReport = {
  label: string
  period: ReportPeriod
  startAt: string
  endAt: string
  totalSalesCount: number
  totalInCents: number
  totalsByPaymentMethod: Record<PaymentMethod, number>
  groupedByDay: SalesReportDayGroup[]
  sales: SalesReportRow[]
}

export type AuditLogUserOption = {
  id: number
  name: string
  username: string
}

export type AuditLogEntry = {
  id: number
  createdAt: string
  action: string
  entity: string
  entityId: number | null
  terminalId: string
  payload: unknown
  user: AuditLogUserOption
}

export type AuditLogFilters = {
  userId?: number | null
  action?: string | null
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export type AuditLogPage = {
  items: AuditLogEntry[]
  page: number
  pageSize: number
  total: number
  availableActions: string[]
  users: AuditLogUserOption[]
}

export type DatabaseTransferResult = {
  canceled: boolean
  filePath: string | null
  relaunching: boolean
}
