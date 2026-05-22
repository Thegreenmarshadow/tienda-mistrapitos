import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type {
  AuditLogFilters,
  AuditLogPage,
  ApiResponse,
  Category,
  ChangePasswordInput,
  CheckoutInput,
  CreateUserInput,
  CreateOfferInput,
  CreateCustomerInput,
  CreateCategoryInput,
  CreateProductInput,
  CreateStockAdjustmentInput,
  CreateStockEntryInput,
  CreateSupplierInput,
  Customer,
  CustomerFilters,
  CustomerSaleSummary,
  DeleteCategoryInput,
  DeleteOfferInput,
  InventoryMovement,
  LoginInput,
  Offer,
  OfferFilters,
  PosProduct,
  Product,
  ProductFilters,
  DatabaseTransferResult,
  ResetUserPasswordInput,
  SaleTicket,
  SalesReport,
  SalesReportFilters,
  SessionUser,
  SetProductActiveInput,
  SetSupplierActiveInput,
  SetUserActiveInput,
  Supplier,
  UpdateOfferInput,
  UpdateCustomerInput,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateSupplierInput,
  UpdateUserInput,
  UserAccount,
} from '../shared/types'

const api = {
  auth: {
    login: (input: LoginInput) => ipcRenderer.invoke(IPC.auth.login, input) as Promise<ApiResponse<SessionUser>>,
    logout: () => ipcRenderer.invoke(IPC.auth.logout) as Promise<ApiResponse<null>>,
    currentUser: () => ipcRenderer.invoke(IPC.auth.currentUser) as Promise<ApiResponse<SessionUser | null>>,
    changePassword: (input: ChangePasswordInput) =>
      ipcRenderer.invoke(IPC.auth.changePassword, input) as Promise<ApiResponse<SessionUser>>,
  },
  users: {
    list: () => ipcRenderer.invoke(IPC.users.list) as Promise<ApiResponse<UserAccount[]>>,
    create: (input: CreateUserInput) => ipcRenderer.invoke(IPC.users.create, input) as Promise<ApiResponse<UserAccount>>,
    update: (input: UpdateUserInput) => ipcRenderer.invoke(IPC.users.update, input) as Promise<ApiResponse<UserAccount>>,
    resetPassword: (input: ResetUserPasswordInput) =>
      ipcRenderer.invoke(IPC.users.resetPassword, input) as Promise<ApiResponse<UserAccount>>,
    setActive: (input: SetUserActiveInput) =>
      ipcRenderer.invoke(IPC.users.setActive, input) as Promise<ApiResponse<UserAccount>>,
  },
  catalog: {
    listCategories: () => ipcRenderer.invoke(IPC.catalog.listCategories) as Promise<ApiResponse<Category[]>>,
    createCategory: (input: CreateCategoryInput) =>
      ipcRenderer.invoke(IPC.catalog.createCategory, input) as Promise<ApiResponse<Category>>,
    updateCategory: (input: UpdateCategoryInput) =>
      ipcRenderer.invoke(IPC.catalog.updateCategory, input) as Promise<ApiResponse<Category>>,
    deleteCategory: (input: DeleteCategoryInput) =>
      ipcRenderer.invoke(IPC.catalog.deleteCategory, input) as Promise<ApiResponse<{ id: number }>>,
    listSuppliers: () => ipcRenderer.invoke(IPC.catalog.listSuppliers) as Promise<ApiResponse<Supplier[]>>,
    createSupplier: (input: CreateSupplierInput) =>
      ipcRenderer.invoke(IPC.catalog.createSupplier, input) as Promise<ApiResponse<Supplier>>,
    updateSupplier: (input: UpdateSupplierInput) =>
      ipcRenderer.invoke(IPC.catalog.updateSupplier, input) as Promise<ApiResponse<Supplier>>,
    setSupplierActive: (input: SetSupplierActiveInput) =>
      ipcRenderer.invoke(IPC.catalog.setSupplierActive, input) as Promise<ApiResponse<Supplier>>,
    listProducts: (filters: ProductFilters) =>
      ipcRenderer.invoke(IPC.catalog.listProducts, filters) as Promise<ApiResponse<Product[]>>,
    createProduct: (input: CreateProductInput) =>
      ipcRenderer.invoke(IPC.catalog.createProduct, input) as Promise<ApiResponse<Product>>,
    updateProduct: (input: UpdateProductInput) =>
      ipcRenderer.invoke(IPC.catalog.updateProduct, input) as Promise<ApiResponse<Product>>,
    setProductActive: (input: SetProductActiveInput) =>
      ipcRenderer.invoke(IPC.catalog.setProductActive, input) as Promise<ApiResponse<Product>>,
  },
  customers: {
    list: (filters: CustomerFilters) => ipcRenderer.invoke(IPC.customers.list, filters) as Promise<ApiResponse<Customer[]>>,
    create: (input: CreateCustomerInput) =>
      ipcRenderer.invoke(IPC.customers.create, input) as Promise<ApiResponse<Customer>>,
    update: (input: UpdateCustomerInput) =>
      ipcRenderer.invoke(IPC.customers.update, input) as Promise<ApiResponse<Customer>>,
    history: (customerId: number) =>
      ipcRenderer.invoke(IPC.customers.history, { customerId }) as Promise<ApiResponse<CustomerSaleSummary[]>>,
  },
  sales: {
    searchProducts: (search?: string) =>
      ipcRenderer.invoke(IPC.sales.searchProducts, { search }) as Promise<ApiResponse<PosProduct[]>>,
    getTicket: (saleId: number) =>
      ipcRenderer.invoke(IPC.sales.getTicket, { saleId }) as Promise<ApiResponse<SaleTicket>>,
    checkout: (input: CheckoutInput) => ipcRenderer.invoke(IPC.sales.checkout, input) as Promise<ApiResponse<SaleTicket>>,
  },
  offers: {
    list: (filters: OfferFilters) => ipcRenderer.invoke(IPC.offers.list, filters) as Promise<ApiResponse<Offer[]>>,
    create: (input: CreateOfferInput) => ipcRenderer.invoke(IPC.offers.create, input) as Promise<ApiResponse<Offer>>,
    update: (input: UpdateOfferInput) => ipcRenderer.invoke(IPC.offers.update, input) as Promise<ApiResponse<Offer>>,
    delete: (input: DeleteOfferInput) => ipcRenderer.invoke(IPC.offers.delete, input) as Promise<ApiResponse<{ id: number }>>,
  },
  inventory: {
    listMovements: () => ipcRenderer.invoke(IPC.inventory.listMovements) as Promise<ApiResponse<InventoryMovement[]>>,
    createEntry: (input: CreateStockEntryInput) =>
      ipcRenderer.invoke(IPC.inventory.createEntry, input) as Promise<ApiResponse<{ processedCount: number }>>,
    createAdjustment: (input: CreateStockAdjustmentInput) =>
      ipcRenderer.invoke(IPC.inventory.createAdjustment, input) as Promise<ApiResponse<{ productId: number; stock: number }>>,
  },
  reports: {
    getSalesSummary: (input: SalesReportFilters) =>
      ipcRenderer.invoke(IPC.reports.salesSummary, input) as Promise<ApiResponse<SalesReport>>,
  },
  audit: {
    list: (filters: AuditLogFilters) => ipcRenderer.invoke(IPC.audit.list, filters) as Promise<ApiResponse<AuditLogPage>>,
  },
  system: {
    exportDatabase: () => ipcRenderer.invoke(IPC.system.exportDatabase) as Promise<ApiResponse<DatabaseTransferResult>>,
    importDatabase: () => ipcRenderer.invoke(IPC.system.importDatabase) as Promise<ApiResponse<DatabaseTransferResult>>,
  },
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: typeof api
  }
}
