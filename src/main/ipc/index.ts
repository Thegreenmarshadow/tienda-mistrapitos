import { registerAuditHandlers } from './audit'
import { registerAuthHandlers } from './auth'
import { registerCatalogHandlers } from './catalog'
import { registerCustomerHandlers } from './customers'
import { registerInventoryHandlers } from './inventory'
import { registerOffersHandlers } from './offers'
import { registerReportsHandlers } from './reports'
import { registerSalesHandlers } from './sales'
import { registerSystemHandlers } from './system'
import { registerUserHandlers } from './users'

export function registerIpcHandlers() {
  registerAuditHandlers()
  registerAuthHandlers()
  registerCatalogHandlers()
  registerCustomerHandlers()
  registerInventoryHandlers()
  registerOffersHandlers()
  registerReportsHandlers()
  registerSalesHandlers()
  registerSystemHandlers()
  registerUserHandlers()
}
