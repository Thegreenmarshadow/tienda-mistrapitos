export const IPC = {
  auth: {
    login: 'auth:login',
    logout: 'auth:logout',
    currentUser: 'auth:current-user',
    changePassword: 'auth:change-password',
  },
  users: {
    list: 'users:list',
    create: 'users:create',
    update: 'users:update',
    resetPassword: 'users:reset-password',
    setActive: 'users:set-active',
  },
  catalog: {
    listCategories: 'catalog:categories:list',
    createCategory: 'catalog:categories:create',
    updateCategory: 'catalog:categories:update',
    deleteCategory: 'catalog:categories:delete',
    listSuppliers: 'catalog:suppliers:list',
    createSupplier: 'catalog:suppliers:create',
    updateSupplier: 'catalog:suppliers:update',
    setSupplierActive: 'catalog:suppliers:set-active',
    listProducts: 'catalog:products:list',
    createProduct: 'catalog:products:create',
    updateProduct: 'catalog:products:update',
    setProductActive: 'catalog:products:set-active',
  },
  customers: {
    list: 'customers:list',
    create: 'customers:create',
    update: 'customers:update',
    history: 'customers:history',
  },
  sales: {
    searchProducts: 'sales:products:search',
    checkout: 'sales:checkout',
  },
  offers: {
    list: 'offers:list',
    create: 'offers:create',
    update: 'offers:update',
    delete: 'offers:delete',
  },
  inventory: {
    listMovements: 'inventory:movements:list',
    createEntry: 'inventory:entries:create',
    createAdjustment: 'inventory:adjustments:create',
  },
  reports: {
    salesSummary: 'reports:sales-summary',
  },
  audit: {
    list: 'audit:list',
  },
  system: {
    exportDatabase: 'system:database:export',
    importDatabase: 'system:database:import',
  },
} as const
